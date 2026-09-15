# DESIGN.md Linting Rules

The linter runs eight rules and produces findings with fixed severity levels: error, warning, or info.

Run:

```bash
npx @google/design.md lint DESIGN.md
```

Example output:

```json
{
  "findings": [
    {
      "rule": "broken-ref",
      "severity": "error",
      "path": "components.button-primary.backgroundColor",
      "message": "Token reference {colors.primary-60} does not resolve"
    }
  ],
  "summary": { "errors": 1, "warnings": 0, "info": 2 }
}
```

The exit code is `1` when there is an error and `0` otherwise.

## Rules

### 1. `broken-ref` (error)

**Trigger**: A token reference such as `{path.to.token}` does not resolve to a defined token.

**Common causes**:
- A typo (`{colors.primry}`)
- A reference to a token that is not defined in frontmatter
- An incorrect nested path, such as `{colors}` instead of `{colors.primary}`

**Fix**: Define the referenced token or correct the spelling.

**Example**:

```yaml
# Wrong
components:
  button-primary:
    backgroundColor: "{colors.primary-60}"  # primary-60 is not defined
    textColor: "{colors.on-primray}"         # typo: primray → primary

colors:
  primary: "#1A1C1E"
  on-primary: "#FFFFFF"
```

```yaml
# Correct
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
```

---

### 2. `contrast-ratio` (warning)

**Trigger**: A component defines both `backgroundColor` and `textColor`, and their WCAG contrast ratio is below 4.5:1 (AA).

**Fix**:
- Darken or lighten one color.
- Reverse bg/text when appropriate.
- Accept the warning if the element is purely decorative and not meant to be read.

**Example**:

```yaml
# 4.1:1 — fails AA
components:
  button:
    backgroundColor: "#777777"
    textColor: "#FFFFFF"
```

```yaml
# 4.54:1 — passes AA
components:
  button:
    backgroundColor: "#666666"
    textColor: "#FFFFFF"
```

Use `https://webaim.org/resources/contrastchecker/` to check the color pair.

---

### 3. `orphaned-tokens` (warning)

**Trigger**: A color token is defined under `colors` but no component references it.

**Fix**:
- Accept the warning if the color is intentional, such as one used only in prose.
- Delete it if it is redundant.
- Add a reference if a component uses it.

**Example**:

```yaml
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  legacy-accent: "#FF0000"   # orphaned — no component uses this

components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.secondary}"
```

---

### 4. `missing-primary` (warning)

**Trigger**: `colors` defines at least one color but has no `primary` token. A consuming agent may generate `primary` automatically and conflict with the design intent.

**Fix**: Define `colors.primary` explicitly.

**Example**:

```yaml
# warning
colors:
  accent: "#B8422E"
  background: "#F7F5F2"
```

```yaml
# Correct
colors:
  primary: "#1A1C1E"
  accent: "#B8422E"
  background: "#F7F5F2"
```

---

### 5. `missing-typography` (warning)

**Trigger**: `colors` is defined but there is no `typography` section. An agent will use default typography, which may not match the brand.

**Fix**: Add a `typography` section with at least `h1` or `body-md`.

---

### 6. `section-order` (warning)

**Trigger**: The Markdown `##` sections do not follow the canonical order.

**Canonical order**:

1. Overview (or Brand & Style)
2. Colors
3. Typography
4. Layout (or Layout & Spacing)
5. Elevation & Depth (or Elevation)
6. Shapes
7. Components
8. Do's and Don'ts

**Fix**: Reorder the headings. Sections may be omitted, but the remaining sections must stay in order.

**Example**:

```markdown
# Wrong — Typography before Colors
## Typography
...
## Colors
...
```

```markdown
# Correct
## Colors
...
## Typography
...
```

---

### 7. `missing-sections` (info)

**Trigger**: Other tokens exist, but frontmatter has no `spacing` or `rounded` section. This is informational, not required.

**Fix**: Add them if the project has consistent spacing or corner-radius rules; otherwise ignore this finding.

---

### 8. `token-summary` (info)

**Trigger**: Always produced. It reports how many tokens each section defines.

**Purpose**: This is a size summary only and requires no fix.

---

## Fix loop

Standard process:

```bash
# 1. Run lint, capture JSON
npx @google/design.md lint DESIGN.md > /tmp/lint.json

# 2. Fix all errors first
#    (broken-ref first, must fix)

# 3. Then handle warnings
#    - contrast-ratio: adjust colors or invert
#    - section-order: reorder
#    - orphaned-tokens: delete or reference
#    - missing-primary / missing-typography: add

# 4. info at discretion

# 5. Re-lint until errors=0
npx @google/design.md lint DESIGN.md
```

**Important**: Do not force every warning to zero. Some warnings reflect deliberate design choices, such as an orphaned token reserved for future use. Explain those warnings and let the user decide.
