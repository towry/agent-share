# task-notes consolidation

`consolidate --task=<slug>` lists unresolved records and suggests a promotion destination for each one. The agent must **present every record to the user** to confirm its destination, invoke the downstream tool after confirmation, and then use `resolve` to set `resolved_to`. **Never write directly to `agpod-memo` or `docs/` without the user's confirmation.**

## Promotion destinations

| type | Subcategory | Default promotion destination |
|---|---|---|
| `finding` | Reusable | `agpod-memo`, with `scope` as the anchor |
| `finding` | Project-specific | The corresponding module documentation under `docs/` |
| `decision` | Architecture / contract-level | A decision in `agpod-memo`, including reasons for rejecting alternatives |
| `decision` | Minor | Include it in the commit message, then mark it `discarded` |
| `constraint` | Naturally expires | `discarded` |
| `constraint` | Long-term preference | A finding in `agpod-memo` |
| `outcome_summary` | Successful delivery | The corresponding module documentation under `docs/`; if already covered by a decision, mark it `discarded` |
| `outcome_summary` | Failed and reusable | A finding in `agpod-memo` to prevent another failed attempt |
| `process` | General agent workflow | `docs/agents-md/` |
| `process` | Project-specific | `docs/runbooks/` or `scripts/` |
| `question` | Answered | Convert it to a finding / decision, then resolve it |
| `question` | Unanswered | Create an issue or handoff, then set `resolved_to=issue:<url>` |

## Values for `resolve --to`

| Value | Use |
|---|---|
| `memo:<entry_id>` | Promoted to agpod-memo; include the entry_id |
| `docs/<path>` | Added to repository documentation; include the relative path |
| `issue:<url>` | An issue / handoff has been created |
| `expired` | Expired naturally and has no promotion value |
| `discarded` | Determined to have no reuse value and discarded |

## Triggers

Run `consolidate` when any of the following occurs:

- The user says “The task is done,” “Capture what we learned,” “Wrap up,” “Summarize before the PR,” or “Archive this.”
- A logical unit is complete, before committing it or opening a PR.
- A long-running task spanning several days reaches a natural stopping point.
