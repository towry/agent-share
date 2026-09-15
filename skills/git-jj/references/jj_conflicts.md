# JJ Conflict Resolution

JJ allows committing conflicts and resolving later.

## Resolve in New Commit (Recommended)
```bash
jj new <conflicted-commit>
# ... edit files to resolve ...
jj diff --no-pager --git
jj squash  # merge back into parent
```

## Direct Edit
```bash
jj edit <conflicted-commit>
# ... resolve conflicts ...
jj describe -m "chore: resolved conflicts" -r <conflicted-commit>
```
