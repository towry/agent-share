
# UX Interaction Audit

## Purpose

Diagnose complex interaction code for UX compliance: describe the current state without prescribing fixes. For each finding, explain **when it reproduces, what should happen, what actually happens, why it happens, and where it is visible**—enough for users to make decisions without deciding for them.

## When to use

Use this audit for code that controls **user-perceivable interactions**: virtual keyboards; scrolling, including bottom-sticking, position preservation, and anchoring; swipe, drag, and pinch gestures; interruptible or reversible animations; modals and sheets; streaming rendering; focus; drag and drop; virtual or infinite lists; pull to refresh; and coordination across a native ↔ WebView bridge.

Trigger signal:
- "Review/examine/look at X's interactive code"
- "Is this interaction/gesture/scrolling/animation correct?"
- "Should Y be used when X?"
- "Feels strange/stuck/shaky/unsmooth/anti-human"
- "Does the implementation satisfy these rules:..."
- Interactive bug review for verification
- "What are the UX risks in the code"

Not suitable for: pure style/typesetting bugs (converted to ui-methodical-fix); pure logic bugs that have nothing to do with interaction; users seek repairs, not diagnosis.

## Process

### 1. Establish the rules

**Do not audit without rules.** Use one of these sources and tell the user which one applies:

- **The user provided rules**: Restate them as a numbered list (R1, R2, ...). Give each rule a **trigger** (when it applies), a **requirement** (the specific behavior), and a **reason** (the UX rationale used in later judgments).
- **The user did not provide rules**: Propose a list based on best practices and **ask the user to confirm or revise it before reviewing the code**. Consult the topic files under `references/`.

Rules must be **decidable from the code**. “Feels natural” is not a rule. “When the user scrolls away from the bottom, new content must not force the view back to the bottom” is. Split compound rules that contain “and” or “or,” and split conditional branches such as “use A for short content and B for long content.”

### 2. Gather evidence

- User **gives the clip**: review it immediately.
- User **gives a path**: gather evidence. Use `mcp-cli-grep-code "<question>" <repo>` for semantic code searches (such as "how is keyboard show handled" or "where does scroll auto-stick to bottom"); use `rg`/`Grep` for exact symbols (such as `keyboardWillShow`, `scrollIntoView`, `visualViewport`, or `ResizeObserver`).
- **Both sides of the hybrid stack are reviewed**: Native (SwiftUI/UIKit/Compose...), webview (HTML/CSS/JS), and bridge can hide violations. If one side is missing, the review will be incomplete.
- If you don’t get anything after asking for it for three rounds, don’t make it up. Just ask "Where is the treatment for X behavior?".

### 3. Walk through scenarios

Do not reduce the audit to a checklist. First list the **user-observable sequence of events**, such as: the user swipes up → a new message arrives → the keyboard appears → an image loads → the keyboard height changes → the keyboard closes. Then trace the code scenario by scenario:

- What **should** be in this scenario (required by the rules)
- What the code actually does (inferred from the behavior it reads)
- If the two do not match, then a discovery is made

Common **mechanism categories** during walk-throughs (the following are abstract words, everything found should be classified):

| Class | Interpretation |
|---|---|
| Out of sequence | State changes and side effects are reversed (pinned first, then smooth) |
| Missing guard | A programmatic-scroll flag is not set, so events caused by the program are mistaken for user actions |
| Forgotten state | A key ref or flag is not read, cleared, or restored; dead code often results |
| Race window | Two overlapping asynchronous sources, such as animation + RO + user gestures, are not coordinated |
| Infinite loop/dead code | A RAF or loop has no restart path after it stops, or a listener writes state that nothing reads |
| Incorrect threshold | An epsilon, debounce, or timeout value does not match the actual UX requirement |
| Double compensation | Add inset/padding to both ends of native and webview, the value is doubled |
| Missing symmetry | Show and hide, enter and exit, or push and pop are not handled as corresponding pairs |
| Bridge delay | Native and WebView events arrive at different times, leaving an inconsistent intermediate render |
| Silent fallback | An exceptional case silently falls back to a default, such as forcing the view to the bottom, with no understandable result for the user |

Every finding must be classified into **at least one category**. An unclassifiable item may represent a new category (which may be mentioned in the final section) or a non-interaction problem (which must be removed).

### 4. Write the report

Use the template below. List findings **in severity order**; end with a summary of satisfied rules and uncertainties.

## Severity

