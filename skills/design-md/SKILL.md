---
name: design-md
description: |
  Use DESIGN.md in Google's design-md format to preserve a project's visual identity and design tokens across sessions. Use it to initialize or extend colors, typography, and components, or to explain the eight-section specification. Trigger it when users mention DESIGN.md, design systems, design tokens, brand colors, visual standards, or an agent-readable single source of truth for visual identity.

  Do not use it to implement a component library, process Figma/Sketch source files, generate CSS or component code, or make non-visual architecture or routing decisions.
---

# design-md

## Core concept

`DESIGN.md` stores a project's visual identity in one plain-text file using Google's two-layer `design-md` format:

- **YAML frontmatter** contains machine-readable design tokens (colors / typography / rounded / spacing / components). These are the normative values that consumers must use.
- **Markdown body** explains the design rationale in eight canonical sections (Overview / Colors / Typography / Layout / Elevation & Depth / Shapes / Components / Do's and Don'ts).

The prose guides high-level decisions; the tokens provide exact values. Together they keep UI output consistent across sessions, agents, and tools.

### Appropriate uses
- Codify brand colors, typography hierarchy, shapes, spacing, and component styles.
- Provide downstream UI, frontend, and theme-export agents with a single source of truth.
- Lint structure and WCAG AA contrast.

### Do not force it
- It is not a component-library implementation; that belongs in code.
- It does not replace Figma/Sketch source files or visual designs.
- It is consumed by code generators but does not generate code itself.
- It does not carry architecture, routing, or data-model decisions.

If the request falls outside these uses, clarify the boundary instead of forcing it into DESIGN.md.

## Workflow

At the start of every task, check for `DESIGN.md` at the project root:

```bash
test -f DESIGN.md && echo exists || echo absent
```

### Case A — No DESIGN.md (initialize)

1. Put DESIGN.md at the project root beside `README.md`, never under `docs/` or another subdirectory.
2. Choose the source:
   - If the user provides brand guidelines / palette / typography specifications, preserve those values exactly.
   - Otherwise choose a preset from `assets/templates/`; see “Using templates.”
3. For a template, ask only for the brand name (`name`), a one-sentence personality for Overview, and the primary hex color for `colors.primary`.
4. Write `./DESIGN.md` with the Write tool.
5. Lint immediately.
6. Fix every error. Explain each warning and let the user decide whether to keep or resolve it.

### Case B — Existing DESIGN.md (maintain/update)

1. Read it first (`Read DESIGN.md`) to learn its token naming and section structure.
2. Apply the relevant rule:
   - New tokens must follow the existing kebab-case or camelCase convention.
   - New components should reference tokens such as `"{colors.primary}"` instead of literal values.
   - After changing a token, check every component that references it, especially for contrast.
   - Insert new sections in the canonical order below.
3. Make local changes with the Edit tool. Preserve two-space YAML indentation and one blank line between prose paragraphs.
4. Lint until there are no errors.

## Lint workflow

Always invoke the CLI through `npx`; no installation is required:

```bash
npx @google/design.md lint DESIGN.md
```

- exit `0` = no errors (warnings/info may remain)
- exit `1` = errors that must be fixed
- JSON output: `{ findings: [...], summary: { errors, warnings, info } }`

Fix findings in this order:

1. **`broken-ref` (error)** — Fix an unresolved token reference, usually a typo or undefined token.
2. **`contrast-ratio` (warning)** — Component `backgroundColor` and `textColor` contrast is below 4.5:1; change a color or reverse bg/text.
3. **`section-order` (warning)** — Reorder `##` sections into canonical order.
4. **`missing-primary` / `missing-typography` (warning)** — Add `primary` when colors exist, or typography when colors exist, unless accepting the default is intentional.
5. **`orphaned-tokens` (warning)** — Delete an unused color token or reference it from a component.
6. **`token-summary` / `missing-sections` (info)** — Informational only; usually no change is needed.

Lint again until `summary.errors = 0`. The first `npx` run may take several seconds to download the package; this is normal.

## Specification quick reference

### Canonical section order (sections may be omitted, but not reordered)

| # | Section | Alias |
|:--|:------|:------|
| 1 | Overview | Brand & Style |
| 2 | Colors | — |
| 3 | Typography | — |
| 4 | Layout | Layout & Spacing |
| 5 | Elevation & Depth | Elevation |
| 6 | Shapes | — |
| 7 | Components | — |
| 8 | Do's and Don'ts | — |

### Token types

- **Color**: `"#RRGGBB"` (SRGB hexadecimal string)
- **Dimension**: a number and `px` / `em` / `rem`, such as `"48px"` or `"-0.02em"`
- **Token Reference**: `"{colors.primary}"`, an object path in braces referencing a defined token
- **Typography**: an object with `fontFamily` / `fontSize` / `fontWeight` / `lineHeight` / `letterSpacing` / `fontFeature` / `fontVariation`

### Allowed component properties (whitelist)

`backgroundColor` / `textColor` / `typography` / `rounded` / `padding` / `size` / `height` / `width`. Other properties produce warnings, not errors.

### Important constraints

- Do not duplicate section headings; two `## Colors` headings fail lint.
- Prefer references such as `"{colors.primary}"` to literals such as `"#1A1C1E"` so updates cascade.
- Follow the existing naming style. If tokens use kebab-case such as `on-surface-variant`, new tokens must too.
- Component bg/text contrast must meet WCAG AA: ≥ 4.5:1.

See `references/spec.md` for the complete schema, consumer behavior, and examples. See `references/linting-rules.md` for every lint rule and repair example.

## Using templates

`assets/templates/` contains four presets. All pass lint with error=0. They may retain `orphaned-tokens` warnings because they include reserved semantic colors; reference or remove those colors as needed.

- **`minimal.md`** — Overview + Colors + Typography; the smallest lintable skeleton
- **`editorial.md`** — High-contrast neutrals with one accent, suitable for news/content products
- **`modern-saas.md`** — Soft neutrals, a bright primary, and Inter, suitable for SaaS/tools
- **`playful.md`** — Bright, saturated, heavily rounded, and lively, suitable for consumer/entertainment products

Usage:

1. `Read` the selected template.
2. `Write` it to `./DESIGN.md`.
3. Always change `name` and the Overview paragraph.
4. Preferably change `colors.primary`, `colors.tertiary`, and the `typography` font family when specified.
5. Run lint.

## Other CLI subcommands

Besides `lint`, `npx @google/design.md` provides:

- `diff DESIGN.md DESIGN-v2.md` — Compare token changes and check regressions.
- `export --format tailwind DESIGN.md` — Export a Tailwind theme configuration.
- `export --format dtcg DESIGN.md` — Export W3C DTCG `tokens.json`.
- `spec` — Print the complete specification for an agent prompt.
- `spec --rules-only --format json` — Print only the lint-rule table.

Use `diff` for change or PR review, `export` to synchronize code-layer consumers such as Tailwind or Figma, and `spec` to provide another agent with specification context.

## References

- `references/spec.md` — Complete DESIGN.md format specification (upstream source)
- `references/linting-rules.md` — Detailed explanations and repair examples for all eight lint rules
- Upstream repository: https://github.com/google-labs-code/design.md
- Official documentation: https://stitch.withgoogle.com/docs/design-md/
