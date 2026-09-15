---
name: artifact-docs
description: |
  Use to decide where to put task materials, deliverable documents, agent instructions, original prompts, and the canonical document for a topic. Triggers when writing temporary notes or cross-task documentation, working with docs/agents-md, preserving a long prompt, consolidating duplicate documents, or deciding whether to save a delivery summary to a file.
---

# Artifact Docs

This skill governs only where materials belong and when to write a file. Whether the content itself is correct or safe, and whether it requires user confirmation, remains subject to higher-level hard gates and the relevant domain skill.

## Choose a location

| Material type | Location |
|---|---|
| Temporary materials for the current task or for a later agent to continue the work | `<repo>/.agents/docs/` |
| Implementation-ready designs and parallel plans (`DESIGN.md` + `PLAN.md`, which must be tracked by git) | Load `buildable-plan` first, then place them in `<repo>/.agents/buildable-plan/<plan-name>/` |
| Facts, usage instructions, designs, and migrations that users or maintainers consult across tasks | `<repo>/docs/` |
| Documents specifically intended to constrain agent actions | Load `agent-doc` first, then place them in `<repo>/docs/agents-md/` |

When uncertain, decide based on the primary purpose first. If the choice remains unclear and would affect the future maintenance path, ask the user one minimal decision question.

## Canonical documents and delivery

- Keep only one canonical document for each topic. When you find duplicate documents, first determine which one is the maintenance entry point, then merge the others or change them to point to the canonical document.
- Return the delivery summary directly by default. Write it to a file only when the user asks to archive it or when the content must be maintained across sessions.

## Preserve the original prompt

When a prompt meets both of the following conditions, save it verbatim to `<repo>/.agents/prompts/<timestamp>-<topic>.md` before starting work. Continue after saving it without waiting for confirmation:

1. It is longer than 40 lines or contains at least two independent requirements.
2. It contains context that cannot be recovered from the repository and must be preserved for later turns.

When the prompt does not meet both conditions, do not create an extra file solely to preserve it. Put any necessary summary in the task notes or final response.
