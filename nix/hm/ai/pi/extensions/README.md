# Pi Extensions

## Creating New Extensions

For creating MCP-based extensions, read `docs/agents-md/pi-mcp-extension.md`.

## Environment Variables

### MCP Server Extensions

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPWIKI_MCP_URL` | No | `https://mcp.deepwiki.com/mcp` | DeepWiki MCP server URL |
| `DEEPWIKI_API_KEY` | No | - | DeepWiki MCP auth token |
| `MASTERGO_BASE_URL` | No | `https://mastergo.com` | MasterGo API base URL |
| `MASTERGO_API_TOKEN` | No | - | MasterGo auth token (or `MG_MCP_TOKEN`, `MASTERGO_TOKEN`) |

### Web Tools

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXA_API_KEY` | Yes | - | Exa API key for web search/crawl |

### Model Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PI_SMART_MODEL` | No | - | Model for complex tasks (format: `provider/model`) |
| `PI_RUSH_MODEL` | No | - | Model for quick tasks |
| `PI_LIBRARIAN_MODEL` | No | - | Model for librarian extension |
| `PI_LESSON_MODEL` | No | `PI_REVIEW_MODEL` | Model for draw-lesson |
| `PI_REVIEW_MODEL` | No | - | Model for review tasks |

### Behavior Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PI_AUTO_REVIEW_SNOOZE_TURNS` | No | `3` | Turns to snooze auto-review |
| `PI_AUTO_REVIEW_MIN_CHANGES` | No | `3` | Min changes to trigger auto-review |
