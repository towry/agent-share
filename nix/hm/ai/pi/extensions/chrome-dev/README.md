# Chrome DevTools Extension for pi

Control and debug Chrome browsers via chrome-devtools-mcp server. This extension allows you to automate browser interactions, capture screenshots, evaluate JavaScript, and debug web applications.

## Prerequisites

1. **Chrome with Remote Debugging Enabled**

   You need to start Chrome with remote debugging enabled:

   ```bash
   # macOS (replace '/Applications/Google Chrome.app' with your Chrome path)
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --disable-gpu \
     --no-sandbox

   # Linux
   google-chrome \
     --remote-debugging-port=9222 \
     --disable-gpu \
     --no-sandbox

   # Windows
   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" \\
     --remote-debugging-port=9222
   ```

2. **Node.js 18+** (required for the MCP SDK)

## Configuration

### Environment Variable

Set the `CHROME_DEBUG_URL` environment variable if your Chrome instance is running on a different URL:

```bash
export CHROME_DEBUG_URL="http://127.0.0.1:9222"
```

Default: `http://127.0.0.1:9222`

### No Additional Configuration Required

The extension automatically:
- Launches `chrome-devtools-mcp` via npx
- Connects to the Chrome instance at the configured URL
- Manages the MCP connection lifecycle

## Available Tools

### Navigation
- `chrome_navigate` - Navigate to URLs or use browser history (back/forward/reload)
- `chrome_list_pages` - List all open browser tabs/pages

### Page Interaction
- `chrome_snapshot` - Generate accessibility tree snapshot with UIDs for element targeting
- `chrome_click` - Click or double-click elements by UID
- `chrome_fill` - Fill input fields or select options by UID
- `chrome_eval` - Execute JavaScript in the page context

### Debugging
- `chrome_console` - List console messages (errors, warnings, logs)
- `chrome_screenshot` - Capture full page or element screenshots

## Usage Examples

### Open a Website
```typescript
// Navigate to a URL
await chrome_navigate({ type: "url", url: "https://example.com" });
```

### Capture Page Snapshot
```typescript
// Get accessibility tree with element UIDs
const snapshot = await chrome_snapshot({ verbose: false });
console.log(snapshot); // View element UIDs for targeting
```

### Interact with Page
```typescript
// First get a snapshot to find element UIDs
const snapshot = await chrome_snapshot();

// Click an element by UID
await chrome_click({ uid: "button-123", dblClick: false });

// Fill a form field
await chrome_fill({ uid: "email-input", value: "test@example.com" });
```

### Execute JavaScript
```typescript
// Run JavaScript in the page context
const result = await chrome_eval({ 
  function: "() => document.title",
  args: [] 
});
console.log("Page title:", result);

// Or with arguments
const count = await chrome_eval({ 
  function: "(selector) => document.querySelectorAll(selector).length",
  args: ["button"] 
});
```

### Debug Console Messages
```typescript
// List recent console messages
const messages = await chrome_console({ 
  types: ["error", "warning", "log"],
  pageIdx: 0,
  pageSize: 20 
});
```

### Take Screenshots
```typescript
// Full page screenshot
await chrome_screenshot({ fullPage: true, format: "png" });

// Element screenshot
await chrome_screenshot({ uid: "chart-element", format: "png" });

// JPEG with quality
await chrome_screenshot({ fullPage: false, format: "jpeg", quality: 80 });
```

## Troubleshooting

### "Failed to connect to Chrome" Error

1. Verify Chrome is running with `--remote-debugging-port=9222`
2. Check Chrome is accessible: `curl http://127.0.0.1:9222/json/version`
3. If using Docker/custom setup, ensure the URL is correct

### "connection refused" or "timeout"

- Chrome might not be running or the debugging port is blocked
- Try restarting Chrome with the remote debugging flags
- Check firewall settings if accessing Chrome remotely

### Tool-specific Errors

Most errors come directly from chrome-devtools-mcp server. Check the error message for specific details:
- Invalid UIDs (element not found)
- Navigation timeouts
- JavaScript evaluation errors

## Architecture

The extension uses:
- **@modelcontextprotocol/sdk** - Official MCP TypeScript SDK
- **StdioClientTransport** - Communicates with chrome-devtools-mcp via stdio
- **Singleton pattern** - Reuses MCP client connection across tool calls
- **Lifecycle management** - Properly initializes and cleans up connections

## Security Notes

- This extension only works with Chrome instances you control
- No authentication is performed (relies on localhost-only Chrome debugging)
- Extension runs within pi's sandboxed environment
- MCP server is launched as a child process with restricted permissions

## Related Tools

- **chrome-devtools-mcp**: https://github.com/ryohey/chrome-devtools-mcp
- **MCP Protocol**: https://spec.modelcontextprotocol.io
- **Chrome DevTools Protocol**: https://chromedevtools.github.io/devtools-protocol/
