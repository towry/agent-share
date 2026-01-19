/**
 * Semantic Read Extension
 *
 * A context extraction tool that spawns a read-only subagent to efficiently
 * read and summarize session files or conversation logs.
 *
 * Used by handoff to provide previous session context without flooding
 * the current session's context window.
 *
 * Usage:
 *   semantic_read tool with filePath parameter
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { complete, type Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ModelRegistry, ThemeColor } from "@mariozechner/pi-coding-agent";
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
import { isBlockedReadPath } from "./permission-gate.js";

// ~5000 lines * 80 chars ≈ 400KB
const SMALL_FILE_THRESHOLD_BYTES = 400 * 1024;

interface FileInfo {
  exists: boolean;
  sizeBytes: number;
  isSmall: boolean;
  content?: string; // Only populated for small files
  blocked?: boolean; // True if path is blocked by permission gate
}

function getFileInfo(filePath: string, cwd: string): FileInfo {
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(cwd, filePath);

  // Security: check blocked paths BEFORE reading
  if (isBlockedReadPath(resolved)) {
    return { exists: false, sizeBytes: 0, isSmall: true, blocked: true };
  }

  try {
    const stat = fs.statSync(resolved);
    const isSmall = stat.size < SMALL_FILE_THRESHOLD_BYTES;
    return {
      exists: true,
      sizeBytes: stat.size,
      isSmall,
      // Read content for small files to avoid subagent overhead
      content: isSmall ? fs.readFileSync(resolved, "utf-8") : undefined,
    };
  } catch {
    return { exists: false, sizeBytes: 0, isSmall: true };
  }
}

function getSemanticReadModelConfig() {
  return getRuntimeModelConfig("SEMANTIC_READ");
}

function getSemanticReadModel(registry: ModelRegistry) {
  const { provider, model } = getSemanticReadModelConfig();
  const models = registry.getAvailable();
  return models.find((m) => m.provider === provider && m.id === model) ?? null;
}

const SYSTEM_PROMPT_BASE = `You are a context extraction assistant. Your job is to efficiently read session files and extract key context.

## AVAILABLE TOOLS
You can ONLY use these tools:
- \`read\` - Read file contents (use offset/limit for large files)
- \`grep\` - Search file contents (uses ripgrep, respects .gitignore)
- \`find\` - Find files by name pattern
- \`ls\` - List directory contents
- \`bash\` - Run shell commands: tail, head ONLY

DO NOT use any other tools. You are READ-ONLY.

## CRITICAL RULES
- You CANNOT modify any files
- You CANNOT run bash commands that modify files (rm, mv, cp, touch, mkdir, echo >, etc.)
- You should finish the task as fast as possible.

## SESSION FILE FORMAT
Session files use this structure:
- \`<user>\` - User messages/requests
- \`<agent>\` - Agent responses and summaries
- \`<tool_call>\` - Tool invocations: \`[Write]\`, \`[Edit]\`, \`[Bash]\`, \`[Read]\`

## OUTPUT FORMAT
Provide a concise summary with:

### Context Summary
Brief overview of what was discussed/accomplished (2-4 sentences)

### Key Decisions
- Decision 1
- Decision 2

### Key Files Modified
- \`path/to/file.ts\` - what was done

### Important Findings
Any critical discoveries, bugs found, or patterns identified

### Current State
Where things left off, what's pending`;

// For large files: use grep/tail strategy
const LARGE_FILE_STRATEGY = `

## READING STRATEGY
The file is large. Use tail and grep to extract key information:
\`\`\`bash
tail -n 200 <file>  # Last 200 lines for recent context
\`\`\`
\`\`\`
# Find key patterns
grep({ pattern: "^Done\\\\.|Created|Updated|Refactored", path: "<file>" })
grep({ pattern: "\\\\[Write\\\\]|\\\\[Edit\\\\]", path: "<file>" })
\`\`\`
Do NOT read the entire file.`;

interface SemanticReadDetails {
  filePath: string;
  query?: string;
  stopCriteria?: string;
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
  const SemanticReadParams = Type.Object({
    filePath: Type.String({
      description:
        "Path to the file to read (relative to project root or absolute)",
    }),
    query: Type.Optional(
      Type.String({
        description:
          "What context to extract (e.g., 'authentication implementation', 'files modified', 'key decisions about X')",
      })
    ),
    stopCriteria: Type.Optional(
      Type.String({
        description:
          "When to stop reading (e.g., 'stop after finding the main implementation file', 'stop once you identify the key decision')",
      })
    ),
  });

  pi.registerTool({
    name: "semantic_read",
    label: "Semantic Read",
    description: `Read a session file and extract key context efficiently. Runs in isolated subagent to prevent context flooding.

Use this to get summarized context from previous sessions without loading the entire conversation.`,
    parameters: SemanticReadParams,

    async execute(_toolCallId, params, onUpdate, ctx, signal) {
      const p = params as {
        filePath: string;
        query?: string;
        stopCriteria?: string;
      };

      const startTime = Date.now();
      const fileInfo = getFileInfo(p.filePath, ctx.cwd);

      // Security: block access to protected paths
      if (fileInfo.blocked) {
        return {
          content: [{ type: "text", text: `SECURITY: Reading "${p.filePath}" is blocked. This path is protected and cannot be accessed.` }],
          details: {
            filePath: p.filePath,
            query: p.query,
            stopCriteria: p.stopCriteria,
            toolCalls: [],
            error: true,
          } as SemanticReadDetails,
          isError: true,
        };
      }

      const querySection = p.query
        ? `\n\nFocus on extracting context related to: ${p.query}`
        : "";

      const stopSection = p.stopCriteria
        ? `\n\n## STOP CRITERIA\n${p.stopCriteria}\nOnce this criteria is met, STOP reading and provide your summary.`
        : "";

      const { provider, model } = getSemanticReadModelConfig();
      // Get full Model object from registry for direct LLM calls
      const semanticModel = getSemanticReadModel(ctx.modelRegistry);

      // Fast path: small files use direct LLM API (no subagent overhead)
      if (fileInfo.isSmall && fileInfo.content && semanticModel) {
        const directSystemPrompt = `You are a context extraction assistant. Extract key context from the provided session file content.

## OUTPUT FORMAT
Provide a concise summary with:

### Context Summary
Brief overview of what was discussed/accomplished (2-4 sentences)

### Key Decisions
- Decision 1
- Decision 2

### Key Files Modified
- \`path/to/file.ts\` - what was done

### Important Findings
Any critical discoveries, bugs found, or patterns identified

### Current State
Where things left off, what's pending`;

        const userMessage: Message = {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract key context from this file: ${p.filePath}${querySection}${stopSection}

<file_content>
${fileInfo.content}
</file_content>

Provide a structured summary.`,
            },
          ],
          timestamp: Date.now(),
        };

        const apiKey = await ctx.modelRegistry.getApiKey(semanticModel);

        const response = await complete(semanticModel, {
          systemPrompt: directSystemPrompt,
          messages: [userMessage],
        }, { apiKey, signal });

        const output = response.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("\n");

        const durationMs = Date.now() - startTime;
        const modelName = `${semanticModel.provider}/${semanticModel.id}`;

        if (response.stopReason === "aborted") {
          return {
            content: [{ type: "text", text: "Aborted" }],
            details: {
              filePath: p.filePath,
              query: p.query,
              stopCriteria: p.stopCriteria,
              toolCalls: [],
              model: modelName,
              usage: response.usage
                ? {
                    input: response.usage.input,
                    output: response.usage.output,
                    cost: response.usage.cost?.total ?? 0,
                    turns: 1,
                  }
                : undefined,
              durationMs,
              aborted: true,
            } as SemanticReadDetails,
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: output || "(no context extracted)" }],
          details: {
            filePath: p.filePath,
            query: p.query,
            stopCriteria: p.stopCriteria,
            toolCalls: [],
            model: modelName,
            usage: response.usage
              ? {
                  input: response.usage.input,
                  output: response.usage.output,
                  cost: response.usage.cost?.total ?? 0,
                  turns: 1,
                }
              : undefined,
            durationMs,
          } as SemanticReadDetails,
        };
      }

      // Large files: use subagent with grep/tail strategy
      const systemPrompt =
        SYSTEM_PROMPT_BASE + LARGE_FILE_STRATEGY;

      const sizeHint = fileInfo.exists
        ? `(${Math.round(fileInfo.sizeBytes / 1024)}KB, large)`
        : "(file may not exist)";

      const fullPrompt = `Read and extract key context from: ${p.filePath} ${sizeHint}${querySection}${stopSection}

Provide a structured summary with: Context Summary, Key Decisions, Key Files, Important Findings, and Current State.`;

      const result = await runPiJsonAgent({
        cwd: ctx.cwd,
        prompt: fullPrompt,
        systemPrompt: systemPrompt,
        replaceSystemPrompt: true,
        provider,
        model,
        tools: "read,bash,ls,grep,find",
        extraArgs: ["--no-extensions", "--no-skills", "--thinking", "off"],
        signal,
        onUpdate: onUpdate
          ? (partial: RunAgentResult) => {
              onUpdate({
                content: [
                  {
                    type: "text",
                    text:
                      getFinalAssistantText(partial.messages) || "(reading...)",
                  },
                ],
                details: {
                  filePath: p.filePath,
                  query: p.query,
                  stopCriteria: p.stopCriteria,
                  toolCalls: getToolCalls(partial.messages),
                  model: partial.model,
                  usage: partial.usage,
                } as SemanticReadDetails,
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
                "Semantic read failed",
            },
          ],
          details: {
            filePath: p.filePath,
            query: p.query,
            stopCriteria: p.stopCriteria,
            toolCalls,
            model: result.model,
            usage: result.usage,
            durationMs: result.durationMs,
            error: true,
          } as SemanticReadDetails,
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: output || "(no context extracted)" }],
        details: {
          filePath: p.filePath,
          query: p.query,
          stopCriteria: p.stopCriteria,
          toolCalls,
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        } as SemanticReadDetails,
      };
    },

    renderCall(args, theme) {
      const a = args as { filePath?: string; query?: string };
      const filePath = a.filePath ?? "...";
      const preview = shortenPath(filePath);
      let text =
        theme.fg("toolTitle", theme.bold("semantic_read ")) +
        theme.fg("accent", preview);
      if (a.query) {
        const queryPreview =
          a.query.length > 30 ? `${a.query.slice(0, 30)}...` : a.query;
        text += theme.fg("dim", ` [${queryPreview}]`);
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded }, theme) {
      const details = result.details as SemanticReadDetails | undefined;
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
          theme.fg("toolTitle", theme.bold("semantic_read"));
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

        // Session path
        if (details?.filePath) {
          container.addChild(new Spacer(1));
          container.addChild(
            new Text(
              theme.fg("muted", "Session: ") +
                theme.fg("dim", shortenPath(details.filePath)),
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
          for (const tc of toolCalls.slice(0, 10)) {
            container.addChild(
              new Text(
                theme.fg("muted", "→ ") +
                  formatToolCall(tc.name, tc.args, theme.fg.bind(theme)),
                0,
                0
              )
            );
          }
          if (toolCalls.length > 10) {
            container.addChild(
              new Text(
                theme.fg("dim", `... +${toolCalls.length - 10} more`),
                0,
                0
              )
            );
          }
        }

        // Result
        container.addChild(new Spacer(1));
        container.addChild(
          new Text(theme.fg("muted", "─── Extracted Context ───"), 0, 0)
        );
        container.addChild(new Markdown(resultText.trim(), 0, 0, mdTheme));

        return container;
      }

      // Collapsed view
      let text =
        theme.fg("success", "✓ ") +
        theme.fg("toolTitle", theme.bold("semantic_read"));
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
