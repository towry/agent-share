---
name: task-notes
description: |
  Use for long-running tasks to capture findings, decisions, temporary constraints, outcomes, processes, and open questions; preserve context across compaction; and promote durable knowledge when the task ends. Record non-obvious facts, decisions, user corrections that must remain binding in the short term, the success or failure of completed work, reusable processes, and unresolved questions. Recall these notes after compaction, when asked for current status, when repeated bug-fix attempts fail, during ML or long-running research retrospectives, and at wrap-up.
  Do not use for one-off preferences (→agpod-memo) or product documentation (→design-md/docs).
---

# task-notes

A lightweight scratch layer that preserves continuity during long-running tasks. Run the command as soon as a trigger applies. **Do not preflight whether the directory or file exists; the script handles it.**

## Commands

```
run-skill-script task-notes notes add --type=TYPE --task=SLUG --content=STR [--why=STR] [--scope=STR]
run-skill-script task-notes notes status [--task=SLUG] [--top=N]
run-skill-script task-notes notes list [--task=SLUG] [--type=TYPE] [--scope=SUBSTR] [--limit=N] [--json]
run-skill-script task-notes notes show ID
run-skill-script task-notes notes resolve ID --to=POINTER
run-skill-script task-notes notes tasks
run-skill-script task-notes notes path [--task=SLUG] [--all]
run-skill-script task-notes notes export-html [--task=SLUG] [--out=PATH] [--open]
run-skill-script task-notes notes consolidate [--task=SLUG]
```

`--task` is the task slug. At the start of a task, choose a short descriptive string (`fix-login-bug` / `train-v3` / `migrate-auth`) and reuse that slug for every subsequent `add` and `list` call for the task. Each task has its own `<slug>.jsonl` file. IDs are globally unique across the notes directory, and `show` / `resolve` locate records by ID across files. When `--task` is omitted, `list` / `consolidate` / `export-html` aggregate all tasks. `tasks` lists known tasks and their record counts.

## When to capture

**General rule**: Capture anything that would force a future task of the same kind, later work in this session, or another agent to explore again, repeat a mistake, or proceed without critical context. The table lists common triggers, but apply this rule to other cases as needed, including unavailable tools, environment differences, alternative approaches, commands that avoid pitfalls, and context shared across tasks. Capture broadly now; decide what to retain during `consolidate`.

Run `add` as soon as a trigger occurs. Each record should contain only one type of information; split mixed records into several entries.

| Trigger                                     | Command                                             |
| ---------------------------------------- | ------------------------------------------------ |
| The user gives a temporary instruction ("Do not write tests during the experiment") | `add --type=constraint --why="<Conditions of invalidity>"` |
| A work segment or subtask finishes, or an approach is tried, whether successfully or not | `add --type=outcome_summary --why="<Results or causes of failure>"` |
| You discover a non-obvious caller, configuration, contract, or other structure | `add --type=finding --scope=<file:line\|module>` |
| You choose one of several alternatives | `add --type=decision --why="<Reason+Reason for rejection>"` |
| You work out how to connect to an online database, reproduce a bug, run an eval, or execute a debugging command chain | `add --type=process --scope=cmd/<name>` |
| A question cannot currently be resolved | `add --type=question` |

`decision` / `constraint` / `outcome_summary` **must include `--why`**. The script rejects records that omit it.

## Store large content separately

Keep `content` to a lightweight, one-sentence statement. If multiline commands, stack traces, log excerpts, long plans, conversation excerpts, long diffs, or similar material must retain its formatting, store it in a separate file and keep only a summary and path in the note.

**Rule**: Put material directly in `content` if one line is enough. Store it separately if it exceeds about 5 lines, contains a code block / stack trace / log / diff, or must preserve its original formatting.

**Workflow** (the file may be written before or after `add`):

