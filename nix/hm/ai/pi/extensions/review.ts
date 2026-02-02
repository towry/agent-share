/**
 * Review Extension
 *
 * Provides both a tool (model-callable) and command (user-callable) for
 * reviewing recent session activity:
 * - Code changes (writes, edits)
 * - Decisions made in conversation
 * - Potential issues or improvements
 *
 * Usage:
 *   /review                          - Review all session activity
 *   /review code                     - Focus on code changes
 *   /review decisions                - Focus on conversation decisions
 *   /review check for security issues - Custom review instructions
 *   /review lifeguard                - Review against closest lifeguard.yaml
 *   /review lifeguard frontend/      - Review against frontend/lifeguard.yaml
 *   /review lifeguard path/to/rules.yaml - Use specific config file
 *
 * API Notes:
 *   To append a message without triggering LLM completion, use:
 *   ```typescript
 *   ctx.sendMessage(
 *     { customType: "review-result", content: [...], display: "..." },
 *     { triggerTurn: false }
 *   );
 *   ```
 *   Options:
 *   - triggerTurn: false - append without triggering LLM
 *   - triggerTurn: true (default) - triggers LLM response
 *   - deliverAs: "steer" | "followUp" | "nextTurn" - controls delivery timing
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ModelRegistry,
  SessionEntry,
  SessionMessageEntry,
} from "@mariozechner/pi-coding-agent";
import { convertToLlm } from "@mariozechner/pi-coding-agent";
import { serializeConversationCompact } from "./utils/serialize.js";
import { Text } from "@mariozechner/pi-tui";
import {
  runPiJsonAgent,
  runPiJsonAgentWithUI,
  getFinalAssistantText,
  getToolCalls,
  formatToolCallLine,
  type RunAgentResult,
} from "./utils/agent.js";
import { getRuntimeModelConfig } from "../agents/extension-models.js";

const VCS_CONTEXT_SCRIPT = path.join(
  process.env.HOME ?? "",
  ".claude/skills/git-jj/scripts/review_vcs_context.sh",
);

function getReviewModel(registry: ModelRegistry) {
  const { provider, model } = getRuntimeModelConfig("REVIEW");
  const models = registry.getAvailable();
  return models.find((m) => m.provider === provider && m.id === model) ?? null;
}

type ReviewFocus = "all" | "code" | "decisions" | "lifeguard";

/**
 * Get list of changed files from VCS (git or jj).
 * Returns empty array if no VCS or no changes.
 */
