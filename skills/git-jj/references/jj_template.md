# JJ Templating Language

Source: https://docs.jj-vcs.dev/latest/templates/

**Use templates only when** plain `jj log` output is insufficient: machine-readable output, conditional formatting, scripting pipelines.

## Invocation

```bash
jj log -r @ --template '...'                    # Single commit
jj log -r 'trunk()..@' --template '...'         # Range
jj log --no-pager --template '...' | jq ...     # Pipe to tools
```

## Commit Fields

| Field | Description |
|-------|-------------|
| `commit_id` / `.short()` | Full/short commit id |
| `change_id` / `.short()` | Change identity |
| `description` / `subject` | Full message / first line |
| `author.email` / `author.name` | Author metadata |
| `timestamp` | Commit timestamp |
| `bookmarks` / `tags` | Lists |
| `conflict` | Boolean |
| `is_empty` | Boolean |
| `divergent` | Boolean |
| `parents` | List of parent commits |

## Functions

| Function | Example |
|----------|---------|
| `format()` | `format("[", change_id.short(), "] ", subject)` |
| `if(cond, a, b)` | `if(conflict, "⚠", "")` |
| `short()` | `commit_id.short()` |
| `json()` | `author.email.json()` |
| `contains()` | `subject.contains("WIP")` |
| `truncate(n)` | `description.truncate(80)` |
| `indent(n)` | `description.indent(4)` |
| `join()` | `bookmarks.join(", ")` |
| `map()` / `filter()` | `bookmarks.map(lower())` |
| `len()` | `parents.len()` |

Chaining: `bookmarks.filter(!contains("WIP")).map(lower()).join(" ")`

## Examples

```bash
# Minimal
change_id.short() " " subject

# WIP emphasis
format(if(subject.contains("WIP"),"[WIP] ",""), change_id.short(), " ", subject)

# Conflicts
format(if(conflict,"⚠ ",""), change_id.short(), " ", subject)

# Bookmarks
format(change_id.short()," ",bookmarks.join(",")," ",subject)

# JSON output
format(
  '{"change":"', change_id.short().json(), '",',
  '"author":"', author.email.json(), '",',
  '"conflict":', if(conflict, 'true','false'), '}'
)
```

## Revset + Template

```bash
# Divergent heads with conflicts
jj log -r 'heads(all()) & conflicts()' --template 'format(change_id.short()," ",subject)'

# Commits ahead of remote
jj log -r 'myfeature - myfeature@origin' --template 'format("AHEAD ", change_id.short())'
```

## Pitfalls

| Issue | Fix |
|-------|-----|
| Unescaped quotes in JSON | Use `.json()` on dynamic fields |
| Slow on huge histories | Narrow revset first |
| Complex templates | Build incrementally with `format()` |
