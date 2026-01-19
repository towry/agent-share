/**
 * Librarian Extension
 *
 * A specialized agent for understanding large, complex codebases across multiple GitHub repositories.
 * Spawns a read-only subagent with access to gh CLI, DeepWiki, and Exa tools.
 *
 * Usage:
 *   /librarian <prompt>  - Research codebases with natural language prompt
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
import { getModelConfig } from "../agents/extension-models.js";

const { model: DEFAULT_MODEL, provider: DEFAULT_PROVIDER } =
  getModelConfig("LIBRARIAN");

const LIBRARIAN_SYSTEM_PROMPT = `You are the Librarian - an expert at understanding large, complex codebases across multiple GitHub repositories.

## AVAILABLE TOOLS
- \`read\` - Read local file contents
- \`bash\` - Run read-only commands: gh, git log, git show, rg, fd, ls, cat, head, tail
- \`deepwiki_*\` - Query DeepWiki for GitHub repo documentation and architecture
- \`exa_*\` - Search the web for documentation, discussions, and related resources

## CRITICAL RULES
- You are READ-ONLY. You CANNOT modify any files.
- Only run read-only bash commands. NO: rm, mv, cp, touch, mkdir, echo >, git add/commit/push
- Use \`gh\` CLI for GitHub operations: gh repo view, gh api, gh search code

## RESEARCH STRATEGY
1. **Start with DeepWiki** - Use deepwiki_read_wiki_structure to understand repo organization
2. **Ask targeted questions** - Use deepwiki_ask_question for specific architectural queries
3. **Search across repos** - Use \`gh search code\` for finding implementations
4. **Deep dive** - Use read and bash (rg, fd) for detailed code analysis
5. **External context** - Use exa_* for documentation, blog posts, discussions

## OUTPUT FORMAT
Structure your findings as:

### Summary
Brief answer (2-3 sentences)

### Key Findings
- Finding with repo/file references

### Code References
Relevant code snippets with file paths`;

interface LibrarianDetails {
  query: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>;
  model?: string;
  usage?: { input: number; output: number; cost: number; turns: number };
  durationMs?: number;
  error?: boolean;
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
  // DeepWiki/Exa tools
  if (toolName.startsWith("deepwiki_") || toolName.startsWith("exa_")) {
    const shortName = toolName.replace(/^(deepwiki_|exa_)/, "");
    const query = (args.query ||
      args.repoName ||
      args.question ||
      "") as string;
    const preview = query.length > 50 ? `${query.slice(0, 50)}...` : query;
    return (
      themeFg("accent", shortName) +
      (preview ? themeFg("dim", ` ${preview}`) : "")
    );
  }
  const argsStr = JSON.stringify(args);
  const preview = argsStr.length > 50 ? `${argsStr.slice(0, 50)}...` : argsStr;
  return themeFg("accent", toolName) + themeFg("dim", ` ${preview}`);
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("librarian", {
    description: "Research codebases across multiple repos (read-only)",
    handler: async (args, ctx) => {
      const prompt = args.trim();
      if (!prompt) {
        if (ctx.hasUI) {
          ctx.ui.notify("Usage: /librarian <prompt>", "error");
        }
        return;
      }

      // Send user message to trigger model to use librarian tool
      pi.sendUserMessage(
        `Use the librarian tool to research external GitHub repos and documentation: ${prompt}`
      );
    },
  });

  const LibrarianParams = Type.Object({
    query: Type.String({
      description:
        "Question about remote GitHub repos. Include repo names (owner/repo format) and what you want to understand.",
    }),
  });

  pi.registerTool({
    name: "librarian",
    label: "Librarian",
    description:
      "Research REMOTE GitHub repositories and external documentation via DeepWiki and web search. NOT for local codebase - use 'explore' tool for local code. Use this for: understanding external library architecture, finding implementations in public repos, reading official docs/discussions.",
    parameters: LibrarianParams,

    async execute(_toolCallId, params, onUpdate, ctx, signal) {
      const p = params as { query: string };

      const envModel = process.env.PI_LIBRARIAN_MODEL;
      let provider = DEFAULT_PROVIDER;
      let model = DEFAULT_MODEL;
      if (envModel) {
        if (envModel.includes(":")) {
          const [prov, mod] = envModel.split(":", 2);
          provider = prov ?? DEFAULT_PROVIDER;
          model = mod ?? DEFAULT_MODEL;
        } else {
          model = envModel;
        }
      }

      const tools = "read,ls,grep,find";

      // Load deepwiki and exa extensions for the subagent
      // --no-extensions prevents auto-discovery (avoids recursive librarian calls)
      const extDir = `${os.homedir()}/.pi/agent/extensions`;
      const extraArgs = [
        "--no-extensions",
        "-e",
        `${extDir}/deepwiki/index.ts`,
        "-e",
        `${extDir}/exa-web/index.ts`,
      ];

      const result = await runPiJsonAgent({
        cwd: ctx.cwd,
        prompt: p.query,
        systemPrompt: LIBRARIAN_SYSTEM_PROMPT,
        replaceSystemPrompt: true,
        provider,
        model,
        tools,
        extraArgs,
        signal,
        onUpdate: onUpdate
          ? (partial: RunAgentResult) => {
              onUpdate({
                content: [
                  {
                    type: "text",
                    text:
                      getFinalAssistantText(partial.messages) ||
                      "(researching...)",
                  },
                ],
                details: {
                  query: p.query,
                  toolCalls: getToolCalls(partial.messages),
                  model: partial.model,
                  usage: partial.usage,
                },
              });
            }
          : undefined,
      });

      const output = getFinalAssistantText(result.messages);
      const toolCalls = getToolCalls(result.messages);

      if (
        result.exitCode !== 0 ||
        result.stopReason === "error" ||
        result.stopReason === "aborted" ||
        result.stopReason === "timeout"
      ) {
        return {
          content: [
            {
              type: "text",
              text:
                result.errorMessage ||
                result.stderr ||
                output ||
                "Research failed",
            },
          ],
          details: {
            query: p.query,
            toolCalls,
            model: result.model,
            usage: result.usage,
            durationMs: result.durationMs,
            error: true,
          },
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: output || "(no findings)" }],
        details: {
          query: p.query,
          toolCalls,
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        },
      };
    },

    renderCall(args, theme) {
      const a = args as { query?: string };
      const query = a.query ?? "...";
      const preview = query.length > 50 ? `${query.slice(0, 50)}...` : query;
      return new Text(
        theme.fg("toolTitle", theme.bold("librarian ")) +
          theme.fg("accent", preview),
        0,
        0
      );
    },

    renderResult(result, { expanded }, theme) {
      const details = result.details as LibrarianDetails | undefined;
      const mdTheme = getMarkdownTheme();

      if (details?.error) {
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
          theme.fg("toolTitle", theme.bold("librarian"));
        if (details?.model) header += theme.fg("dim", ` (${details.model})`);
        if (details?.usage) {
          const u = details.usage;
          header += theme.fg(
            "dim",
            ` ${u.turns}t ↑${u.input} ↓${u.output} $${u.cost.toFixed(4)}`
          );
        }
        if (details?.durationMs) {
          header += theme.fg(
            "dim",
            ` ${(details.durationMs / 1000).toFixed(1)}s`
          );
        }
        container.addChild(new Text(header, 0, 0));

        // Query
        if (details?.query) {
          container.addChild(new Spacer(1));
          container.addChild(
            new Text(
              theme.fg("muted", "Query: ") + theme.fg("dim", details.query),
              0,
              0
            )
          );
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
        theme.fg("toolTitle", theme.bold("librarian"));
      if (details?.model) text += theme.fg("dim", ` (${details.model})`);
      if (toolCalls.length > 0)
        text += theme.fg("dim", ` ${toolCalls.length} calls`);
      if (details?.durationMs) {
        text += theme.fg("dim", ` ${(details.durationMs / 1000).toFixed(1)}s`);
      }

      const lines = resultText.split("\n").slice(0, 5);
      text += `\n${theme.fg("toolOutput", lines.join("\n"))}`;
      if (resultText.split("\n").length > 5) {
        text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;
      }

      return new Text(text, 0, 0);
    },
  });
}
