/**
 * Chrome DevTools Extension - Interact with Chrome browser for debugging via chrome-devtools-mcp
 *
 * Connects to chrome-devtools-mcp server via stdio to control Chrome browser.
 * Requires Chrome running with remote debugging enabled.
 */

import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { runPiJsonAgent, getFinalAssistantText } from "../utils/agent.js";
import { getRuntimeModelConfig } from "../../agents/extension-models.js";

function getChromeDevModelConfig() {
  return getRuntimeModelConfig("CHROME_DEV");
}

// Shared MCP client instance
let mcpClient: Client | null = null;
let isConnecting = false;

const BROWSER_URL = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9222";

async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  if (isConnecting) {
    // Wait for connection to complete
    while (isConnecting) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (mcpClient) return mcpClient;
  }

  isConnecting = true;
  try {
    const client = new Client({
      name: "pi-chrome-dev",
      version: "0.1.0",
    });

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

async function callChromeTool(
  toolName: string,
  args: Record<string, unknown>,
  onUpdate?: (status: string) => void
): Promise<unknown> {
  onUpdate?.(`Connecting to Chrome DevTools...`);
  const client = await getMcpClient();

  onUpdate?.(`Calling ${toolName}...`);
  const result = await client.request(
    {
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    },
    CallToolResultSchema
  );

  return result;
}

function formatToolResult(result: unknown): string {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "No result.";

  const typed = result as { content?: Array<{ type: string; text?: string }> };
  const content = Array.isArray(typed.content) ? typed.content : [];

  if (content.length > 0) {
    const chunks = content
      .map((item) => {
        if (item.type === "text" && typeof item.text === "string") {
          return item.text;
        }
        return JSON.stringify(item, null, 2);
      })
      .filter((s) => s.length > 0);

    if (chunks.length > 0) return chunks.join("\n");
  }

  return JSON.stringify(typed, null, 2);
}

export default function (pi: ExtensionAPI) {
  // Navigation tool
  pi.registerTool({
    name: "chrome_navigate",
    label: "Chrome Navigate",
    description:
      "Navigate Chrome to a URL or use browser history (back/forward/reload)",
    parameters: Type.Object({
      type: StringEnum(["url", "back", "forward", "reload"] as const),
      url: Type.Optional(
        Type.String({
          description: "URL to navigate to (required for type=url)",
        })
      ),
      timeout: Type.Optional(
        Type.Number({ description: "Navigation timeout in ms", default: 30000 })
      ),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("navigate_page", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );

        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "navigate_page", ...params },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Take snapshot tool (runs in subagent to isolate large output)
  pi.registerTool({
    name: "chrome_snapshot",
    label: "Chrome Snapshot",
    description:
      "Use this first for UI/layout debugging to locate the affected element and get its UID for targeting (click/eval/screenshot).",
    parameters: Type.Object({
      verbose: Type.Optional(
        Type.Boolean({ description: "Include more details", default: false })
      ),
      query: Type.Optional(
        Type.String({
          description:
            "What to find or analyze in the snapshot (e.g., 'find login button', 'list all form inputs')",
        })
      ),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, signal) {
      const p = params as { verbose?: boolean; query?: string };
      const subagentPath = path.join(
        import.meta.dirname,
        "subagents",
        "chrome_snapshot_subagent.ts"
      );

      const prompt = p.query
        ? `Take a snapshot of the current page${
            p.verbose ? " with verbose details" : ""
          }, then analyze it to: ${
            p.query
          }. Return a concise summary with relevant UIDs.`
        : `Take a snapshot of the current page${
            p.verbose ? " with verbose details" : ""
          }. Summarize the page structure and list key interactive elements with their UIDs.`;

      const { provider, model } = getChromeDevModelConfig();

      const result = await runPiJsonAgent({
        cwd: _ctx.cwd,
        prompt,
        systemPrompt: `You are a Chrome DevTools assistant. Use chrome_snapshot_subagent to take page snapshots.
Analyze the snapshot and return a concise summary. Focus on:
- Page title and main content areas
- Interactive elements (buttons, links, inputs) with their UIDs
- Any specific elements the user asked about
Keep output brief - extract only what's needed, not the full raw snapshot.`,
        replaceSystemPrompt: true,
        provider,
        model,
        extraArgs: [
          "--no-extensions",
          "--no-skills",
          "--tools",
          "read,ls",
          "-e",
          subagentPath,
          "--thinking",
          "off",
        ],
        signal,
        onUpdate: onUpdate
          ? (partial) => {
              onUpdate({
                content: [
                  {
                    type: "text",
                    text:
                      getFinalAssistantText(partial.messages) ||
                      "(analyzing page...)",
                  },
                ],
                details: { model: partial.model, usage: partial.usage },
              });
            }
          : undefined,
      });

      const output = getFinalAssistantText(result.messages);

      return {
        content: [{ type: "text", text: output || "(no output)" }],
        details: {
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        },
        isError: result.exitCode !== 0,
      };
    },
  });

  // Evaluate script tool (runs in subagent to isolate large DOM output)
  pi.registerTool({
    name: "chrome_eval",
    label: "Chrome Eval",
    description:
      "Execute JavaScript in the page. Use after snapshot to inspect computed styles/measurements (e.g., overflow, bounding boxes) or extract specific info.",
    parameters: Type.Object({
      function: Type.String({
        description:
          "JavaScript function expression, e.g. '() => document.title', '() => { return document.body.innerHTML }', '(el) => el.innerText'",
      }),
      args: Type.Optional(
        Type.Array(
          Type.Object({
            uid: Type.String({
              description: "Element UID from snapshot to pass as argument",
            }),
          }),
          { description: "Element UIDs to pass as arguments to the function" }
        )
      ),
      query: Type.Optional(
        Type.String({
          description: "What to extract or summarize from the result",
        })
      ),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, signal) {
      const p = params as {
        function: string;
        args?: Array<{ uid: string }>;
        query?: string;
      };
      const subagentPath = path.join(
        import.meta.dirname,
        "subagents",
        "chrome_eval_subagent.ts"
      );

      const evalParams = { function: p.function, args: p.args };
      const prompt = p.query
        ? `Execute this JavaScript: ${p.function}. Then analyze the result focusing on: ${p.query}`
        : `Execute this JavaScript: ${p.function}. Summarize the result concisely.`;

      const { provider, model } = getChromeDevModelConfig();

      const result = await runPiJsonAgent({
        cwd: _ctx.cwd,
        prompt: `Use chrome_eval_subagent with params: ${JSON.stringify(
          evalParams
        )}. ${prompt}`,
        systemPrompt: `You are a Chrome DevTools assistant. Use chrome_eval_subagent to execute JavaScript in the page.
- Summarize the result concisely
- For large DOM content, extract only relevant parts
- Report any errors clearly
Never include raw HTML dumps in your response.`,
        replaceSystemPrompt: true,
        provider,
        model,
        extraArgs: [
          "--no-extensions",
          "--no-skills",
          "--tools",
          "read,ls",
          "-e",
          subagentPath,
          "--thinking",
          "off",
        ],
        signal,
        onUpdate: onUpdate
          ? (partial) => {
              onUpdate({
                content: [
                  {
                    type: "text",
                    text:
                      getFinalAssistantText(partial.messages) ||
                      "(evaluating script...)",
                  },
                ],
                details: { model: partial.model, usage: partial.usage },
              });
            }
          : undefined,
      });

      const output = getFinalAssistantText(result.messages);

      return {
        content: [{ type: "text", text: output || "(no output)" }],
        details: {
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        },
        isError: result.exitCode !== 0,
      };
    },
  });

  // Console messages tool (runs in subagent to isolate large stack traces)
  pi.registerTool({
    name: "chrome_console",
    label: "Chrome Console",
    description:
      "Check console errors/warnings when you suspect runtime issues (crashes, missing JS, event handlers not firing). Not the first step for pure visual/layout bugs.",
    parameters: Type.Object({
      types: Type.Optional(
        Type.Array(Type.String(), {
          description: "Filter by message types (e.g., ['error', 'warning'])",
        })
      ),
      pageIdx: Type.Optional(
        Type.Number({ description: "Page index for pagination", default: 0 })
      ),
      pageSize: Type.Optional(
        Type.Number({ description: "Number of messages per page", default: 20 })
      ),
      query: Type.Optional(
        Type.String({ description: "What to look for in console messages" })
      ),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, signal) {
      const p = params as {
        types?: string[];
        pageIdx?: number;
        pageSize?: number;
        query?: string;
      };
      const subagentPath = path.join(
        import.meta.dirname,
        "subagents",
        "chrome_console_subagent.ts"
      );

      const consoleParams = {
        types: p.types,
        pageIdx: p.pageIdx,
        pageSize: p.pageSize,
      };
      const prompt = p.query
        ? `List console messages with params: ${JSON.stringify(
            consoleParams
          )}. Focus on: ${p.query}`
        : `List console messages with params: ${JSON.stringify(
            consoleParams
          )}. Summarize errors and warnings.`;

      const { provider, model } = getChromeDevModelConfig();

      const result = await runPiJsonAgent({
        cwd: _ctx.cwd,
        prompt: `Use chrome_console_list_subagent. ${prompt}`,
        systemPrompt: `You are a Chrome DevTools assistant. Use chrome_console_list_subagent to fetch console messages.
- Summarize errors and warnings concisely
- For stack traces, show only the relevant parts (first few frames)
- Group similar messages if there are many
Never dump full stack traces.`,
        replaceSystemPrompt: true,
        provider,
        model,
        extraArgs: [
          "--no-extensions",
          "--no-skills",
          "--tools",
          "read,ls",
          "-e",
          subagentPath,
          "--thinking",
          "off",
        ],
        signal,
        onUpdate: onUpdate
          ? (partial) => {
              onUpdate({
                content: [
                  {
                    type: "text",
                    text:
                      getFinalAssistantText(partial.messages) ||
                      "(fetching console...)",
                  },
                ],
                details: { model: partial.model, usage: partial.usage },
              });
            }
          : undefined,
      });

      const output = getFinalAssistantText(result.messages);

      return {
        content: [{ type: "text", text: output || "(no output)" }],
        details: {
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        },
        isError: result.exitCode !== 0,
      };
    },
  });

  // Click element tool
  pi.registerTool({
    name: "chrome_click",
    label: "Chrome Click",
    description: "Click an element by its UID (from snapshot)",
    parameters: Type.Object({
      uid: Type.String({
        description: "Element UID from accessibility snapshot",
      }),
      dblClick: Type.Optional(
        Type.Boolean({ description: "Double-click instead of single click" })
      ),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("click", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );

        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "click", uid: params.uid },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Fill form tool
  pi.registerTool({
    name: "chrome_fill",
    label: "Chrome Fill",
    description: "Fill an input field or select option by UID (from snapshot)",
    parameters: Type.Object({
      uid: Type.String({
        description: "Element UID from accessibility snapshot",
      }),
      value: Type.String({ description: "Value to fill or option to select" }),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("fill", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );

        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "fill", uid: params.uid },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Screenshot tool (runs in subagent to isolate large base64 output)
  pi.registerTool({
    name: "chrome_screenshot",
    label: "Chrome Screenshot",
    description:
      "Use this first for UI/layout debugging (overflow, clipping, misalignment). Capture the page or an element to confirm what’s actually rendered.",
    parameters: Type.Object({
      uid: Type.Optional(
        Type.String({
          description: "Element UID to screenshot (omit for full page)",
        })
      ),
      fullPage: Type.Optional(
        Type.Boolean({
          description: "Capture full scrollable page",
          default: false,
        })
      ),
      format: Type.Optional(
        StringEnum(["png", "jpeg"] as const, { default: "png" })
      ),
      quality: Type.Optional(
        Type.Number({
          description: "JPEG quality 0-100",
          minimum: 0,
          maximum: 100,
        })
      ),
      filePath: Type.Optional(
        Type.String({ description: "Save to file instead of returning base64" })
      ),
      query: Type.Optional(
        Type.String({
          description: "What to verify or describe in the screenshot",
        })
      ),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, signal) {
      const p = params as {
        uid?: string;
        fullPage?: boolean;
        format?: string;
        quality?: number;
        filePath?: string;
        query?: string;
      };
      const subagentPath = path.join(
        import.meta.dirname,
        "subagents",
        "chrome_screenshot_subagent.ts"
      );

      const defaultPath = `/tmp/screenshot-${Date.now()}.${p.format || "png"}`;
      const screenshotParams = {
        uid: p.uid,
        fullPage: p.fullPage,
        format: p.format,
        quality: p.quality,
        filePath: p.filePath || defaultPath,
      };
      const prompt = p.query
        ? `Take a screenshot with params: ${JSON.stringify(
            screenshotParams
          )}. Then describe what you see, focusing on: ${p.query}`
        : `Take a screenshot with params: ${JSON.stringify(
            screenshotParams
          )}. Confirm success and describe the captured content briefly.`;

      const { provider, model } = getChromeDevModelConfig();

      const result = await runPiJsonAgent({
        cwd: _ctx.cwd,
        prompt,
        systemPrompt: `You are a Chrome DevTools assistant. Use chrome_screenshot_subagent to capture screenshots.
After taking the screenshot:
- Confirm if it was saved to file or returned as base64
- Briefly describe what's visible in the screenshot
- Note any specific elements the user asked about
Keep output concise - don't include raw base64 data in your response.`,
        replaceSystemPrompt: true,
        provider,
        model,
        extraArgs: [
          "--no-extensions",
          "--no-skills",
          "--tools",
          "read,ls",
          "-e",
          subagentPath,
          "--thinking",
          "off",
        ],
        signal,
        onUpdate: onUpdate
          ? (partial) => {
              onUpdate({
                content: [
                  {
                    type: "text",
                    text:
                      getFinalAssistantText(partial.messages) ||
                      "(capturing screenshot...)",
                  },
                ],
                details: { model: partial.model, usage: partial.usage },
              });
            }
          : undefined,
      });

      const output = getFinalAssistantText(result.messages);

      return {
        content: [{ type: "text", text: output || "(no output)" }],
        details: {
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        },
        isError: result.exitCode !== 0,
      };
    },
  });

  // List pages tool
  pi.registerTool({
    name: "chrome_list_pages",
    label: "Chrome List Pages",
    description: "List all open browser tabs/pages",
    parameters: Type.Object({}),

    async execute(_toolCallId, _params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("list_pages", {}, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );

        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "list_pages" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Select page tool
  pi.registerTool({
    name: "chrome_select_page",
    label: "Chrome Select Page",
    description: "Select a browser tab/page by index for subsequent operations",
    parameters: Type.Object({
      pageIdx: Type.Number({ description: "Page index from list_pages" }),
      bringToFront: Type.Optional(
        Type.Boolean({ description: "Focus the page and bring to front" })
      ),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("select_page", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );

        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "select_page", pageIdx: params.pageIdx },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // New page tool
  pi.registerTool({
    name: "chrome_new_page",
    label: "Chrome New Page",
    description: "Open a new browser tab with the specified URL",
    parameters: Type.Object({
      url: Type.String({ description: "URL to open in the new page" }),
      timeout: Type.Optional(
        Type.Number({ description: "Navigation timeout in ms" })
      ),
    }),

    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("new_page", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );

        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "new_page", url: params.url },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Close page tool
  pi.registerTool({
    name: "chrome_close_page",
    label: "Chrome Close Page",
    description: "Close a browser tab by index (cannot close the last page)",
    parameters: Type.Object({
      pageIdx: Type.Number({ description: "Page index to close" }),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("close_page", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "close_page" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Drag tool
  pi.registerTool({
    name: "chrome_drag",
    label: "Chrome Drag",
    description: "Drag an element onto another element",
    parameters: Type.Object({
      from_uid: Type.String({ description: "UID of element to drag" }),
      to_uid: Type.String({ description: "UID of element to drop into" }),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("drag", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "drag" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Emulate tool
  pi.registerTool({
    name: "chrome_emulate",
    label: "Chrome Emulate",
    description:
      "Emulate device features (CPU throttling, geolocation, network conditions)",
    parameters: Type.Object({
      cpuThrottlingRate: Type.Optional(
        Type.Number({
          description: "CPU slowdown factor (1-20, 1=no throttle)",
          minimum: 1,
          maximum: 20,
        })
      ),
      latitude: Type.Optional(
        Type.Number({
          description: "Geolocation latitude (-90 to 90)",
          minimum: -90,
          maximum: 90,
        })
      ),
      longitude: Type.Optional(
        Type.Number({
          description: "Geolocation longitude (-180 to 180)",
          minimum: -180,
          maximum: 180,
        })
      ),
      clearGeolocation: Type.Optional(
        Type.Boolean({ description: "Set true to clear geolocation override" })
      ),
      networkConditions: Type.Optional(
        StringEnum([
          "No emulation",
          "Offline",
          "Slow 3G",
          "Fast 3G",
          "Slow 4G",
          "Fast 4G",
        ] as const)
      ),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        // Transform flat params to nested format for MCP
        const mcpParams: Record<string, unknown> = {};
        if (params.cpuThrottlingRate !== undefined)
          mcpParams.cpuThrottlingRate = params.cpuThrottlingRate;
        if (params.networkConditions !== undefined)
          mcpParams.networkConditions = params.networkConditions;
        if (params.clearGeolocation) {
          mcpParams.geolocation = null;
        } else if (
          params.latitude !== undefined &&
          params.longitude !== undefined
        ) {
          mcpParams.geolocation = {
            latitude: params.latitude,
            longitude: params.longitude,
          };
        }
        const result = await callChromeTool("emulate", mcpParams, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "emulate" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Fill form tool
  pi.registerTool({
    name: "chrome_fill_form",
    label: "Chrome Fill Form",
    description: "Fill multiple form elements at once",
    parameters: Type.Object({
      elements: Type.Array(
        Type.Object({
          uid: Type.String({ description: "Element UID" }),
          value: Type.String({ description: "Value to fill" }),
        })
      ),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("fill_form", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "fill_form" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Get console message tool (runs in subagent to isolate large stack traces)
  pi.registerTool({
    name: "chrome_get_console_message",
    label: "Chrome Get Console Message",
    description:
      "Inspect one specific console message (by ID) after you’ve found a relevant error/warning from chrome_console.",
    parameters: Type.Object({
      msgid: Type.Number({
        description: "Message ID from list_console_messages",
      }),
      query: Type.Optional(
        Type.String({ description: "What to extract from the message" })
      ),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, signal) {
      const p = params as { msgid: number; query?: string };
      const subagentPath = path.join(
        import.meta.dirname,
        "subagents",
        "chrome_console_subagent.ts"
      );

      const prompt = p.query
        ? `Get console message ${p.msgid}. Focus on: ${p.query}`
        : `Get console message ${p.msgid}. Summarize the message and relevant stack trace frames.`;

      const { provider, model } = getChromeDevModelConfig();

      const result = await runPiJsonAgent({
        cwd: _ctx.cwd,
        prompt: `Use chrome_console_get_subagent with msgid: ${p.msgid}. ${prompt}`,
        systemPrompt: `You are a Chrome DevTools assistant. Use chrome_console_get_subagent to fetch a console message.
- Summarize the error/warning message
- Show only relevant stack trace frames (top 3-5)
- Identify the source file and line if available
Never dump the full stack trace.`,
        replaceSystemPrompt: true,
        provider,
        model,
        extraArgs: [
          "--no-extensions",
          "--no-skills",
          "--tools",
          "read,ls",
          "-e",
          subagentPath,
          "--thinking",
          "off",
        ],
        signal,
        onUpdate: onUpdate
          ? (partial) => {
              onUpdate({
                content: [
                  {
                    type: "text",
                    text:
                      getFinalAssistantText(partial.messages) ||
                      "(fetching message...)",
                  },
                ],
                details: { model: partial.model, usage: partial.usage },
              });
            }
          : undefined,
      });

      const output = getFinalAssistantText(result.messages);

      return {
        content: [{ type: "text", text: output || "(no output)" }],
        details: {
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        },
        isError: result.exitCode !== 0,
      };
    },
  });

  // Get network request tool (runs in subagent to isolate large response bodies)
  pi.registerTool({
    name: "chrome_get_network_request",
    label: "Chrome Get Network Request",
    description:
      "Inspect one network request (by ID) after chrome_list_network_requests shows a failed/suspicious request.",
    parameters: Type.Object({
      reqid: Type.Optional(
        Type.Number({ description: "Request ID (omit for currently selected)" })
      ),
      query: Type.Optional(
        Type.String({ description: "What to extract from the request" })
      ),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, signal) {
      const p = params as { reqid?: number; query?: string };
      const subagentPath = path.join(
        import.meta.dirname,
        "subagents",
        "chrome_network_subagent.ts"
      );

      const prompt = p.query
        ? `Get network request${p.reqid ? ` ${p.reqid}` : ""}. Focus on: ${
            p.query
          }`
        : `Get network request${
            p.reqid ? ` ${p.reqid}` : ""
          }. Summarize URL, status, headers, and response.`;

      const { provider, model } = getChromeDevModelConfig();

      const result = await runPiJsonAgent({
        cwd: _ctx.cwd,
        prompt: `Use chrome_network_get_subagent${
          p.reqid ? ` with reqid: ${p.reqid}` : ""
        }. ${prompt}`,
        systemPrompt: `You are a Chrome DevTools assistant. Use chrome_network_get_subagent to fetch network request details.
- Summarize: URL, method, status code, content-type
- For response bodies, extract only relevant parts (first 500 chars max)
- Note any errors or redirects
Never dump full response bodies.`,
        replaceSystemPrompt: true,
        provider,
        model,
        extraArgs: [
          "--no-extensions",
          "--no-skills",
          "--tools",
          "read,ls",
          "-e",
          subagentPath,
          "--thinking",
          "off",
        ],
        signal,
        onUpdate: onUpdate
          ? (partial) => {
              onUpdate({
                content: [
                  {
                    type: "text",
                    text:
                      getFinalAssistantText(partial.messages) ||
                      "(fetching request...)",
                  },
                ],
                details: { model: partial.model, usage: partial.usage },
              });
            }
          : undefined,
      });

      const output = getFinalAssistantText(result.messages);

      return {
        content: [{ type: "text", text: output || "(no output)" }],
        details: {
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        },
        isError: result.exitCode !== 0,
      };
    },
  });

  // Handle dialog tool
  pi.registerTool({
    name: "chrome_handle_dialog",
    label: "Chrome Handle Dialog",
    description: "Accept or dismiss a browser dialog (alert, confirm, prompt)",
    parameters: Type.Object({
      action: StringEnum(["accept", "dismiss"] as const),
      promptText: Type.Optional(
        Type.String({ description: "Text to enter for prompt dialogs" })
      ),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("handle_dialog", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "handle_dialog" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Hover tool
  pi.registerTool({
    name: "chrome_hover",
    label: "Chrome Hover",
    description: "Hover over an element by UID",
    parameters: Type.Object({
      uid: Type.String({ description: "Element UID from snapshot" }),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("hover", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "hover" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // List network requests tool (runs in subagent to isolate large request lists)
  pi.registerTool({
    name: "chrome_list_network_requests",
    label: "Chrome List Network Requests",
    description:
      "Check network requests when you suspect loading/data issues (missing CSS/JS/fonts/images, API failures). Not the first step for pure visual/layout bugs.",
    parameters: Type.Object({
      resourceTypes: Type.Optional(
        Type.Array(Type.String(), {
          description: "Filter by types: document, xhr, fetch, script, etc.",
        })
      ),
      pageIdx: Type.Optional(
        Type.Number({ description: "Page number (0-based)" })
      ),
      pageSize: Type.Optional(Type.Number({ description: "Results per page" })),
      includePreservedRequests: Type.Optional(
        Type.Boolean({
          description: "Include requests from last 3 navigations",
        })
      ),
      query: Type.Optional(
        Type.String({ description: "What to look for in network requests" })
      ),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, signal) {
      const p = params as {
        resourceTypes?: string[];
        pageIdx?: number;
        pageSize?: number;
        includePreservedRequests?: boolean;
        query?: string;
      };
      const subagentPath = path.join(
        import.meta.dirname,
        "subagents",
        "chrome_network_subagent.ts"
      );

      const listParams = {
        resourceTypes: p.resourceTypes,
        pageIdx: p.pageIdx,
        pageSize: p.pageSize,
        includePreservedRequests: p.includePreservedRequests,
      };
      const prompt = p.query
        ? `List network requests with params: ${JSON.stringify(
            listParams
          )}. Focus on: ${p.query}`
        : `List network requests with params: ${JSON.stringify(
            listParams
          )}. Summarize key requests.`;

      const { provider, model } = getChromeDevModelConfig();

      const result = await runPiJsonAgent({
        cwd: _ctx.cwd,
        prompt: `Use chrome_network_list_subagent. ${prompt}`,
        systemPrompt: `You are a Chrome DevTools assistant. Use chrome_network_list_subagent to list network requests.
- Summarize requests: URL, method, status, type
- Group similar requests if many
- Highlight failed requests (4xx, 5xx)
Keep output concise.`,
        replaceSystemPrompt: true,
        provider,
        model,
        extraArgs: [
          "--no-extensions",
          "--no-skills",
          "--tools",
          "read,ls",
          "-e",
          subagentPath,
          "--thinking",
          "off",
        ],
        signal,
        onUpdate: onUpdate
          ? (partial) => {
              onUpdate({
                content: [
                  {
                    type: "text",
                    text:
                      getFinalAssistantText(partial.messages) ||
                      "(fetching requests...)",
                  },
                ],
                details: { model: partial.model, usage: partial.usage },
              });
            }
          : undefined,
      });

      const output = getFinalAssistantText(result.messages);

      return {
        content: [{ type: "text", text: output || "(no output)" }],
        details: {
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        },
        isError: result.exitCode !== 0,
      };
    },
  });

  // Performance analyze insight tool
  pi.registerTool({
    name: "chrome_performance_analyze_insight",
    label: "Chrome Performance Analyze Insight",
    description:
      "Get detailed info on a specific Performance Insight from a trace",
    parameters: Type.Object({
      insightSetId: Type.String({
        description: "Insight set ID from trace results",
      }),
      insightName: Type.String({
        description: "Insight name (e.g., 'DocumentLatency', 'LCPBreakdown')",
      }),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool(
          "performance_analyze_insight",
          params,
          (status) =>
            onUpdate?.({
              content: [{ type: "text", text: status }],
              details: undefined,
            })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "performance_analyze_insight" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Performance start trace tool
  pi.registerTool({
    name: "chrome_performance_start_trace",
    label: "Chrome Performance Start Trace",
    description:
      "Start a performance trace recording for CWV and performance insights",
    parameters: Type.Object({
      reload: Type.Boolean({ description: "Reload page after starting trace" }),
      autoStop: Type.Boolean({ description: "Auto-stop the trace recording" }),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool(
          "performance_start_trace",
          params,
          (status) =>
            onUpdate?.({
              content: [{ type: "text", text: status }],
              details: undefined,
            })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "performance_start_trace" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Performance stop trace tool
  pi.registerTool({
    name: "chrome_performance_stop_trace",
    label: "Chrome Performance Stop Trace",
    description: "Stop the active performance trace recording",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool(
          "performance_stop_trace",
          {},
          (status) =>
            onUpdate?.({
              content: [{ type: "text", text: status }],
              details: undefined,
            })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "performance_stop_trace" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Press key tool
  pi.registerTool({
    name: "chrome_press_key",
    label: "Chrome Press Key",
    description: "Press a key or key combination (e.g., 'Enter', 'Control+A')",
    parameters: Type.Object({
      key: Type.String({
        description: "Key or combo (e.g., 'Enter', 'Control+Shift+R')",
      }),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("press_key", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "press_key" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Resize page tool
  pi.registerTool({
    name: "chrome_resize_page",
    label: "Chrome Resize Page",
    description: "Resize the page viewport to specified dimensions",
    parameters: Type.Object({
      width: Type.Number({ description: "Page width in pixels" }),
      height: Type.Number({ description: "Page height in pixels" }),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("resize_page", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "resize_page" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Upload file tool
  pi.registerTool({
    name: "chrome_upload_file",
    label: "Chrome Upload File",
    description: "Upload a file through a file input element",
    parameters: Type.Object({
      uid: Type.String({ description: "File input element UID" }),
      filePath: Type.String({ description: "Local path of file to upload" }),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("upload_file", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "upload_file" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });

  // Wait for tool
  pi.registerTool({
    name: "chrome_wait_for",
    label: "Chrome Wait For",
    description: "Wait for specified text to appear on the page",
    parameters: Type.Object({
      text: Type.String({ description: "Text to wait for" }),
      timeout: Type.Optional(
        Type.Number({ description: "Max wait time in ms (0 for default)" })
      ),
    }),
    async execute(_toolCallId, params, onUpdate, _ctx, _signal) {
      try {
        const result = await callChromeTool("wait_for", params, (status) =>
          onUpdate?.({
            content: [{ type: "text", text: status }],
            details: undefined,
          })
        );
        return {
          content: [{ type: "text", text: formatToolResult(result) }],
          details: { tool: "wait_for" },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  });
}
