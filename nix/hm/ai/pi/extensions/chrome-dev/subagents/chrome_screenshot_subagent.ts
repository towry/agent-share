/**
 * Chrome Screenshot Subagent Extension
 * Minimal extension for screenshot tool - loaded only by subagent
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
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
		const client = new Client({ name: "pi-chrome-screenshot", version: "0.1.0" });
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
		name: "chrome_screenshot_subagent",
		label: "Chrome Screenshot (Subagent)",
		description: "Take a screenshot of the page or element",
		parameters: Type.Object({
			uid: Type.Optional(Type.String({ description: "Element uid from snapshot to screenshot" })),
			fullPage: Type.Optional(Type.Boolean({ description: "Take full page screenshot", default: false })),
			format: Type.Optional(StringEnum(["png", "jpeg", "webp"] as const, { default: "png" })),
			quality: Type.Optional(Type.Number({ description: "Compression quality 0-100 for jpeg/webp" })),
			filePath: Type.Optional(Type.String({ description: "Save to file instead of returning base64" })),
		}),

		async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
			try {
				onUpdate?.({ content: [{ type: "text", text: "Connecting to Chrome DevTools..." }], details: undefined });
				const client = await getMcpClient();

				onUpdate?.({ content: [{ type: "text", text: "Taking screenshot..." }], details: undefined });
				const result = await client.request(
					{ method: "tools/call", params: { name: "take_screenshot", arguments: params } },
					CallToolResultSchema
				);

				const typed = result as { content?: Array<{ type: string; text?: string }> };
				const text = typed.content?.find((c) => c.type === "text")?.text || JSON.stringify(result, null, 2);

				return {
					content: [{ type: "text", text }],
					details: { tool: "take_screenshot" },
				};
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				return { content: [{ type: "text", text: `Error: ${msg}` }], details: { error: msg } };
			}
		},
	});
}
