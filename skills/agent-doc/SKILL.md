---
name: agent-doc
description: |
  Use for writing, reviewing, or simplifying agent instruction artifacts, including AGENTS.md, docs/agents-md, role prompts, descriptions, and skill-writing conventions. Also use to capture reusable rule gaps uncovered during reviews or corrections. Triggers: agent doc, lint instructions, simplify instructions, convention.

  Do not use for temporary notes (.agents/docs/), one-time preferences, product documentation (docs/), or the full skill evaluation and creation workflow (use skill-creator).
---

# Agent Doc

## Scope

This skill applies only to **instruction artifacts that constrain future agent decisions and behavior**—writing that changes what an agent should do at a decision point.  
“Written for an agent” does not necessarily mean “constrains an agent.” Use `artifact-docs` to choose a location, `skill-creator` to create skills or evaluations, and `system-architecture-doc` for architecture navigation.

| In scope | Out of scope |
|----------|--------------|
| Reusable decisions, processes, and responsibility boundaries | Handoffs or investigations for the current task (temporary material) |
| | Product or project `docs/` primarily written for people |

## Routing (load only the document you need)

| What you are writing or doing | Read |
|-------------------------------|------|
| Project `AGENTS.md` / `docs/agents-md/` structure, decision points, or structural audits | `project-agents-md.md` |
| Instruction **content** principles, roles, or descriptions | `prompt-writing.md` |
| Skill artifacts (description format, structure, and mechanical conventions) | `skill-writing.md` |
| Quality checks for rule sections | `instruction-lint.md` (load details from `instruction-lint/` as needed) |
| Simplifying or unhobbling rule sections | `instruction-lint.md` (run only S8/S9/S11/S18/S19), plus the `project-agents-md` structural audit when needed |
| Whether to capture a reusable convention, where to put it, or whether to delete it | “Capturing lessons” below |
| An empty template for a detailed document | `reference-doc-template.md` |

Each principle has one canonical source; do not expand it in several documents. Content belongs in `prompt-writing`, skill mechanics in `skill-writing`, project structure in `project-agents-md`, and acceptance checks in `instruction-lint`.

Use this order: determine whether the material is an instruction artifact → decide whether to capture it and where, including deletion or demotion → write it according to its artifact type → review it **only if you changed a rule section**. A review does not set product policy. When rewriting, prefer deletion and local anchors; see the lint rewrite priorities.

## Capturing lessons

Use these **hard checkpoints** at fixed times; they are not a sequence of steps:

- After the user corrects you or you disprove one of your earlier assumptions  
- Before sending the final response  

At these points, only decide whether a lesson is worth capturing. You do not need to edit a file every time. Stop when the correction is specific to this task or an existing rule already covers it. Any edit must remain within the authorization for the current task; do not expand the task merely to maintain rules.

1. Is the lesson proven and reusable for similar tasks, rather than a one-off assumption or preference?
2. Is the same mistake likely to recur if it is not written down, and do existing rules fail to cover it? If so, write it in the correct location.
3. **Is an existing rule outdated, a restatement of an upstream rule, or better expressed as a local anchor or outcome contract?** If so, delete, merge, or demote it (use a detailed-document trigger or match the surrounding code). Do not only add rules without removing any.
4. Is the location correct, and does the user know when to load it again?

**Success state:** Every necessary convention is in the correct location and has an actionable criterion, expressed as a decision-point sentence or rule sentence. Anything unnecessary has been removed or demoted, and the user knows where it lives and when to load it.

| Type of convention | Location |
|--------------------|----------|
| Project-specific code, runtime, or process conventions | `AGENTS.md` or `docs/agents-md/<topic>.md` |
| Conventions for one skill only | That skill; promote them only if they generalize |
| Cross-project content principles | `references/prompt-writing.md` |
| Cross-project skill mechanics | `references/skill-writing.md` |
| Review checks | `references/instruction-lint*` |
| One-time handoff or investigation | **Do not write it** to a long-term instruction path |

If one line is enough, write a decision-point sentence in the entry document. If more detail is needed, write a detailed document and leave only a **triggered reference** in the entry document (`Before X: …`; see `project-agents-md` for the structure). Prefer executable references such as tests, scripts, and golden files for high-fidelity detail; do not restate them in the entry document. If you changed a rule section, lint it. If you only removed fluff or duplication, the simplify track is enough.

**Counterexamples:** Saying “got it” without recording anything; notes with no decision point; treating temporary `.agents/docs/` files as permanent instructions; using one example instead of a category in a description; continually adding rules without removing conflicts or general knowledge.
