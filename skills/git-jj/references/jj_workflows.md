# Jujutsu (jj) Workflows Guide

**Version**: jj 0.9+

## Core Concepts

**MAN page**: For each command, you can run `jj --no-pager help <command> <sub-command-if-has>` to see detailed usage, like `jj --no-pager help op show` or `jj --no-pager help log`

**Key differences from Git:**
- **Auto-snapshotting**: Most commands automatically commit working-copy changes
- **No staging area**: All tracked files are automatically included
- **`@` symbol**: Always represents current working-copy commit
- **Immutable history**: Operations create new commits; old commits remain accessible
- **rev**: A flexible way to reference commits (like Git refs, SHAs, expressions)

## Quick Reference

### Status & Inspection, History
```bash
# Snapshot and show status
jj status

# Working copy changes
jj --no-pager diff --git

# Changes in specific revision
jj --no-pager diff --git -r <rev>

# History
jj log -n 10 --no-pager --no-graph

# Commit details - include diff
jj --no-pager show <rev>
jj file show -r <rev> <file-path>

# Check operation logs, like git reflog 
jj op log --no-graph --no-pager -n 15
# Show details of the operation by operation id (from the log, something like `9bd790f1b272`)
jj op show <op-id>
```

### Creating & Modifying Commits

Always check current status and logs before modifying history, avoid creating useless empty commits(no file changes)

```bash
# Update current commit description, before run, check logs first
jj describe -m "message"

# Update specific revision
jj describe -r <rev> -m "msg"

# Commit current working copy, and create new empty working copy, before run, check logs first
jj commit -m "message"

# Create empty checkpoint commit
jj new -m "message"

# Move changes between commits, <src> and <dest> are jj rev or commit id
jj squash -f <src> -t <dest>

# Remove commit from history, danger operation. if something wrong, use `jj op log --no-graph --no-pager -n 15` and `jj op undo`
jj abandon <rev>

# Cherry-pick equivalent, duplicate a new commit from existing one
jj duplicate <rev>

# Rebase revision, rev and dest are jj rev or commit id
jj rebase -r <rev> -o <dest>  # --onto/-o (old: -d/--destination)

# Edit specific revision, make that rev current working copy
jj edit <rev>
```

### File Operations

```bash
# restore from a specific commit/rev
# for example jj restore -f main@origin <file-path>
jj restore --from <rev> <file-path>
```

### Bookmarks (Branches)
```bash
# List all
jj bookmark list

# Create at @
jj bookmark create <name>

# Point to revision
jj bookmark set <name> -r <rev>

# Delete
jj bookmark delete <name>

# Set up tracking
jj bookmark track <name> --remote=<remote>  # Or omit --remote for all remotes
```

### Remotes
```bash
# Fetch all
jj git fetch

# Fetch specific
jj git fetch --remote <name>

# Push bookmark
jj git push -b <bookmark>

# Push all bookmarks
jj git push --all
```

### Workspaces
```bash
# Create (like git worktree)
jj workspace add <path>

# List all
jj workspace list

# Remove
jj workspace forget <name>
```

## WIP Commit Pattern

```bash
jj status 
jj log -n 10 --no-pager --no-graph
# So our working copy have a wip description
jj describe -m "WIP: feature" -r @

# Continue working (auto-snapshots on jj commands)

# Finalize (if @ is the WIP commit)
# run `jj status` so we are in the WIP commit, not ontop of it.
jj commit -m "feat: completed"
# If `jj log` shows that we are not in the WIP commit, to commit it, we should use jj describe -r <wip-rev> -m "new message" to update the wip commit's message
```

**Before committing**, check state:
```bash
jj --no-pager status

# Check parent
jj --no-pager log -r 'trunk()..@' --no-graph
```

## Conflict Resolution

JJ allows committing conflicts and resolving them later.

### Recommended: Resolve in New Commit
```bash
# Create child
jj new <conflicted-commit>

# ... edit files to resolve ...

# Review resolutions
jj diff --no-pager --git

# Merge changes back into parent (the conflicted commit)
jj squash
```

### Alternative: Direct Edit
```bash
jj edit <conflicted-commit>

# ... resolve conflicts ...

jj describe -m "chore: resolved conflicts" -r <conflicted-commit>
```

## Revision Syntax

A bookmark name can be used as a revision (e.g., `main`, `feature-branch`, `main@origin`)

**Note:** The `<bookmark>@<remote>` syntax is valid for revsets and revision arguments, but deprecated for `jj bookmark track/untrack` commands (use `--remote=<remote>` instead).

- `@` - Working copy
- `@-` - Parent of working copy
- `<rev>::` - Ancestors
- `::<rev>` - Descendants
- `<rev1>..<rev2>` - Range
- `trunk()` - main/master branch

## Fileset Language

In command like `jj diff -r <rev> <fileset-pattern>`, you can use below fileset syntax to filter files.

### Patterns
| Pattern | Description |
|---------|-------------|
| `"path"` | CWD-relative prefix (recursive) |
| `file:"path"` | Exact file match |
| `glob:"*.rs"` | CWD-relative glob |
| `root:"path"` | Workspace-relative prefix |
| `root-glob:"**/*.rs"` | Workspace-relative glob |

### Operators
| Op | Meaning | Example |
|----|---------|---------|
| `~x` | NOT | `~Cargo.lock` |
| `x & y` | AND | `src & glob:"*.rs"` |
| `x ~ y` | MINUS | `src ~ glob:"*test*"` |
| `x \| y` | OR | `src \| tests` |

### Examples
```bash
# Exclude file on diff
jj --no-pager diff -r <rev> '~Cargo.lock'

# Only markdown for show diff
jj --no-pager diff -r <rev> 'glob:"**/*.md"'

# Diff vs trunk
jj --no-pager diff --git -f "trunk()" -t "@"
```

## Important Notes

1. For some write operations, like update description, write commit, avoid interactive mode by provide options directly like the `-m` in jj commit.
2. **Check status before critical ops**: `jj --no-pager status`
3. **Conflicts are first-class**: Can be committed, shared, resolved incrementally
4. **Operations are recoverable**: `jj op log --no-pager --no-graph -n 20` shows history
