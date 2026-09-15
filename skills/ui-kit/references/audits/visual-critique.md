
# First-Impression Visual Critique

## Purpose

- This technique only determines "whether the picture is established" and does not ask "why the implementation is like this".
- The product is a visual symptom diagnosis, and does not code the root cause and repair prescription.
- Focus on the overall look and feel before local details.

## Writing and diagnostic constraints

- Write the entire response in Simplified Chinese.
- Do not set examples, do not list wrong and correct examples, and do not include platform or component templates; examples can easily lead to overfitting and make the subsequent review examples a model.
- Not bound to any UI type, platform, tool, or design software.
- The terminology is based on visual principles, not specific frameworks.

## When to use

- Users provide image materials and ask for comments, review, and judgment from the designer’s perspective.
- Users ask what is strange, what is unreasonable, what is the problem at first sight, and what is visually awkward.
- The user made it clear that "look at the pictures first and speak" and did not want to talk about the code first.
- The main evidence is images, and the main task is diagnosis rather than repair.

## Not suitable for use

- The user explicitly stated that he wanted to check the root cause of the code, fix the implementation, and change the shared components.
- Users need to review interaction logic, state timing, gestures, scrolling, and animation.
- Users need to check the consistency between design source and implementation, and need to read the design tree.
- Users need to settle project design specifications or tokens.

## Boundaries with other skills

- `ui-phantom-frame` diagnoses implementation mechanics; this skill diagnoses visual symptoms only.
- `ui-methodical-fix` owns the repair process; this skill judges what is visible in the image.
- `layout-interaction-contract` examines dynamic relationships; this skill examines the perception of a still frame.
- `ux-interaction-audit` reviews interactive UX; this skill judges whether the static composition works visually.
- `mastergo-design-parity-guard` checks implementation against a design source; this skill can critique an image without reading the design tree.
- `design-md` establishes project-wide standards; this skill judges a single image.

## Dominant Rules

- If the main evidence is an image and the main task is visual comment, this technique will be used first.
- If the user also provides code, links, or bug reports, complete the visual pass before switching to another skill. This skill does not dominate when images are only supporting evidence for code diagnosis, such as DevTools or stack-trace screenshots, and the user asks for code-level attribution.
- If you subsequently move to repair, attribution, review, and interactive review, switch to the corresponding skills.

## Core method

- Start with the whole, then move closer.
- Inspect empty space before occupied space. If the image is too dense to expose empty space, diagnose the density first.
- Judge major issues before fine details.
- Describe symptoms before considering causes.
- Prefer a few substantial findings to many weak ones.

## Hard threshold

- Five seconds of blind viewing are mandatory in the first round.
- If the "biggest anomaly at first sight", "negative space conclusion" and "visual center of gravity conclusion" are not written down, they will not be allowed to enter the local review.
- Disable implementation terminology, platform terminology, and code attribution in the first two steps.
- Low-confidence details must not overwhelm high-confidence overall issues.
- No matter what skills are loaded at the same time, this level must be passed in the first round; before this level is passed, the remaining skills cannot dominate the output.

## Workflow

### 1. Delimitation

- It is stated that this round will only be judged based on what is seen on the screen.
- Suspended code, design tree, implementation hypothesis.
- First identify what the user wants is visual diagnosis, not repair implementation.

### 2. Five-second blind viewing

- Judge the image as a non-specialist would at first glance. Do not inspect individual elements, count pixels, or use specialist terminology.
- Tell me what you saw at first sight; if you don't know how to write at the moment, you can ask three questions to start it - where is the most eye-catching or obstructive, where is the most unbalanced, and where is the most like "it shouldn't be like this but is the most conspicuous" - the three questions may not all be answered, it depends on the picture.
- Only describe "what you saw", not "why it happened".
- **Hard constraint**: If the first note names a specific control, graphic, text element, or decoration, the blind-viewing pass has failed. Step back and assess the whole image again. This pass describes overall energy, direction, emptiness, and weight rather than individual parts.

### 3. Negative space scanning

Look at the blank first, then the entity.

**Multi-scale method**: Visual problems in the picture can occur at different scales - the entire picture, large areas, small groups, and units. Every scale has its boundaries and margins to be scrutinized. You must **start from the large scale and drill down step by step**:

1. First understand the various levels of scale contained in the picture (it may be nested containers, it may be just visual groups, or there may be no obvious layering in the whole picture).
2. **Start from the largest scale** (often referred to as the "whole picture as a whole" - the most easily overlooked, because the eyes tend to focus on the content rather than the overall boundaries and white space of the picture).
3. Scan the edges and white space of each scale independently.

**All four sides of the screen must be scanned, one cannot be missing**——The following four questions must be answered one by one in each scale, and no skipping is allowed:

