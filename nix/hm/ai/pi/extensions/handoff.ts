/**
 * Handoff extension - transfer context to a new focused session
 *
 * Instead of compacting (which is lossy), handoff extracts what matters
 * for your next task and creates a new session with a generated prompt.
 *
 * Usage:
 *   /handoff now implement this for teams as well
 *   /handoff execute phase one of the plan
 *   /handoff check other places that need this fix
 *
 * The generated prompt appears as a draft in the editor for review/editing.
 */

import { complete, type Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { BorderedLoader } from "@mariozechner/pi-coding-agent";
import {
  saveSessionAsMarkdown,
  extractMessagesFromBranch,
  getConversationText,
} from "./utils/session.js";

const SYSTEM_PROMPT = `You are a context transfer assistant. Given a conversation history, generate a focused summary that:

1. Summarizes relevant context from the conversation (decisions made, approaches taken, key findings)
2. Lists any relevant files that were discussed or modified
3. Is self-contained - the new thread should be able to proceed without the old conversation

Format your response as a prompt the user can send to start the new thread. Be concise but include all necessary context. Do not include any preamble like "Here's the prompt" - just output the prompt itself.

Example output format:
## Context
We've been working on X. Key decisions:
- Decision 1
- Decision 2

Files involved:
- path/to/file1.ts
- path/to/file2.ts`;

const MAX_TITLE_LENGTH = 80;

function slugifyTitle(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TITLE_LENGTH);

  return slug || "handoff";
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("handoff", {
    description: "Transfer context to a new focused session",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("handoff requires interactive mode", "error");
        return;
      }

      if (!ctx.model) {
        ctx.ui.notify("No model selected", "error");
        return;
      }

      const goal = args.trim();
      const branch = ctx.sessionManager.getBranch();
      const messages = extractMessagesFromBranch(branch);

      if (messages.length === 0) {
        ctx.ui.notify("No conversation to hand off", "error");
        return;
      }

      // Get conversation text for LLM prompt
      const conversationText = getConversationText(messages);

      // Save conversation using shared utility
      const { relativePath } = await saveSessionAsMarkdown({
        cwd: ctx.cwd,
        messages,
        slug: slugifyTitle(goal || "handoff"),
      });

      const currentSessionFile = ctx.sessionManager.getSessionFile();

      // Generate the handoff prompt with loader UI
      const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
        const loader = new BorderedLoader(
          tui,
          theme,
          `Generating handoff prompt...`
        );
        loader.onAbort = () => done(null);

        const doGenerate = async () => {
          const apiKey = await ctx.modelRegistry.getApiKey(ctx.model!);

          const userMessage: Message = {
            role: "user",
            content: [
              {
                type: "text",
                text: `## Conversation History\n\n${conversationText}`,
              },
            ],
            timestamp: Date.now(),
          };

          const response = await complete(
            ctx.model!,
            { systemPrompt: SYSTEM_PROMPT, messages: [userMessage] },
            { apiKey, signal: loader.signal }
          );

          if (response.stopReason === "aborted") {
            return null;
          }

          return response.content
            .filter(
              (c): c is { type: "text"; text: string } => c.type === "text"
            )
            .map((c) => c.text)
            .join("\n");
        };

        doGenerate()
          .then(done)
          .catch((err) => {
            console.error("Handoff generation failed:", err);
            done(null);
          });

        return loader;
      });

      if (result === null) {
        ctx.ui.notify("Cancelled", "info");
        return;
      }

      const userNoteSection = goal ? `\n\n### User note:\n\n${goal}` : "";
      const handoffPrompt = `${result}\n\nFor full conversation context, use the semantic_read tool: \`semantic_read("${relativePath}")\`${userNoteSection}`;

      // Create new session with parent tracking
      const newSessionResult = await ctx.newSession({
        parentSession: currentSessionFile,
      });

      if (newSessionResult.cancelled) {
        ctx.ui.notify("New session cancelled", "info");
        return;
      }

      // Set the edited prompt in the main editor for submission
      ctx.ui.setEditorText(handoffPrompt);
      ctx.ui.notify("Handoff ready. Submit when ready.", "info");
    },
  });
}
