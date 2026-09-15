#!/usr/bin/env bun
// present-mermaid.ts — present Mermaid diagrams to users
// Usage:
//   present-mermaid.ts html   --code 'flowchart LR\n A-->B'
//   present-mermaid.ts html   diagram.mmd
//   present-mermaid.ts image  --code '...' [--format svg|png] [--output out.png]
//   present-mermaid.ts terminal --code '...'

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { $ } from "bun";

// --- Input reading ---
function readInput(args: string[]): string {
  const codeIdx = args.indexOf("--code");
  if (codeIdx !== -1 && args[codeIdx + 1]) {
    return args[codeIdx + 1].replace(/\\n/g, "\n");
  }
  // Find first arg that's not a flag
  for (const a of args) {
    if (!a.startsWith("-")) {
      return readFileSync(a, "utf8");
    }
  }
  return readFileSync("/dev/stdin", "utf8");
}

function getFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
}

// --- HTML mode ---
function presentHtml(code: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mermaid Diagram</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #1a1a2e;
      font-family: system-ui, sans-serif;
    }
    #diagram {
      background: #fff;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      max-width: 95vw;
      overflow: auto;
    }
  </style>
</head>
<body>
  <div id="diagram">
    <pre class="mermaid">
${code}
    </pre>
  </div>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
</body>
</html>`;

  const dir = mkdtempSync(join(tmpdir(), "mermaid-"));
  const file = join(dir, "diagram.html");
  writeFileSync(file, html);
  return file;
}

// --- Image mode (via mermaid.ink API) ---
interface FetchOpts {
  format?: "png" | "svg";
  theme?: "default" | "dark" | "forest" | "neutral";
  bgColor?: string;
  scale?: number;
}

async function fetchImage(
  code: string,
  opts: FetchOpts = {}
): Promise<Buffer> {
  const { format = "png", theme = "default", bgColor, scale = 2 } = opts;

  // mermaid.ink accepts config via pako-compressed JSON in the URL,
  // or simpler: embed %%{init}%% directive in the code itself
  const directive = `%%{init:{"theme":"${theme}"}}%%\n`;
  const fullCode = code.startsWith("%%{") ? code : directive + code;

  const encoded = Buffer.from(fullCode).toString("base64url");
  const endpoint = format === "svg" ? "svg" : "img";

  const params = new URLSearchParams();
  if (bgColor) params.set("bgColor", bgColor);
  if (format === "png" && scale > 1) {
    params.set("width", "1600");
    params.set("scale", String(Math.min(scale, 3)));
  }

  const qs = params.toString();
  const url = `https://mermaid.ink/${endpoint}/${encoded}${qs ? "?" + qs : ""}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(
      `mermaid.ink returned ${resp.status}: ${await resp.text()}`
    );
  }
  return Buffer.from(await resp.arrayBuffer());
}

// --- Terminal image display via chafa (kitty graphics + tmux passthrough) ---
async function terminalDisplay(imagePath: string) {
  // chafa with kitty format handles tmux passthrough automatically
  try {
    await $`chafa -f kitty --passthrough=auto ${imagePath}`;
    return;
  } catch {
    // fall through
  }

  // Fallback to viu
  try {
    await $`viu -w 120 ${imagePath}`;
    return;
  } catch {
    console.log(`Image saved: ${imagePath}`);
  }
}

// --- Main ---
const [mode, ...rest] = process.argv.slice(2);

if (!mode || !["html", "image", "terminal"].includes(mode)) {
  console.error(
    "Usage: present-mermaid.ts <html|image|terminal> [--code '...'] [file.mmd] [--format png|svg] [--output path]"
  );
  process.exit(1);
}

const input = readInput(rest);

if (mode === "html") {
  const file = presentHtml(input);
  await $`open ${file}`;
  console.log(JSON.stringify({ mode: "html", path: file }));
} else if (mode === "image") {
  const format = (getFlag(rest, "--format") as "png" | "svg") || "svg";
  const output =
    getFlag(rest, "--output") ||
    join(mkdtempSync(join(tmpdir(), "mermaid-")), `diagram.${format}`);

  const data = await fetchImage(input, { format });
  writeFileSync(output, data);
  console.log(JSON.stringify({ mode: "image", format, path: resolve(output) }));
} else if (mode === "terminal") {
  // PNG from mermaid.ink (server-side browser render, includes text)
  const data = await fetchImage(input, { format: "png", theme: "default", scale: 3 });
  const tmpPath = join(
    mkdtempSync(join(tmpdir(), "mermaid-")),
    "diagram.png"
  );
  writeFileSync(tmpPath, data);
  await terminalDisplay(tmpPath);
  console.log(JSON.stringify({ mode: "terminal", path: tmpPath }));
}
