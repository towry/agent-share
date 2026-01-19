import { execSync } from "node:child_process";

/**
 * Parse repo name from git remote URL.
 * Returns "owner/repo" format or null if parsing fails.
 *
 * Supports:
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 * - ssh://git@host:port/owner/repo.git
 */
export function parseRepoNameFromUrl(remoteUrl: string): string | null {
	// Handle SSH URLs with port: ssh://git@host:port/owner/repo.git
	const sshWithPort = remoteUrl.match(/ssh:\/\/[^/]+\/(.+?)\/([^/]+?)(?:\.git)?$/);
	if (sshWithPort) {
		return `${sshWithPort[1]}/${sshWithPort[2]}`;
	}

	// Handle standard formats:
	// https://github.com/owner/repo.git -> owner/repo
	// git@github.com:owner/repo.git -> owner/repo
	const match = remoteUrl.match(/[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
	if (match) {
		return `${match[1]}/${match[2]}`;
	}

	return null;
}

/**
 * Get repo name from git remote URL (handles worktrees correctly).
 * Returns "owner/repo" format or null if not a git repo.
 */
export function getRepoName(): string | null {
	try {
		const remoteUrl = execSync("git remote get-url origin", {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
		return parseRepoNameFromUrl(remoteUrl);
	} catch {
		return null;
	}
}
