# Skill Writing (Conventions for Skill Artifacts)

## When to Use

Use this when creating or changing `.agents/skills/<name>/`, tightening or broadening description triggers, checking for triggers that are too narrow, broad, or overfit, or reducing an oversized always-loaded skill.

| Out of scope | Use instead |
|--------------|-------------|
| Rule sentences: observability, categories, strength, and related concerns | `prompt-writing.md` |
| Project AGENTS layering | `project-agents-md.md` |
| S1–S19 quality checks | `instruction-lint.md` |
| Skill creation, evaluation, and packaging | `skill-creator` |

## Canonical hierarchy

| Layer | Purpose |
|-------|---------|
| `prompt-writing.md` | Content principles: outcome contracts, unlocked paths, and defaults for strong models |
| **This document** | Skill-artifact conventions: description format, structure, and mechanics |
| `skill-creator` | Creation and evaluation workflow, not writing guidance |

If the host project has additional conventions for skill workflows, evaluations, or hooks, its `AGENTS.md` or equivalent entry document must declare them. This document neither references nor depends on project-specific paths.

## What belongs in a skill

Skills encode opinions, knowledge, and hard checkpoints specific to you, your team, or your product. They are not general programming textbooks or manuals for inferable tool behavior.

| Always loaded (SKILL.md) | On demand (references/) | Do not write |
|--------------------------|-------------------------|--------------|
| When to use and not use the skill; success state and deliverable; hard checkpoints; evidence requirements; when to read each reference | Long templates, command matrices, optional recipes, and deep domain material | General knowledge; restatements of AGENTS; optional recipes presented as the only valid path; non-critical global absolute prohibitions |

Reserve absolute prohibitions for **critical** cases involving safety, state destruction, or contracts that are inherently wrong to violate. Express style and exploration space as outcome contracts or local anchors; see `prompt-writing` and S19.

## Structure (progressive disclosure)

```
skill-name/
├── SKILL.md # Decision skeleton: when, target/boundary/delivery, hard checkpoint, pointer
├── references/ # long template/matrix/optional recipe - on demand; not the only legal track
├── scripts/ # Deterministic and executable (prefer a clear interface: parameters, exit code, stdout contract)
└── assets/
```

Loading progresses from name and description, to the SKILL body after triggering (preferably under 500 lines and as short as practical), and then to references or scripts as needed.  
Move templates longer than 40 lines, command matrices, and repeated boilerplate to `references/`. The body must say **when** to read each document.

### Prefer interfaces to examples

Describe tools and scripts through parameter shapes, enumerated states, and observable success and failure. Avoid many few-shot trajectories, which can lock down the exploration space.  
Put long examples in references only when needed, and mark them optional. This aligns with lint S11: principles are preferable to exhaustive lists.

## description (the only canonical format)

See section 3 of `prompt-writing` for the “categories, not instances” principle. YAML and token rules belong **only in this section**.

```yaml
description: |
  Use for: <triggers and scope; Key rule, trigger terms, proactive scenarios>.

  Do not use for: <add only when boundaries are easily confused; give the most likely near-miss, not an exhaustive list>.
```

- `用：` is required; add `不用：` only when needed.  
- The description must be no more than **150 tokens** in `o200k_base`. Measure it with `run-skill-script agent-doc count-skill-desc-tokens`.  
- Do not repeat the same information as both capabilities and trigger terms. Scripts, CLI commands, and internal workflows belong in the body.  
- For the agent's own work, such as writing documentation or skills, being corrected, or wrapping up, include an **explicit meta-level trigger**.  
- Put individual examples only in an Examples section in the body.  

## Body contract

| Include | Avoid |
|---------|-------|
| When to use and not use the skill; success state and deliverable; hard rules and checkpoints; evidence requirements; common mistakes; command behavior that must be verified; reference pointers | Presenting a recommended order as the only valid path; putting inferable procedures in the always-loaded body; including an optional recipe in default steps without saying when to read it |

See `prompt-writing` for sentence-level principles and the default writing form. Do not copy those sections here.

| Convention | Requirement |
|------------|-------------|
| Outcome contract | Define the goal, evidence, boundaries, and deliverable without locking the process to one path |
| Hard checkpoint | Specify a fixed time, question, and action; “please reflect” is insufficient |
| Verify flags before documenting them | Run `<cmd> --help` before writing `--flag` |
| Real constraints vs. tool discretion | State constraints clearly when violating them is inherently wrong or would destroy state. Do not turn decisions a tool can make itself into `always pass`, `never pass`, or `always use` rules, and do not explain tool internals |
| Template placeholders | Use `<placeholder>` rather than a business-specific name |
| Deduplication and bidirectional references | Define a shared rule in one place. If A produces lessons for B, A must point to B and B must have an entry point. Complementary responsibilities may trigger together; delete duplicate content downstream. Only when requirements conflict should you narrow triggers according to confirmed responsibility boundaries or state an explicit ruling; see lint S4/S9 |
| Question gate | Confirm before non-read-only actions; ask one minimal question only when missing information changes the path |

## After writing

Keep the description at or below 150 tokens, measured with `run-skill-script agent-doc count-skill-desc-tokens`. If you changed a rule section, lint it. If you only removed general knowledge, duplication, or overconstraint, use the simplify track (S8/S9/S11/S18/S19).  
Put cross-project conventions in this document. Put host-project-specific workflows and evaluations only in that project's entry document; do not feed its paths back into this document.  
Writing guidance belongs here and in `prompt-writing`; evaluation loops belong in `skill-creator` and run only when explicitly requested by the user.

## Common mistakes

Using a specific string as the description; burying the key rule at the end; omitting proactive scenarios or a necessary `不用：` boundary; documenting only one side of a cross-skill relationship or duplicating two complete trigger sets; replacing a checkpoint with vague reflection; guessing flags; turning tool discretion into hard rules; making an optional recipe the only allowed sequence; substituting process for goals, boundaries, and delivery; and filling the always-loaded skill with generic best practices.
