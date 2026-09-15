
# Methodical Fix

Use this for fixes where “fixing A breaks B,” especially with shared components, common styles, layout regressions, and cross-page differences. Its purpose is not to slow execution, but to gather evidence before making changes and reduce blind experimentation and rollbacks.

## When to use

Use this skill immediately in the following situations:

- Modifying a component, function, style, slot, mixin, or hook referenced in multiple places
- Adjusting `position: absolute`, `overflow`, flex, grid, table cell, sticky, z-index, padding, or margin
- The user says, “This is fixed here, but somewhere else broke,” or “Two pages share a component but behave differently”
- You have begun a second or later trial-and-error attempt without clearly explaining the root cause
- The visual symptoms do not fully match the DOM data

## Working principles

- **Evidence before inference**: Check callers, inspect screenshots, and identify constraints before changing code.
- **Act by default**: If the user has clearly asked for a fix, do not create an additional blocker. Briefly state your assumptions and tradeoffs, then implement it directly.
- **Assess the impact surface of shared components first**: Before changing a shared component, enumerate all major consumers and their differences.
- **Prioritize visual evidence for visual problems**: If a screenshot exists, inspect it with vision first. If there is no screenshot but the issue is reproducible, take one proactively.
- **Prioritize root causes over symptoms**: Do not mistake “padding that happens to make the container taller” for design intent.

## Standard workflow

### 1. Scan the impact surface

First use code-search tools to find every caller. Do not focus only on the current page.

Answer these first:

1. Who uses this component/style/utility?
2. Which pages pass different `prop`, `slot`, `class`, or data structures?
3. Which pages share an implementation but have different visual goals?
4. Will this change affect wide/narrow modes, hover/non-hover states, tables/cards, or overlays/normal flow?

If this is a shared component, first write a very short impact table:

| Consumer | Affected? | Difference |
|---|---|---|
| Page A | Yes | Passes the `bottom-right` slot |
| Page B | Yes | Uses the default prop and passes no slot |
| Page C | No/to be verified | Reuses only the style and does not render the bottom track |

### 2. Gather visual evidence

For layout, spacing, obstruction, clipping, and alignment problems, do not infer from numbers alone.

Gather evidence in this order:

1. If the user provided a screenshot, inspect it first.
2. If the issue can be reproduced locally, proactively capture the current state.
3. When necessary, combine this with DOM dimensions, computed styles, and scroll-container information.

The goal is not to “collect more data,” but to confirm exactly **what symptom the user sees**.

### 3. Model the constraints

Before making changes, clarify the key constraints in a few lines. At minimum, answer:

1. What is the positioning reference? What is `absolute` positioned relative to?
2. Which elements are in document flow, and which are not?
3. Which parent has `overflow`, a fixed height, table clipping, or scrolling constraints?
4. Is the current whitespace/obstruction caused by actual content height or by compensating styles?

For layout problems, first distinguish among three categories:

- **Visual compensation**: Such as extra `padding-bottom` or placeholder `margin`
- **Actual layout constraints**: Such as `overflow: hidden`, cell height, or flex shrinking
- **Positioning relationships**: Such as `position: relative/absolute` or stacking context

## 4. Compare solutions

List at least two solutions and explain their costs. Do not immediately commit to the first solution that works.

Example:

| Solution | Benefit | Risk |
|---|---|---|
| Change the shared padding directly | Least code | Can easily affect every consumer |
| Add a prop / class to distinguish variants | Controlled impact surface | Requires updating callers |
| Refactor the layout to return the element to flow | Cleaner semantics | Higher cost; may affect hit areas/interactions |

If the user has clearly said “fix it first so I can see it,” do not wait for confirmation. Choose the safest solution and implement it directly, then explain the tradeoff in your report.

### 5. Review syntax and mechanics

Before changing CSS/SCSS/template conditions, verify that what you write really has the semantics you think it does.

Common pitfalls:

```scss
// Descendant selector: .A .B
.A {
  & .B {}
}

// Two classes on one element: .A.B
.A {
  &.B {}
}
```

Also watch for:

- Whether checks for empty slots / scoped slots can actually distinguish instances
- `::before` / `::after` can become flex items in flex layouts, but whether they solve parent clipping still depends on the actual constraints
- `min-height`, `padding`, and pseudo-element placeholders may change only one layer's box without changing the element that actually clips

### 6. Implement in small steps

Change only one primary hypothesis at a time. If you change padding, position, overflow, and slot logic simultaneously, it becomes difficult to know which change worked.

Preferred order of changes:

1. The smallest verifiable conditional control (prop/class/selector)
2. Then change layout parameters
3. Only then consider structural rearrangement

### 7. Verify variants

After the change, verify at least:

- The page containing the current error/symptom
- Another major consumer of the same component
- Wide/narrow modes or other significant variants
- Whether the visual result matches the DOM data

If the fix is essentially “add a condition for one variant,” explicitly verify that “pages that do not match the condition retain their previous behavior.”

## Common mistakes

1. Immediately changing a suspicious style without first checking every consumer
2. Looking only at DOM dimensions, not screenshots, and failing to confirm the actual visual symptom
3. Mistaking a side effect for the root cause, such as “padding made the container taller, so it should exist”
4. Misreading SCSS/slot/conditional-rendering semantics
5. Trying three or four solutions at once, making causality impossible to trace
6. Fixing a shared component without verifying at least one sibling page

## Output requirements

When handling this type of task, include the following in the output whenever possible:

- **Root cause**: Explain the actual problematic relationship in one sentence.
- **Impact surface**: State which callers/modes are affected.
- **Tradeoff**: Explain why you chose this solution instead of a more forceful alternative.
- **Verification**: State which pages, modes, screenshots, or DOM evidence you inspected.

## One-line reminder

If you are repeatedly using trial and error, stop immediately: check callers, inspect the visuals, model the constraints, and only then change the code.
