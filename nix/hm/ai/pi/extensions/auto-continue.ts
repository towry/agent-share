/**
 * Auto-Continue Extension
 *
 * Detects when model stops prematurely (stopReason: "stop" but thinking
 * contains unexecuted tool calls) and auto-sends a continue message.
 *
 * This handles a model behavior issue where some models stop mid-thinking
 * with tool_call tags in the thinking block that were never executed.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { AssistantMessage, ThinkingContent } from "@mariozechner/pi-ai";

// Pattern to detect tool calls in thinking content
const TOOL_CALL_PATTERN = /<tool_call>|<function_calls>/;

// Cooldown to prevent infinite loops (ms)
const COOLDOWN_MS = 3000;

export default function autoContinueExtension(pi: ExtensionAPI) {
  let lastContinueTime = 0;

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

    // Only check if stopReason is "stop" (not toolUse, error, etc.)
    if (lastAssistant.stopReason !== "stop") return;

    // Check if thinking content contains unexecuted tool calls
    let thinkingBlock: ThinkingContent | undefined;
    for (const c of lastAssistant.content) {
      if (c.type === "thinking") {
        thinkingBlock = c;
        break;
      }
    }
    if (!thinkingBlock) return;

    const hasToolCallInThinking = TOOL_CALL_PATTERN.test(thinkingBlock.thinking);
    if (!hasToolCallInThinking) return;

    // Check cooldown to prevent infinite loops
    const now = Date.now();
    if (now - lastContinueTime < COOLDOWN_MS) {
      ctx.ui.notify("Auto-continue skipped (cooldown)", "warning");
      return;
    }

    // Detected incomplete response - send continue message
    lastContinueTime = now;
    ctx.ui.notify("Detected incomplete response, auto-continuing...", "info");

    // Use followUp delivery to queue after current processing
    pi.sendUserMessage("Continue if not finished", { deliverAs: "followUp" });
  });
}
