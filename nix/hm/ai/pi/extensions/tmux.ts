import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Type } from "@sinclair/typebox";
import type {
  ExtensionAPI,
  AgentToolResult,
} from "@mariozechner/pi-coding-agent";

const TMUX_CLI_BIN = path.join(
  os.homedir(),
  ".dotfiles/conf/tmux/bin/tmux-cli-controller.py"
);

function result(text: string, isError = false): AgentToolResult<unknown> {
  return { content: [{ type: "text", text }], details: { isError } };
}

function sanitizeTaskToFilename(task: string): string {
  const trimmed = task.trim().slice(0, 80) || "task";
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "task";
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
}

function safeWriteFile(filePath: string, content: string) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, { encoding: "utf-8", mode: 0o644 });
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `"'"'"'`)}'`;
}

function tmuxPaneTitleFromTask(task: string, taskSlug: string): string {
  const trimmed = task.trim().replace(/\s+/g, " ");
  const base = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
  const safe = base.replace(/[^a-zA-Z0-9 _\-.:/]/g, "");
  return safe ? `pi:${safe}` : `pi:${taskSlug}`;
}

async function runTmuxCliAsync(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn("python3", [TMUX_CLI_BIN, ...args], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  let stdout = "";
  let stderr = "";

  return new Promise((resolve) => {
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) =>
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 0,
      })
    );
    proc.on("error", (err) =>
      resolve({ stdout: stdout.trim(), stderr: String(err), exitCode: 1 })
    );
  });
}

async function getCurrentPaneInfo(): Promise<{ id: string; title: string }> {
  const proc = spawn(
    "tmux",
    ["display-message", "-p", "#{pane_id}|#{pane_title}"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    }
  );

  let stdout = "";
  return new Promise((resolve) => {
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.on("close", () => {
      const [id = "", title = ""] = stdout.trim().split("|");
      resolve({ id, title });
    });
    proc.on("error", () => resolve({ id: "", title: "" }));
  });
}

function parseLaunchPaneIds(stdout: string): {
  paneId?: string;
  paneFormattedId?: string;
} {
  const rawIdMatch = stdout.match(/in pane\s+(%\d+)/);
  const paneId = rawIdMatch?.[1];
  const formattedPaneMatch = stdout.match(/in pane\s+([^\s]+)$/);
  const paneFormattedId = formattedPaneMatch?.[1];
  return { paneId, paneFormattedId };
}

