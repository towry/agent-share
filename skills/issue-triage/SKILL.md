---
name: issue-triage
description: |
  Use this for structured diagnostic triage of code problems: classify errors to locate causes instead of making blind, speculative changes. Trigger it when repeated fixes have not resolved a failure, a large change has uncertain results, or the cause remains unclear; when an error includes an error code, stack trace, or structured error fields; or when the user says "triage," "analyze first," or "do not rush to change it." It also applies to configuration, environment, and integration problems, especially when a custom implementation may duplicate a mature library, patches have accumulated on patches, or the implementation premise is questionable.

  Do not use it for an obvious single-step fix or the first attempted change.
---

# Issue Triage

Stop making blind attempts and diagnose first. When an agent has tried several rounds of fixes without success, switch to structured diagnosis and do not make another speculative change.

## When to use it

### Automatic trigger (at least two conditions apply)

1. **The user explicitly says it remains unresolved** — "It still does not work," "Nothing happens," "The same problem," or "No improvement."
2. **At least two substantive changes have been made** — code/config/integration changes that affect behavior (pure formatting, naming, and comment changes do not count).
3. **The root cause is unclear** — further fixes are based on speculation rather than evidence.

### Immediate trigger

- A cross-layer problem involving the boundary among UI / backend / config / env.
- A single large change still had no effect: the change was extensive, and its result is unclear.
- The user explicitly instructs you to analyze first.
- The current implementation may be pursuing the wrong direction: a custom implementation duplicates a common library/framework capability, patches are stacked on patches, state ownership is confused, or the user asks whether it was wrong from the start.
- The user provides a structured error containing internal information such as an error code, structured error fields, a stack trace, or an exception class name. First classify it by its internal structure: which layer each category belongs to (infrastructure/configuration/data/state), who is responsible, and what the handling path is. Do not classify it from the literal outer error name, such as `pending`, `retry`, or `unavailable`. Do not jump directly to the presentation layer, copy translation, UI state, or a fix.

## Core principles

- **Define before changing**: Define the problem from existing evidence first. Only load-bearing ambiguities require user confirmation.
- **Decide from facts**: Use static analysis + web research, not speculation.
- **Step back**: Before fixing the current implementation, examine whether its premise is valid. If a mature third-party or framework-provided capability is more appropriate, include it as a candidate.
- **Preserve findings in writing**: Record diagnostic findings in an issue document for later reference.
- **Hypotheses before buckshot**: Rank root-cause hypotheses and test them one at a time.
- **Write `unknown` when unknown**: Do not invent or fill in facts without basis.

## Workflow

### 1. Define the problem

**Purpose**: Form a problem statement sufficient to select a diagnostic path without blocking safe evidence gathering on formal confirmation.

1. First extract five elements from the user's exact words, error output, and repository facts:
   - **Where**: The page, component, command, or entry point.
   - **When**: Reproduction conditions, frequency, and environment.
   - **Expected**: The expected behavior.
   - **Actual**: The observed behavior.
   - **Trigger**: The action that triggers it.
2. Mark unknown items `unknown`. If logs, code, state, or official sources can establish an item safely, proceed directly to read-only evidence gathering in Phase 2 instead of asking the user for it.
3. Only when an ambiguity would change the diagnostic target, responsible layer, or next path, restate the current understanding and ask one minimal decision question. Before the user responds, you may still perform read-only checks that do not depend on the answer.
4. If the information uniquely identifies the diagnostic target, proceed directly to Phase 2 without requiring formal confirmation from the user.

**Examples**:
- The build log already provides the first failing derivation, exit code, and timed-out test → inspect the full log, build configuration, and dependency source directly.
- The user only says "Back does nothing," and "Back" could mean the system gesture, navigation-bar button, or page button → first ask which control they mean; in parallel, you may read the navigation entry point shared by all three.

**Prohibitions**:
- Do not repeat questions about facts the user has already stated clearly under the pretext of "confirming."
- Do not mix file changes, starting a high-cost environment, or state changes into read-only evidence gathering. Evaluate those actions separately under upstream safety and execution rules.

