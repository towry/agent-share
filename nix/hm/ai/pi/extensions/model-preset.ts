/**
 * Model Preset Extension
 *
 * Adds quick model presets for "smart" and "rush" modes, plus tmux master agent mode.
 * - CLI flags: --smart / --rush / --tmux
 * - Tmux mode: instructs agent to load tmux skill for bash-based tmux operations
 * - Env overrides: PI_SMART_MODEL / PI_RUSH_MODEL
 * - Keybind: Ctrl+S cycles modes
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Key } from "@mariozechner/pi-tui";
import { EXTENSION_MODEL_DEFAULTS } from "../agents/extension-models.js";

type Mode = "smart" | "rush";

const TMUX_MASTER_SYSTEM_PROMPT = `
<tmux-master-agent-mode>
## Tmux Master Agent Mode

IMPORTANT: Load the \`tmux\` skill from ~/.agents/skills/tmux/SKILL.md FIRST. All tmux operations use bash \`tmux\` commands directly — there are NO tmux MCP tools.

Role: You are a **master agent** that delegates tasks to tmux subagents. Orchestrate work, don't execute it directly.

### Two Different Subagent Systems — do NOT confuse them

1. **\`subagent\` tool** — In-process delegation, NO tmux involved
   - NO pane is created, NO cleanup needed
   - Used by \`explore\`, \`librarian\`, etc.

2. **Tmux subagents** — Spawned via bash \`tmux split-window\` + \`pi\` command
   - Creates a new tmux pane with "pi:" prefix in title
   - Requires cleanup with \`tmux kill-pane -t %PANE_ID\` after completion

### When to spawn tmux subagents

- Large refactors broken into smaller tasks
- Parallelizable or repetitive tasks
- Multi-step processes (test, build, deploy)
- You have an implementation plan

### When NOT to spawn

- Simple tasks doable in one tool call
- \`subagent\` / \`explore\` tool suffices

### Workflow

1. **Analyze**: Break tasks into atomic subtasks (< 30 min each).
2. **Spawn**: Use tmux skill commands to split a new pane and run \`pi\` with the task.
   - Provide complete context — subagents have NO prior context.
   - One task per pane — do NOT reuse panes.
3. **Wait**: After spawning, WAIT for subagent notification via \`tmux send-keys\` to your pane.
   - Do NOT poll or capture to check state.
4. **On Completion**: Read the summary file, kill the pane, review the work.
5. **Coordination**: Use \`tmux list-panes\` to see active subagents ("pi:" prefix in title).
   - Only manage panes you spawned. Never kill other panes.

### Rules

- **NEVER kill panes after \`subagent\` or \`explore\` tool calls** — they don't create panes.
- **Atomic tasks only**: Each subtask completable in one session.
- **No polling**: Subagent notifies master when done.
- **Complete context**: Subagents are stateless.
- **Clean up**: Always kill panes after subagents finish.
- **Sequential when dependent, parallel when independent**.
</tmux-master-agent-mode>
`;

const DEFAULT_SMART_PROVIDER = EXTENSION_MODEL_DEFAULTS.MODEL_PRESET.SMART.provider;
const DEFAULT_SMART_MODEL = EXTENSION_MODEL_DEFAULTS.MODEL_PRESET.SMART.model;
const DEFAULT_RUSH_PROVIDER = EXTENSION_MODEL_DEFAULTS.MODEL_PRESET.RUSH.provider;
const DEFAULT_RUSH_MODEL = EXTENSION_MODEL_DEFAULTS.MODEL_PRESET.RUSH.model;

interface ModeModel {
  provider: string;
  model: string;
}

function parseModelEnv(envValue: string | undefined, fallback: ModeModel): ModeModel {
  const raw = envValue?.trim();
  if (!raw) return fallback;

  if (raw.includes(":")) {
    const [provider, model] = raw.split(":", 2);
    return {
      provider: provider || fallback.provider,
      model: model || fallback.model,
    };
  }

  return { provider: fallback.provider, model: raw };
}

function resolveModeModel(mode: Mode): ModeModel {
  if (mode === "smart") {
    return parseModelEnv(process.env.PI_SMART_MODEL, {
      provider: DEFAULT_SMART_PROVIDER,
      model: DEFAULT_SMART_MODEL,
    });
  }

  return parseModelEnv(process.env.PI_RUSH_MODEL, {
    provider: DEFAULT_RUSH_PROVIDER,
    model: DEFAULT_RUSH_MODEL,
  });
}

export default function modelPresetExtension(pi: ExtensionAPI) {
  let activeMode: Mode | undefined;
  let tmuxMode = false;

  pi.registerFlag("smart", {
    description: "Start in smart model preset",
    type: "boolean",
    default: false,
  });

  pi.registerFlag("rush", {
    description: "Start in rush model preset",
    type: "boolean",
    default: false,
  });

  pi.registerFlag("tmux", {
    description: "Start in tmux master agent mode",
    type: "boolean",
    default: false,
  });

  function updateStatus(ctx: ExtensionContext) {
    if (!ctx.hasUI) return;
    const parts: string[] = [];
    if (activeMode) parts.push(`mode:${activeMode}`);
    if (tmuxMode) parts.push("tmux");
    if (parts.length > 0) {
      ctx.ui.setStatus("model-preset", ctx.ui.theme.fg("accent", parts.join(" ")));
    } else {
      ctx.ui.setStatus("model-preset", undefined);
    }
  }

  async function applyMode(mode: Mode, ctx: ExtensionContext): Promise<void> {
    const resolved = resolveModeModel(mode);
    const model = ctx.modelRegistry.find(resolved.provider, resolved.model);

    if (!model) {
      ctx.ui.notify(`Model not found: ${resolved.provider}/${resolved.model}`, "warning");
      return;
    }

    const ok = await pi.setModel(model);
    if (!ok) {
      ctx.ui.notify(`No API key for ${resolved.provider}/${resolved.model}`, "warning");
      return;
    }

    activeMode = mode;
    ctx.ui.notify(`Mode set to ${mode}`, "info");
    updateStatus(ctx);
  }

  function getNextMode(): Mode {
    return activeMode === "smart" ? "rush" : "smart";
  }

  pi.registerShortcut(Key.ctrl("s"), {
    description: "Cycle model preset mode",
    handler: async (ctx) => {
      await applyMode(getNextMode(), ctx);
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    const smartFlag = pi.getFlag("smart") === true;
    const rushFlag = pi.getFlag("rush") === true;
    const tmuxFlag = pi.getFlag("tmux") === true;

    // Handle tmux mode - defaults to smart (frontier-muffin) unless rush is specified
    if (tmuxFlag) {
      tmuxMode = true;
      ctx.ui.notify("Tmux master agent mode enabled", "info");
      if (!rushFlag) {
        await applyMode("smart", ctx);
        updateStatus(ctx);
        return;
      }
    }

    if (smartFlag && rushFlag) {
      ctx.ui.notify("Both --smart and --rush set; using --rush", "warning");
      await applyMode("rush", ctx);
      return;
    }

    if (smartFlag) {
      await applyMode("smart", ctx);
      return;
    }

    if (rushFlag) {
      await applyMode("rush", ctx);
      return;
    }

    updateStatus(ctx);
  });

  // Append tmux master system prompt when tmux mode is enabled
  pi.on("before_agent_start", async (event, _ctx) => {
    if (tmuxMode) {
      return {
        systemPrompt: event.systemPrompt + "\n\n" + TMUX_MASTER_SYSTEM_PROMPT,
      };
    }
    return undefined;
  });
}
