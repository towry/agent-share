/**
 * Shared utilities for spawning pi agents in JSON mode
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Message } from "@mariozechner/pi-ai";
import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { matchesKey, Key, truncateToWidth } from "@mariozechner/pi-tui";

export interface AgentUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  totalTokens: number;
  turns: number;
}

export interface RunAgentResult {
  exitCode: number;
  messages: Message[];
  stderr: string;
  model?: string;
  stopReason?: string;
  errorMessage?: string;
  usage: AgentUsage;
  durationMs: number;
}

export interface ResolvedModel {
  provider?: string;
  model?: string;
}

/**
 * Resolve model string to provider and model (pure function).
 * - "provider:model" → { provider, model }
 * - "model" → { provider: defaultProvider, model }
 * - undefined → { provider: defaultProvider, model: undefined }
 */
export function resolveModel(
  modelStr: string | undefined,
  defaultProvider?: string,
): ResolvedModel {
  if (!modelStr) {
    return { provider: defaultProvider || undefined, model: undefined };
  }
  if (modelStr.includes(":")) {
    const [p, m] = modelStr.split(":", 2);
    return { provider: p || undefined, model: m || undefined };
  }
  return { provider: defaultProvider || undefined, model: modelStr };
}

export interface RunAgentOptions {
  cwd: string;
  prompt: string;
  systemPrompt?: string;
  /** Use --system-prompt instead of --append-system-prompt (replaces default prompt) */
  replaceSystemPrompt?: boolean;
  provider?: string;
  model?: string;
  tools?: string | string[];
  extraArgs?: string[];
  timeoutMs?: number;
  signal?: AbortSignal;
  onUpdate?: (result: RunAgentResult) => void;
}

interface TempFile {
  dir: string;
  filePath: string;
  cleanup: () => void;
}

export function writeSystemPromptTempFile(prefix: string, content: string): TempFile {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `pi-${prefix}-`));
  const filePath = path.join(tmpDir, "prompt.md");
  fs.writeFileSync(filePath, content, { encoding: "utf-8", mode: 0o600 });

  return {
    dir: tmpDir,
    filePath,
    cleanup: () => {
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
      try {
        fs.rmdirSync(tmpDir);
      } catch {
        /* ignore */
      }
    },
  };
}

