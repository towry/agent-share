/**
 * Chrome Console Subagent Extension
 * Minimal extension for console tools - loaded only by subagent
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

let mcpClient: Client | null = null;
let isConnecting = false;
const BROWSER_URL = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9222";

async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;
  if (isConnecting) {
    while (isConnecting) await new Promise((r) => setTimeout(r, 100));
    if (mcpClient) return mcpClient;
  }
  isConnecting = true;
  try {
    const client = new Client({ name: "pi-chrome-console", version: "0.1.0" });
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["chrome-devtools-mcp@latest", `--browser-url=${BROWSER_URL}`],
      stderr: "ignore",
    });
    await client.connect(transport);
    mcpClient = client;
    return client;
  } finally {
    isConnecting = false;
  }
}

export default function (pi: ExtensionAPI) {
  // List console messages
  pi.registerTool({
    name: "chrome_console_list_subagent",
    label: "Chrome Console List (Subagent)",
    description: "List console messages from the page",
    parameters: Type.Object({
      types: Type.Optional(Type.Array(Type.String())),
      pageIdx: Type.Optional(Type.Number()),
      pageSize: Type.Optional(Type.Number()),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        onUpdate?.({
          content: [{ type: "text", text: "Connecting to Chrome DevTools..." }],
          details: undefined,
        });
        const client = await getMcpClient();

        onUpdate?.({
          content: [{ type: "text", text: "Fetching console messages..." }],
          details: undefined,
        });
        const result = await client.request(
          { method: "tools/call", params: { name: "list_console_messages", arguments: params } },
          CallToolResultSchema,
        );

        const typed = result as { content?: Array<{ type: string; text?: string }> };
        const text =
          typed.content?.find((c) => c.type === "text")?.text || JSON.stringify(result, null, 2);

        return {
          content: [{ type: "text", text }],
          details: { tool: "list_console_messages" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: `Error: ${msg}` }], details: { error: msg } };
      }
    },
  });

  // Get single console message
  pi.registerTool({
    name: "chrome_console_get_subagent",
    label: "Chrome Console Get (Subagent)",
    description: "Get a specific console message by ID",
    parameters: Type.Object({
      msgid: Type.Number({ description: "Message ID" }),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        onUpdate?.({
          content: [{ type: "text", text: "Connecting to Chrome DevTools..." }],
          details: undefined,
        });
        const client = await getMcpClient();

        onUpdate?.({
          content: [{ type: "text", text: "Fetching console message..." }],
          details: undefined,
        });
        const result = await client.request(
          { method: "tools/call", params: { name: "get_console_message", arguments: params } },
          CallToolResultSchema,
        );

        const typed = result as { content?: Array<{ type: string; text?: string }> };
        const text =
          typed.content?.find((c) => c.type === "text")?.text || JSON.stringify(result, null, 2);

        return {
          content: [{ type: "text", text }],
          details: { tool: "get_console_message" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: `Error: ${msg}` }], details: { error: msg } };
      }
    },
  });
}
