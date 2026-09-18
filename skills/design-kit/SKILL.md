---
name: design-kit
description: |
  Use this reference collection for design styles and design-parity workflows. It covers monochrome, blueprint editorial, Material Design, paper UI, and classic Mac OS (System 1–7), plus implementing MasterGo designs without layout drift. Trigger it when users mention those styles, provide a MasterGo URL, say the result still looks different, or ask for screenshot-based parity review.

  Do not use it to codify project-wide visual standards in DESIGN.md (use design-md), perform visual critique only (use ui-visual-critique), or audit UI interaction compliance (use ux-interaction-audit).
---

# design-kit

## Usage

This skill is a collection of design references. It does not prescribe a solution directly; instead, it points you to the relevant reference file.

1. **List the available references first**:

   ```bash
   run-skill-script design-kit list
   ```

   It groups references by `[styles]` / `[workflows]` with a one-line description, so you can tell which one to load.

2. **Load the specific reference**: use the Read tool to read `references/<category>/<name>.md` in full, then follow its instructions.

## Directory structure

```
design-kit/
├── references/
│   ├── styles/                       # style languages: palettes, typography, components, tokens
│   │   ├── monochrome.md             # monochrome / terminal aesthetics; high contrast, restrained chrome
│   │   ├── blueprint-editorial.md     # technical paper + engineering sketch; gray-scale hierarchy, line-art diagrams, soft product panels
│   │   ├── google-material-design.md # Material Design 3; elevation, HCT dynamic color, adaptive layouts
│   │   ├── paper-ui-style.md         # Paper UI; reading-first, warm paper feel, centered narrow column, serif body text
│   │   └── classic-mac.md            # Classic Mac OS (System 1–7); beveled windows, striped title bars, hard offset shadows
│   └── workflows/                    # design workflow conventions
│       └── mastergo-parity.md        # implementing MasterGo designs with parity; structure before code
```

## Boundaries with other skills

- **design-md**: Use design-md to codify a visual identity in a root-level `DESIGN.md` with YAML tokens and eight prose sections, validated with `npx @google/design.md lint`. This skill provides style languages; it is not a DESIGN.md authoring workflow.
- **ui-visual-critique**: Provides first-impression visual diagnosis from screenshots without prescribing fixes.
- **ux-interaction-audit**: Audits code-level UX compliance, including keyboard, scrolling, and gestures, without prescribing fixes.
- **mcp__vision__ui_to_artifact**: Converts a UI screenshot into code or a prompt.

## Triggers

Run `list` and load the relevant reference when the user mentions any of the following:

- Style terms: `monochrome` / `terminal 风格` / `极简单色` / `blueprint` / `technical paper` / `工程草图` / `Material Design` / `Material 风格` / `paper UI` / `阅读风格` / `博客排版` / `classic Mac` / `System 7` / `复古 Mac 风格`
- Parity work: the user provides a MasterGo URL, says “还是不一样 / 差别很大 / looks wrong”, or asks for screenshot-based review.
- A vague request about “设计风格” or “视觉风格”: run `list` first and let the user choose.

## Extending the collection

When adding a reference:

1. Put it under `references/styles/` or `references/workflows/`, using a kebab-case filename.
2. Update the `STYLES` or `WORKFLOWS` array in `scripts/list.sh` with its name and a one-line description.
3. If you add a category, add its group to `list.sh` and update the directory structure in this SKILL.md.