export async function runPiJsonAgent(options: RunAgentOptions): Promise<RunAgentResult> {
  // Prevent nested pi agent spawning
  if (process.env.PI_SUBAGENT) {
    return {
      exitCode: 1,
      messages: [],
      stderr: "",
      stopReason: "error",
      errorMessage: "Cannot spawn pi agent from within a subagent",
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        cost: 0,
        totalTokens: 0,
        turns: 0,
      },
      durationMs: 0,
    };
  }

  const args = ["--mode", "json", "-p", "--no-session"];

  if (options.provider) args.push("--provider", options.provider);
  if (options.model) args.push("--model", options.model);
  if (options.tools) {
    const toolsStr = Array.isArray(options.tools) ? options.tools.join(",") : options.tools;
    args.push("--tools", toolsStr);
  }
  if (options.extraArgs) args.push(...options.extraArgs);

  let tempFile: TempFile | null = null;
  const startTime = Date.now();

  const result: RunAgentResult = {
    exitCode: 0,
    messages: [],
    stderr: "",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, totalTokens: 0, turns: 0 },
    durationMs: 0,
  };

  // Setup timeout if requested
  let timeoutId: NodeJS.Timeout | null = null;
  let timeoutController: AbortController | null = null;
  let combinedSignal = options.signal;

  if (options.timeoutMs) {
    timeoutController = new AbortController();
    timeoutId = setTimeout(() => timeoutController!.abort(), options.timeoutMs);

    // Combine user signal + timeout signal
    if (options.signal) {
      const combined = new AbortController();
      const abortBoth = () => combined.abort();
      options.signal.addEventListener("abort", abortBoth, { once: true });
      timeoutController.signal.addEventListener("abort", abortBoth, { once: true });
      combinedSignal = combined.signal;
    } else {
      combinedSignal = timeoutController.signal;
    }
  }

  try {
    if (options.systemPrompt?.trim()) {
      tempFile = writeSystemPromptTempFile("agent", options.systemPrompt);
      const flag = options.replaceSystemPrompt ? "--system-prompt" : "--append-system-prompt";
      args.push(flag, tempFile.filePath);
    }

    args.push(options.prompt);

    let wasAborted = false;
    let wasTimeout = false;

    const exitCode = await new Promise<number>((resolve) => {
      const proc = spawn("pi", args, {
        cwd: options.cwd,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, PI_SUBAGENT: "1" },
      });
      let buffer = "";

      const processLine = (line: string) => {
        if (!line.trim()) return;
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }

        // Stream partial text updates
        if (event.type === "message_update" && event.message && options.onUpdate) {
          const msg = event.message as Message;
          if (msg.role === "assistant") {
            if (!result.model && msg.model) result.model = msg.model;
            // Temporarily update last message for streaming display
            const streamResult = { ...result, messages: [...result.messages, msg] };
            streamResult.durationMs = Date.now() - startTime;
            options.onUpdate(streamResult);
          }
        }

        if (event.type === "message_end" && event.message) {
          const msg = event.message as Message;
          result.messages.push(msg);

          if (msg.role === "assistant") {
            result.usage.turns++;
            const usage = msg.usage;
            if (usage) {
              result.usage.input += usage.input || 0;
              result.usage.output += usage.output || 0;
              result.usage.cacheRead += usage.cacheRead || 0;
              result.usage.cacheWrite += usage.cacheWrite || 0;
              result.usage.cost += usage.cost?.total || 0;
              result.usage.totalTokens = usage.totalTokens || 0;
            }
            if (!result.model && msg.model) result.model = msg.model;
            if (msg.stopReason) result.stopReason = msg.stopReason;
            if (msg.errorMessage) result.errorMessage = msg.errorMessage;
          }

          if (options.onUpdate) {
            result.durationMs = Date.now() - startTime;
            options.onUpdate({ ...result });
          }
        }

        if (event.type === "tool_result_end" && event.message) {
          result.messages.push(event.message as Message);
          if (options.onUpdate) {
            result.durationMs = Date.now() - startTime;
            options.onUpdate({ ...result });
          }
        }
      };

      proc.stdout.on("data", (data) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) processLine(line);
      });

      proc.stderr.on("data", (data) => {
        result.stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (buffer.trim()) processLine(buffer);
        resolve(code ?? 0);
      });

      proc.on("error", (err) => {
        result.errorMessage = err.message;
        result.stopReason = "error";
        resolve(1);
      });

      if (combinedSignal) {
        const killProc = () => {
          wasAborted = true;
          if (timeoutController?.signal.aborted) wasTimeout = true;
          proc.kill("SIGTERM");
          setTimeout(() => {
            if (!proc.killed) proc.kill("SIGKILL");
          }, 3000);
        };
        if (combinedSignal.aborted) killProc();
        else combinedSignal.addEventListener("abort", killProc, { once: true });
      }
    });

    result.exitCode = exitCode;
    result.durationMs = Date.now() - startTime;
    if (wasAborted) {
      result.stopReason = wasTimeout ? "timeout" : "aborted";
    }

    return result;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (tempFile) tempFile.cleanup();
  }
}

export function getFinalAssistantText(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (
          typeof part === "object" &&
          part !== null &&
          "type" in part &&
          part.type === "text" &&
          "text" in part &&
          part.text
        ) {
          return part.text as string;
        }
      }
    }
  }
  return "";
}

export function getToolCalls(
  messages: Message[],
): Array<{ name: string; args: Record<string, unknown> }> {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  for (const msg of messages) {
    if (msg?.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (
          typeof part === "object" &&
          part !== null &&
          "type" in part &&
          part.type === "toolCall" &&
          "name" in part &&
          "arguments" in part
        ) {
          calls.push({
            name: part.name as string,
            args: (part.arguments as Record<string, unknown>) || {},
          });
        }
      }
    }
  }
  return calls;
}

