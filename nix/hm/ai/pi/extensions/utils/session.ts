/**
 * Session file utilities for saving/copying session files locally.
 * Shared between pi extensions and other tools.
 */

import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { mkdir, copyFile, writeFile, access } from "node:fs/promises";
import { join, basename } from "node:path";
import { randomUUID } from "node:crypto";
import type { Message } from "@mariozechner/pi-ai";
import type { SessionEntry } from "@mariozechner/pi-coding-agent";
import { convertToLlm } from "@mariozechner/pi-coding-agent";
import { serializeConversationCompact } from "./serialize.js";

/**
 * Generates a timestamp string safe for filenames.
 * Format: YYYYMMDD-HHMMSS
 */
export function generateTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, "").replace("T", "-").replace(/\..*$/, "");
}

/**
 * Ensures a directory exists under .agents/ in the project (sync).
 * @returns The full path to the directory
 */
export function ensureAgentsDir(cwd: string, subdir: string): string {
  const dir = join(cwd, ".agents", subdir);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Ensures a directory exists under .agents/ in the project (async).
 * @returns The full path to the directory
 */
export async function ensureAgentsDirAsync(cwd: string, subdir: string): Promise<string> {
  const dir = join(cwd, ".agents", subdir);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Copies a session file to .agents/sessions/ in the project directory (sync).
 * @returns The path to the saved session file, or null if source doesn't exist
 */
export function saveSessionFileLocally(cwd: string, sessionFile: string): string | null {
  // Check if source file exists (session might not be flushed yet)
  if (!existsSync(sessionFile)) {
    return null;
  }
  const sessionsDir = ensureAgentsDir(cwd, "sessions");
  const savedPath = join(sessionsDir, basename(sessionFile));
  copyFileSync(sessionFile, savedPath);
  return savedPath;
}

/**
 * Copies a session file to .agents/sessions/ in the project directory (async).
 * @returns The path to the saved session file, or null if source doesn't exist
 */
export async function saveSessionFileLocallyAsync(
  cwd: string,
  sessionFile: string,
): Promise<string | null> {
  // Check if source file exists (session might not be flushed yet)
  try {
    await access(sessionFile);
  } catch {
    return null;
  }
  const sessionsDir = await ensureAgentsDirAsync(cwd, "sessions");
  const savedPath = join(sessionsDir, basename(sessionFile));
  await copyFile(sessionFile, savedPath);
  return savedPath;
}

export interface SaveSessionAsMarkdownOptions {
  cwd: string;
  messages: Message[];
  slug?: string;
}

export interface SaveSessionAsMarkdownResult {
  absolutePath: string;
  relativePath: string;
  filename: string;
}

/**
 * Saves session messages as a readable markdown file in .agents/sessions/.
 * Used by both /clear and /handoff commands.
 */
export async function saveSessionAsMarkdown(
  options: SaveSessionAsMarkdownOptions,
): Promise<SaveSessionAsMarkdownResult> {
  const { cwd, messages, slug = "session" } = options;

  const conversationText = serializeConversationCompact(messages);
  const now = new Date();
  const sessionId = randomUUID();
  const filename = `${generateTimestamp(now)}-session-${slug}-ID_${sessionId}.md`;
  const relativePath = join(".agents", "sessions", filename);
  const sessionDir = await ensureAgentsDirAsync(cwd, "sessions");
  const absolutePath = join(sessionDir, filename);

  await writeFile(
    absolutePath,
    [
      "# Session",
      `- Saved: ${now.toISOString()}`,
      `- CWD: ${cwd}`,
      "",
      "## Conversation",
      "",
      conversationText,
      "",
    ].join("\n"),
    "utf-8",
  );

  return { absolutePath, relativePath, filename };
}

/**
 * Extracts messages from session branch and converts to LLM format.
 */
export function extractMessagesFromBranch(branch: SessionEntry[]): Message[] {
  const messages = branch
    .filter((entry): entry is SessionEntry & { type: "message" } => entry.type === "message")
    .map((entry) => entry.message);

  return convertToLlm(messages);
}

/**
 * Serializes messages to compact text format.
 */
export function getConversationText(messages: Message[]): string {
  return serializeConversationCompact(messages);
}
