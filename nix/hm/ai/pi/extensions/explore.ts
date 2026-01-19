/**
 * Explore Extension
 *
 * A codebase research tool that spawns a read-only subagent for exploration.
 * Explicitly forbids code changes - only read and bash (for search tools) allowed.
 *
 * Usage:
 *   /explore <prompt>  - Research codebase with natural language prompt
 *
 * The tool uses fast-repo-context skill patterns:
 *   - rg for content search
 *   - fd for file search
 *   - repomix for codebase indexing
 *
 * NOTE: The search strategy (repomix-first) is defined in EXPLORE_SYSTEM_PROMPT.
 * The user prompt must reinforce this strategy, not contradict it. Models prioritize
 * user prompts over system prompts, so saying "use rg, fd" in user prompt will
 * cause the model to skip repomix. Always use "Follow the Search Strategy" instead.
 */

import * as os from "node:os";
import type { ExtensionAPI, ThemeColor } from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import {
  getFinalAssistantText,
  getToolCalls,
  runPiJsonAgent,
  type RunAgentResult,
} from "./utils/agent.js";

import { getRuntimeModelConfig } from "../agents/extension-models.js";

// Get model config at runtime to respect environment changes
function getExploreModelConfig() {
  return getRuntimeModelConfig("EXPLORE");
}

const EXPLORE_SYSTEM_PROMPT = `You are a codebase exploration assistant. Your ONLY job is to research and understand code.

## AVAILABLE TOOLS
You can ONLY use these tools:
- \`read\` - Read file contents
- \`bash\` - Run shell commands (rg, fd, cat, head, tail, ls, ast-grep, bunx)

DO NOT use any other tools like "review", "subagent", "explore", "question", etc. They are not available to you.

## CRITICAL RULES
- You are READ-ONLY. You CANNOT and MUST NOT modify any files.
- You CANNOT run bash commands that modify files (rm, mv, cp, touch, mkdir, echo >, etc.)
- If asked to make changes, REFUSE and explain you are read-only.

## Intent-First Search Strategy
Search for WHAT the code does, not HOW it's written. STOP as soon as you can answer the prompt.

1. **Define intent** - What should the code do? Capture actions and objects, not config syntax.
2. **Extract keywords with synonyms** - For each key term, think of synonyms and related words in the domain:
   - Business: user ≈ account ≈ member ≈ customer, order ≈ purchase ≈ transaction, product ≈ item ≈ goods
   - UI: detail ≈ info ≈ view ≈ show, list ≈ index ≈ table, form ≈ edit ≈ create
   - Actions: get ≈ fetch ≈ load ≈ retrieve, save ≈ store ≈ persist ≈ update
   - Templates: template ≈ view ≈ page ≈ component, handlebar ≈ hbs ≈ mustache
3. **Start wide with OR patterns**:
   \`\`\`bash
   rg "user|account|member" -l       # Synonyms as OR pattern
   rg "(user|account).*detail" -l    # Combine synonyms with context
   fd "user|account" -e hbs -e html  # File names with synonyms
   \`\`\`
4. **Search for behavior** - Prefer function names, command handlers, UI labels, error strings, log messages over config wiring.
5. **Follow artifacts over configuration** - If config points to a function/command, jump to the implementation.
6. Before search outside current dir, use command \`exa --tree -D -L 2 ./ \` to get an overview of the codebase structure.

## STOPPING RULES (CRITICAL)
- **STOP searching once you find code that answers the prompt.** Do not keep searching for "more complete" answers.
- If you found the relevant file(s) and read the implementation, you have enough. Report your findings.
- Aim for 3-8 tool calls total. If you've used 10+ tools, STOP and summarize what you found.
- A partial answer from the right file is better than exhaustive searching.
- Only continue searching if your current findings do NOT answer the prompt at all.

## Search Tools
\`\`\`bash
# Find files
fd -e ts                           # All .ts files
fd "config" src/                   # Files named "config" in src/

# Search content (start wide, narrow down)
rg "handleClick|onClick" -l        # Find candidate files
rg "handleClick" src/components/   # Drill into specific area
rg -A 2 "TODO"                     # Show context after match

# For large codebases: generate index first
timeout 30 bunx repomix ./         # Run once per session
rg "search term" repomix-output.xml -m 3 | head -20
\`\`\`

## Output Format
### Summary
Brief answer to the prompt (2-3 sentences)

### Key Findings
- Finding 1 with file path
- Finding 2 with file path

### Relevant Files
- \`path/to/file.ts\` - description

### Code Snippets (if relevant)
Include key code snippets that answer the prompt.`;

