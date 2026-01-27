/**
 * Explore Extension (sgrep-based semantic search)
 *
 * A codebase research tool that uses semantic search on a filtered subset of files.
 *
 * Approach:
 * 1. Caller provides keywords and semantic query
 * 2. Find files matching keywords using rg/fd
 * 3. Copy matched files to a persistent cache directory
 * 4. Run sgrep index && sgrep search on that cache dir
 * 5. Return the sgrep output
 *
 * This speeds up semantic search by limiting the files to index.
 */

import { execSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { isBlockedReadPath } from "./permission-gate.js";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// Find files matching keywords using rg and fd
async function findMatchingFiles(
  cwd: string,
  keywords: string[],
  filePatterns: string[],
  maxFiles: number = 100,
): Promise<string[]> {
  const files = new Set<string>();

  // Use rg to find files containing keywords
  // NOTE: Explicitly specify "./" to prevent rg from reading stdin (Node.js socket heuristic issue)
  if (keywords.length > 0) {
    // Escape special regex chars in keywords except | which is intentional OR
    const pattern = keywords
      .map((k) => k.replace(/[.*+?^${}()[\]\\]/g, "\\$&").replace(/\\\|/g, "|"))
      .join("|");
    const rgCmd = `rg -l --max-count=1 -e "${pattern}" --type-add 'code:*.{ts,tsx,js,jsx,vue,svelte,py,go,rs,java,c,cpp,h,hpp,rb,php,swift,kt,cs,scala,clj,ex,exs,elm,hs,ml,nim,zig,lua,sh,bash,zsh,fish,nix}' -t code ./ 2>/dev/null | head -${maxFiles}`;
    try {
      const rgResult = execSync(rgCmd, { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
      for (const f of rgResult.trim().split("\n").filter(Boolean)) {
        files.add(f);
      }
    } catch {
      // rg exits with code 1 when no matches found, ignore
    }
  }

  // Use fd to find files by name patterns
  if (filePatterns.length > 0 && files.size < maxFiles) {
    for (const pattern of filePatterns) {
      if (files.size >= maxFiles) break;
      // NOTE: Use -g for glob patterns (fd uses regex by default)
      const fdCmd = `fd -g "${pattern}" --type f ./ 2>/dev/null | head -${maxFiles - files.size}`;
      try {
        const fdResult = execSync(fdCmd, {
          cwd,
          encoding: "utf-8",
          maxBuffer: 10 * 1024 * 1024,
        });
        for (const f of fdResult.trim().split("\n").filter(Boolean)) {
          files.add(f);
        }
      } catch {
        // fd may fail if no matches, ignore
      }
    }
  }

  // Filter out blocked paths (security: prevent bypassing permission-gate)
  const filtered = Array.from(files).filter((f) => {
    const absPath = path.resolve(cwd, f);
    return !isBlockedReadPath(absPath);
  });

  return filtered.slice(0, maxFiles);
}

// Get a deterministic cache directory for a project
// NOTE: Uses project directory name for easy identification
function getExploreCacheDir(cwd: string): string {
  const projectName = path.basename(cwd);
  const cacheDir = path.join(os.tmpdir(), `pi-explore-${projectName}`);
  fs.mkdirSync(cacheDir, { recursive: true });
  return cacheDir;
}

// Copy files to cache directory preserving structure (incremental)
// NOTE: Only copies files that are newer than cached version
function copyFilesToCache(cwd: string, files: string[], cacheDir: string): number {
  let copied = 0;

  for (const file of files) {
    const srcPath = path.join(cwd, file);
    const destPath = path.join(cacheDir, file);

    try {
      // Check if we need to copy (file doesn't exist or is older)
      let needsCopy = true;
      try {
        const srcStat = fs.statSync(srcPath);
        const destStat = fs.statSync(destPath);
        needsCopy = srcStat.mtimeMs > destStat.mtimeMs;
      } catch {
        // Dest doesn't exist, need to copy
      }

      if (needsCopy) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        copied++;
      }
    } catch {
      // Skip files that can't be copied
    }
  }

  return copied;
}

// Run a command asynchronously with abort support
function runCommandAsync(
  command: string,
  args: string[],
  options: { timeout?: number; signal?: AbortSignal },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    // Handle abort signal
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        killed = true;
        proc.kill("SIGTERM");
        reject(new Error("Aborted"));
      });
    }

    // Timeout
    const timeoutId = options.timeout
      ? setTimeout(() => {
          killed = true;
          proc.kill("SIGTERM");
          reject(new Error(`Timeout after ${options.timeout}ms`));
        }, options.timeout)
      : undefined;

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (killed) return;
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Exit code ${code}: ${stderr}`));
      }
    });

    proc.on("error", (err) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!killed) reject(err);
    });
  });
}

// Run sgrep index and search (async with progress)
async function runSgrepSearch(
  cacheDir: string,
  semanticQuery: string,
  signal?: AbortSignal,
  onProgress?: (stage: "indexing" | "searching") => void,
): Promise<{ output: string; error?: string }> {
  // Index the cache directory (incremental)
  onProgress?.("indexing");
  try {
    await runCommandAsync("sgrep", ["index", "--quiet", cacheDir], {
      timeout: 60000,
      signal,
    });
  } catch (err) {
    if (signal?.aborted) return { output: "", error: "Aborted" };
    const errMsg = err instanceof Error ? err.message : String(err);
    return { output: "", error: `sgrep index failed: ${errMsg}` };
  }

  // Search
  onProgress?.("searching");
  try {
    const { stdout } = await runCommandAsync(
      "sgrep",
      ["search", "--path", cacheDir, "--limit", "20", "--json", semanticQuery],
      { timeout: 30000, signal },
    );
    return { output: stdout };
  } catch (err) {
    if (signal?.aborted) return { output: "", error: "Aborted" };
    const errMsg = err instanceof Error ? err.message : String(err);
    return { output: "", error: `sgrep search failed: ${errMsg}` };
  }
}

// Format sgrep JSON output to readable text
function formatSgrepOutput(jsonOutput: string, cacheDir: string): string {
  try {
    const data = JSON.parse(jsonOutput);
    const results = data.results;
    if (!Array.isArray(results) || results.length === 0) {
      return "(no semantic matches found)";
    }

    const lines: string[] = ["## Semantic Search Results\n"];

    for (const result of results) {
      // Remove cacheDir prefix from path for cleaner output
      const filePath = result.path?.replace(cacheDir + "/", "") || "unknown";
      const score = result.score ? `(score: ${result.score.toFixed(3)})` : "";
      const lineRange = result.start_line
        ? result.end_line && result.end_line !== result.start_line
          ? `:${result.start_line}-${result.end_line}`
          : `:${result.start_line}`
        : "";

      lines.push(`### \`${filePath}${lineRange}\` ${score}\n`);

      if (result.snippet) {
        const lang = result.language || "";
        lines.push(`\`\`\`${lang}`);
        lines.push(result.snippet.trim());
        lines.push("```\n");
      }
    }

    // Add search metadata
    if (data.duration_ms) {
      lines.push(`\n*Search completed in ${data.duration_ms}ms*`);
    }

    return lines.join("\n");
  } catch {
    // If not valid JSON, return as-is
    return jsonOutput || "(no output)";
  }
}

