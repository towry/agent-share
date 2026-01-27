/**
 * Generic MCP (Model Context Protocol) HTTP client.
 * Handles JSON-RPC 2.0 over HTTP with SSE support.
 */

type ToolContentItem = { type: "text"; text: string } | { type: string; [key: string]: unknown };

type CallToolResult = {
  content?: ToolContentItem[];
  [key: string]: unknown;
};

type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
};

type JsonRpcError = {
  jsonrpc: "2.0";
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
};

type PostJsonRpcResult = {
  decoded: unknown;
  sessionId?: string;
};

export interface McpClientConfig {
  serverUrl: string;
  clientName: string;
  clientVersion?: string;
  protocolVersion?: string;
  getAuthHeaders?: () => Record<string, string>;
}

export type McpStatusCallback = (status: string) => void;

function parseJsonRpcFromSse(bodyText: string): unknown {
  const events = bodyText.split(/\n\n+/g);
  const parsed: unknown[] = [];

  for (const event of events) {
    const dataLines = event
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trimStart());

    if (dataLines.length === 0) continue;
    const data = dataLines.join("\n").trim();
    if (!data) continue;

    try {
      parsed.push(JSON.parse(data));
    } catch {
      // ignore non-JSON data frames
    }
  }

  return parsed.length > 0 ? parsed[parsed.length - 1] : bodyText;
}

function unwrapJsonRpc(decoded: unknown, serverName: string): unknown {
  if (!decoded || typeof decoded !== "object") return decoded;

  const maybeError = decoded as Partial<JsonRpcError>;
  if ("error" in maybeError) {
    const err = maybeError.error as JsonRpcError["error"] | undefined;
    if (err && typeof err === "object") {
      throw new Error(
        `${serverName} MCP error ${err.code}: ${err.message}${
          err.data ? `\n${JSON.stringify(err.data, null, 2)}` : ""
        }`,
      );
    }
    throw new Error(`${serverName} MCP error: ${JSON.stringify(maybeError, null, 2)}`);
  }

  const maybeSuccess = decoded as Partial<JsonRpcSuccess>;
  if ("result" in maybeSuccess) return maybeSuccess.result;

  return decoded;
}

async function postJsonRpc(
  serverUrl: string,
  sessionId: string | undefined,
  method: string,
  params: Record<string, unknown>,
  authHeaders: Record<string, string>,
): Promise<PostJsonRpcResult> {
  const id = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : Date.now();
  const headers: Record<string, string> = {
    ...authHeaders,
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  };
  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  let res: Response;
  try {
    res = await fetch(serverUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`MCP fetch failed (${serverUrl}): ${msg}`);
  }

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`MCP HTTP ${res.status}: ${bodyText || res.statusText}`);
  }

  const contentType = res.headers.get("content-type") || "";
  let decoded: unknown = bodyText;
  if (contentType.includes("text/event-stream")) {
    decoded = parseJsonRpcFromSse(bodyText);
  } else {
    try {
      decoded = JSON.parse(bodyText);
    } catch {
      decoded = bodyText;
    }
  }

  return { decoded, sessionId: res.headers.get("mcp-session-id") ?? undefined };
}

/**
 * Call an MCP tool on a remote server.
 * Handles session initialization and JSON-RPC protocol.
 */
export async function callMcpTool(
  config: McpClientConfig,
  toolName: string,
  toolArgs: Record<string, unknown>,
  onStatus?: McpStatusCallback,
): Promise<unknown> {
  const {
    serverUrl,
    clientName,
    clientVersion = "0.1.0",
    protocolVersion = "2024-11-05",
    getAuthHeaders,
  } = config;

  const authHeaders = getAuthHeaders?.() ?? {};
  const report = onStatus ?? (() => {});

  if (typeof fetch !== "function") {
    throw new Error("Global fetch() is not available; requires Node.js 18+.");
  }

  report("Initializing MCP session...");
  const initResponse = await postJsonRpc(
    serverUrl,
    undefined,
    "initialize",
    {
      protocolVersion,
      clientInfo: { name: clientName, version: clientVersion },
      capabilities: {},
    },
    authHeaders,
  );
  unwrapJsonRpc(initResponse.decoded, clientName);

  const sessionId = initResponse.sessionId;
  // Session ID is optional - some MCP servers (e.g., mcp-remote) don't use sessions

  report(`Calling ${toolName}...`);
  const callResponse = await postJsonRpc(
    serverUrl,
    sessionId,
    "tools/call",
    { name: toolName, arguments: toolArgs },
    authHeaders,
  );

  return unwrapJsonRpc(callResponse.decoded, clientName);
}

/**
 * Format MCP tool result content array to string.
 */
export function formatMcpResult(result: unknown): string {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "No result.";

  const typed = result as CallToolResult;
  const content = Array.isArray(typed.content) ? typed.content : [];

  if (content.length > 0) {
    const chunks = content
      .map((item) => {
        if (item && typeof item === "object" && (item as any).type === "text") {
          const text = (item as any).text;
          return typeof text === "string" ? text : JSON.stringify(item, null, 2);
        }
        return JSON.stringify(item, null, 2);
      })
      .filter((s) => s.length > 0);

    if (chunks.length > 0) return chunks.join("\n");
  }

  return JSON.stringify(typed, null, 2);
}
