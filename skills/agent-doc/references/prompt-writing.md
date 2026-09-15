# Prompt Writing (Content Principles Shared by Three Instruction Artifacts)

## When to Use

Use this when writing or changing the **semantic content** of instructions—how an agent should decide and act after reading them—including role prompts, role descriptions, reviewer-role contracts, and rule sentences.  
Despite its filename, this is the canonical source for **content principles**.

| Out of scope | Use instead |
|--------------|-------------|
| AGENTS layering and decision points | `project-agents-md.md` |
| Skill structure, the 150-token limit, `用：`, and flags | `skill-writing.md` |
| S1–S19 acceptance checks for rule sections | `instruction-lint.md` |
| Creating skills or evaluations | `skill-creator` |

Skill **sentences** follow this document; skill **structure** belongs only in `skill-writing.md`.

## Default form: specify outcomes, not a fixed path

| State | Meaning |
|-------|---------|
| **Goal** | The successful end state |
| **Evidence** | The facts, tools, or executable references that support a conclusion, and what to do when evidence is insufficient |
| **Boundaries** | Permissions, prohibitions, exclusions, behavior after exclusion, and when to ask, stop, or hand off |
| **Delivery** | Output format, completion criteria, and failure reporting |

Let the model choose the path unless the task requires a hard checkpoint, irreversible safety measure, or mechanical contract that is inherently wrong to violate.

Excessive process lists—one mandatory sequence or inferable tool instructions—consume attention, constrain route selection, and suppress useful exploration. They are often a net negative for strong models.  
Still state explicitly: boundaries that change a decision, evidence and completion criteria, checkpoints with fixed timing, and project facts that cannot be inferred.

### Defaults for strong models (aligned with acceptance checks)

| Prefer | Use cautiously |
|--------|----------------|
| Locally observable anchors: surrounding code, same-directory conventions, existing formatters or tests | Global absolute prohibitions such as never commenting or never writing documentation when violating them is not inherently wrong |
| Outcome contracts with explicit exceptions | Inferable processes presented as the only valid path |
| Category principles and interface shapes | Long examples or forbidden-word lists used instead of judgment |
| A small entry document, details loaded on demand, and executable references for fidelity | Putting everything that might be useful into always-loaded context |

Reserve absolute prohibitions for safety, state destruction, version or API contracts, and mechanical facts that are inherently wrong to violate. Express style and taste with local anchors. See S8/S9/S18/S19 in `instruction-lint` for acceptance checks.

**Self-check:** If you remove “first…then…,” can the reader still identify the goal, boundaries, evidence, and deliverable? If only topic words remain, add the contract. If removing the steps erases the success state, the instruction is process-locked. If the process is inferable, delete it or mark it optional. Replace a global “never X” with “match the surrounding code” or an observable end state whenever possible.

(IDEA = Intent/Data/Edges/Answer, which is semantically equivalent to the table above.)

## Sentence-level principles

1. **Runtime-observable** — State responsibilities, criteria, boundaries, permissions, and completion conditions. Omit deployment history and assembly fields; describe only a mechanism's observable semantics.  
2. **Decision boundaries** — Every rule that **changes a branch** must identify which path to take. Do not provide topic labels alone.  
3. **Categories, not instances** — Write triggers and descriptions as patterns. Put individual cases in Examples.  
4. **Strength and exclusions for branch-changing sentences** — Rules changing permissions, prohibitions, defaults, or routing must clearly say required/default/allowed/forbidden/ask first/stop. State an actionable behavior after an exclusion. Pure target states and local judgment anchors do not require strength words; see lint S1. Trigger and scope rules need boundaries; see S2/S6. Do not inflate style principles with exhaustive exclusion lists.  
5. **Verifiable actions** — Anchor high-risk vague terms such as `适当`, `必要时`, and `合理` to an observable definition, completion criterion, or local convention such as surrounding code. They do not all need to become absolute prohibitions; see lint S3.  
6. **Bindable objects** — The target of an action in a branch-changing sentence must be the same for two independent agents. If a demonstrative pronoun or mixed role names could refer to another object, use a proper name or ID, or one consistent term within the paragraph; see lint S7.  
7. **No revision-history voice** — Write “use X,” not “no longer use old X.”  
8. **Prefer executable references** — Put high-fidelity constraints in tests, scripts, golden files, or example implementations. Instructions should state when to consult them and what success looks like rather than restating their details. Delete neighboring sentences or duplicate fields whose removal does not change a decision; see lint S8.

## Role

Write an outcome contract and its boundaries, not an operating manual for the task.

**Include:** Mission (goal); Scope/NOT for; Decision Rules for **branch-changing** conditions (act/ask/hand off/stop); observable permissions; Evidence; Output/Failure.  
**Exclude:** Host-injected details, unrelated vendors, one-time task context, configuration field names, inferable step-by-step procedures, and global style Never lists that should be local anchors.

```md
You are <role>, responsible for <success state>.

## Scope
- Handle: <categories>
- Do not: <out> → <who>

## Decision Rules
- If <path-changing condition>, <branch>.
- If <missing info changes path>, ask <one question>.
- If blocked, stop and report <facts>.

## Evidence
- Before <claim type>, verify with <observables/tools/executable refs>.
- Unverifiable external → mark unverified.

## Output
- <fields>
```

For a longer example, see `conf/llm/docs/prompts/agent-maker.md` in the repository; it is not canonical for this skill.

## Role description

A role description determines whether the dispatcher calls that **role**, not a skill. Describe categories rather than instances.  
The format for skill descriptions belongs **only** in `skill-writing.md`.

```yaml
description: |
  Best for: <strengths>.
  How: <style, permissions, I/O>.
  When: <triggers>.
  NOT for: <near-miss + better route>.
  Key rule: <one critical if needed>.
```

The first sentence should state the essential trigger. Do not put steps or script names in the description.

## Reviewer / Evaluator

Report only verified issues. Give severity, location, evidence, impact, and the smallest fix. “Not found” does not mean “absent”; mark unverifiable external facts as unverified.  
When fixing overconstraint, prefer deletion or a local anchor. Do not “fix” S19 with a longer list of absolute prohibitions.

## After writing

For rule sections, use `instruction-lint.md`. For project structure, use `project-agents-md`. For skill structure, use `skill-writing`.

## Common mistakes

Substituting process for a contract; adding inferable steps “for safety”; binding a reference to a private project path; confusing “written for an agent” with “constrains an agent”; filling descriptions with instances; omitting trigger boundaries; putting one-time task context in a durable prompt; exposing deployment mechanics in a role; using revision-history language; replacing a surrounding-code anchor with a global Never rule; copying an executable specification into prose; using a demonstrative pronoun that could name another object; and repeating the same fact in adjacent sentences.
