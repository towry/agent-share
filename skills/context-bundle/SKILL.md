---
name: context-bundle
description: Maintains a context bundle when working with subagents or threads.
---

# Context Bundle

## What It Solves

Large tasks often involve multi-phase implementation and delegation to subagents. Without a shared location, entry points, constraints, and ruled-out options discovered by an earlier agent cannot be passed to a later agent. For example, when tech-research is consulted after code exploration, it may repeat the search for repository facts or research the wrong question without sufficient context. This skill uses a bundle organized **by task topic** to preserve reusable intermediate context, allowing subsequent read-only subagents to continue from known facts instead of exploring again from scratch.

## Path

```
.agents/task-context-bundle/<task-topic>/README.md
```

- `<task-topic>`: A short slug for the task topic (kebab-case). Keep it fixed throughout the same topic; do not use a timestamp or session ID as the directory name.
- Create the directory if it does not exist. If it already exists, read it before editing, update it incrementally, and do not rewrite the entire bundle and erase contributions from others.
- Before delegating to a subagent, include the bundle path in the delegation instructions and require the subagent to read it before starting work.
- When an earlier subagent produces new information, the main agent integrates it back into the bundle. Read-only subagents do not need write access to the bundle; they can report new facts and suggested locations in their response.
- At the end of the task, the directory may be deleted or archived. Do **not promote it** into long-term instructions; put reusable decisions through `agent-doc` or the canonical path instead.

## Handoffs Across Subagents

When a later subagent depends on earlier exploration results, first save a self-contained handoff in the README or a detail file:

| Field | Content |
|------|------|
| `handoff_id` | A stable ID referenced by subsequent delegations |
| `for_role` | The intended consumer, such as `tech-research` / reviewer |
| `question` | The remaining question that the later agent alone needs to answer |
| `known_facts` | Proven facts; each item must include evidence from a path, symbol, command, or external source |
| `ruled_out` | Directions already examined and ruled out, to prevent repeated exploration; each item includes evidence |
| `artifacts` | Pointers to detailed results or canonical files |
| `hypotheses` | Unverified inferences; they must not be mixed into `known_facts` |
| `unknowns` | Matters that remain unknown and would change the conclusion |
| `requested_output` | Facts or decision material that the later response needs to supply |

Give subsequent delegations the `bundle path + handoff_id`, and state explicitly: "Use the known facts as inputs and do not repeat repository exploration. If you find a conflict, identify the conflicting evidence instead of silently overriding it." External research results must still include their sources and currency; repository facts in the bundle cannot replace external verification.

The bundle preserves **intermediate task state**, not an unconditionally trusted fact store. Unsupported content must not enter `known_facts`; it belongs only in `hypotheses` or `unknowns`. If a fact on which a later agent depends lacks evidence, the agent reports the gap instead of making an assumption.

When the caller declares an external canonical path, such as `plan_volume`, write complete facts and evidence only to that canonical location. The bundle stores only the handoff summary, stable ID, and pointer to the canonical location.

## README and Detail Files

The goal is to let later readers, including subagents, find the context they still need with minimal reading, not to maintain a "tidy document." **The README is the entry point.** When there is a large amount of material, sections are independent of one another, or content will be used only by a particular phase or subagent, put the details in other files in the same directory and leave only an index and pointers in the README. The agent **decides independently** what to write, whether to split it, and how to split it based on whether doing so reduces load and makes delegation easier in that round. Do not add structure for its own sake or split content mechanically merely because it has "grown longer."
