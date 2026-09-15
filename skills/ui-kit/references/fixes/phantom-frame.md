
# Phantom Frame

Use this skill to solve UI problems by fixing structure before tuning cosmetics.

The goal is not merely to make the screenshot look closer for one moment. The goal is to find the rendering model that makes the UI naturally stable: one source of truth, one ownership boundary per layer, and no duplicated state or duplicated DOM that fights itself.

## When this skill should dominate

Use this skill when the task involves any of these:

- Screenshot says implementation is wrong, strange, off, or uncanny.
- Layout shifts when a panel opens, closes, or changes state.
- Selected state disappears, duplicates, or changes size.
- Modal, popover, dropdown, sticky header, tabs, or overlay behavior feels structurally wrong.
- Design handoff exists from MasterGo or similar tool and the code does not match.
- A "simple style tweak" has already failed once or twice.

If the issue smells like state ownership, duplicated rendering, layout participation, or wrong stacking context, use this skill immediately instead of iterating on padding and colors.

## Core doctrine

1. Reframe the problem from appearance to mechanics.
2. Identify which layer owns layout, which layer owns overlay, and which layer owns state.
3. Eliminate duplicated rendering before adjusting micro-spacing.
4. Keep a single source of truth for selection and visibility.
5. Prefer structural fixes over cosmetic patches.

Useful engineering names for this approach:

- root-cause fix
- structural refactor
- single source of truth
- eliminate duplicated rendering
- reframe the problem representation

## Workflow

### 1. Capture the visible failure precisely

Write down the failure in concrete terms:

- what moves
- what duplicates
- what loses selected state
- what should float but participates in normal flow
- what should remain stable across open/close states

Bad framing:

- "spacing looks weird"

Better framing:

- "opening the category panel creates a second top row, so the first row changes position and selected state becomes inconsistent"

### 2. Inspect the current rendering model

Read the implementation and answer:

- Is the same UI row rendered twice in different branches?
- Is the open state replacing DOM instead of overlaying it?
- Does selected state depend on two different style systems?
- Does active styling change width, border, font weight, or padding?
- Is an overlay incorrectly participating in layout flow?
- Is there a mask, sticky header, or z-index boundary fighting the panel?

Prefer code-structure questions over design-token questions at this stage.

### 3. Classify the bug

Most UI mismatch bugs fall into one of these buckets:

- **Duplicated DOM**: same controls rendered in collapsed and expanded branches.
- **Duplicated state logic**: selected item styled by different rules in different branches.
- **Wrong layer ownership**: modal/dropdown lives in normal flow instead of overlay.
- **Intrinsic sizing drift**: active state changes border or font weight and moves siblings.
- **Anchor drift**: overlay is positioned relative to the wrong ancestor or top offset.
- **Design-token mismatch**: spacing, color, font, radius differ after structure is already correct.

Name the bucket before editing.

### 4. Choose the minimum structural correction

Prefer changes like these:

- Keep the anchor row mounted and stable; only overlay the expanded layer.
- Render shared controls once when possible.
- If two layers must exist, ensure they render disjoint data sets.
- Give stable box metrics to active and inactive states; use transparent borders if needed.
- Start overlays below the anchor row, not on top of it, unless design explicitly says replacement.
- Reserve toggle space explicitly so content does not slide under the icon.

Avoid:

- adding compensating margins without explaining the mechanic
- changing multiple unrelated spacings before isolating the cause
- introducing fallback branches that hide the real bug

### 5. Only then map back to the design

After the structure is correct:

- compare spacing, alignment, typography, radius, and tokens
- check project style rules
- if a MasterGo link exists, fetch the DSL and compare the intended layer behavior

For this repo in particular:

- read `docs/agents-md/style-conventions.md` before choosing colors or units
- use `rpx()` for sizes
- use CSS variables instead of hardcoded colors
- if the issue comes from a design link, follow `docs/agents-md/design-to-component-workflow.md`

### 6. Validate behavior, not just pixels

Verify all relevant states:

- collapsed
- expanded
- selected item inside visible row
- selected item inside overflow area
- open then close
- switching tabs
- mask click close

If possible, validate with Storybook or the local mini-program flow appropriate to the screen.

## Output format

When using this skill, report in this order:

1. **Symptom**: what the user sees
2. **Root cause**: the structural reason
3. **Fix**: what changed in rendering/state/layout ownership
4. **Verification**: how you checked the result

Keep the explanation short, but make the root cause explicit.

## Heuristics that often work

- If UI "jumps", inspect width, border, font weight, and duplicated branches first.
- If content gets pushed down, suspect flow layout where overlay is needed.
- If something appears twice, inspect conditional rendering boundaries before styling.
- If active state disappears, compare whether the active item is rendered from the same data slice in both states.
- If tabs and a dropdown feel visually unrelated, check whether they are using different interaction metaphors for the same control tier.

## Example moves

**Example 1:**
User says: "After expanding, the panel pushes the content below it down, and the selected button also jumps around."

Apply this reasoning:

- classify as wrong layer ownership + duplicated rendering + intrinsic sizing drift
- keep top row stable
- render the panel as overlay below the row
- make active and inactive button metrics identical
- ensure overflow list excludes already visible items

**Example 2:**
User says: "It looks slightly different from the design, but I have already adjusted the padding many times and it is still wrong."

Apply this reasoning:

- stop tuning padding
- inspect DOM structure and state branches
- compare design layer semantics, not just distances
- make one structural correction, then return to spacing

## Anti-patterns

Do not:

- solve a structural bug with random spacing nudges
- keep two separate implementations of the same control row unless there is a hard reason
- let active state alter outer dimensions unintentionally
- treat screenshot mismatch as only a token mismatch
- ask the user too many low-value clarification questions if the code already reveals the mechanic

## Success criteria

This skill succeeds when:

- the UI stays spatially stable across state changes
- the selected state is consistent in every branch
- visible and overflow items do not duplicate
- overlays behave like overlays
- final polish is small because the structure is now correct