**Output**: A problem statement that clearly separates knowns, unknowns, and load-bearing ambiguities. Only load-bearing ambiguities require user confirmation.

### 2. Analyze the evidence

**Purpose**: Gather evidence and form root-cause hypotheses. Evidence and hypotheses must remain strictly separate; do not interweave reasoning and speculation in the same paragraph.

**Output format**: After analysis, present the result in a structured format with separate Evidence and Hypotheses sections. Do not replace it with a stream-of-consciousness monologue such as "Let me think... maybe it is... no... let me try another angle...."

1. **Inspect the code**
   - Find the entry files and call chains related to the problem.
   - Inspect event bindings, state transitions, conditional branches, and asynchronous timing.
   - Inspect recent diffs, if any, to determine whether a recent change caused the problem.

2. **Inspect logs**
   - Check console errors, stack traces, and build warnings.
   - If the user can provide runtime information, actively request it.

3. **Research sources**
   - For questionable framework/library behavior, you **must inspect** official documentation, the issue tracker, and StackOverflow. Do not assert framework behavior from memory.
   - Record key findings and cite their sources.

4. **Review the implementation premise**
   - Ask whether this implementation builds a common capability in-house, such as routing, caching, queues, forms, virtual lists, scroll anchoring, permissions, retries, schema validation, state synchronization, or concurrency control.
   - Ask whether the current problem comes from a faulty abstraction, such as patches stacked on patches, confused state ownership, duplicating an existing framework mechanism, violating the officially recommended pattern, or maintaining invariants through side effects.
   - If either answer is yes, investigate official built-in solutions, mature third-party libraries, and comparable open-source implementations. Compare maintainability, API fit, migration cost, the amount of custom code that can be deleted, risk, and verification.
   - Produce one of three decisions: **continue patching** / **refactor in-house** / **replace with a library**. Do not default to continued patching merely because "the current change is small."
   - If there is no mature alternative or the migration cost is unsuitable, state why. Mark unknowns `unknown`; do not speculate.

5. **Form hypotheses**
   - Rank them by likelihood, with no more than three.
   - Each must include **hard evidence** such as code line numbers, documentation citations, or log excerpts. Mark any hypothesis without evidence `unverified`.
   - A hypothesis must identify a specific code location and mechanism. Do not use vague statements such as "It may be a bug" or "There may be a problem."

### 3. Record the findings (hard gate—do not enter the fix-and-verify phase without documentation)

**Purpose**: Preserve diagnostic findings for later agent sessions. **Do not enter Phase 4 until the document has been created.**

Create `<slug>.md` under `.agents/docs/issues/`, using a short descriptive slug such as `back-button-no-response`.

Use this template:

```markdown
# Issue: <Short title>

- Status: triaging | fixing | blocked | verified | closed
- Updated: YYYY-MM-DD

## Problem

- Report: <The user's exact words or a summary>
- Where: <Location>
- When: <Conditions>
- Expected: <Expected behavior>
- Actual: <Observed behavior>
- Trigger: <Triggering action>

## Reproduction

- Steps:
  1.
  2.
  3.
- Frequency: always | intermittent | unknown
- Scope: <Blast radius: one page/specific feature/global>

## Context

- Files:
  - `path/to/file.ts` — <Its responsibility>
- Environment (if relevant): <OS/browser/runtime/version>

## Evidence

- Static analysis:
- Errors/logs:
- Web research:

## Implementation Premise

- Self-built scope: <Whether a common capability is built in-house; write none if not>
- External candidates: <Framework built-in/third-party library/open-source precedent; write unknown if unknown>
- Decision: continue patching | refactor in-house | replace with library
- Why: <Tradeoff basis: maintainability/API fit/migration cost/deletable code/risk>

## Hypotheses

1. <H1: Most likely cause + evidence>
2. <H2: Alternative>
3. <H3: Less likely>

## Attempts

- <Attempted direction>: <Result>
- Ruled out: <What has been ruled out>

## Fix Plan

- Next: <Next step>
- Why: <Why this comes first>

## Verification

- Checks: <How to verify the fix>
- Pass: <What counts as fixed>

## Resolution

- Root cause: <Final cause>
- Change: <Summary of the final change>
- Verified: yes | no
```

