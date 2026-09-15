# Check Rules

Entry point: `../instruction-lint.md`. Each of the four layers can be performed independently.

**Rewrite priority** (aligned with unhobbling strong models): delete what can be deleted (S8/S9) → replace it with a locally observable anchor or outcome contract (S18/S19) → then clarify strength, exclusions, or required ordering (S1/S2/S4…). Do not pile on inferable process instructions or global absolute prohibitions merely to “pass lint.”

## Layer 1: Structural checks (S1–S19)

| # | Check | Severity |
|---|-------|----------|
| S1 | A **branch-changing constraint** lacks strength: a sentence changing permissions, prohibitions, defaults, choices, or routing does not say required/allowed/forbidden/ask first/default | major |
| S2 | A **trigger, scope, or routing** rule says when to act but not when not to act, or provides no equivalent boundary | major |
| S3 | A high-risk vague term has **no observable anchor**, such as a definition, completion criterion, or local-convention anchor | warning |
| S4 | Simultaneously applicable requirements conflict, and host priority, existing responsibility boundaries, or an explicit ruling cannot resolve them; do not report complementary requirements that trigger together | fatal |
| S5 | There is no escalation path when rules conflict or a decision cannot be made: ask, stop, or report rather than “handle appropriately” | major |
| S6 | A **trigger, scope, routing, or destination** rule lacks a counterexample or explicit exclusion at its boundary | major |
| S7 | **Object binding fails**: two agents could identify different action targets in a branch-changing sentence, including a drifting demonstrative pronoun, several names for one object in a paragraph, or one term with different meanings across files | major |
| S8 | **Sentence tax**: ignoring the sentence would not be wrong, so it is fluff; or deleting a neighboring sentence or repeated field would not change any decision, so it is repetition within the section. Delete both kinds | major |
| S9 | The rule restates an upstream system instruction, AGENTS rule, or equivalent source; delete the downstream copy first | major |
| S10 | The rule hard-codes a fast-changing external dependency such as a version, endpoint, or volatile configuration | warning |
| S11 | A forbidden-word list or long example list substitutes for a decision principle | major |
| S12 | The primary trigger uses an accidental property such as path or audience instead of purpose, unless the path itself defines the scope | major |
| S13 | A context reference is unreachable from the current role; delete it or replace it with a positive statement | major |
| S14 | The rule specifies an exclusion but not what to do afterward, such as skip, report, or hand off | major |
| S15 | An order is missing **only when** success depends on a sequence of decisions that **cannot be reordered**; a recommended workflow does not qualify | major |
| S16 | Verification is required but not anchored to a tool, command, or executable reference | warning |
| S17 | An action is required but has no observable success state or completion criterion | major |
| S18 | Process locking: removing the process steps leaves no target state. State the outcome first and make the process optional guidance | major |
| S19 | **Overconstraint**: a global absolute prohibition or mandate (never/forbidden/must) is not required for safety, a contract, state preservation, or another case where noncompliance is inherently wrong, and it has neither a local judgment anchor nor an explicit exception. Replace it with “match the surrounding code,” an outcome contract, or a recommendation/default | major |

For S1 and pure target states or local judgment anchors, do **not** report S1 merely because words such as required or forbidden are absent. This includes target-state sentences with a clear success condition, local anchors such as “match the surrounding code, existing formatter, or project conventions,” and informational gotchas, though S8 may still identify fluff.  
Still report S1 when a sentence appears to constrain a branch but hides its strength behind vague wording such as “should” or “pay attention.”

**Scope of S2/S6:** Apply these checks only to **trigger, scope, routing, and destination** rules. Style, taste, and local judgment principles do not need a complete table of when not to apply. When their boundaries are unclear, use an S3 anchor or S17 completion criterion rather than adding exclusions solely to satisfy S2.

An S3 **observable anchor** may be any one of the following; it need not become an absolute prohibition: an operational definition; an observable success or failure condition; a local anchor such as surrounding code, same-directory conventions, existing lint or formatter configuration, or repository tests or golden files; or an executable reference with a clear trigger.  
Report unanchored terms such as `适当` `必要时` `合理` `尽量` `妥善` `酌情` as warnings.

For S7 **object binding**, ask: “What is the target of this action?” If two agents could answer differently for a branch-changing sentence, report major. Common causes include a demonstrative pronoun or role name that could refer to another object in the current context, several names for the same object within one paragraph, and the same term carrying different meanings across files. Rewrite with a proper name or ID, or use one consistent name within the paragraph. Do not report an object that is already uniquely identifiable. Do not turn this into a list of prohibited pronouns (S11). S3 covers unanchored vague terms; S13 covers names unavailable to the current role.

For S8 **sentence tax**, delete general knowledge that would not be wrong to ignore. Also delete repetition when removing a neighboring sentence, parallel field, or status line would not change the decision. S9 applies to restatements of upstream documents, not repetition within the same section.

For S4/S15, if requirements are compatible but execution order affects correctness, check necessary dependencies under S15. Do not treat jointly triggered requirements as a forced choice.

For S15/S17, report S17 when one action lacks an observable result and S15 when only a required sequence is missing. Report the more specific issue for a shared root cause.  
For S18/S15, use S18 when a checklist or sequence is the **only** definition of success; use S15 only when a non-reorderable decision sequence is missing.  
For S19/S1, use S1 when a rule should be strict but its strength is unclear; use S19 when it is already strict but too broad and noncompliance is not inherently wrong.  
For S16, prefer anchors such as `rg`, a test, a script, or an existing check command. Treat code or tests as the specification instead of restating them in long prose.

**High-risk vague terms** (warn when unanchored): `适当` `必要时` `长期` `复杂` `相关` `面向` `给…读` `重要` `合理` `尽量` `妥善` `酌情`

## Layer 2: Semantics

For fatal and major issues, check whether classification axes are mixed, rules collide, names mislead, and two agents would make the same choice in boundary cases that **change a branch**, including binding the same action object under S7. Prefer essential properties to accidental ones.  
For S19, check whether a narrower local anchor can replace the global prohibition.

## Layer 3: Scenario tests

| Rule type | Test requirement |
|-----------|------------------|
| Permissions, routing, safety, contracts, and S4/S5 rules | Give 2–3 boundary cases for each fatal or major issue. Each must lead to **one expected branch**: act, do not act, or ask a named party. If it cannot, report fatal |
| S18/S19 or pure style and local-anchor rules | Expect an **observable success state**, or a recommendation to delete or replace the rule with an anchor; do **not** require one exact sequence of low-level actions |
| S8/S9 only (sentence deletion) | Scenario tests may be omitted if the issue report clearly explains why the sentence should be deleted |

Format: scenario / question / expected answer / source of ambiguity.

## Layer 4: Domain coverage

For the document as a whole, identify the dimensions the domain requires, what is actually covered, and any **coverage gap**. Flag the gap without setting policy.  
Also check for excessive existing sections that S8 or S19 would remove. Report them rather than recommending more rules merely for “coverage.”
