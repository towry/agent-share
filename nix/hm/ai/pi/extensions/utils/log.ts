/**
 * Debug logging utility for pi extensions.
 *
 * Enable via environment variable: PI_EXT_DEBUG=1 or PI_EXT_DEBUG=kg,review
 * Logs are written to /tmp/pi-ext-debug.log
 */

import { appendFileSync } from "node:fs";

const LOG_FILE = "/tmp/pi-ext-debug.log";

function isDebugEnabled(namespace: string): boolean {
  const debug = process.env.PI_EXT_DEBUG;
  if (!debug) return false;
  if (debug === "1" || debug === "true" || debug === "*") return true;
  return debug.split(",").some((ns) => ns.trim() === namespace);
}

/**
 * Create a namespaced debug logger.
 *
 * @example
 * const log = createDebugLog("kg");
 * log("autoExtract:response", responseText);
 * log("autoExtract:parsed", { title, insight });
 *
 * Enable with: PI_EXT_DEBUG=kg or PI_EXT_DEBUG=1
 */
export function createDebugLog(
  namespace: string
): (context: string, data: unknown) => void {
  return (context: string, data: unknown): void => {
    if (!isDebugEnabled(namespace)) return;

    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${namespace}:${context}]\n${typeof data === "string" ? data : JSON.stringify(data, null, 2)}\n---\n`;
    try {
      appendFileSync(LOG_FILE, entry);
    } catch {
      // Ignore write errors
    }
  };
}