interface ExploreDetails {
  prompt: string;
  keywords: string[];
  filePatterns: string[];
  semanticQuery: string;
  filesFound?: number;
  durationMs?: number;
  error?: boolean;
}

export default function (pi: ExtensionAPI) {
  // Register /explore command
  pi.registerCommand("explore", {
    description: "Research codebase (semantic search)",
    handler: async (args, ctx) => {
      const prompt = args.trim();
      if (!prompt) {
        if (ctx.hasUI) {
          ctx.ui.notify("Usage: /explore <prompt>", "error");
        }
        return;
      }

      // Send user message to trigger model to use explore tool
      pi.sendUserMessage(`Use the explore tool to research: ${prompt}`);
    },
  });

  // Register explore tool (model-callable)
  const ExploreParams = Type.Object({
    prompt: Type.String({
      description: "The original question/request about the codebase",
    }),
    keywords: Type.Array(Type.String(), {
      description:
        "Keywords/patterns for grep search. Use | for OR patterns (e.g., 'login|signin|auth'). Include function names, domain terms, and synonyms.",
    }),
    filePatterns: Type.Array(Type.String(), {
      description:
        "Glob patterns for file NAME search (e.g., '*login*', '*auth*'). Must contain specific text, NOT just extensions like '*.sh' or '*.ts' (those are filtered out).",
    }),
    semanticQuery: Type.String({
      description:
        "A descriptive query optimized for semantic/embedding search. Describe WHAT the code does, not just names.",
    }),
  });

  // Filter out broad extension-only patterns like "*.sh", "*.ts", "*.fish"
  // These match too many files and defeat the purpose of filtering
  const filterBroadPatterns = (patterns: string[]): string[] =>
    patterns.filter((p) => !/^\*\.[a-zA-Z0-9]+$/.test(p));

  pi.registerTool({
    name: "explore",
    label: "Explore Codebase",
    description: `Explore the codebase using semantic search. Finds files matching keywords, then runs semantic search on them.

You MUST provide:
- keywords: Array of grep patterns (use | for OR, e.g., ["login|signin", "auth|authenticate"]). Be SPECIFIC - avoid generic terms like "data", "component", "view".
- filePatterns: Array of glob patterns for file NAMES. Must be SPECIFIC to the search topic (e.g., ["*login*", "*auth*"]). AVOID generic patterns like "*dialog*", "*component*", "*view*", "*modal*" - they match too many files. Only use patterns that include the actual feature/domain name.
- semanticQuery: Descriptive query for semantic search (e.g., "Vue component handling user login form submission")

Example for "find privacy dialog":
{
  "prompt": "Find privacy dialog",
  "keywords": ["privacy|隐私", "privacy.?policy|隐私政策"],
  "filePatterns": ["*privacy*", "*Privacy*"],
  "semanticQuery": "Vue component showing privacy policy or data privacy agreement in a dialog"
}

BAD filePatterns: ["*dialog*", "*component*", "*view*", "*modal*"] - too generic!
GOOD filePatterns: ["*privacy*", "*login*", "*auth*"] - specific to the feature!`,
    parameters: ExploreParams,

    async execute(_toolCallId, params, onUpdate, ctx, signal) {
      const p = params as {
        prompt: string;
        keywords: string[];
        filePatterns: string[];
        semanticQuery: string;
      };
      const startTime = Date.now();
      let spinnerFrame = 0;

      // Filter out broad extension patterns
      const filteredFilePatterns = filterBroadPatterns(p.filePatterns ?? []);

      // Helper to show progress with spinner
      const showProgress = (message: string, filesFound?: number) => {
        if (!onUpdate) return;
        const spinner = SPINNER_FRAMES[spinnerFrame % SPINNER_FRAMES.length];
        spinnerFrame++;
        onUpdate({
          content: [{ type: "text", text: `${spinner} ${message}` }],
          details: { ...p, filesFound } as ExploreDetails,
        });
      };

      // Validate inputs
      if (!p.keywords?.length && !p.filePatterns?.length) {
        return {
          content: [{ type: "text", text: "Error: Must provide keywords or filePatterns" }],
          details: { ...p, error: true } as ExploreDetails,
          isError: true,
        };
      }

      if (!p.semanticQuery?.trim()) {
        return {
          content: [{ type: "text", text: "Error: Must provide semanticQuery" }],
          details: { ...p, error: true } as ExploreDetails,
          isError: true,
        };
      }

      // Step 1: Find matching files
      showProgress("Searching files...");

      const matchedFiles = await findMatchingFiles(ctx.cwd, p.keywords, filteredFilePatterns, 100);

      if (matchedFiles.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No files found matching keywords: ${p.keywords.join(", ")}\n\nTry different keywords or file patterns.`,
            },
          ],
          details: {
            ...p,
            filesFound: 0,
            durationMs: Date.now() - startTime,
          } as ExploreDetails,
        };
      }

      // Step 2: Copy files to cache directory
      showProgress(`Copying ${matchedFiles.length} files...`, matchedFiles.length);

      const cacheDir = getExploreCacheDir(ctx.cwd);
      copyFilesToCache(ctx.cwd, matchedFiles, cacheDir);

      // Step 3: Run sgrep index and search with progress updates
      // Start a spinner interval for long-running operations
      let progressInterval: ReturnType<typeof setInterval> | undefined;
      let currentStage = "indexing";

      if (onUpdate) {
        progressInterval = setInterval(() => {
          const stageText = currentStage === "indexing" ? "Indexing" : "Searching";
          showProgress(`${stageText} ${matchedFiles.length} files...`, matchedFiles.length);
        }, 100); // Update spinner every 100ms
      }

      const sgrepResult = await runSgrepSearch(cacheDir, p.semanticQuery, signal, (stage) => {
        currentStage = stage;
      });

      if (progressInterval) clearInterval(progressInterval);

      if (sgrepResult.error) {
        return {
          content: [{ type: "text", text: sgrepResult.error }],
          details: {
            ...p,
            filesFound: matchedFiles.length,
            durationMs: Date.now() - startTime,
            error: true,
          } as ExploreDetails,
          isError: true,
        };
      }

      // Step 4: Format and return results
      const formattedOutput = formatSgrepOutput(sgrepResult.output, cacheDir);

      const summary = `### Search Info
- **Query**: ${p.prompt}
- **Semantic Query**: ${p.semanticQuery}
- **Keywords**: ${p.keywords.join(", ")}
- **Files Searched**: ${matchedFiles.length}

${formattedOutput}`;

      return {
        content: [{ type: "text", text: summary }],
        details: {
          ...p,
          filesFound: matchedFiles.length,
          durationMs: Date.now() - startTime,
        } as ExploreDetails,
      };
    },

    renderCall(args, theme) {
      const a = args as { prompt?: string; semanticQuery?: string };
      const query = a.semanticQuery ?? a.prompt ?? "...";
      const preview = query.length > 50 ? `${query.slice(0, 50)}...` : query;
      return new Text(
        theme.fg("toolTitle", theme.bold("explore ")) + theme.fg("accent", preview),
        0,
        0,
      );
    },

    renderResult(result, { expanded }, theme) {
      const details = result.details as ExploreDetails | undefined;
      const mdTheme = getMarkdownTheme();

      if (details?.error) {
        return new Text(
          theme.fg("warning", "⚠ " + (result.content[0] as { text: string }).text),
          0,
          0,
        );
      }

      const resultText = (result.content[0] as { text: string })?.text ?? "";

      if (expanded) {
        const container = new Container();

        // Header
        let header = theme.fg("success", "✓ ") + theme.fg("toolTitle", theme.bold("explore"));
        if (details?.filesFound !== undefined)
          header += theme.fg("dim", ` ${details.filesFound} files`);
        if (details?.durationMs) {
          const secs = (details.durationMs / 1000).toFixed(1);
          header += theme.fg("dim", ` ${secs}s`);
        }
        container.addChild(new Text(header, 0, 0));

        // Search info
        if (details?.keywords?.length) {
          container.addChild(new Spacer(1));
          container.addChild(
            new Text(
              theme.fg("muted", "Keywords: ") +
                theme.fg("dim", details.keywords.slice(0, 5).join(", ")),
              0,
              0,
            ),
          );
        }
        if (details?.semanticQuery) {
          container.addChild(
            new Text(
              theme.fg("muted", "Semantic: ") + theme.fg("dim", details.semanticQuery.slice(0, 60)),
              0,
              0,
            ),
          );
        }

        // Result
        container.addChild(new Spacer(1));
        container.addChild(new Text(theme.fg("muted", "─── Results ───"), 0, 0));
        container.addChild(new Markdown(resultText.trim(), 0, 0, mdTheme));

        return container;
      }

      // Collapsed view
      let text = theme.fg("success", "✓ ") + theme.fg("toolTitle", theme.bold("explore"));
      if (details?.filesFound !== undefined)
        text += theme.fg("dim", ` ${details.filesFound} files`);
      if (details?.durationMs) {
        const secs = (details.durationMs / 1000).toFixed(1);
        text += theme.fg("dim", ` ${secs}s`);
      }

      const lines = resultText.split("\n").slice(0, 5);
      text += `\n${theme.fg("toolOutput", lines.join("\n"))}`;
      if (resultText.split("\n").length > 5) text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;

      return new Text(text, 0, 0);
    },
  });
}
