# Instruction Lint (Quality Checks for Rule Sections)

## Purpose

This is a quality gate to run **after writing**. It checks whether a rule section is **actionable, unambiguous, appropriately constrained, and sufficiently complete**, then reports prioritized issues and minimal rewrite suggestions.

It does **not set product policy** or choose business defaults and permission models for the user. It also does not replace `prompt-writing`, `project-agents-md`, or `skill-writing` as writing guidance.  
For structural audits such as line counts, document splitting, and decision-point trees, use `project-agents-md`. For content principles, use `prompt-writing`. This document uses the S rules for **acceptance checks**.

Prioritize checks aligned with context engineering for strong models:

| Goal | S rule |
|------|--------|
| Bind each object unambiguously | S7 |
| Remove fluff, general knowledge, and repetition within a section | S8 |
| Do not restate upstream instructions | S9 |
| Prefer principles to exhaustive lists | S11 |
| Specify an outcome contract without locking the process | S18 |
| Reserve absolute prohibitions for cases where violating them is inherently wrong; otherwise use a local judgment anchor | S19 |
| Do not mistake a recommended workflow for an immutable sequence | S15 |

Do **not** use linting to produce an ever-thicker manual of absolute rules. Rewrite in this order: **delete → demote to a local anchor or outcome contract → then clarify strength and exclusions**. See “Default form” and “Defaults for strong models” in `prompt-writing`.

## When to Use

Use this after adding or revising a rule section, when the user explicitly asks for linting or a rule review, or as a self-check after capturing a rule. When the user asks to simplify, unhobble, or remove redundancy, run **only** S8/S9/S11/S18/S19 and follow the structural-audit pointer.  
Skip it for changes limited to typos, formatting, or text with no rule semantics.

## Load on demand

| Need | Read |
|------|------|
| S1–S19 and the four review layers | `instruction-lint/check-rules.md` (**must** be read before citing an S number; do not rely on memory) |
| Calibrated bad examples | `instruction-lint/bad-patterns.md` |

## Deliverable (success state)

- Report the conclusion and review scope. For each issue, give its location, governing rule, impact, severity, and a minimal rewrite suggestion. State evidence limitations, and do not omit blockers merely to keep the report short.
- Adjust the level of detail to the risk and number of issues; no fixed table or severity count is required. Perform scenario checks internally. Expand boundary cases and confirmed coverage gaps when they affect the conclusion or the user requests a detailed review.

Use four layers: structure (S1–S19) → semantics → scenario tests → coverage.  
Use **S18** for process locking and **S19** for overconstraint. Before rewriting, read “Default form” and “Defaults for strong models” in `prompt-writing`; do not duplicate those principles here.

If the user asks only for a review, report recommendations without editing files. If edits are authorized, directly fix verified issues within scope without asking again. If unresolved product policy, permissions, or scope expansion is involved, complete unaffected authorized work and ask only about the remaining decisions. Concision does not mean fragmentation: better structure can save words. **Length does not make a rule decidable**: delete what can be deleted.
