/**
 * Model Preset Extension
 *
 * Adds quick model presets for "smart" and "rush" modes, plus tmux master agent mode.
 * - CLI flags: --smart / --rush / --tmux
 * - Env overrides: PI_SMART_MODEL / PI_RUSH_MODEL
 * - Keybind: Ctrl+S cycles modes
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { Key } from "@mariozechner/pi-tui";
import { EXTENSION_MODEL_DEFAULTS } from "../agents/extension-models.js";

type Mode = "smart" | "rush";

const TMUX_MASTER_SYSTEM_PROMPT = `
<tmux-master-agent-mode>
## Tmux Master Agent Mode

Role and responsible: You are operating as a **master agent** that delegates tasks to tmux subagents. Your role is to orchestrate work, not execute it directly.

### When to use tmux agent to delegate work

- Large refactors that can be broken into smaller tasks
- Multi-step processes (e.g., testing, building, deploying)
- Tasks that can be parallelized safely
- Repetitive tasks that can be automated
- You have an implement plan

### When NOT to use tmux agent

- Simple tasks that can be done in one tool call or one command.
- Other light tools or scripts are better suited, like using explore tool to exploring codebase.

### Workflow

1. **Task Analysis**: Break down complex tasks into atomic, independent subtasks (< 30 min each).

2. **Spawn Subagents**: Use \`tmux_spawn_pi\` to delegate each subtask:
   - Provide complete context (files, patterns, examples) - subagents have NO prior context
   - Set \`canNotifyMaster: true\` so subagents notify you when done
   - One task per subagent - do NOT reuse panes

3. **Master Wait for Completion**: After spawning, WAIT for subagent notification via \`tmux_send\`.
   - Do NOT proceed until notified
   - Do NOT poll or check status repeatedly
   - Do NOT call tmux_capture to check subagent state

4. **On Subagent Completion**:
   - Read the summary file (path provided in spawn result)
   - **Kill the pane immediately** using \`tmux_kill_pane\` - do NOT leave panes running
   - Review the work by yourself and decide next steps

5. **Coordination**:
   - Use \`tmux_list_panes\` to see active subagents (spawned panes have "pi:" prefix in title)
   - Only manage panes with "pi:" title prefix - never kill other panes
   - If a subagent is stuck, kill it and respawn with clearer instructions
   - Do not call 'tmux_capture' to check subagent status

### Rules

- **Atomic tasks only**: Each subtask must be completable in one session
- **No polling to check task state**: Subagent will notify master when its done, no provocaly checking in any ways.
- **Complete context**: Subagents are stateless - include everything they need
- **Clean up**: Always kill panes after subagents finish
- **Sequential when dependent**: Wait for dependent tasks to complete before spawning next
- **Parallel when independent**: Spawn multiple subagents for independent tasks, do not kill unfinished subagent.
</tmux-master-agent-mode>
`;

const DEFAULT_SMART_PROVIDER =
  EXTENSION_MODEL_DEFAULTS.MODEL_PRESET.SMART.provider;
const DEFAULT_SMART_MODEL = EXTENSION_MODEL_DEFAULTS.MODEL_PRESET.SMART.model;
const DEFAULT_RUSH_PROVIDER =
  EXTENSION_MODEL_DEFAULTS.MODEL_PRESET.RUSH.provider;
const DEFAULT_RUSH_MODEL = EXTENSION_MODEL_DEFAULTS.MODEL_PRESET.RUSH.model;

interface ModeModel {
  provider: string;
  model: string;
}

function parseModelEnv(
  envValue: string | undefined,
  fallback: ModeModel,
): ModeModel {
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
      ctx.ui.setStatus(
        "model-preset",
        ctx.ui.theme.fg("accent", parts.join(" ")),
      );
    } else {
      ctx.ui.setStatus("model-preset", undefined);
    }
  }

  async function applyMode(mode: Mode, ctx: ExtensionContext): Promise<void> {
    const resolved = resolveModeModel(mode);
    const model = ctx.modelRegistry.find(resolved.provider, resolved.model);

    if (!model) {
      ctx.ui.notify(
        `Model not found: ${resolved.provider}/${resolved.model}`,
        "warning",
      );
      return;
    }

    const ok = await pi.setModel(model);
    if (!ok) {
      ctx.ui.notify(
        `No API key for ${resolved.provider}/${resolved.model}`,
        "warning",
      );
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
