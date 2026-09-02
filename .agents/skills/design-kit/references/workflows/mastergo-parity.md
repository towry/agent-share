
# MasterGo Design Parity Guard

## Purpose

Use this skill to enforce an evidence-first workflow for MasterGo design parity work.

It exists to stop the agent from:

- reading only part of a MasterGo design
- inferring layout from text alone
- guessing “common” UI structure
- implementing too early
- then discovering the real frame structure later

This applies both to:

- MasterGo → implementation work
- MasterGo ↔ implementation correction work

## When to trigger

Use this skill when any of the following is true:

- the user provides a MasterGo URL
- the user says the component is not aligned with the design
- the user shares a screenshot and says “还是不一样”, “looks wrong”, “差别很大”, or similar
- the task involves content blocks inside dialogs/cards where structure is easy to misread
- the agent is about to “just start implementing” from partial design understanding

## Non-negotiable rule

**Do not write or revise component structure until the full design tree has been extracted and summarized.**

If you have not yet read:

- the top-level frames
- the key child frames
- the flex direction / gap / padding of those frames
- the text nodes inside each major region

then you are still in analysis mode, not implementation mode.

## Failure patterns this skill prevents

These are the main mistakes to avoid:

1. **Text-first hallucination**
   Guessing layout from labels or values without reading the frame hierarchy.

2. **Common-pattern projection**
   Assuming the UI is “probably a vertical card stack” because that feels common.

3. **Partial-tree coding**
   Reading a few nodes and coding before checking the entire relevant subtree.

4. **Wrong axis**
   Missing that a key frame is `flex=row` rather than `flex=column`, or vice versa.

5. **Wrong label relationship**
   Confusing:
   - label above content
   - label beside content
   - label embedded inside card

6. **Wrong footer grouping**
   Missing that several visual regions actually belong to one row, cluster, or parent frame.

## Required workflow

### Step 1: Read the current implementation first

Before touching code, read:

- the target component file
- any child components it composes
- any preview, story, demo, or usage example if one exists

Extract the **current implemented structure** in plain words.

Example:

- header
- body vertical stack
- candidate card
- fee block
- payment row
- QR block
- agreement
- upsell outside card

Do not judge yet. Just describe.

### Step 2: Read the full MasterGo tree

Use whichever available design-reading interface can inspect the full MasterGo structure, and extract the **entire relevant tree**, not only text nodes.

At minimum, inspect:

- top root frame
- immediate child frames
- each region’s `layoutStyle`
- each region’s `flexContainerInfo`
- the text nodes inside each region

You must explicitly capture:

- frame `id`
- frame `size`
- `relativeX` / `relativeY`
- `flexDirection`
- `gap`
- `padding`
- `alignItems`
- `justifyContent`

If needed, print the tree recursively.

### Step 3: Produce a design summary before coding

Write a semantic summary like:

1. header
2. body section A
3. body section B
4. footer left block
5. footer right info column

Then write a structural summary like:

- root: `column`, gap `24px`
- header: `row`, gap `16px`
- body: `column`, gap `24px`
- footer: `row`, gap `16px`, padding `16px`

Do not start implementation until both semantic and structural summaries exist.

### Step 4: Build a gap table

Compare **current implementation** vs **design structure**.

Use a table with these columns:

- current section
- current implementation
- design section
- exact gap
- required fix

This is mandatory whenever the user says the UI still differs from the design, or when the current structure is not obviously identical to the design.

### Step 5: Only then edit code

Once the gap table is complete:

- change structure first
- then spacing
- then visuals/icons
- then text defaults

Do not start from color polishing while the layout axis is still wrong.

## Priority order for fixes

Always fix in this order:

1. **Structure**
   - frame nesting
   - row/column direction
   - section grouping

2. **Spatial rules**
   - gap
   - padding
   - fixed sizes
   - align / justify

3. **Semantic placement**
   - whether label is above/beside/inside
   - whether upsell belongs inside footer or outside
   - whether close button belongs to shell or content

4. **Visual details**
   - icons
   - border radius
   - background
   - text weight / size

If structure is wrong, do **not** call the result “mostly done”.

## Required output before implementation

Before editing, produce these four items internally or explicitly:

1. **Current structure summary**
2. **Full design tree summary**
3. **Gap table**
4. **Fix order**

If any one is missing, you are not ready to implement.

## Adaptation rule

This skill is intentionally cross-project.

After you have the design structure right, adapt to the target codebase:

- follow the local component conventions of the project
- use the target framework’s normal styling system
- place files according to the project’s own directory rules
- update exports, stories, docs, or tests only if that project uses them

But **none of that matters if the layout structure is wrong**. Design parity comes first.

## Screenshot correction loop

When the user provides a screenshot and says “still wrong”:

1. Read the screenshot carefully
2. Re-read the design tree
3. Compare screenshot vs design vs current implementation
4. State the exact discrepancy in one sentence each
5. Fix the highest-structure error first

Typical examples:

- “Footer should be row, not column”
- “Label should sit above card, not in left column”
- “Visual group belongs inside the same parent block”
- “Info text belongs in the right column, not above the media block”

## Anti-hallucination checklist

Before coding, ask yourself:

- Have I seen the full relevant frame tree?
- Do I know which parent is `row` and which is `column`?
- Do I know whether the footer is one block or multiple blocks?
- Do I know whether a label is outside or inside the card?
- Am I copying the design, or inventing a plausible layout?

If the answer to the last question is anything other than “copying the design,” stop and inspect more.

## Validation after fixes

Run the target project’s normal verification steps.

A reasonable order is:

1. format
2. lint
3. type check
4. build or targeted test

Do not hardcode repository-specific commands into the skill. Use the host project’s native workflow.

## Hand-off format

When reporting back, explain:

1. why the old implementation was wrong
2. which structural facts from the design were previously missed
3. what structural corrections were made
4. what validations passed

This helps future workers learn the right habit: **first tree, then code**.

## Core lesson

This skill captures a reusable failure-and-recovery pattern:

- first implementation guessed layout from partial understanding
- it inferred structure from plausible UI conventions
- later, the full MasterGo tree revealed the actual parent-child relationships and axes
- the screenshot confirmed the mismatch
- only after reading the full tree did the correct structure become obvious

Keep this lesson active: **never trust partial design reading when layout parity matters**.
