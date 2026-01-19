# Chrome DevTools Extension - Quick Start Guide

## Step 1: Start Chrome with Remote Debugging

First, shut down any running Chrome instances, then start Chrome with remote debugging:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-dev-profile

# Linux
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-dev-profile

# Windows
"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" \\
  --remote-debugging-port=9222 \\
  --user-data-dir=C:\\temp\\chrome-dev-profile
```

The `--user-data-dir` ensures a fresh profile for debugging.

## Step 2: Verify Chrome Accessibility

Test that Chrome is accessible:

```bash
curl http://127.0.0.1:9222/json/version
```

You should see JSON output with Chrome version info.

## Step 3: Use in pi

### Basic Navigation and Inspection

```typescript
// Navigate to a page
await chrome_navigate({ type: "url", url: "https://example.com" });

// Take a snapshot to see the page structure
await chrome_snapshot({ verbose: false });
```

### Automated Testing Example

```typescript
// Navigate to a form
await chrome_navigate({ type: "url", url: "https://httpbin.org/forms/post" });

// Get page snapshot
const snap = await chrome_snapshot({ verbose: false });

// Use the snapshot to find element UIDs, then interact:
// (The actual UIDs will vary based on the page)
await chrome_fill({ uid: "customer-name-ui", value: "John Doe" });
await chrome_fill({ uid: "telephone-ui", value: "555-1234" });
await chrome_fill({ uid: "email-ui", value: "john@example.com" });
await chrome_click({ uid: "submit-order-ui" });

// Check console for any errors
await chrome_console({ types: ["error", "warning"] });

// Take a screenshot of the result
await chrome_screenshot({ fullPage: false });
```

### Debugging JavaScript Issues

```typescript
// Navigate to the page with issues
await chrome_navigate({ type: "url", url: "https://example.com" });

// Execute diagnostic code
await chrome_eval({ 
  function: "() => {
    const issues = [];
    if (!window.Promise) issues.push('No Promise support');
    if (!document.querySelector) issues.push('No querySelector support');
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      readyState: document.readyState,
      issues: issues
    };
  }",
  args: []
});

// Check console messages for errors
const messages = await chrome_console({ types: ["error"] });
console.log("Console errors:", messages);
```

### Performance Testing

```typescript
// Navigate to test page
await chrome_navigate({ type: "url", url: "https://example.com" });

// Collect performance metrics
await chrome_eval({ 
  function: "() => {
    const timing = performance.timing;
    const metrics = {
      loadComplete: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstByte: timing.responseStart - timing.navigationStart,
      pageSize: document.documentElement.outerHTML.length
    };
    return metrics;
  }",
  args: []
});

// Take a full page screenshot for visual inspection
await chrome_screenshot({ fullPage: true, format: "png" });
```

## Common Patterns

### Error Handling

```typescript
try {
  await chrome_navigate({ type: "url", url: "https://example.com" });
  const result = await chrome_eval({ 
    function: "dangerousOperation()",
    args: []
  });
} catch (error) {
  console.error("Browser automation failed:", error);
  // Fallback or cleanup
}
```

### Waiting for Dynamic Content

```typescript
// Navigate first
await chrome_navigate({ type: "url", url: "https://example.com" });

// Wait for content (simple polling via evaluation)
let attempts = 0;
const maxAttempts = 10;
while (attempts < maxAttempts) {
  const ready = await chrome_eval({ 
    function: "() => document.querySelectorAll('.loaded').length > 0",
    args: []
  });
  if (ready) break;
  await new Promise(resolve => setTimeout(resolve, 1000));
  attempts++;
}
```

## Testing Your Setup

Run this comprehensive test:

```typescript
// 1. List pages
await chrome_list_pages();

// 2. Navigate
await chrome_navigate({ type: "url", url: "https://example.com" });

// 3. Take snapshot
await chrome_snapshot({ verbose: false });

// 4. Execute JavaScript
const title = await chrome_eval({ 
  function: "() => document.title",
  args: []
});
console.log("Page title:", title);

// 5. Take screenshot
await chrome_screenshot({ fullPage: false });

// 6. Check console
await chrome_console({ types: ["error", "warning"] });

console.log("All tests completed successfully!");
```

## Troubleshooting

### "Chrome not found" errors
- Ensure Chrome is running with `--remote-debugging-port=9222`
- Check the debug endpoint: `curl http://127.0.0.1:9222/json/version`

### Connection timeout
- Chrome might be starting up, wait a few seconds
- Verify no firewall is blocking localhost:9222

### Tool errors
- Take a snapshot first to get valid UIDs
- Some operations require specific page states
- Check console messages for JavaScript errors

## API Reference

See [../README.md](../README.md) for complete API documentation of all tools.
