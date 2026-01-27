/**
 * Auto Review Extension
 *
 * After each turn, checks for code changes and tracks the total count since the
 * last confirmed review. When the cumulative count reaches the minimum threshold,
 * it asks the user to confirm a review and resets the counter on confirmation.
 * If the user declines, reminders are snoozed for a number of turns unless new
 * changes cross the threshold.
 *
 * Config via environment:
 *   PI_AUTO_REVIEW_MIN_CHANGES=3   - Minimum code changes to trigger (default: 5)
 *   PI_AUTO_REVIEW_SNOOZE_TURNS=3  - Turns to suppress reminders after decline (default: 3)
 */

import type {
  ExtensionAPI,
  SessionEntry,
  SessionMessageEntry,
} from "@mariozechner/pi-coding-agent";

const SNOOZE_TURNS = parseInt(process.env.PI_AUTO_REVIEW_SNOOZE_TURNS ?? "3", 10);

const MIN_CODE_CHANGES = parseInt(process.env.PI_AUTO_REVIEW_MIN_CHANGES ?? "3", 10);

type SessionAgentMessage = SessionMessageEntry["message"];

interface ExtractedToolCall {
  toolName: string;
  input: Record<string, unknown>;
}

function getMessagesFromEntries(entries: SessionEntry[]): SessionAgentMessage[] {
  return entries
    .filter((e): e is SessionMessageEntry => e.type === "message")
    .map((e) => e.message);
}

function extractToolCallsFromMessages(messages: SessionAgentMessage[]): ExtractedToolCall[] {
  const toolCalls: ExtractedToolCall[] = [];

  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "toolCall"
        ) {
          const toolBlock = block as {
            type: "toolCall";
            id: string;
            name: string;
            arguments: Record<string, unknown>;
          };
          toolCalls.push({
            toolName: toolBlock.name,
            input: toolBlock.arguments,
          });
        }
      }
    }
  }

  return toolCalls;
}

function countCodeChanges(toolCalls: ExtractedToolCall[]): number {
  return toolCalls.filter((call) => call.toolName === "write" || call.toolName === "edit").length;
}

export default function (pi: ExtensionAPI) {
  let turnCount = 0;
  let lastRemindTurn = 0;
  let snoozeUntilTurn = 0;
  let lastCheckedEntryCount = 0;
  let lastRemindChangeCount = 0;
  // Accumulates code-change count since the last confirmed review.
  let pendingChangeCount = 0;

  const resetState = () => {
    turnCount = 0;
    lastRemindTurn = 0;
    snoozeUntilTurn = 0;
    lastCheckedEntryCount = 0;
    lastRemindChangeCount = 0;
    pendingChangeCount = 0;
  };

  pi.on("session_start", async () => {
    resetState();
  });

  pi.on("session_switch", async () => {
    resetState();
  });

  pi.on("turn_end", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    turnCount++;

    const entries = ctx.sessionManager.getBranch() as SessionEntry[];

    // Only check entries since last check
    const newEntries = entries.slice(lastCheckedEntryCount);
    lastCheckedEntryCount = entries.length;

    if (newEntries.length === 0) return;

    const messages = getMessagesFromEntries(newEntries);
    const toolCalls = extractToolCallsFromMessages(messages);

    const changeCount = countCodeChanges(toolCalls);
    if (changeCount > 0) {
      pendingChangeCount += changeCount;
    }

    if (pendingChangeCount < MIN_CODE_CHANGES) return;

    const newChangesSinceRemind = pendingChangeCount - lastRemindChangeCount;
    const thresholdReachedSinceRemind = newChangesSinceRemind >= MIN_CODE_CHANGES;

    const isSnoozed = lastRemindTurn > 0 && snoozeUntilTurn > 0 && turnCount <= snoozeUntilTurn;

    if (isSnoozed && !thresholdReachedSinceRemind) return;

    const choice = await ctx.ui.select(
      `${pendingChangeCount} code change(s) since last confirmed review. Run a review?`,
      ["No", "Yes (now)", "Yes (follow-up)"],
      { timeout: 10000 }, // Auto-close after 10 seconds (defaults to "No")
    );

    lastRemindTurn = turnCount;
    lastRemindChangeCount = pendingChangeCount;

    // NOTE: == null catches both null (ESC) and undefined (timeout/edge cases)
    if (choice === "No" || choice == null) {
      snoozeUntilTurn = lastRemindTurn + SNOOZE_TURNS;
      return;
    }

    pendingChangeCount = 0;
    lastRemindChangeCount = 0;
    snoozeUntilTurn = 0;

    const deliverAs = choice === "Yes (now)" ? "steer" : "followUp";

    pi.sendMessage(
      {
        customType: "auto-review-trigger",
        content: "Please use the review tool to review recent code changes.",
        display: true,
      },
      { triggerTurn: true, deliverAs },
    );
  });
}
