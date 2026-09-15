# task-notes schema

The format is JSONL, with one JSON object per line and 8 fields.

## Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | int | Yes | Auto-incremented by the script and unique within the repository |
| `task` | string | Yes | The task slug chosen by the agent at the start and reused throughout the task |
| `type` | enum | Yes | `finding\|decision\|constraint\|outcome_summary\|process\|question` |
| `content` | string | Yes | A one-sentence statement of the main point |
| `why` | string | Required for `decision`/`constraint`/`outcome_summary` | For a decision, include reasons for rejecting alternatives; for a constraint, its expiration condition; for an outcome summary, the result or reason for failure |
| `scope` | string | No | `file:line` \| module path \| `bug-<id>` \| conceptual anchor |
| `created_at` | ISO8601 | Yes | Filled by the script, including the local time zone |
| `resolved_to` | string | No; filled after consolidation | `memo:<entry_id>` \| `docs/<path>` \| `issue:<url>` \| `expired` \| `discarded` |

Additional fields added by the script during `resolve`; callers do not need to manage them:

- `resolved_at` (ISO8601)
- `resolved_note` (string, optional)

## Type semantics

| type | When to use it | Example |
|---|---|---|
| `finding` | A non-obvious fact is discovered, including a negative finding that X is not true | "The session token is stored in a cookie, not localStorage" |
| `decision` | One of several alternatives is chosen, including reasons for rejecting the others | "Use an httpOnly cookie; reject localStorage because of the XSS risk" |
| `constraint` | A temporary constraint imposed by the user or context | "Do not write tests during the experiment (expires when the refactor is done)" |
| `outcome_summary` | The result of a completed work segment, whether a successful delivery or a failed experiment | "Login now uses an httpOnly cookie and has been verified in production" / "Tried lr=0.001; train loss exploded at epoch 3, so it was abandoned" |
| `process` | A reusable process is discovered | "To connect to the online PG instance, first open an ssh tunnel on 5433, then run psql -p 5433" |
| `question` | A question is currently unresolved and requires an external decision | "Does batch norm conflict with this LR schedule?" |

## Storage

- Path: `<repo-root>/.agents/notes/<task-slug>.jsonl`, one file per task
- Repository root: `git rev-parse --show-toplevel`; outside a git repository, use `$PWD/.agents/notes/`
- Override: the `TASK_NOTES_DIR` environment variable, which points to the notes directory rather than a single file
- The script creates directories and files; callers do not need to preflight them
- Allowed task slug characters: `[A-Za-z0-9._-]`; the script rejects other characters
- `id` is globally unique across the notes directory. `show` / `resolve` search across files by ID; when `--task` is omitted, `list` / `consolidate` / `export-html` aggregate all task files

## Atomicity

- `add`: append-only, using a POSIX atomic write (a single JSON line is far smaller than PIPE_BUF)
- `resolve`: load one task file → mutate → write `.tmp` → replace with `rename`; POSIX guarantees atomicity
- Concurrent use within a single-user session is safe. Multiple agents writing concurrently is not guaranteed, but does not occur under this skill's in-task usage model.
- Concurrent `add` operations across tasks are safe because they use different files. Concurrent `add` operations within one task are protected by append-only atomicity.

## Example records

```jsonl
{"id":1,"task":"fix-login","type":"finding","content":"session token exists in cookie, not localStorage","scope":"auth.py:42","created_at":"2026-05-20T10:00:00+08:00"}
{"id":2,"task":"fix-login","type":"decision","content":"Use httpOnly + SameSite=Strict cookie","why":"localStorage XSS Risk;httpOnly Block JS Read","scope":"auth-strategy","created_at":"2026-05-20T10:05:00+08:00"}
{"id":3,"task":"fix-login","type":"constraint","content":"Let's not write the tests for the experiment.","why":"speed up iteration; restore once refactor passes verification","created_at":"2026-05-20T10:10:00+08:00"}
{"id":4,"task":"fix-login","type":"outcome_summary","content":"Try httpOnly+Secure Yes. localhost","why":"failed: no local HTTPS, cookie not sent; rolled back","scope":"auth.py:120","created_at":"2026-05-20T10:30:00+08:00"}
{"id":2,"task":"fix-login","type":"decision","content":"Use httpOnly + SameSite=Strict cookie","why":"localStorage XSS Risk;httpOnly Block JS Read","scope":"auth-strategy","resolved_to":"memo:abc123","resolved_at":"2026-05-20T18:00:00+08:00","created_at":"2026-05-20T10:05:00+08:00"}
```
