---
name: git-jj
description: |
  Use for general vcs/git/jj operations: status, diff, commit, branch, worktree, squash, push, GitHub stacked PRs, conflict resolution, and GitHub assignment. Trigger words: [git], [jj], [gh stack], [gh assign].
---

# Git version control skill

## Entry routing (must run first)

Before taking any vcs task, **first run** `run-skill-script git-jj repo-check` to identify the repository type:

| Output | Route |
|---|---|
| `jj` | Follow the jj workflow in this skill's `references/jj_*.md` files |
| `git` | Follow the standard Git workflow in this skill and obey the current repository's project instructions |
| `no-repo` | Ask the user to initialize a repository |

## Git workflow

Before changing repository state, check the project instructions, current branch, and working tree so that existing changes are not accidentally included in this operation. Follow the project instructions for branch strategy. If the project requires working directly on the default branch, do not create another branch. Otherwise, create a topic branch from the expected baseline with standard Git commands.

### GitHub Stack

When the target remote for the current Git repository is hosted on GitHub and the task involves stacked branches or stacked PRs, use the official `gh stack` extension. For other repositories or ordinary single-branch operations, continue to use the standard Git workflow. Obey the project instructions if they prohibit stacks.

Before first use, confirm the extension and the local command semantics:

```bash
gh stack --version || gh extension install github/gh-stack
gh stack --help
```

Before performing a specific action, read `gh stack <command> --help` and follow the locally installed version:

| Goal | Command | Boundary |
|---|---|---|
| Create or adopt a branch stack | `gh stack init [branches...]` | Order multiple branch arguments from bottom to top |
| Add a branch at the top | `gh stack add [branch]` | `--all` includes untracked files; use it only when every such file belongs in this commit |
| View and navigate | `gh stack view`, `checkout`, `bottom`, `down`, `up`, `top`, `trunk` | Read-only operations or local checkout |
| Create or update PRs | `gh stack submit` | Pushes and writes to GitHub; the user must explicitly request it. In a non-interactive environment, titles are generated automatically, and new PRs are drafts unless `--open` is provided |
| Synchronize the branch stack | `gh stack sync` | Fetches, performs cascading rebases, and atomically pushes with force-with-lease; the user must explicitly request it and confirm the rewrite scope |
| Merge a PR stack | `gh stack merge` | Atomically merges the remote stack on GitHub; the user must explicitly request it |
| Remove stack metadata | `gh stack unstack` | Modifies both the local repository and GitHub by default. Use `--local` to change only the local repository; the user must explicitly request any remote change |

**Safety rules:**

- Proactively decide whether to handle remote writes such as pushes and creating or updating PRs.
- A force push requires an explicit user request. Before performing it, explain which remote scope will be rewritten.
- Follow the project instructions for protected branches. When the project does not define them, treat default, shared, or stable branches as protected. Confirm authorization before committing, pushing, or rebasing them.
- Never create a git worktree or jj workspace unless the user explicitly requests it. In complex projects, a new worktree often lacks installed dependencies, `.env`, symbolic links, build artifacts, and other setup, so a bare worktree is rarely ready for development. When one is truly necessary, first tell the user that the new worktree will require separate setup, and create it only when the user explicitly instructs you to do so.

**Commit format:** `topic(scope): message`, with change details in the body.

Functional changes (behavior changes, bug fixes, or new features) must use `feat` or `fix`. Do not mislabel them as `chore` or `refactor`, which could omit them from a release. Use `refactor` only for purely structural changes that do not alter behavior, and use `chore` only for scaffolding, dependencies, and tool configuration.

**Atomic commits:** Commit each logical unit as soon as it is complete and has passed review. Do not accumulate a large diff and split it afterward. Before committing, recheck the status and branch to avoid accidentally committing to a protected branch.

**Automatic commits:** Run `git commit` without asking for confirmation when **all** of the following conditions are met:

1. The logical unit is complete, or the diff exceeds 800 lines and the completed portion must be committed first.
2. Review has passed with no critical or major issues. If the environment requires committing and pushing to preserve the changes state, prioritize committing and pushing proactively.
3. The changes contain only code, configuration, or documentation and no sensitive files such as keys, certificates, `.env`, or tokens.
4. Temporary artifacts are excluded from the commit.

## Assign issues and PRs

When you must assign an issue or PR to someone but have only their real name or its pinyin and do not know their GitHub username, **first run** `run-skill-script git-jj list-gh-assignees` (you may provide a numeric argument for the number of recent commits to scan; the default is 100). It lists users who can be assigned in this repository and provides a "recent committer real name/email → GitHub login" mapping. Look up the login by real name, then confirm that it appears in the assignable-user list. This avoids a 404 from a guessed username or accidentally pinging someone else.
