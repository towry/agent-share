# Presenting Diagrams

There are three ways to present Mermaid diagrams to users.

## Summary

| Mode | Command | Dependency | Use case |
|---|---|---|---|
| `html` | `run-skill-script diagram present html ...` | Browser | Interactive preview, complex charts |
| `image` | `run-skill-script diagram present image ...` | Network (mermaid.ink) | Embedded documents, offline saving |
| `terminal` | `run-skill-script diagram present terminal ...` | `viu` + Network | Quick View in Terminal |

## Usage

### HTML  —  Browser Preview

Generate an HTML file that loads Mermaid from a CDN and open it automatically in the default browser. This requires no local dependencies, and browser rendering supports all Mermaid syntax and interactions.

```bash
# Inline Code
run-skill-script diagram present html --code 'flowchart LR\n  A-->B-->C'

# Read From File
run-skill-script diagram present html diagram.mmd
```

Output:`{"mode":"html","path":"/tmp/mermaid-.../diagram.html"}`

### Image  —  Generate image files

Use the [mermaid.ink](https://mermaid.ink) API to download a PNG or SVG. This is suitable for embedding in documents or sending to others.

```bash
# PNG(default)
run-skill-script diagram present image --code 'flowchart LR\n  A-->B'

# SVG
run-skill-script diagram present image --code 'flowchart LR\n  A-->B' --format svg

# Specify output path
run-skill-script diagram present image --code '...' --output /path/to/diagram.png
```

Output:`{"mode":"image","format":"png","path":"/absolute/path/diagram.png"}`

Supported formats: `png` (default) and `svg`.

### Terminal  —  Terminal Inline Display

Fetch a PNG image, then render it inline in the terminal with `chafa` (preferred, using the kitty protocol) or `viu` (fallback).

```bash
run-skill-script diagram present terminal --code 'flowchart LR\n  A-->B-->C'
```

> **Agent note**: First check whether a built-in diagram display tool, such as a `mermaid` tool, is available. If so, use it directly instead of this script.
>
> **Pipe limitation**: When an agent runs this script as a subprocess, stdout is captured by a pipe. The kitty/iTerm2 graphics escape sequences therefore cannot reach the terminal, so the image is **not visible**. The script itself is working correctly; the pipe causes the problem. In this case, the agent should:
> 1. Use `image` mode to generate an image, tell the user its path, and ask them to run `chafa -f kitty --passthrough=auto <path>` manually to view it;
> 2. Or ask the user to run `run-skill-script diagram present terminal ...` manually in their shell.

> **Note**: Terminal displays are width-constrained. Use `html` mode for complex diagrams.

## Mode selection guidance for agents

| Situation | Recommended Mode |
|---|---|
| Users interact in a terminal and want a quick glance | Use a built-in diagram tool if available; otherwise use `image` to generate a path that the user can view with `chafa`. |
| Users need to save the image or embed it in a document | Use `image` and specify `--output`. |
| The diagram is complex with many nodes and needs interactive zooming | `html` |
| No Network Environment | Use `html`. The Mermaid CDN also requires a network connection, but the HTML file can later work offline if the CDN resource has been cached. |

## Input Method

All three modes support the same input:

```bash
# Inline code (\n converted to a line break)
... --code 'flowchart LR\n  A-->B'

# From .mmd Documentation
... diagram.mmd

# From stdin
cat diagram.mmd | run-skill-script diagram present html
```

## Technical remarks

- **mermaid.ink API**: A free public service that converts base64url-encoded Mermaid code to PNG or SVG without requiring Puppeteer or Chromium.
- **viu**: A Rust terminal image viewer that supports the iTerm2 image protocol, Kitty protocol, Sixel, and Unicode half-blocks.
- **HTML mode**: Uses the `mermaid@11` ESM CDN with a dark background and white card styling.
