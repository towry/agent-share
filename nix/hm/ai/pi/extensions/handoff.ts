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
import type { ExtensionAPI, ModelRegistry } from "@mariozechner/pi-coding-agent";
import { BorderedLoader } from "@mariozechner/pi-coding-agent";
import {
  saveSessionAsMarkdown,
  extractMessagesFromBranch,
  getConversationText,
} from "./utils/session.js";
import { getRuntimeModelConfig } from "../agents/extension-models.js";

function getHandoffModelConfig() {
  return getRuntimeModelConfig("HANDOFF");
}

function getHandoffModel(registry: ModelRegistry) {
  const { provider, model } = getHandoffModelConfig();
  const models = registry.getAvailable();
  return models.find((m) => m.provider === provider && m.id === model) ?? null;
}

const SYSTEM_PROMPT = `You are a context transfer assistant. Given a conversation history, generate a focused summary that:

1. **Prioritizes recent context**: Provide richer, more detailed coverage of the LATEST messages in the conversation. Early messages can be summarized more briefly.
2. Summarizes relevant context from the conversation (decisions made, approaches taken, key findings)
3. Lists any relevant files that were discussed or modified
4. **Captures workflow patterns**: Document which context files (AGENTS.md, skills, reference docs) were read and the decision path followed
5. Is self-contained - the new thread should be able to proceed without the old conversation

IMPORTANT: Pay special attention to:
- Any AGENTS.md, CLAUDE.md, or skill files that were read - these contain project conventions
- Reference docs or guides that informed decisions
- The workflow path: "read X → discovered Y → used Z" patterns
- Existing scripts/commands that were discovered and used (vs writing new ones)

Format your response as a prompt the user can send to start the new thread. For recent/late-stage conversations, include specific details, code snippets, and recent changes. For early context, summarize concisely. Do not include any preamble like "Here's the prompt" - just output the prompt itself.

Example output format:
## Context
We've been working on X. Key decisions:
- Decision 1
- Decision 2

## Workflow & Context Files
The agent followed this path:
1. Read \`AGENTS.md\` which pointed to skill X
2. Loaded skill from \`~/.claude/skills/X/SKILL.md\`
3. Discovered existing script \`scripts/do-thing.sh\` (don't write new one!)

Key context files to read:
- \`AGENTS.md\` - contains project conventions for Y
- \`~/.claude/skills/X/SKILL.md\` - workflow for Z task

## Recent Developments
(LATEST, be detailed):
- Specific change made to file X
- Exact implementation detail or finding from recent messages
- Code snippet or specific approach from the end of conversation

## Files Involved
- path/to/file1.ts (modified)
- path/to/file2.ts (read for reference)`;

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

      const handoffModel = getHandoffModel(ctx.modelRegistry);
      if (!handoffModel) {
        const { provider, model } = getHandoffModelConfig();
        ctx.ui.notify(`Handoff model not found: ${provider}/${model}`, "error");
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
        const loader = new BorderedLoader(tui, theme, `Generating handoff prompt...`);
        loader.onAbort = () => done(null);

        const doGenerate = async () => {
          const apiKey = await ctx.modelRegistry.getApiKey(handoffModel);

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
            handoffModel,
            { systemPrompt: SYSTEM_PROMPT, messages: [userMessage] },
            { apiKey, signal: loader.signal },
          );

          if (response.stopReason === "aborted") {
            return null;
          }

          return response.content
            .filter((c): c is { type: "text"; text: string } => c.type === "text")
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
