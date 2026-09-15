# JJ History Rewrite

```bash
# Move changes between commits
jj squash -f <src> -t <dest>

# Remove commit from history
jj abandon <rev>

# Cherry-pick (duplicate commit)
jj duplicate <rev>

# Rebase revision
jj rebase -r <rev> -o <dest>  # --onto/-o

# Edit specific revision (make it working copy)
jj edit <rev>
```

## Recovery
```bash
jj op log --no-graph --no-pager -n 15
jj op undo
```
