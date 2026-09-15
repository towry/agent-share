# JJ Status & Inspection

```bash
# Status
jj status

# Working copy diff
jj --no-pager diff --git

# Diff for specific revision
jj --no-pager diff --git -r <rev>

# History
jj log -n 10 --no-pager --no-graph

# Show commit details with diff
jj --no-pager show <rev>
jj file show -r <rev> <file-path>

# Operation log (like git reflog)
jj op log --no-graph --no-pager -n 15
jj op show <op-id>
```

## Revision Syntax
- `@` - Working copy
- `@-` - Parent of working copy
- `trunk()` - main/master branch
- `<bookmark>@<remote>` - Remote bookmark (e.g., `main@origin`)
