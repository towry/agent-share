---
name: ui-kit
description: |
  Use for: A reference collection for UI diagnosis and repair, including first-impression visual critiques, interaction compliance audits (keyboard/scrolling/gestures/streaming, etc.), layout drift and pixel-level bug fixes, and cross-page regression handling for shared components. Trigger when users mention shaking, flashing, misalignment, or overlap; provide UI screenshots or designs; report interaction bugs or cross-page layout distortion; or say "fixing A broke B."

  Do not use for: Codifying visual standards in DESIGN.md (use design-md), or style languages and design-comparison workflows (use design-kit).
---

# ui-kit

## Usage

This skill is a reference collection for UI diagnosis and repair. It does not provide solutions directly; it directs you to specific reference files.

1. **List the contents first**:

   ```bash
   run-skill-script ui-kit list
   ```

   The output is grouped under `[audits]` / `[fixes]` and includes a one-line description to help you decide which file to load.

2. **Then load the specific reference**: Use the Read tool to read all of `references/<category>/<name>.md`, then work according to its rules.

## Directory structure

```
ui-kit/
├── references/
│   ├── audits/                      # Audits: describe the current state and diagnose it without prescribing fixes
│   │   ├── visual-critique.md       # Purely visual first-impression critique—visual center/layers/rhythm/density/scanning path
│   │   └── interaction-audit.md     # UX compliance of interaction code—keyboard/scrolling/gestures/focus/streaming
│   └── fixes/                       # Fixes: solve UI bugs by starting with structure
│       ├── methodical-fix.md        # Evidence-based fixes for shared components, cross-page regressions, and "fixing A broke B"
│       └── phantom-frame.md         # Layout drift, flicker, screenshot-versus-implementation differences, and pixel-level UI bugs
└── evals/
    └── interaction-audit/           # Evaluation set and fixtures for interaction-audit
```

## Boundaries with other skills

- **design-kit**: Style languages (monochrome, Material Design) and design-comparison workflows (MasterGo parity). This skill contains no implementation guidance for design standards; it only diagnoses and repairs existing UI.
- **design-md**: Codifies visual identity in `DESIGN.md`. This skill does not write standards; it only audits the current state.
- **mcp__vision__ui_to_artifact**: Converts UI screenshots into code or a prompt.

## Trigger criteria

When a user mentions any of the following, run `list` first and then load the corresponding reference:

- Visual complaint: provides a screenshot and asks "why does this look strange?" or requests a first-impression review → `audits/visual-critique`
- Interaction bug: unusual keyboard appearance/dismissal, incorrect scroll position, gesture conflicts, or unusual streaming rendering → `audits/interaction-audit`
- Cross-page regression: "fixing A broke B," another location breaks after a shared component changes, or layouts differ across pages → `fixes/methodical-fix`
- Pixel-level bug: UI shaking/flashing/misalignment/overlap, design walkthroughs, or layout drift in Taro / mini programs / Storybook → `fixes/phantom-frame`

For vague questions such as "the UI is wrong" or "it looks strange," run `list` first and let the user choose.

## Extending

When adding a reference:

1. Place it under `references/audits/` or `references/fixes/`, with a kebab-case filename.
2. Update the `AUDITS` / `FIXES` arrays in `scripts/list.sh` at the same time, adding the name and a one-line description.
3. If adding a category, add a new group to `list.sh` and update the "Directory structure" section of this SKILL.md.
