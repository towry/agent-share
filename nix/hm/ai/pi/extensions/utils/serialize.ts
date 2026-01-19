/**
 * Compact conversation serialization - truncates tool results and user messages.
 */
import type { Message } from "@mariozechner/pi-ai";

const MAX_TOOL_RESULT_LEN = 200;
const MAX_TOOL_ARG_LEN = 100;
const MAX_USER_MSG_LEN = 2000;

export function serializeConversationCompact(messages: Message[]): string {
  const parts: string[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      const content =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .filter((c): c is { type: "text"; text: string } => c.type === "text")
              .map((c) => c.text)
              .join("");
      if (content) {
        const truncated =
          content.length > MAX_USER_MSG_LEN
            ? `${content.slice(0, MAX_USER_MSG_LEN)}... [truncated]`
            : content;
        parts.push(`[User]: ${truncated}`);
      }
    } else if (msg.role === "assistant") {
      const textParts: string[] = [];
      const thinkingParts: string[] = [];
      const toolCalls: string[] = [];

      for (const block of msg.content) {
        if (block.type === "text") {
          textParts.push(block.text);
        } else if (block.type === "thinking") {
          thinkingParts.push((block as { thinking: string }).thinking);
        } else if (block.type === "toolCall") {
          const args = block.arguments as Record<string, unknown>;
          const argsStr = Object.entries(args)
            .map(([k, v]) => {
              const str = JSON.stringify(v);
              return str.length > MAX_TOOL_ARG_LEN
                ? `${k}=${str.slice(0, MAX_TOOL_ARG_LEN)}...[truncated]`
                : `${k}=${str}`;
            })
            .join(", ");
          toolCalls.push(`${block.name}(${argsStr})`);
        }
      }

      if (thinkingParts.length > 0) {
        parts.push(`[Assistant thinking]: ${thinkingParts.join("\n")}`);
      }
      if (textParts.length > 0) {
        parts.push(`[Assistant]: ${textParts.join("\n")}`);
      }
      if (toolCalls.length > 0) {
        parts.push(`[Assistant tool calls]: ${toolCalls.join("; ")}`);
      }
    } else if (msg.role === "toolResult") {
      const content = msg.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("");
      if (content) {
        const truncated =
          content.length > MAX_TOOL_RESULT_LEN
            ? `${content.slice(0, MAX_TOOL_RESULT_LEN)}... [truncated]`
            : content;
        parts.push(`[Tool result]: ${truncated}`);
      }
    }
  }

  return parts.join("\n\n");
}