| Severity | Marker | Meaning |
|---|---|---|
| **Fatal** | 🟥 | Blocking core processes, data loss, irreversible operations, and users being completely unable to continue |
| **Severe** | 🟧 | UX is obviously damaged, obvious shaking/stuttering/losing gestures, performance collapse, long-term accumulation of competition |
| **Medium** | 🟨 | Occasional irregularities, abnormal corner scenes, and slight deviation of the threshold value |
| **Mild** | 🟦 | Dead code, smell, not friendly to future expansion |

Sort by **user-perceived impact**, not by difficulty of repair.

## Report template

```markdown
# UX interaction review: [scope, such as "chat keyboard + streaming rendering"]

**Overview**: Fatal N₁ / Severe N₂ / Moderate N₃ / Mild N₄ (N findings in total); **Meets** N₅ items; **Uncertain** N₆ items.

**Based rules** (If the user does not provide it clearly, this is the proposal of this review, **to be confirmed by the user**):
- R1 [abbreviation] — [one sentence each for trigger/requirement/reason]
- R2 ...

---

## 🟥 #1 [A brief description, the subject is code behavior]

**Scenario**: [User Observable Behavior Sequence]
**Expected**:[According to Rx]
**Actual**:[Where does the code lead]
**Mechanism**: [categorization word + one sentence reason]
**Evidence**:`path/file.ext:L42-L48`
\```lang
// Minimum relevant excerpt
\```
**Violated**: R1, R3

---

## 🟧 #2 ...

---

## Satisfied rules

- ✓ R2:[Which part of the statement is correct + evidence file:line]
- ✓ R5:...

## Uncertain

- ? R4:[X has not been read / depends on runtime Y / needs to see Z]
```

## Business rules

- **Never prescribe a solution**: Do not write repair code, say “change X to Y,” or evaluate alternative implementations. Provide diagnosis only.
- **Keep diagnosis separate from prescription**: You may say “the code has no flag that records whether the user is manually scrolling,” because that describes what is missing. Do not say “add an isUserScrolling flag,” because that chooses a solution for the user.
- **Start of scenario**: The subject of the first sentence of each question should be **code behavior** or **user scenario**, not just "the loop is wrong" or "the logic has bugs".
- **Three states must be in order**: Scenario, expectation, and actual three paragraphs are indispensable; the expectation paragraph must be able to correspond to a certain rule number.
- **Mechanisms must be classified**: Every discovery is classified into at least one mechanism category (see the table above); those that cannot be classified into any of the above categories are listed separately in the "New Category" section.
- **Subject to evidence**: Each discovery must be file:line + excerpt. If there is no evidence, it will be reduced to "uncertain", so don't lie.
- **Balanced assessment**: In addition to findings, list **satisfied rules** so the report is not one-sided and the user knows what already works. If none are evident, say so.
- **Do not add rules during review**: If the rules are found to be incomplete, **report to the user first** and then add them after approval. Do not expand the scope silently.
- **Hybrid Stack Sided**: Cross-native and webview interaction, the violation may be on any side or bridge; the side must be specified in the report.
- **Brevity over completeness**: Keep each finding to three to five lines and under ten lines; users will not finish reading longer findings.

## Counterexample (common mistakes)

- Talking about "the code is wrong" in a straightforward manner - no scene, no mechanism, it means nothing is said.
- Only list the rule status (satisfied/violated) without describing the scenario - missing "when will it happen again" makes it difficult to review.
- Write "It is recommended to change it to X" - breaking the red line of "never give an answer".
- Severity levels filled in carelessly - marking dead-code fixes as fatal and RAF infinite loops as minor completely inverts user-perceived severity.
- Assigning every available mechanism label to a finding without showing evidence for each one.

## Reference (expanded as needed)

The `references/` directory is initially empty. When a certain interaction topic (such as keyboard + scrolling, virtual list anchor, gesture nesting, flow bottom, etc.) is repeatedly involved in multiple reviews, you can create a `<topic>.md` to precipitate the common UX expectation rules and typical violation signals of the topic, so that it can be used in the post-review "proposed rules".

Reference is not made to the rules themselves, but when the user does not provide a rule, it is **proposed** based on this for confirmation; all such proposed rules must be reconsidered by the user before they can be used as a basis for decision-making.

**Forbidden**: Do not embed the code structure, variable names, and file paths of specific projects in `references/` to avoid overfitting the experience of one case into general rules. The reference must be in **abstract interaction mode** (such as "keyboard events conflict with deviation from the bottom"), not in specific framework/codebase.
