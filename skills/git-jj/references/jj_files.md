# JJ File Operations

```bash
# Restore file from specific commit/rev
jj restore --from <rev> <file-path>
# Example: jj restore -f main@origin src/lib.rs
```

## Fileset Patterns (for diff/log)
| Pattern | Description |
|---------|-------------|
| `"path"` | CWD-relative prefix |
| `file:"path"` | Exact file |
| `glob:"*.rs"` | CWD-relative glob |
| `root:"path"` | Workspace-relative |

## Operators
- `~x` - NOT
- `x & y` - AND
- `x ~ y` - MINUS

```bash
# Exclude file
jj --no-pager diff -r <rev> '~Cargo.lock'

# Only markdown
jj --no-pager diff -r <rev> 'glob:"**/*.md"'
```
