/**
 * DeepWiki tools - call the official DeepWiki remote MCP server over HTTP.
 *
 * Server docs: https://docs.devin.ai/work-with-devin/deepwiki-mcp
 * Default endpoint: https://mcp.deepwiki.com/mcp (Streamable HTTP)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { callMcpTool, formatMcpResult, type McpClientConfig } from "../utils/mcp-client.js";

const DEFAULT_SERVER_URL = "https://mcp.deepwiki.com/mcp";

type DeepwikiToolName = "read_wiki_structure" | "read_wiki_contents" | "ask_question";

type DeepwikiDetails = {
	tool: DeepwikiToolName;
	repoName: string;
	question?: string;
	status?: string;
};

function getConfig(serverUrl: string): McpClientConfig {
	return {
		serverUrl,
		clientName: "pi-deepwiki",
		clientVersion: "0.1.0",
		getAuthHeaders: (): Record<string, string> => {
			const apiKey = process.env.DEEPWIKI_API_KEY;
			if (apiKey) return { Authorization: `Bearer ${apiKey}` };
			return {};
		},
	};
}

const RepoParams = Type.Object({
	repoName: Type.String({ description: "GitHub repo in owner/repo format" }),
	serverUrl: Type.Optional(
		Type.String({
			description: `DeepWiki MCP server URL (default: ${DEFAULT_SERVER_URL})`,
		})
	),
});

export default function (pi: ExtensionAPI) {
	const defaultServerUrl = process.env.DEEPWIKI_MCP_URL ?? DEFAULT_SERVER_URL;

	pi.registerTool({
		name: "deepwiki_read_wiki_structure",
		label: "DeepWiki Read Wiki Structure",
		description: "List documentation topics for a GitHub repo via DeepWiki MCP.",
		parameters: RepoParams,

		async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
			const serverUrl =
				typeof params.serverUrl === "string" ? params.serverUrl : defaultServerUrl;
			const details: DeepwikiDetails = {
				repoName: params.repoName,
				tool: "read_wiki_structure",
			};

			const result = await callMcpTool(
				getConfig(serverUrl),
				"read_wiki_structure",
				{ repoName: params.repoName },
				(status: string) =>
					onUpdate?.({
						content: [{ type: "text", text: status }],
						details: { ...details, status },
					})
			);

			return {
				content: [{ type: "text", text: formatMcpResult(result) }],
				details,
			};
		},
	});

	pi.registerTool({
		name: "deepwiki_read_wiki_contents",
		label: "DeepWiki Read Wiki Contents",
		description: "Read DeepWiki docs for a GitHub repo via DeepWiki MCP.",
		parameters: RepoParams,

		async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
			const serverUrl =
				typeof params.serverUrl === "string" ? params.serverUrl : defaultServerUrl;
			const details: DeepwikiDetails = {
				repoName: params.repoName,
				tool: "read_wiki_contents",
			};

			const result = await callMcpTool(
				getConfig(serverUrl),
				"read_wiki_contents",
				{ repoName: params.repoName },
				(status: string) =>
					onUpdate?.({
						content: [{ type: "text", text: status }],
						details: { ...details, status },
					})
			);

			return {
				content: [{ type: "text", text: formatMcpResult(result) }],
				details,
			};
		},
	});

	pi.registerTool({
		name: "deepwiki_ask_question",
		label: "DeepWiki Ask Question",
		description: "Ask a question about a GitHub repo via DeepWiki MCP.",
		parameters: Type.Object({
			repoName: Type.String({ description: "GitHub repo in owner/repo format" }),
			question: Type.String({ description: "Question to ask about the repository" }),
			serverUrl: Type.Optional(
				Type.String({
					description: `DeepWiki MCP server URL (default: ${DEFAULT_SERVER_URL})`,
				})
			),
		}),

		async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
			const serverUrl =
				typeof params.serverUrl === "string" ? params.serverUrl : defaultServerUrl;
			const details: DeepwikiDetails = {
				repoName: params.repoName,
				question: params.question,
				tool: "ask_question",
			};

			const result = await callMcpTool(
				getConfig(serverUrl),
				"ask_question",
				{ repoName: params.repoName, question: params.question },
				(status: string) =>
					onUpdate?.({
						content: [{ type: "text", text: status }],
						details: { ...details, status },
					})
			);

			return {
				content: [{ type: "text", text: formatMcpResult(result) }],
				details,
			};
		},
	});
}
