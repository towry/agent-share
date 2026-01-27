/**
 * Chrome Snapshot Subagent Extension
 * Minimal extension for snapshot tool - loaded only by subagent
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
    const client = new Client({ name: "pi-chrome-snapshot", version: "0.1.0" });
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
  pi.registerTool({
    name: "chrome_snapshot_subagent",
    label: "Chrome Snapshot (Subagent)",
    description: "Take accessibility tree snapshot of current page",
    parameters: Type.Object({
      verbose: Type.Optional(Type.Boolean({ description: "Include more details", default: false })),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        onUpdate?.({
          content: [{ type: "text", text: "Connecting to Chrome DevTools..." }],
          details: undefined,
        });
        const client = await getMcpClient();

        onUpdate?.({ content: [{ type: "text", text: "Taking snapshot..." }], details: undefined });
        const result = await client.request(
          { method: "tools/call", params: { name: "take_snapshot", arguments: params } },
          CallToolResultSchema,
        );

        const typed = result as { content?: Array<{ type: string; text?: string }> };
        const text =
          typed.content?.find((c) => c.type === "text")?.text || JSON.stringify(result, null, 2);

        return {
          content: [{ type: "text", text }],
          details: { tool: "take_snapshot" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: `Error: ${msg}` }], details: { error: msg } };
      }
    },
  });
}