export default function (pi: ExtensionAPI) {
  // Tool 1: List panes
  pi.registerTool({
    name: "tmux_list_panes",
    label: "Tmux List Panes",
    description: "List all tmux panes",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _onUpdate, ctx, _signal) {
      const res = await runTmuxCliAsync(["list_panes"], ctx.cwd);
      if (res.exitCode !== 0) {
        return result(res.stderr || "failed", true);
      }
      // Filter out current pane
      const currentPane = process.env.TMUX_PANE;
      if (currentPane) {
        try {
          const panes = JSON.parse(res.stdout || "[]");
          const filtered = panes.filter((p: any) => p.id !== currentPane);
          return result(JSON.stringify(filtered, null, 2));
        } catch {
          return result(res.stdout || "[]");
        }
      }
      return result(res.stdout || "[]");
    },
  });

  // Tool 2: Send keys to pane
  pi.registerTool({
    name: "tmux_send",
    label: "Tmux Send",
    description:
      "Send keys to a tmux pane. If PI_MASTER_PANE env is set and pane is omitted, sends to master.",
    parameters: Type.Object({
      pane: Type.Optional(
        Type.String({
          description: "Target pane id. Defaults to PI_MASTER_PANE if set.",
        })
      ),
      keys: Type.String({ description: "Keys to send" }),
      enter: Type.Optional(
        Type.Boolean({ description: "Send Enter after", default: true })
      ),
    }),
    async execute(_toolCallId, params, _onUpdate, ctx, _signal) {
      const p = params as { pane?: string; keys: string; enter?: boolean };
      const targetPane = p.pane || process.env.PI_MASTER_PANE;
      if (!targetPane) {
        return result("pane is required (no PI_MASTER_PANE set)", true);
      }
      const currentPane = process.env.TMUX_PANE;
      if (currentPane && targetPane === currentPane) {
        return result("cannot send keys to current pane", true);
      }

      const paneInfo = await getCurrentPaneInfo();
      // Single-line signature to avoid shell interpreting newlines as command separators
      const signature = paneInfo.id
        ? ` [from ${paneInfo.id}${paneInfo.title ? `: ${paneInfo.title}` : ""}]`
        : "";
      const keysWithSig = p.keys + signature;

      const args = [
        "send",
        keysWithSig,
        `--pane=${targetPane}`,
        ...(p.enter === false ? ["--no-enter"] : []),
      ];
      const res = await runTmuxCliAsync(args, ctx.cwd);
      return result(
        res.exitCode === 0 ? "sent" : res.stderr || "failed",
        res.exitCode !== 0
      );
    },
  });

  // Tool 3: Kill pane
  pi.registerTool({
    name: "tmux_kill_pane",
    label: "Tmux Kill Pane",
    description: "Kill a tmux pane",
    parameters: Type.Object({
      pane: Type.String({ description: "Target pane id to kill" }),
    }),
    async execute(_toolCallId, params, _onUpdate, ctx, _signal) {
      const p = params as { pane: string };
      const currentPane = process.env.TMUX_PANE;
      if (currentPane && p.pane === currentPane) {
        return result("cannot kill current pane", true);
      }
      const res = await runTmuxCliAsync(["kill", `--pane=${p.pane}`], ctx.cwd);
      return result(
        res.exitCode === 0 ? "killed" : res.stderr || "failed",
        res.exitCode !== 0
      );
    },
  });

  // Tool 4: Capture pane content
  pi.registerTool({
    name: "tmux_capture",
    label: "Tmux Capture",
    description:
      "Capture the content of a tmux pane. Defaults to last 10 lines. Use filter for grep with context. Do not use this for polling.",
    parameters: Type.Object({
      pane: Type.String({ description: "Target pane id to capture" }),
      lines: Type.Optional(
        Type.Number({
          description: "Number of lines to capture from end (default: 10)",
        })
      ),
      filter: Type.Optional(
        Type.String({
          description:
            "Grep pattern (case-insensitive, extended regex). Use | for OR: 'error|fail|warning'",
        })
      ),
    }),
    async execute(_toolCallId, params, _onUpdate, ctx, _signal) {
      const p = params as { pane: string; lines?: number; filter?: string };
      const currentPane = process.env.TMUX_PANE;
      if (currentPane && p.pane === currentPane) {
        return result("cannot capture current pane", true);
      }
      const lines = p.lines ?? 10;
      const args = ["capture", `--pane=${p.pane}`, `--lines=${lines}`];
      const res = await runTmuxCliAsync(args, ctx.cwd);
      if (res.exitCode !== 0) {
        return result(res.stderr || "failed", true);
      }
      let output = res.stdout;
      if (p.filter?.trim()) {
        // Pipe to grep -i -E -C3 for case-insensitive, extended regex, 3 lines context
        const grepProc = spawn("grep", ["-i", "-E", "-C3", p.filter.trim()], {
          stdio: ["pipe", "pipe", "pipe"],
        });
        grepProc.stdin.write(output);
        grepProc.stdin.end();
        output = await new Promise<string>((resolve) => {
          let out = "";
          grepProc.stdout.on("data", (d) => (out += d.toString()));
          grepProc.on("close", () => resolve(out.trim()));
        });
      }
      return result(output || "(no matching content)");
    },
  });

  // Tool 5: Run command in new pane (with duplicate detection)
  pi.registerTool({
    name: "tmux_run",
    label: "Tmux Run",
    description:
      "Run a command in a new tmux pane. Checks for existing panes with same name to prevent duplicates (e.g., port conflicts).",
    parameters: Type.Object({
      command: Type.String({ description: "Command to run" }),
      name: Type.Optional(
        Type.String({
          description:
            "Unique identifier for duplicate detection. If omitted, derived from command.",
        })
      ),
      cwd: Type.Optional(
        Type.String({
          description:
            "Working directory for the command. Defaults to current project cwd.",
        })
      ),
    }),
    async execute(_toolCallId, params, _onUpdate, ctx, _signal) {
      const p = params as { command: string; name?: string; cwd?: string };
      if (!p.command?.trim()) {
        return result("command is required", true);
      }

      const workingDir = p.cwd || ctx.cwd;

      // Derive title: pi-run:<cmd> or pi-run:<cmd>:<name>
      const cmdSlug = p.command
        .trim()
        .slice(0, 40)
        .replace(/[^a-zA-Z0-9 _\-.]/g, "")
        .trim();
      const title = p.name?.trim()
        ? `pi-run:${cmdSlug}:${p.name.trim()}`
        : `pi-run:${cmdSlug}`;

      // Check for existing pane with exact same title
      const listRes = await runTmuxCliAsync(["list_panes"], workingDir);
      if (listRes.exitCode === 0) {
        try {
          const panes = JSON.parse(listRes.stdout || "[]");
          const existing = panes.find(
            (pane: { title?: string; id?: string }) => pane.title === title
          );
          if (existing) {
            return result(
              `pane "${title}" already exists: ${existing.id}. Kill it first to restart.`,
              true
            );
          }
        } catch {
          // ignore parse errors, proceed with launch
        }
      }

      const startCommand = `tmux set-option -p allow-set-title off && tmux select-pane -T ${shellQuote(
        title
      )} && ${p.command}`;
      const launchRes = await runTmuxCliAsync(
        ["launch", startCommand, "--vertical", "--size=50"],
        workingDir
      );

      if (launchRes.exitCode !== 0) {
        return result(
          launchRes.stderr || launchRes.stdout || "launch failed",
          true
        );
      }

      const { paneId, paneFormattedId } = parseLaunchPaneIds(launchRes.stdout);
      return result(
        `started in pane ${
          paneFormattedId || paneId || "(unknown)"
        }. title: ${title}`
      );
    },
  });

  // Tool 6: Spawn pi agent (disabled for subagents)
  if (!process.env.PI_MASTER_PANE) {
    pi.registerTool({
      name: "tmux_spawn_pi",
      label: "Tmux Spawn Pi",
      description:
        "Spawn a new pi agent in a tmux pane to work on a task independently. " +
        "IMPORTANT: Task must be atomic and completable in one session (< 30 min). " +
        "Good: 'Add error handling to parseConfig function in src/config.ts'. " +
        "Bad: 'Refactor the entire codebase' or 'Implement authentication system'. " +
        "Multi-turn coordination (spawn → wait → kill) is expected and allowed. " +
        "canNotifyMaster is default to true, so in the prompt to subagent you can tell subagent to notify you when its done." +
        "After spawning, put yourself on hold, do not use sleep or other methods try to get subagent state.",

      parameters: Type.Object({
        task: Type.String({
          description:
            "A small, atomic task with clear scope. Include: " +
            "(1) specific files/functions to modify, " +
            "(2) relevant code snippets or patterns to follow, " +
            "(3) doc references or API usage examples if applicable. " +
            "The spawned agent has no prior context - give it everything it needs to start immediately.",
        }),
        canNotifyMaster: Type.Optional(
          Type.Boolean({
            description:
              "Allow spawned agent to notify master via tmux_send, default to true",
            default: true,
          })
        ),
      }),
      async execute(_toolCallId, params, _onUpdate, ctx, _signal) {
        const p = params as { task: string; canNotifyMaster?: boolean };
        /// default to true
        const canNotifyMaster =
          typeof p.canNotifyMaster === "boolean" ? p.canNotifyMaster : true;
        if (!p.task?.trim()) {
          return result("task is required", true);
        }

        const taskSlug = sanitizeTaskToFilename(p.task);
        const channelDir = path.join(ctx.cwd, ".pi", "agents-channel");
        const channelFile = path.join(channelDir, `${taskSlug}.md`);
        const title = tmuxPaneTitleFromTask(p.task, taskSlug);

        const masterPane = process.env.TMUX_PANE || "";
        const notifyMasterStep =
          canNotifyMaster && masterPane
            ? `4. Notify master: use tmux_send with pane="${masterPane}" (also in env PI_MASTER_PANE). Do NOT use tmux_list_panes to find master. Run this at the very last step.`
            : "";

        const systemPrompt = `You are a background PI worker running in tmux.

FIRST STEP (required):
- Run kg_search with tag="insight" and query relevant to your task to check for prior learnings, mistakes to avoid, or patterns discovered in this repo.
- Before using explore tool, make sure you have checked for relevant insights first.
- This helps you avoid repeating past mistakes and leverage existing knowledge.

Rules:
- Use the right tool for right job, DO NOT use oracle for codebase exploration or documentation lookup.

Workflow:
- **Critical**: Review (\`review\` tool) early and often. validate code changes frequently at the start to ensure alignment and prevent regression.
- Use oracle agent via subagent tool for deep thinking on issues, design decisions.
- Use explore tool to exploring codebase for unfamiliar areas.
- Use librarian tool when you need latest and accurate library/framework docs.

FINAL STEP (required, in order):
1. Run \`review\` tool to validate all changes before finishing, only if there are code changes that you have made, pass this step if you have not made code changes.
2. Write final summary to: ${channelFile}
   - Format: Markdown
   - Include: What you did, files changed (if any), commands run (if any), and next steps.
   - Overwrite the file content.
3. Save insight: use \`kg_insight_save\` to record:
   - Task purpose and what was accomplished
   - Key learnings or patterns discovered
   - Troubles encountered and how they were resolved
   - Unresolved issues or follow-up needed
   - Any info beneficial for future agents working on related tasks
${notifyMasterStep}
`;

        safeWriteFile(
          channelFile,
          `# ${p.task.trim()}\n\nStatus: running\n\n(PI instance will overwrite this file with the final summary.)\n`
        );

        const tmpPromptPath = path.join(
          "/tmp",
          `pi-agents-channel-${process.pid}-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}.md`
        );
        fs.writeFileSync(tmpPromptPath, systemPrompt, {
          encoding: "utf-8",
          mode: 0o600,
        });

        // Write env to temp file, source it in spawned shell to inherit full environment
        // Exclude TMUX_PANE so new pane gets its own value from tmux
        const readonlyVars = new Set([
          "SHLVL",
          "PWD",
          "OLDPWD",
          "UID",
          "EUID",
          "PPID",
          "BASHPID",
          "BASH_VERSINFO",
          "RANDOM",
          "LINENO",
          "SECONDS",
          "HISTCMD",
          "OPTIND",
          "TMUX_PANE",
        ]);
        const envVars: Record<string, string> = {};
        for (const [k, v] of Object.entries(process.env)) {
          if (v === undefined) continue;
          if (k.startsWith("_") || k.includes("(") || k.includes(" ")) continue;
          if (v.includes("\n") || v.includes("\r")) continue;
          if (readonlyVars.has(k)) continue;
          envVars[k] = v;
        }
        // Pass notify env if enabled
        if (canNotifyMaster && masterPane) {
          envVars["PI_SUBAGENT_NOTIFY_ON"] = "1";
          envVars["PI_MASTER_PANE"] = masterPane;
        }
        const envContent = Object.entries(envVars)
          .map(([k, v]) => `export ${k}=${shellQuote(v)}`)
          .join("\n");
        const tmpEnvPath = path.join(
          "/tmp",
          `pi-env-${process.pid}-${Date.now()}.sh`
        );
        fs.writeFileSync(tmpEnvPath, envContent, {
          encoding: "utf-8",
          mode: 0o600,
        });

        const piCmd = `source ${shellQuote(tmpEnvPath)} && rm -f ${shellQuote(
          tmpEnvPath
        )} && pi --rush --append-system-prompt ${shellQuote(
          tmpPromptPath
        )} ${shellQuote(`Task: ${p.task.trim()}`)}`;
        const startCommand = `tmux set-option -p allow-set-title off && tmux select-pane -T ${shellQuote(
          title
        )} && ${piCmd}`;

        const launchRes = await runTmuxCliAsync(
          ["launch", startCommand, "--vertical", "--size=50"],
          ctx.cwd
        );

        const { paneId, paneFormattedId } = parseLaunchPaneIds(
          launchRes.stdout
        );

        if (launchRes.exitCode !== 0) {
          return result(
            launchRes.stderr || launchRes.stdout || "launch failed",
            true
          );
        }

        setTimeout(() => {
          try {
            fs.unlinkSync(tmpPromptPath);
          } catch {
            /* ignore */
          }
        }, 60_000);

        const waitMsg = canNotifyMaster
          ? " Do not start other work until notified, put yourself in hold, do not run any tools or commands."
          : " Wait for user instructions.";
        return result(
          `spawned pi in pane ${
            paneFormattedId || paneId || "(unknown)"
          }. title: ${title}. summary: ${channelFile}.${waitMsg}`
        );
      },
    });
  }

  // Remind spawned subagent to notify master when idle (once only)
  if (process.env.PI_SUBAGENT_NOTIFY_ON === "1") {
    let reminderSent = false;
    pi.on("agent_end", (_event, ctx) => {
      if (reminderSent || !ctx.isIdle()) return;
      reminderSent = true;
      pi.sendUserMessage(
        "Are you finished with the task? If so, please ensure the review is done (only if there are code changes), then notify master that you are done (ignore this if you already did).",
        { deliverAs: "followUp" }
      );
    });
  }
}