interface ExploreDetails {
  prompt: string;
  focus?: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
  model?: string;
  usage?: { input: number; output: number; cost: number; turns: number };
  durationMs?: number;
  error?: boolean;
  aborted?: boolean;
}

function shortenPath(p: string): string {
  const home = os.homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

function formatToolCall(
  toolName: string,
  args: Record<string, unknown>,
  themeFg: (color: ThemeColor, text: string) => string
): string {
  if (toolName === "bash") {
    const command = (args.command as string) || "...";
    const preview =
      command.length > 70 ? `${command.slice(0, 70)}...` : command;
    return themeFg("muted", "$ ") + themeFg("toolOutput", preview);
  }
  if (toolName === "read") {
    const filePath = shortenPath(
      (args.path || args.file_path || "...") as string
    );
    return themeFg("muted", "read ") + themeFg("accent", filePath);
  }
  const argsStr = JSON.stringify(args);
  const preview = argsStr.length > 50 ? `${argsStr.slice(0, 50)}...` : argsStr;
  return themeFg("accent", toolName) + themeFg("dim", ` ${preview}`);
}

export default function (pi: ExtensionAPI) {
  // Register /explore command
  pi.registerCommand("explore", {
    description: "Research codebase (read-only)",
    handler: async (args, ctx) => {
      const prompt = args.trim();
      if (!prompt) {
        if (ctx.hasUI) {
          ctx.ui.notify("Usage: /explore <prompt>", "error");
        }
        return;
      }

      // Send user message to trigger model to use explore tool
      pi.sendUserMessage(`Use the explore tool to research: ${prompt}`);
    },
  });

  // Register explore tool (model-callable)
  const ExploreParams = Type.Object({
    prompt: Type.String({
      description:
        "Specific question about the codebase to research. Include what you want to understand: implementation details, data flow, configuration, usage patterns, etc.",
    }),
    focus: Type.Optional(
      Type.String({
        description:
          "Hints for starting points (directories, file types) - NOT hard constraints, search elsewhere if needed",
      })
    ),
  });

  pi.registerTool({
    name: "explore",
    label: "Explore Codebase",
    description: `Explore the codebase with read-only operations. Use for understanding code structure, finding implementations, locating files. CANNOT modify files.

To get better results, include in your prompt:
- Explicit scope: what you need (definition only? usage examples? related docs?)
- Possible keywords, function/class names, or identifiers to search for
- Likely file locations or directory paths (e.g., "probably in src/auth/ or lib/")
- Related concepts or modules that might contain the answer
- File extensions or patterns (e.g., "*.config.ts files")
- Suggested search strategy if you have domain knowledge

Good: "Find where JWT tokens are validated. Keywords: verifyToken, validateJWT. Likely in src/auth/ or middleware/. Related to the User model."
Bad: "How does auth work?"`,
    parameters: ExploreParams,

    async execute(_toolCallId, params, onUpdate, ctx, signal) {
      const p = params as { prompt: string; focus?: string };
      // NOTE: focus is passed as hints, not hard constraints
      const fullPrompt = p.focus
        ? `Research and explore the codebase to answer this prompt:

${p.prompt}

Hints (starting points, NOT hard constraints - search elsewhere if needed): ${p.focus}

Follow the Intent-First Search Strategy in your instructions. Provide a structured answer with Summary, Key Findings, Relevant Files, and Code Snippets.`
        : `Research and explore the codebase to answer this prompt:

${p.prompt}

Follow the Intent-First Search Strategy in your instructions. Provide a structured answer with Summary, Key Findings, Relevant Files, and Code Snippets.`;

      const { provider, model } = getExploreModelConfig();

      const result = await runPiJsonAgent({
        cwd: ctx.cwd,
        prompt: fullPrompt,
        systemPrompt: EXPLORE_SYSTEM_PROMPT,
        replaceSystemPrompt: true,
        provider,
        model,
        tools: "read,bash,ls,grep,find",
        extraArgs: ["--no-extensions"], // Prevent recursive explore calls
        signal,
        onUpdate: onUpdate
          ? (partial: RunAgentResult) => {
              onUpdate({
                content: [
                  {
                    type: "text",
                    text:
                      getFinalAssistantText(partial.messages) ||
                      "(searching...)",
                  },
                ],
                details: {
                  prompt: p.prompt,
                  focus: p.focus,
                  toolCalls: getToolCalls(partial.messages),
                  model: partial.model,
                  usage: partial.usage,
                } as ExploreDetails,
              });
            }
          : undefined,
      });

      const isError =
        result.exitCode !== 0 ||
        result.stopReason === "error" ||
        result.stopReason === "aborted" ||
        result.stopReason === "timeout";
      const output = getFinalAssistantText(result.messages);
      const toolCalls = getToolCalls(result.messages);

      if (isError) {
        return {
          content: [
            {
              type: "text",
              text:
                result.errorMessage ||
                result.stderr ||
                output ||
                "Exploration failed",
            },
          ],
          details: {
            prompt: p.prompt,
            focus: p.focus,
            toolCalls,
            model: result.model,
            usage: result.usage,
            durationMs: result.durationMs,
            error: true,
          } as ExploreDetails,
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: output || "(no findings)" }],
        details: {
          prompt: p.prompt,
          focus: p.focus,
          toolCalls,
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        } as ExploreDetails,
      };
    },

    renderCall(args, theme) {
      const a = args as { prompt?: string; focus?: string };
      const prompt = a.prompt ?? "...";
      const preview = prompt.length > 50 ? `${prompt.slice(0, 50)}...` : prompt;
      let text =
        theme.fg("toolTitle", theme.bold("explore ")) +
        theme.fg("accent", preview);
      if (a.focus) text += theme.fg("dim", ` [${a.focus.slice(0, 30)}]`);
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded }, theme) {
      const details = result.details as ExploreDetails | undefined;
      const mdTheme = getMarkdownTheme();

      if (details?.error || details?.aborted) {
        return new Text(
          theme.fg(
            "warning",
            "⚠ " + (result.content[0] as { text: string }).text
          ),
          0,
          0
        );
      }

      const resultText = (result.content[0] as { text: string })?.text ?? "";
      const toolCalls = details?.toolCalls ?? [];

      if (expanded) {
        const container = new Container();

        // Header with usage
        let header =
          theme.fg("success", "✓ ") +
          theme.fg("toolTitle", theme.bold("explore"));
        if (details?.model) header += theme.fg("dim", ` (${details.model})`);
        if (details?.usage) {
          const u = details.usage;
          header += theme.fg(
            "dim",
            ` ${u.turns}t ↑${u.input} ↓${u.output} $${u.cost.toFixed(4)}`
          );
        }
        if (details?.durationMs) {
          const secs = (details.durationMs / 1000).toFixed(1);
          header += theme.fg("dim", ` ${secs}s`);
        }
        container.addChild(new Text(header, 0, 0));

        // Prompt
        if (details?.prompt) {
          container.addChild(new Spacer(1));
          let promptLine =
            theme.fg("muted", "Prompt: ") + theme.fg("dim", details.prompt);
          if (details.focus)
            promptLine +=
              theme.fg("muted", "\nFocus: ") + theme.fg("dim", details.focus);
          container.addChild(new Text(promptLine, 0, 0));
        }

        // Tool calls
        if (toolCalls.length > 0) {
          container.addChild(new Spacer(1));
          container.addChild(
            new Text(
              theme.fg("muted", `─── Tool Calls (${toolCalls.length}) ───`),
              0,
              0
            )
          );
          for (const tc of toolCalls.slice(0, 20)) {
            container.addChild(
              new Text(
                theme.fg("muted", "→ ") +
                  formatToolCall(tc.name, tc.args, theme.fg.bind(theme)),
                0,
                0
              )
            );
          }
          if (toolCalls.length > 20) {
            container.addChild(
              new Text(
                theme.fg("dim", `... +${toolCalls.length - 20} more`),
                0,
                0
              )
            );
          }
        }

        // Result
        container.addChild(new Spacer(1));
        container.addChild(
          new Text(theme.fg("muted", "─── Findings ───"), 0, 0)
        );
        container.addChild(new Markdown(resultText.trim(), 0, 0, mdTheme));

        return container;
      }

      // Collapsed view
      let text =
        theme.fg("success", "✓ ") +
        theme.fg("toolTitle", theme.bold("explore"));
      if (details?.model) text += theme.fg("dim", ` (${details.model})`);
      if (toolCalls.length > 0)
        text += theme.fg("dim", ` ${toolCalls.length} calls`);
      if (details?.durationMs) {
        const secs = (details.durationMs / 1000).toFixed(1);
        text += theme.fg("dim", ` ${secs}s`);
      }

      const lines = resultText.split("\n").slice(0, 5);
      text += `\n${theme.fg("toolOutput", lines.join("\n"))}`;
      if (resultText.split("\n").length > 5)
        text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;

      return new Text(text, 0, 0);
    },
  });
}