1. **Up**: Is it on top? Is it overcrowded? Is it heavy on the head?
2. **Bottom**: Is there an end point? Does the content seem to be cut off or hanging in the air? **The blank space below is the most easily overlooked, so it is a separate must-check item** - If the picture or its partitions have discernible boundaries, you must clearly answer "whether there is a reasonable ending at the bottom."
3. **Left**: Is it symmetrical to the right? Is it leaning to one side?
4. **Right**: Same as above.

After each scale is completed, scan the empty space between the blocks and outside the groups to determine whether the empty space is unbalanced, out of rhythm, or lost. Large areas of empty space without owners, local overcrowding, and edge imbalance should all be noted. **Be especially careful**: The imbalance of white space in large scales is often taken away by the physical conflicts in small scales. Therefore, the conclusions of each scale must be explicitly checked, and the conclusions of each scale must not be reported only in small scales.

### 4. Visual focus and hierarchy

- Determine whether the center of gravity is stable, whether it is falling, drifting, pressing to the top, or sinking to the bottom.
- Determine whether the priority is clear and whether the focus is where it should be.
- Determine whether "the person who should be seen most" and "the person who should be seen first" are the same.

### 5. Group, rhythm, density, scanning

- Check whether the information is naturally grouped and whether it is accidentally merged or split.
- Check whether the spacing rhythm and repetition order are consistent, and whether the density is reasonable.
- Check whether the scanning path is clear and whether it is interrupted by white space, weight or shape.

### 6. Partial review

- Only now can we get into the details. The details of the review vary from picture to picture - for interface pictures, look at alignment, spacing, font weight, control size, borders, and icons; for charts, look at scale, legend, color matching, and data-to-ink ratio; for posters, illustrations, maps, and 3D scenes, each has its own details. Don’t use one list to cover the whole picture.
- Color, contrast, readability, status indication, brand recognition, cultural adaptation, etc. are also reviewed here, and everything shown in the picture can be discussed.
- Only those with sufficient visual evidence will be accepted.
- Minor differences can be downgraded or deleted if they do not harm the overall picture.

### 7. Sorting and closing

- Determine the primary anomalies first, and then rank the main findings.
- Sort by "first sight damage", not by terms.
- Delete items with low confidence, low significance, and items that rely on imagination.

## Output format

The format should scale with the complexity and simplicity of the diagram. If the diagram is simple, the chief judge can add one or two findings; if the diagram is complex, the whole table can be spread out. Don’t make the template neat and tidy, and don’t force the fields together.

- **Overall judgment**: In one or two sentences, say whether the composition works and identify its largest problem.
- **Primary issue**: Usually one. If two issues have equal severity, list them in order rather than forcing them into one. This is the place to examine first if only one area can change.
- **Main findings**: The count follows the image's complexity - fewer is better than padding. Order by whole → section → part.
- **Minor discovery**: It can be saved, not to make up the number.
- **Uncertain items**: Those with unclear boundaries, questionable cutting, and unknown status will be returned here, and there will be no hard judgment.
- **Review sentence**: Point out the overall signal based on which this round of judgment should be based.

Whenever you find this small template available, fill in the fields as needed, no need to fill them all in:

- **Layer**: Overall/Partition/Part
- **Phenomena**: What you see on the screen
- **Injury**: Choose the most relevant one to name. Common examples include negative space, center of gravity, hierarchy, grouping, rhythm, density, scanning path, color, contrast, readability, status indication, consistency, etc.; this is not a closed list. Any defects in the picture can be named. Do not force the existing tags to be inserted.
- **Significance**: primary / obvious / secondary
- **Confidence**: High / Medium / Low

## Anti-pattern

- Before looking at the whole, click on the parts first.
- Only look at entities, not blank spaces.
- Replace visual judgment with implementation terms.
- Let numerous low-confidence details obscure a serious, high-confidence issue.
- Apply familiar templates and misread unfamiliar scenes.
- Jump directly to the code root cause or design intent from the screenshot.
- Overlong checklists meant to look professional dilute the signal.
- Do not state certainty levels you do not have, and do not include undecidable items.
- Let another skill override the first-impression judgment.
- Add examples or specific cases to avoid overfitting.

## Success criteria

- The biggest problem was caught at first glance and not missed.
- Negative space, center of gravity, and hierarchy are judged before details.
- The report entries are few but heavy, clearly sorted, and can be reviewed.
- Do not fabricate code root causes, and do not spam low-confidence snippets.
- Readers will know at a glance "where to read first."

## Reminder

Look at the empty space before the objects. Judge visual weight before discussing details. Do not collect small problems before identifying the largest imbalance.
