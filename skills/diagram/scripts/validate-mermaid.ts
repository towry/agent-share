#!/usr/bin/env bun
// validate-mermaid.ts — validate Mermaid diagram syntax (parse-only, no render)
// Usage: bun scripts/validate-mermaid.ts --code 'flowchart LR\n  A-->B'
//        bun scripts/validate-mermaid.ts diagram.mmd
//        bun scripts/validate-mermaid.ts README.md   (extracts ```mermaid blocks)

import { readFileSync } from "node:fs";

// --- Browser & DOMPurify stubs (mermaid is browser-first) ---
const DOMPurifyStub = {
  sanitize: (html: string) => html,
  addHook: () => {},
  removeHook: () => {},
  removeHooks: () => {},
  removeAllHooks: () => {},
  isSupported: true,
  setConfig: () => {},
};

// @ts-expect-error Bun plugin API
Bun.plugin({
  name: "dompurify-stub",
  setup(build: any) {
    build.module("dompurify", () => ({
      exports: { default: DOMPurifyStub },
      loader: "object",
    }));
  },
});

if (typeof globalThis.addEventListener === "undefined") {
  // @ts-expect-error stub
  globalThis.addEventListener = () => {};
}
if (typeof globalThis.window === "undefined") {
  // @ts-expect-error stub
  globalThis.window = globalThis;
}
if (typeof globalThis.document === "undefined") {
  // @ts-expect-error stub
  globalThis.document = {
    addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
    createElementNS: () => ({}),
    documentElement: { style: {} },
  };
}

// Dynamic import — must come after stubs
const mermaid = (await import("mermaid")).default;
mermaid.initialize({ startOnLoad: false, suppressErrorRendering: true });

// --- CLI ---
function readInput(): string {
  const args = process.argv.slice(2);
  const codeIdx = args.indexOf("--code");
  if (codeIdx !== -1 && args[codeIdx + 1]) {
    return args[codeIdx + 1].replace(/\\n/g, "\n");
  }
  if (args.length > 0 && !args[0].startsWith("-")) {
    return readFileSync(args[0], "utf8");
  }
  return readFileSync("/dev/stdin", "utf8");
}

function extractMermaidBlocks(text: string): string[] {
  const blocks: string[] = [];
  const re = /```mermaid\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

const input = readInput();
const blocks = extractMermaidBlocks(input);
// If no mermaid fences found, treat entire input as raw mermaid
const targets = blocks.length > 0 ? blocks : [input];

let allValid = true;
for (let i = 0; i < targets.length; i++) {
  const label = blocks.length > 1 ? `block ${i + 1}/${targets.length}` : undefined;
  try {
    const result = await mermaid.parse(targets[i]);
    console.log(JSON.stringify({ valid: true, diagramType: result.diagramType, ...(label && { label }) }));
  } catch (err: unknown) {
    allValid = false;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ valid: false, error: msg, ...(label && { label }) }));
  }
}

process.exit(allValid ? 0 : 1);
