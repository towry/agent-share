# JJ Revset Language Reference

- Source: https://docs.jj-vcs.dev/latest/revsets/
- Revsets select sets of revisions for inspection, history manipulation, and automation.
- Run bash command `jj --no-pager help -k revsets` to see full documentation, in case doc is outdated and you keep run into issues with revsets.

## Atoms

| Atom | Meaning |
|------|---------|
| `@` | Working-copy commit |
| `<commit-id>` | Specific commit (short/full hex) |
| `<change-id>` | Latest visible commit for change |
| `<bookmark>` | Bookmark target |
| `<bookmark>@<remote>` | Remote bookmark snapshot (valid in revsets) |
| `root()` | Virtual root |
| `trunk()` | Main branch |

## Operators

| Syntax | Meaning |
|--------|---------|
| `X::` | Ancestors of X (inclusive) |
| `::X` | Descendants of X (inclusive) |
| `A..B` | Reachable from B but not A |
| `A \| B` | Union |
| `A & B` | Intersection |
| `A - B` | Difference |

## Functions

| Function | Purpose |
|----------|---------|
| `all()` | All visible commits|
| `ancestors(X)` / `descendants(X)` | Ancestry traversal |
| `git_refs()` | ⚠️ Deprecated (jj 0.37+): Use `remote_bookmarks(remote=glob:*) \| tags()` |
| `git_head()` | ⚠️ Deprecated (jj 0.37+): Use `first_parent(@)` in colocated repos |
| `parents(X)` / `children(X)` | Direct relatives |
| `heads(X)` | Commits in X that are not ancestors of other commits in X. |
| `visible_heads()` | All visible heads (same as heads(all()) if no hidden revisions are mentioned). |
| `author(pattern)` | By author substring |
| `author_name(pattern)` | By author name |
| `author_email(pattern)` | By author email |
| `merges()` | Merge commits |
| `description(pattern)` | By description regex |
| `files("path")` | Commits affecting path |
| `present(X)` | Filter to visible form |

## Common Patterns

```md
# Work since branching from main
main..@

# Commits affecting file
descendants(main) & files("src/lib.rs")

# Ahead of remote (push candidates)
feature - feature@origin

# Behind remote (need to pull)
feature@origin - feature

# Find WIP commits
description("WIP") & ::@

# Filter by author
author("alice") & main..@

# Divergent heads (conflicts)
heads(<change-id>)
```

## File Filtering

```md
files("src/")                              # Commits under src/
files("src/") - file("src/test/")          # Exclude test dir
descendants(main) & files("*.rs")          # Rust files since main
```

## Pitfalls

| Issue | Fix |
|-------|-----|
| `A..B` direction confusion | B's ancestors minus A's ancestors |
| Hidden commits not showing | Use `all()` or `present()` |
| Shell expansion | Quote paths and regex |
