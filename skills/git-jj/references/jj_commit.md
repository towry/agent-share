# JJ Commit Operations

Check status/log before modifying history to avoid empty commits.

## Confirmation Rules

- **User-initiated commit** (user says "commit", "commit changes", etc.): Just commit, then present the commit message. No confirmation needed.
- **Agent-initiated commit** (agent decides to commit as part of workflow): Ask for user confirmation first with summary of changes.
- If user is not satisfied with commit message, use `jj describe -r <rev> -m "new msg"` to fix.

## Standard Commit Flow

```bash
# 1. Check status first
jj status

# 2. Describe the working copy with commit message
jj describe -m "type(scope): message

- change 1
- change 2"

# 3. Create new empty working copy (IMPORTANT!)
jj new
```

**Why `jj new` after describe?** In jj, working copy (`@`) is always a commit. After `jj describe`, further changes will modify the same commit. Running `jj new` creates a fresh working copy, keeping the committed rev clean. If you need to add changes to the committed rev later, use `jj squash`.

## Commands Reference

```bash
# Update current commit description
jj describe -m "message"

# Update specific revision
jj describe -r <rev> -m "msg"

# Commit working copy AND create new empty working copy (one step)
jj commit -m "message"

# Create empty checkpoint commit (after describe)
jj new

# Edit a rev, making it the working copy
jj edit <rev>
```

## WIP Pattern

```bash
jj log -n 10 --no-pager --no-graph

jj describe -m "WIP: feature ..." -r @

# if working copy is not correct rev, need to use edit first 
jj edit <rev-to-be-working-copy>

jj describe -m "feat: completed ..." -r <rev>

# After finalizing, create new working copy
jj new
```

Always use `-m` flag - bare command opens editor.