**Template requirements**:
- Use one to three bullets per section; do not write prose paragraphs.
- Fill unknowns with `unknown`; do not invent them.
- Problem and Verification must correspond to each other.
- Keep Evidence and Hypotheses strictly separate—speculation is not evidence.
- Complete Implementation Premise before Fix Plan. If the decision is to replace the implementation with a library, the Fix Plan must describe migration boundaries rather than continuing to patch the old implementation.

### 4. Fix and verify

**Purpose**: Make small changes based on the hypotheses and test them one at a time.

**Precondition check**: Before entering this phase, verify that Phase 1 has a problem statement sufficient to select a fix path, with any load-bearing ambiguities confirmed; the Phase 2 implementation-premise review exists; and the Phase 3 document (`.agents/docs/issues/<slug>.md`) exists. If any item is missing, go back and complete it.

1. **Test hypotheses in order**
   - Change only one hypothesis direction at a time.
   - Verify immediately after the change to confirm its effect.
   - build/run/simulator are all verification methods and may be used only after a hypothesis is explicit. Do not replace thought with "run it and see."

2. **Record valuable attempts**
   - Record only attempts that change the primary hypothesis, disprove an important direction, produce new evidence, or cause an observable change.
   - Format: `tried X → result Y`.
   - Do not record tiny experiments or small fixes with no informational value.

3. **If verification passes**
   - Verify according to the document's Verification criteria.
   - Update Status → `verified` and complete Resolution.

4. **If verification does not pass**
   - Update Attempts and mark the directions that have been ruled out.
   - Return to Phase 2 for further analysis and adjust the hypotheses.
   - If three consecutive rounds of hypotheses are disproven, stop, tell the user the current status, and request more information or a different approach.

## Related skills

- **ui-methodical-fix**: Specializes in UI/CSS layout and shared-component regressions. If triage identifies a UI layout problem, hand it off.
- **tech-research**: Its patterns can support Phase 2 web research and comparisons of third-party/framework-provided solutions.
- **facts-check**: Can assist when verifying API/library behavior.
- **contract-refactor-first**: If the classification conclusion involves cross-module field semantics, error taxonomy, or a state machine, switch to its §6 to produce a Contract Impact Note before changing business code.

## Common mistakes

1. Fixing while a load-bearing ambiguity remains—the diagnostic target or responsible layer is unresolved, so the fix does not address the user's problem.
2. Requesting formal confirmation when there is no load-bearing ambiguity—blocking read-only evidence gathering that could proceed directly.
3. Guessing at a load-bearing ambiguity instead of asking—choosing an answer unilaterally even though different answers would change the path.
4. Skipping static analysis and going straight to speculative changes—the reason this skill exists.
5. Replacing structured analysis with a stream-of-consciousness monologue—"Let me think... no... another angle..." is speculation, not diagnosis.
6. Asserting framework/library behavior from impressions without checking documentation—official documentation must be the evidence.
7. Making hypotheses too vague, such as "It may be a bug"—they must identify a specific code location and mechanism.
8. Changing several directions at once—causality becomes impossible to distinguish.
9. Fixing without recording findings—the next agent session starts from zero again.
10. Mixing Evidence and Hypotheses—speculation is not evidence.
11. Starting high-cost verification before defining a hypothesis—substituting execution for diagnosis, which consumes time and may not address the problem.
12. Being captive to the current implementation—patching only the old code without examining whether it should have been custom-built at all.
13. Letting "the change is small" outweigh correct design—clinging to the old implementation even when a mature library or framework-provided solution is more appropriate.
