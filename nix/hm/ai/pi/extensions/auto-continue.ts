/**
 * Auto-Continue Extension
 *
 * Detects when model stops prematurely and auto-sends a continue message.
 *
 * Handles two cases:
 * 1. Empty response (content: [], totalTokens: 0) - API-level failures that return 200
 * 2. Thinking contains unexecuted tool calls - model stops mid-thinking with tool_call
 *    tags that were never executed
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { AssistantMessage } from "@mariozechner/pi-ai";

// Pattern to detect tool calls in thinking content (case-insensitive, word boundary)
const TOOL_CALL_PATTERN = /<tool_call\b|<function_calls\b/i;

// Cooldown to prevent rapid retries (ms)
const COOLDOWN_MS = 3000;

// Maximum consecutive continues before giving up
const MAX_CONTINUES = 3;

// Status key for footer display
const STATUS_KEY = "auto-continue";

export default function autoContinueExtension(pi: ExtensionAPI) {
  let lastContinueTime = 0;
  let continueCount = 0;

  // Reset all state when a new session starts
  const resetState = () => {
    lastContinueTime = 0;
    continueCount = 0;
  };

  // Reset counter on successful response
  const resetOnSuccess = () => {
    if (continueCount > 0) {
      continueCount = 0;
    }
  };

  // Reset on session lifecycle events
  pi.on("session_start", () => {
    resetState();
  });
  pi.on("session_switch", () => {
    resetState();
  });
  pi.on("session_fork", () => {
    resetState();
  });
  pi.on("session_tree", () => {
    resetState();
  });

  pi.on("agent_end", async (event, ctx) => {
    // Get the last assistant message
    const messages = event.messages;
    let lastAssistant: AssistantMessage | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg && msg.role === "assistant") {
        lastAssistant = msg;
        break;
      }
    }
    if (!lastAssistant) return;

    // Skip if stopReason indicates intentional stop
    // - toolUse: mid-execution, waiting for tool results
    // - aborted: user cancelled the operation
    // Normalize to handle provider variants (toolUse, tool_use, etc.)
    const stopReason = (lastAssistant.stopReason ?? "").toString().toLowerCase().replace(/_/g, "");
    if (stopReason === "tooluse" || stopReason === "aborted") {
      // Reset counter on intentional stops - model is working correctly
      resetOnSuccess();
      return;
    }

    // Helper to check cooldown and send continue message
    const tryContinue = (reason: string): boolean => {
      // Check max retries
      if (continueCount >= MAX_CONTINUES) {
        ctx.ui.notify(
          `Auto-continue stopped after ${MAX_CONTINUES} attempts. Check provider/model.`,
          "error",
        );
        ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("error", `⚠ ${reason} (max retries)`));
        return false;
      }

      // Check cooldown
      const now = Date.now();
      if (now - lastContinueTime < COOLDOWN_MS) {
        // Don't spam notifications, just update status
        ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("dim", "↻ cooldown..."));
        return false;
      }

      // Increment counter and send continue
      continueCount++;
      lastContinueTime = now;

      // Show status in footer
      ctx.ui.setStatus(
        STATUS_KEY,
        ctx.ui.theme.fg("warning", `↻ ${reason} (${continueCount}/${MAX_CONTINUES})`),
      );
      ctx.ui.notify(`${reason}, auto-continuing (${continueCount}/${MAX_CONTINUES})...`, "info");

      pi.sendUserMessage("Continue");
      return true;
    };

    const content = lastAssistant.content ?? [];

    // Case 1: Empty response (API-level failure that returned 200)
    const hasToolCall = content.some((c) => c.type === "toolCall");
    const hasMeaningfulText = content.some(
      (c) => c.type === "text" && (c.text?.trim?.() ?? "").length > 0,
    );

    if (content.length === 0 || (!hasToolCall && !hasMeaningfulText)) {
      tryContinue("Empty response");
      return;
    }

    // Case 2: Thinking contains unexecuted tool calls (scan all thinking blocks)
    const hasToolCallInThinking = content
      .filter((c) => c.type === "thinking")
      .some((c) => TOOL_CALL_PATTERN.test(c.thinking ?? ""));

    if (hasToolCallInThinking) {
      tryContinue("Incomplete response");
      return;
    }

    // Normal completion - reset counter and clear status
    resetOnSuccess();
    ctx.ui.setStatus(STATUS_KEY, undefined);
  });
}