function getChangedFiles(cwd: string): string[] {
  try {
    // Try jj first
    const jjOutput = execSync("jj diff --name-only 2>/dev/null", {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    if (jjOutput) {
      return jjOutput.split("\n").filter((f) => f.length > 0);
    }
  } catch {
    // jj not available or failed
  }

  try {
    // Try git
    const gitOutput = execSync("git diff --name-only HEAD 2>/dev/null", {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    if (gitOutput) {
      return gitOutput.split("\n").filter((f) => f.length > 0);
    }
  } catch {
    // git not available or failed
  }

  return [];
}

/**
 * Get VCS context (status only) by running the review_vcs_context.sh script.
 * Returns empty string if script fails or no repo detected.
 */
function getVcsContext(cwd: string): string {
  if (!fs.existsSync(VCS_CONTEXT_SCRIPT)) {
    return "";
  }
  try {
    const output = execSync(`bash "${VCS_CONTEXT_SCRIPT}"`, {
      cwd,
      encoding: "utf-8",
      timeout: 10000,
      maxBuffer: 1024 * 1024, // 1MB
    });
    return output.trim();
  } catch {
    return "";
  }
}

const REVIEW_TOOLING_PROMPT = `You are a session review assistant running in STRICT READ-ONLY mode.

## AVAILABLE and only allowed TOOLS
- \`read\` - Read file contents (READ-ONLY)
- \`bash\` - Run shell commands (READ-ONLY commands only)
- \`ls\` - List directory contents (READ-ONLY)
- \`grep\` - Search file contents (READ-ONLY)
- \`find\` - Find files and directories (READ-ONLY)

## CRITICAL: OUTPUT FORMAT
- After using tools, produce ONLY your final review as markdown
- Do NOT include your reasoning, verification steps, or "I will now..." statements
- Do NOT wrap your review in code blocks - output markdown directly
- Start your final response with the review content immediately

## CRITICAL: READ-ONLY ENFORCEMENT
You are operating in a READ-ONLY context. You MUST NOT modify any files or repository state.

### ALLOWED bash commands (read-only):
- File inspection with bash tool: ls, head, tail, wc, file, stat
- Builtin read tool
- Search: rg, grep, fd, find, ag
- Git read-only: git status, git diff, git log, git show, git branch -l
- Jj read-only: jj status, jj diff, jj log, jj show
- Other read-only: pwd, echo (without >), env, which, type

### FORBIDDEN bash commands (will modify state):
- File modification: rm, mv, cp, mkdir, touch, chmod, chown
- Redirects: >, >>, |>, tee (with file output)
- Git write: git add, git commit, git push, git checkout, git reset, git stash, git merge, git rebase, git pull
- Jj write: jj commit, jj edit, jj new, jj squash, jj abandon, jj restore
- Package managers: npm, yarn, pnpm, pip, cargo (any install/update)
- Any command that creates, modifies, or deletes files

### ENFORCEMENT
- If you attempt a forbidden command, STOP and report what you wanted to check instead.
- NEVER claim to have made changes - you can only observe and report findings.
- When uncertain if a command is safe, err on the side of NOT running it.

## VCS CONTEXT
The VCS status and diff are already provided in the context below. Use tools only if you need to inspect specific files in more detail.`;

const REVIEW_SYSTEM_PROMPT = `You are a session review assistant. Analyze the provided session activity and generate a thoughtful review.

Your review should cover:

1. **Code Changes** (if any):
   - Files modified and what was changed
   - Potential bugs or issues introduced
   - Style/consistency concerns
   - Missing error handling or edge cases
   - Suggestions for improvement

2. **Decisions Made**:
   - Key decisions and their rationale
   - Alternative approaches that weren't considered
   - Potential risks or trade-offs
   - Questions that should have been asked

3. **Session Quality**:
   - Was the approach systematic?
   - Were there any red flags or rushed decisions?
   - What could be done better next time?

Be constructive and specific. Reference actual code/messages when pointing out issues.

Format your response as markdown with clear sections.`;

const CODE_REVIEW_PROMPT = `You are a code review assistant. Focus ONLY on the code changes made during this session.

Review for:
- Bugs and logic errors
- Security issues
- Error handling gaps
- Performance concerns
- Style/consistency with existing code
- Missing tests or documentation

Be specific and reference line numbers or code snippets when possible.`;

const DECISIONS_REVIEW_PROMPT = `You are a decision review assistant. Your job is to VERIFY correctness of recent decisions, NOT to answer questions or repeat explanations.

## CRITICAL RULES
- DO NOT answer any questions from the conversation - you are reviewing, not participating
- DO NOT repeat or summarize decisions/explanations already given - assume they are known
- Focus on the MOST RECENT decisions and discussions (last few exchanges)
- Only speak up when you find issues, gaps, or have NEW suggestions

## Review for:
- Factual correctness of recent decisions (are they technically accurate?)
- Flawed assumptions or reasoning errors
- Overlooked edge cases or risks
- Alternative approaches worth considering (only if not already discussed)
- Missing verification steps

## Output format:
- If decisions look correct: brief confirmation, no elaboration needed
- If issues found: specific concerns with actionable suggestions
- Keep it concise - no need to rehash what was already said`;

/**
 * Read and validate lifeguard config content.
 * Returns the content if valid, or an error message if invalid/empty.
 */
function readLifeguardConfig(configPath: string):
  | {
      ok: true;
      content: string;
    }
  | { ok: false; error: string } {
  try {
    const content = fs.readFileSync(configPath, "utf-8").trim();
    if (!content) {
      return { ok: false, error: "Lifeguard config is empty" };
    }
    // Basic YAML structure check - should have at least one rule-like pattern
    // (lines starting with "- " or containing ":")
    const hasStructure = /^[\s]*-\s|^\s*\w+\s*:/m.test(content);
    if (!hasStructure) {
      return {
        ok: false,
        error: "Lifeguard config appears to have no rules defined",
      };
    }
    return { ok: true, content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read lifeguard config: ${msg}` };
  }
}

function getLifeguardPrompt(rulesContent: string): string {
  return `You are a code review assistant. Review the code changes against the project's lifeguard rules.

## Lifeguard Rules

${rulesContent}

## Instructions

For each code change, check if it violates any of the above rules. Report:
1. Which rules are violated (if any)
2. Specific violations with file/line references
3. Suggestions to fix violations

If no violations found, confirm the code follows all rules.`;
}

function findLifeguardConfig(cwd: string): string | null {
  for (const name of ["lifeguard.yaml", "lifeguard.yml"]) {
    const p = path.join(cwd, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Find the closest lifeguard config by walking up from a file's directory.
 * Stops at repoRoot to avoid searching beyond the repository.
 */
function findLifeguardConfigForFile(filePath: string, repoRoot: string): string | null {
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
  let dir = path.dirname(absPath);
  const normalizedRoot = path.resolve(repoRoot);

  while (dir.startsWith(normalizedRoot) || dir === normalizedRoot) {
    for (const name of ["lifeguard.yaml", "lifeguard.yml"]) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) return p;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}

// NOTE: groupFilesByLifeguardConfig can be used for advanced per-file config grouping
// when reviewing multiple files from different subdirectories with different configs.
// Keeping findLifeguardConfigForFile available for future use.

type SessionAgentMessage = SessionMessageEntry["message"];

interface ExtractedToolCall {
  toolName: string;
  input: Record<string, unknown>;
  result?: string;
}

function getMessagesFromEntries(entries: SessionEntry[]): SessionAgentMessage[] {
  return entries
    .filter((e): e is SessionMessageEntry => e.type === "message")
    .map((e) => e.message);
}

function extractToolCallsFromMessages(messages: SessionAgentMessage[]): ExtractedToolCall[] {
  const toolCalls: ExtractedToolCall[] = [];
  const pendingCalls = new Map<string, ExtractedToolCall>();

  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "toolCall"
        ) {
          const toolBlock = block as {
            type: "toolCall";
            id: string;
            name: string;
            arguments: Record<string, unknown>;
          };
          const call: ExtractedToolCall = {
            toolName: toolBlock.name,
            input: toolBlock.arguments,
          };
          pendingCalls.set(toolBlock.id, call);
          toolCalls.push(call);
        }
      }
    } else if (msg.role === "toolResult" && "toolCallId" in msg) {
      const toolResultMsg = msg as {
        toolCallId: string;
        content: Array<{ type: string; text?: string }>;
      };
      const call = pendingCalls.get(toolResultMsg.toolCallId);
      if (call && Array.isArray(toolResultMsg.content)) {
        const textContent = toolResultMsg.content.find(
          (c) => c.type === "text" && typeof c.text === "string",
        );
        if (textContent && textContent.text) {
          call.result = textContent.text;
        }
      }
    }
  }

  return toolCalls;
}

function extractCodeChanges(toolCalls: ExtractedToolCall[]): string[] {
  const changes: string[] = [];

  for (const call of toolCalls) {
    const { toolName, input, result } = call;

    if (toolName === "write" || toolName === "edit") {
      const path = input?.path as string | undefined;
      const content = input?.content as string | undefined;
      const oldText = input?.oldText as string | undefined;
      const newText = input?.newText as string | undefined;

      if (toolName === "write" && path) {
        const preview = content ? content.slice(0, 500) : "";
        changes.push(
          `**Write: ${path}**\n\`\`\`\n${preview}${
            content && content.length > 500 ? "\n...(truncated)" : ""
          }\n\`\`\``,
        );
      } else if (toolName === "edit" && path) {
        changes.push(
          `**Edit: ${path}**\nOld:\n\`\`\`\n${
            oldText ?? ""
          }\n\`\`\`\nNew:\n\`\`\`\n${newText ?? ""}\n\`\`\``,
        );
      }
    }

    if (toolName === "bash") {
      const command = input?.command as string | undefined;
      if (command && /\b(git\s+commit|git\s+add|rm\s+-|mv\s+|cp\s+)/.test(command)) {
        const output = typeof result === "string" ? result.slice(0, 300) : "";
        changes.push(`**Bash: ${command}**\n${output ? `Output: ${output}` : ""}`);
      }
    }
  }

  return changes;
}

function getSystemPrompt(
  focus: ReviewFocus,
  customInstructions?: string,
  overrideSystemPrompt?: string,
): string {
  let basePrompt: string;
  switch (focus) {
    case "code":
      basePrompt = CODE_REVIEW_PROMPT;
      break;
    case "decisions":
      basePrompt = DECISIONS_REVIEW_PROMPT;
      break;
    default:
      basePrompt = REVIEW_SYSTEM_PROMPT;
  }

  if (overrideSystemPrompt) basePrompt = overrideSystemPrompt;

  if (customInstructions) {
    basePrompt = `${basePrompt}\n\n## Additional Instructions from User\n\n${customInstructions}`;
  }

  return `${REVIEW_TOOLING_PROMPT}\n\n${basePrompt}`;
}

function buildReviewContext(
  focus: ReviewFocus,
  conversationText: string,
  codeChanges: string[],
  vcsContext: string,
): string {
  const contextParts: string[] = [];

  if (focus === "all" || focus === "decisions") {
    contextParts.push("## Conversation\n\n" + conversationText);
  }

  if (focus === "all" || focus === "code") {
    if (codeChanges.length > 0) {
      contextParts.push("## Session Code Changes (from tool calls)\n\n" + codeChanges.join("\n\n"));
    }
    if (vcsContext) {
      contextParts.push(vcsContext);
    }
    contextParts.push(
      "## Repo Inspection\n\nUse `jj diff --git` or `git diff` to inspect specific files if needed. Use `read` tool to view file contents.",
    );
  }

  return contextParts.join("\n\n---\n\n");
}

async function runReview(
  ctx: ExtensionCommandContext,
  focus: ReviewFocus,
  customInstructions?: string,
  overrideSystemPrompt?: string,
): Promise<RunAgentResult | null> {
  const reviewModel = getReviewModel(ctx.modelRegistry);
  if (!reviewModel) {
    const { provider, model } = getRuntimeModelConfig("REVIEW");
    ctx.ui.notify(`Review model not found: ${provider}/${model}`, "error");
    return null;
  }

  const entries = ctx.sessionManager.getBranch() as SessionEntry[];
  const messages = getMessagesFromEntries(entries);
  const toolCalls = extractToolCallsFromMessages(messages);

  if (messages.length === 0) {
    ctx.ui.notify("No conversation to review", "error");
    return null;
  }

  const llmMessages = convertToLlm(messages);
  const conversationText = serializeConversationCompact(llmMessages);
  const codeChanges = extractCodeChanges(toolCalls);
  const vcsContext = getVcsContext(ctx.cwd);
  const reviewContext = buildReviewContext(focus, conversationText, codeChanges, vcsContext);

  if (!reviewContext) {
    if (focus === "code") {
      ctx.ui.notify("No code changes found. Try /review or /review decisions", "error");
    } else {
      ctx.ui.notify("Nothing to review for the selected focus", "error");
    }
    return null;
  }

  const systemPrompt = getSystemPrompt(focus, customInstructions, overrideSystemPrompt);

  const focusLabel = focus === "all" ? "session" : focus;
  const result = await runPiJsonAgentWithUI(ctx, {
    cwd: ctx.cwd,
    prompt: reviewContext,
    systemPrompt,
    replaceSystemPrompt: true,
    provider: reviewModel.provider,
    model: reviewModel.id,
    tools: "read,bash,ls,grep,find",
    title: `Reviewing ${focusLabel}`,
    extraArgs: ["--no-extensions"],
  });

  if (result.stopReason === "aborted") return null;
  return result;
}

export default function (pi: ExtensionAPI) {
  // Register /review command
  pi.registerCommand("review", {
    description: "Review session activity. Usage: /review [code|decisions|lifeguard [path]]",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("review requires interactive mode", "error");
        return;
      }

      const arg = args.trim();
      const argLower = arg.toLowerCase();

      // Handle /review lifeguard [path] [instructions]
      // Supports:
      //   /review lifeguard                     - use closest lifeguard.yaml
      //   /review lifeguard frontend/           - use frontend/lifeguard.yaml
      //   /review lifeguard check security      - with custom instructions
      if (argLower === "lifeguard" || argLower.startsWith("lifeguard ")) {
        const lifeguardArgs = arg.slice(10).trim(); // after "lifeguard "
        let lifeguardPath: string | null = null;
        let customInstructions: string | undefined;

        if (lifeguardArgs) {
          // Check if first arg is a path to lifeguard config or directory
          const parts = lifeguardArgs.split(/\s+/);
          const firstArg = parts[0] ?? "";
          const potentialPath = path.resolve(ctx.cwd, firstArg);

          if (
            firstArg &&
            fs.existsSync(potentialPath) &&
            fs.statSync(potentialPath).isFile() &&
            (firstArg.endsWith(".yaml") || firstArg.endsWith(".yml"))
          ) {
            // Explicit path to config file
            lifeguardPath = potentialPath;
            customInstructions = lifeguardArgs.slice(firstArg.length).trim() || undefined;
          } else if (
            firstArg &&
            fs.existsSync(potentialPath) &&
            fs.statSync(potentialPath).isDirectory()
          ) {
            // Directory path - look for lifeguard config in it
            lifeguardPath = findLifeguardConfig(potentialPath);
            if (!lifeguardPath) {
              ctx.ui.notify(`No lifeguard.yaml found in ${firstArg}`, "error");
              return;
            }
            customInstructions = lifeguardArgs.slice(firstArg.length).trim() || undefined;
          } else {
            // Not a path, treat as custom instructions
            lifeguardPath = findLifeguardConfig(ctx.cwd);
            customInstructions = lifeguardArgs;
          }
        } else {
          // No explicit path - try to find config based on changed files
          const changedFiles = getChangedFiles(ctx.cwd);
          const firstFile = changedFiles[0];
          if (firstFile) {
            // Use the first changed file to find closest config
            lifeguardPath = findLifeguardConfigForFile(firstFile, ctx.cwd);
          }
          // Fall back to cwd if no changed files or no config found for them
          if (!lifeguardPath) {
            lifeguardPath = findLifeguardConfig(ctx.cwd);
          }
        }

        if (!lifeguardPath) {
          ctx.ui.notify(
            "No lifeguard.yaml or lifeguard.yml found. Use: /review lifeguard <path>",
            "error",
          );
          return;
        }

        const configResult = readLifeguardConfig(lifeguardPath);
        if (!configResult.ok) {
          ctx.ui.notify(configResult.error, "error");
          return;
        }

        const configDir = path.relative(ctx.cwd, path.dirname(lifeguardPath)) || ".";
        const review = await runReview(
          ctx,
          "code",
          customInstructions,
          getLifeguardPrompt(configResult.content),
        );

        if (review === null) {
          ctx.ui.notify("Review cancelled", "info");
          return;
        }

        const reviewText = getFinalAssistantText(review.messages);

        if (!reviewText) {
          const toolCalls = getToolCalls(review.messages);
          if (toolCalls.length > 0) {
            ctx.ui.notify(
              `Lifeguard review made ${toolCalls.length} tool calls but produced no summary.`,
              "warning",
            );
          } else {
            ctx.ui.notify("Lifeguard review produced no output.", "warning");
          }
          return;
        }

        const headerNote = configDir !== "." ? ` (using ${configDir}/lifeguard.yaml)` : "";
        ctx.ui.setEditorText(`Here's the lifeguard review${headerNote}:\n\n${reviewText}`);
        ctx.ui.notify("Lifeguard review ready. Edit and submit to add to conversation.", "info");
        return;
      }

      // Parse focus and custom instructions
      let focus: ReviewFocus = "all";
      let customInstructions: string | undefined;

      if (argLower === "code") {
        focus = "code";
      } else if (argLower === "decisions") {
        focus = "decisions";
      } else if (argLower.startsWith("code ")) {
        focus = "code";
        customInstructions = arg.slice(5).trim();
      } else if (argLower.startsWith("decisions ")) {
        focus = "decisions";
        customInstructions = arg.slice(10).trim();
      } else if (arg) {
        // Treat entire arg as custom instructions
        customInstructions = arg;
      }

      const review = await runReview(ctx, focus, customInstructions);

      if (review === null) {
        ctx.ui.notify("Review cancelled", "info");
        return;
      }

      const reviewText = getFinalAssistantText(review.messages);

      if (!reviewText) {
        // Agent completed but produced no text output - show diagnostic info
        const toolCalls = getToolCalls(review.messages);
        const msgCount = review.messages.length;
        const stopReason = review.stopReason || "unknown";
        ctx.ui.notify(
          `Review empty: ${msgCount} msgs, ${toolCalls.length} tools, stop=${stopReason}. Model may need explicit instruction to summarize.`,
          "warning",
        );
        return;
      }

      // Display review and offer to add to conversation
      ctx.ui.setEditorText(`Here's the review of our session:\n\n${reviewText}`);
      ctx.ui.notify("Review ready. Edit and submit to add to conversation.", "info");
    },
  });

  // Register review tool (model-callable)
  const ReviewParams = Type.Object({
    focus: Type.Optional(
      StringEnum(["all", "code", "decisions", "lifeguard"] as const, {
        description:
          "What to focus the review on. 'lifeguard' reviews against project lifeguard.yaml rules. Default: all",
      }),
    ),
    reason: Type.Optional(Type.String({ description: "Why the review is being requested" })),
    filePaths: Type.Optional(
      Type.Array(Type.String(), {
        description:
          "Specific file paths to review. If provided, only these files will be reviewed instead of all unstaged changes. Use this to avoid re-reviewing files that were already reviewed. For lifeguard focus, also determines which lifeguard.yaml to use (closest to first file).",
      }),
    ),
    lifeguardPath: Type.Optional(
      Type.String({
        description:
          "Path to lifeguard.yaml config file or directory containing it. Only used when focus is 'lifeguard'. If not provided, finds closest config to changed files.",
      }),
    ),
  });

  pi.registerTool({
    name: "review",
    label: "Review Session",
    description:
      "Run a read-only review of the current session. The reviewer checks conversation context plus repo diffs to flag bugs, risks, and missing steps. Use focus to narrow scope ('code', 'decisions', or 'lifeguard'). For 'lifeguard', reviews against project lifeguard.yaml rules - auto-detects closest config to changed files, or use lifeguardPath to specify. Pass filePaths to limit review to specific files.",
    parameters: ReviewParams,

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const p = params as {
        focus?: ReviewFocus;
        reason?: string;
        filePaths?: string[];
        lifeguardPath?: string;
      };
      const focus = p.focus ?? "all";
      const filePaths = p.filePaths;
      let customInstructions = p.reason;

      // Add file path constraint to instructions if provided
      if (filePaths && filePaths.length > 0) {
        const fileList = filePaths.join(", ");
        const fileConstraint = `\n\nIMPORTANT: Only review these specific files: ${fileList}. Do not review other unstaged changes.`;
        customInstructions = customInstructions
          ? customInstructions + fileConstraint
          : fileConstraint;
      }

      // Handle lifeguard focus - find config and build prompt
      let lifeguardPrompt: string | undefined;
      if (focus === "lifeguard") {
        let configPath: string | null = null;

        if (p.lifeguardPath) {
          // Explicit path provided
          const resolvedPath = path.resolve(ctx.cwd, p.lifeguardPath);
          if (fs.existsSync(resolvedPath)) {
            if (fs.statSync(resolvedPath).isDirectory()) {
              configPath = findLifeguardConfig(resolvedPath);
            } else {
              configPath = resolvedPath;
            }
          }
        } else {
          // Auto-detect from filePaths or changed files
          const targetFile = filePaths?.[0] ?? getChangedFiles(ctx.cwd)[0];
          if (targetFile) {
            configPath = findLifeguardConfigForFile(targetFile, ctx.cwd);
          }
          if (!configPath) {
            configPath = findLifeguardConfig(ctx.cwd);
          }
        }

        if (!configPath) {
          return {
            content: [
              {
                type: "text",
                text: "No lifeguard.yaml found. Provide lifeguardPath or ensure config exists in project.",
              },
            ],
            details: { error: true },
          };
        }

        const configResult = readLifeguardConfig(configPath);
        if (!configResult.ok) {
          return {
            content: [{ type: "text", text: configResult.error }],
            details: { error: true },
          };
        }
        lifeguardPrompt = getLifeguardPrompt(configResult.content);
      }

      const reviewModel = getReviewModel(ctx.modelRegistry);
      if (!reviewModel) {
        const { provider, model } = getRuntimeModelConfig("REVIEW");
        return {
          content: [
            {
              type: "text",
              text: `Review model not found: ${provider}/${model}`,
            },
          ],
          details: { error: true },
        };
      }

      const entries = ctx.sessionManager.getBranch() as SessionEntry[];
      const messages = getMessagesFromEntries(entries);
      const toolCalls = extractToolCallsFromMessages(messages);

      if (messages.length === 0) {
        return {
          content: [{ type: "text", text: "No conversation to review" }],
          details: { empty: true },
        };
      }

      const llmMessages = convertToLlm(messages);
      const conversationText = serializeConversationCompact(llmMessages);
      const codeChanges = extractCodeChanges(toolCalls);
      const vcsContext = getVcsContext(ctx.cwd);
      // For lifeguard, use "code" focus to get code-related context
      const effectiveFocus = focus === "lifeguard" ? "code" : focus;
      const reviewContext = buildReviewContext(
        effectiveFocus,
        conversationText,
        codeChanges,
        vcsContext,
      );

      if (!reviewContext) {
        return {
          content: [{ type: "text", text: `Nothing to review for focus: ${focus}` }],
          details: { empty: true },
        };
      }

      const systemPrompt = getSystemPrompt(effectiveFocus, customInstructions, lifeguardPrompt);

      try {
        const result = await runPiJsonAgent({
          cwd: ctx.cwd,
          prompt: reviewContext,
          systemPrompt,
          replaceSystemPrompt: true,
          provider: reviewModel.provider,
          model: reviewModel.id,
          tools: "read,bash,ls",
          signal,
          onUpdate: onUpdate
            ? (partial: RunAgentResult) => {
                onUpdate({
                  content: [
                    {
                      type: "text",
                      text: getFinalAssistantText(partial.messages) || "(reviewing...)",
                    },
                  ],
                  details: {
                    focus,
                    toolCalls: getToolCalls(partial.messages),
                    model: partial.model,
                    usage: partial.usage,
                    durationMs: partial.durationMs,
                  },
                });
              }
            : undefined,
        });

        if (result.stopReason === "aborted") {
          return {
            content: [{ type: "text", text: "Review aborted" }],
            details: { aborted: true },
          };
        }

        const reviewText = getFinalAssistantText(result.messages);
        const disclaimer =
          "\n\n---\n**Note**: This review may contain inaccuracies. Verify findings before acting. If uncertain, consult the user.";

        if (!reviewText) {
          return {
            content: [{ type: "text", text: "Review failed to produce output" }],
            details: { error: true },
          };
        }

        return {
          content: [{ type: "text", text: reviewText + disclaimer }],
          details: {
            focus,
            model: result.model,
            usage: result.usage,
            durationMs: result.durationMs,
            codeChangesCount: codeChanges.length,
            messagesCount: messages.length,
          },
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Review failed: ${errorMsg}` }],
          details: { error: true },
        };
      }
    },

    renderCall(args, theme) {
      const a = args as { focus?: string; filePaths?: string[] };
      const focus = a.focus ?? "all";
      let text = theme.bold("review ") + theme.fg("accent", focus);
      if (a.filePaths && a.filePaths.length > 0) {
        const files =
          a.filePaths.length <= 2 ? a.filePaths.join(", ") : `${a.filePaths.length} files`;
        text += theme.fg("dim", ` [${files}]`);
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as
        | {
            error?: boolean;
            aborted?: boolean;
            empty?: boolean;
            focus?: string;
            toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
            model?: string;
            usage?: {
              input: number;
              output: number;
              cost: number;
              turns: number;
            };
            durationMs?: number;
            codeChangesCount?: number;
            messagesCount?: number;
          }
        | undefined;

      if (details?.error || details?.aborted || details?.empty) {
        return new Text(
          theme.fg("warning", "! " + (result.content[0] as { text: string }).text),
          0,
          0,
        );
      }

      const reviewText = (result.content[0] as { text: string })?.text ?? "";
      const toolCalls = details?.toolCalls ?? [];

      // Build header with usage info
      let header = theme.fg("success", "✓ ") + theme.fg("toolTitle", theme.bold("review"));
      if (details?.focus) header += theme.fg("dim", ` (${details.focus})`);
      if (details?.model) header += theme.fg("dim", ` ${details.model}`);
      if (details?.usage) {
        const u = details.usage;
        const cost = Number.isFinite(u.cost) ? `$${u.cost.toFixed(4)}` : "";
        header += theme.fg("dim", ` ${u.turns}t ↑${u.input} ↓${u.output}${cost ? ` ${cost}` : ""}`);
      }
      if (details?.durationMs) {
        header += theme.fg("dim", ` ${(details.durationMs / 1000).toFixed(1)}s`);
      }

      const changes = details?.codeChangesCount ?? 0;
      const msgs = details?.messagesCount ?? 0;
      if (msgs > 0 || changes > 0) {
        header += theme.fg("dim", ` | ${msgs} msgs, ${changes} changes`);
      }

      // Show tool calls if present (streaming progress)
      let toolCallsText = "";
      if (toolCalls.length > 0) {
        const lines = toolCalls
          .slice(-8)
          .map((tc) => theme.fg("muted", "→ ") + theme.fg("dim", formatToolCallLine(tc)));
        toolCallsText = "\n" + lines.join("\n") + "\n";
      }

      return new Text(header + toolCallsText + "\n" + reviewText, 0, 0);
    },
  });
}