// ─── Streaming UI for Commands ───

function shortenPath(p: string): string {
  const home = os.homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

export function formatToolCallLine(call: { name: string; args: Record<string, unknown> }): string {
  if (call.name === "bash") {
    const cmd = (call.args.command as string) || "...";
    return `$ ${cmd.length > 60 ? cmd.slice(0, 60) + "..." : cmd}`;
  }
  if (call.name === "read") {
    const p = shortenPath((call.args.path || call.args.file_path || "...") as string);
    return `read ${p}`;
  }
  const argsStr = JSON.stringify(call.args);
  return `${call.name} ${argsStr.length > 40 ? argsStr.slice(0, 40) + "..." : argsStr}`;
}

export interface RunAgentWithUIOptions extends Omit<RunAgentOptions, "signal" | "onUpdate"> {
  /** Title shown in header */
  title: string;
}

/**
 * Run a pi agent with streaming UI in a command context.
 * Shows progress, tool calls, and supports esc to cancel.
 */
export async function runPiJsonAgentWithUI(
  ctx: ExtensionCommandContext,
  options: RunAgentWithUIOptions,
): Promise<RunAgentResult> {
  const abortController = new AbortController();
  let currentResult: RunAgentResult = {
    exitCode: 0,
    messages: [],
    stderr: "",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, totalTokens: 0, turns: 0 },
    durationMs: 0,
  };

  const result = await ctx.ui.custom<RunAgentResult>((tui, theme, _kb, done) => {
    let toolCallLines: string[] = [];
    let statusText = "(starting...)";
    let headerMeta = ""; // model, turns, duration - raw values, themed in render

    const updateDisplay = () => {
      tui.requestRender();
    };

    const buildHeaderMeta = () => {
      const parts: string[] = [];
      if (currentResult.model) parts.push(`(${currentResult.model})`);
      if (currentResult.usage.turns > 0) parts.push(`${currentResult.usage.turns}t`);
      if (currentResult.durationMs > 0)
        parts.push(`${(currentResult.durationMs / 1000).toFixed(1)}s`);
      return parts.join(" ");
    };

    // Start the agent
    runPiJsonAgent({
      ...options,
      signal: abortController.signal,
      onUpdate: (partial) => {
        currentResult = partial;
        headerMeta = buildHeaderMeta();
        toolCallLines = getToolCalls(partial.messages).slice(-8).map(formatToolCallLine);
        statusText =
          getFinalAssistantText(partial.messages).split("\n").slice(0, 3).join("\n") ||
          "(working...)";
        updateDisplay();
      },
    })
      .then((final) => {
        currentResult = final;
        done(final);
      })
      .catch((err) => {
        currentResult.exitCode = 1;
        currentResult.stopReason = "error";
        currentResult.errorMessage = err instanceof Error ? err.message : String(err);
        done(currentResult);
      });

    return {
      render(width: number): string[] {
        const lines: string[] = [];
        // Top border
        lines.push(...new DynamicBorder((s: string) => theme.fg("border", s)).render(width));
        // Header
        let header = theme.fg("accent", theme.bold(options.title));
        if (headerMeta) header += " " + theme.fg("dim", headerMeta);
        lines.push(truncateToWidth(header, width));
        lines.push("");
        // Tool calls
        if (toolCallLines.length > 0) {
          for (const line of toolCallLines) {
            lines.push(truncateToWidth(theme.fg("muted", "→ ") + theme.fg("dim", line), width));
          }
          lines.push("");
        }
        // Status
        for (const line of statusText.split("\n").slice(0, 5)) {
          lines.push(truncateToWidth(theme.fg("toolOutput", line), width));
        }
        lines.push("");
        // Help
        lines.push(theme.fg("dim", "esc cancel"));
        // Bottom border
        lines.push(...new DynamicBorder((s: string) => theme.fg("border", s)).render(width));
        return lines;
      },
      invalidate() {},
      handleInput(data: string) {
        if (matchesKey(data, Key.escape)) {
          abortController.abort();
        }
      },
    };
  });

  return result;
}