1. Use the external file path `<repo-root>/.agents/notes/<slug>/<topic-slug>.md` (under the same root as the jsonl files, in a directory for the task).
2. Put this reverse-reference header on the **first line** of the external file:

   ```markdown
   <!-- referenced by task-notes task=<slug> topic=<topic-slug>; add #<id> after `notes add` if known -->
   ```

3. In `notes add`, make `content` a one-sentence summary that includes “See `<relative-path>` for details,” and set `--scope` to that relative path so `list --scope=<substr>` can find it.
4. After `add` returns an `id`, optionally add `#<id>` to the header so the record can be opened directly with `notes show`.

**Using the reverse header**: If the jsonl `scope` becomes stale, use the header's `task=<slug>` + `topic=<topic-slug>` with `notes list --task=<slug> --scope=<path-substr>` to find the owning note.

**Moving files**: When renaming or moving an external file, update both `topic=<topic-slug>` in its header and the recorded relative path. The jsonl `scope` field has no update interface, so create a new note with `notes add` for the new path and mark the old note invalid with `resolve --to=discarded`.

**On resolve**: Dispose of the external file together with its note. When promoting it to `docs/`, move the material into the canonical documentation and delete the external file. After promoting it to `memo:`, mark it `discarded` and delete the file. Delete it when marking the note `expired` as well.

## When to recall

To reconstruct context after compaction, when asked for current status, when resuming an old task, after repeated bug-fix failures, or during an ML or long-running research retrospective, follow these three steps:

```bash
notes tasks                         # Just lists the tasks + total count (one line per task, lightest)
notes status                        # When the slug is unknown: show the type table per task + each task's latest outcome headline
notes status --task=<slug>          # Yes. slug: Single tasks type Count + Latest + Headline for recent results
notes status --task=<slug> --top=3  # Same as above + the full content of the latest 3 records per type (including why)
```

When there are many tasks, use `tasks` to choose a slug, then run `status --task=<slug> --top=N`. Because `--top=N` includes the full `content` + `scope` + `why`, **one status call is enough to reconstruct context**.

## Targeted queries when you know what to look for

```bash
notes list --task=fix-login --type=decision     # See all records of one type
notes list --type=outcome_summary --scope=bug-123  # Query across tasks by scope
notes list --scope=<substr>                     # Fuzzy search
```

`list` uses reverse chronological order and truncates `content` summaries to ≤58 characters. **Do not retrieve information by calling `show <id>` for every record.** Use `show` only when `list` truncates a record with `…` and you need the full text; prefer `status --top=N` whenever possible.

## Full-text search by content keyword

`list --scope=` searches only `scope`. If commands, stack traces, or error codes appear in `content`, use `notes path` to obtain the paths and fall back to `rg`:

The jsonl fields are `id task type content why scope created_at resolved_to` (see `references/schema.md`).

```bash
# Keyword Sweeping Text
notes path --all      | tr '\n' '\0' | xargs -0 rg '<keyword>'
notes path --task=<slug> | tr '\n' '\0' | xargs -0 rg '<keyword>'

# Press type Filter + Keywordsjq Structured, with field names)
notes path --all | tr '\n' '\0' | xargs -0 \
  jq -c 'select(.type=="process" and (.content | test("<keyword>")))'
```

After finding an ID, use `notes show <id>` to read the full record. Try `list --scope=` / `status` first, and use `rg` only if they return nothing.

## When to consolidate

When the user says “The task is done,” “Capture what we learned,” “Wrap up,” “Summarize before the PR,” or “Archive this,” run `consolidate --task=<slug>`. The script prints suggestions from its built-in table. The agent must **present each item to the user** to confirm its promotion destination, invoke the downstream tool after confirmation, and then use `resolve` to set `resolved_to`.

Read `references/consolidation.md` only when the promotion destination is unclear or the correct value for `resolve --to` is uncertain.

## Fields

The script fills `id` and `created_at`. Read `references/schema.md` only when a field's meaning is unclear, when extending the schema, or when investigating the data.
