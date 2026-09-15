
# Monochrome UI

## Overview

Monochrome UI is a data-focused, terminal-inspired visual system that prioritizes clarity and density over ornament. It uses a nearly black canvas (or near-white in light mode), high-contrast text, thin borders, and monospace for data. The look is quiet, utilitarian, and precise.

## Core Principles

- **Monochrome first**: grayscale only; a single accent is allowed for status.
- **High contrast, low noise**: readable text with minimal decoration.
- **Data as primary**: tables, lists, and metrics are the center of attention.
- **Sparse chrome**: thin borders, squared corners, minimal shadows.

---

## Quick Start — Complete CSS Variables

Copy this block to get all Monochrome UI tokens:

```css
:root {
  color-scheme: dark;

  /* === Colors (Dark Theme) === */
  --mono-bg: #0a0a0a;
  --mono-panel: #101010;
  --mono-text: #f2f2f2;
  --mono-muted: #9a9a9a;
  --mono-pill: #1a1a1a;
  --mono-accent: #ffffff;
  --mono-positive: #1fbf67;

  /* === Borders === */
  --mono-border: #2b2b2b;
  --mono-border-muted: #1f1f1f;
  --mono-border-strong: #3d3d3d;
  --mono-border-focus: #ffffff;
  --mono-border-1: 1px;
  --mono-border-2: 2px;

  /* === Typography === */
  --mono-font-ui: "Inter", system-ui, -apple-system, sans-serif;
  --mono-font-data: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  /* Font sizes */
  --mono-text-xs: 0.75rem;    /* 12px */
  --mono-text-sm: 0.875rem;   /* 14px */
  --mono-text-base: 1rem;     /* 16px */
  --mono-text-lg: 1.125rem;   /* 18px */
  --mono-text-xl: 1.25rem;    /* 20px */

  /* Headings */
  --mono-h1: 1.5rem;          /* 24px */
  --mono-h2: 1.25rem;         /* 20px */
  --mono-h3: 1rem;            /* 16px */
  --mono-h4: 0.875rem;        /* 14px */

  /* Line heights */
  --mono-leading-none: 1;
  --mono-leading-tight: 1.25;
  --mono-leading-snug: 1.375;
  --mono-leading-normal: 1.5;
  --mono-leading-relaxed: 1.625;

  /* Font weights */
  --mono-weight-normal: 400;
  --mono-weight-medium: 500;
  --mono-weight-semibold: 600;
  --mono-weight-bold: 700;

  /* Letter spacing */
  --mono-tracking-tighter: -0.02em;
  --mono-tracking-tight: -0.01em;
  --mono-tracking-normal: 0;
  --mono-tracking-wide: 0.025em;
  --mono-tracking-wider: 0.05em;

  /* === Spacing === */
  --mono-space-0: 0.125rem;   /* 2px — for dense components */
  --mono-space-1: 0.25rem;    /* 4px */
  --mono-space-2: 0.5rem;     /* 8px */
  --mono-space-3: 0.75rem;    /* 12px */
  --mono-space-4: 1rem;       /* 16px */
  --mono-space-6: 1.5rem;     /* 24px */
  --mono-space-8: 2rem;       /* 32px */
  --mono-space-12: 3rem;      /* 48px */
  --mono-space-16: 4rem;      /* 64px */

  /* === Border Radius === */
  /* Squared aesthetic — 0px for most UI elements */
  --mono-radius-none: 0;
  --mono-radius-sm: 0;
  --mono-radius-md: 0;
  --mono-radius-lg: 0;
  --mono-radius-full: 9999px;  /* avatars, badges, toggle switches only */

  /* === Transitions === */
  --mono-transition-fast: 100ms ease;
  --mono-transition-base: 150ms ease;
  --mono-transition-slow: 300ms ease;
}
```

---

## Border Radius — Squared Aesthetic

Monochrome UI uses **0px border-radius** for almost all elements, following a terminal-inspired, squared aesthetic.

### When to Use Each Value

| Token | Value | Use For |
|-------|-------|---------|
| `--mono-radius-none` | 0 | Explicit zero |
| `--mono-radius-sm` | 0 | Inputs, small buttons |
| `--mono-radius-md` | 0 | Cards, panels |
| `--mono-radius-lg` | 0 | Pills, modals |
| `--mono-radius-full` | 9999px | **Only** for: avatars, status dots, toggle switches |

### Elements That Need Rounded Corners

Only these elements should use `--mono-radius-full`:

```css
/* Avatars - circular */
.mono-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--mono-radius-full);
  overflow: hidden;
}

/* Status dot/badge - circular */
.mono-status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--mono-radius-full);
  background-color: var(--mono-positive);
}

/* Toggle switch track - pill shape */
.mono-toggle-track {
  width: 40px;
  height: 20px;
  border-radius: var(--mono-radius-full);
  background-color: var(--mono-pill);
}

/* Toggle switch thumb - circular */
.mono-toggle-thumb {
  width: 16px;
  height: 16px;
  border-radius: var(--mono-radius-full);
  background-color: var(--mono-text);
}
```

### Why Squared?

- **Terminal aesthetic**: Sharp corners evoke command-line interfaces
- **Data density**: Squared elements pack tighter without visual gaps
- **Clarity**: No decorative softening — form follows function
- **Consistency**: One rule (0px) is easier to maintain than a scale

---

## Light Theme

Override color tokens for light mode:

```css
/* Light theme via data attribute */
[data-theme="light"],
.mono-light {
  color-scheme: light;

  --mono-bg: #f8f8f8;
  --mono-panel: #ffffff;
  --mono-text: #1a1a1a;
  --mono-muted: #6b6b6b;
  --mono-pill: #e8e8e8;
  --mono-accent: #000000;
  --mono-positive: #16a34a;

  --mono-border: #d4d4d4;
  --mono-border-muted: #e5e5e5;
  --mono-border-strong: #a3a3a3;
  --mono-border-focus: #000000;
}

/* Auto-detect system preference */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    color-scheme: light;

    --mono-bg: #f8f8f8;
    --mono-panel: #ffffff;
    --mono-text: #1a1a1a;
    --mono-muted: #6b6b6b;
    --mono-pill: #e8e8e8;
    --mono-accent: #000000;
    --mono-positive: #16a34a;

    --mono-border: #d4d4d4;
    --mono-border-muted: #e5e5e5;
    --mono-border-strong: #a3a3a3;
    --mono-border-focus: #000000;
  }
}
```

### Theme Toggle

```html
<!-- Set theme via data attribute -->
<html data-theme="dark">
<!-- or -->
<html data-theme="light">
```

```js
// Toggle theme
function toggleTheme() {
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
}

// Respect system preference on load
function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.dataset.theme = saved;
  }
  // Otherwise, CSS @media handles it automatically
}
```

---

## Base Styles

Recommended reset and defaults:

```css
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--mono-font-ui);
  font-size: var(--mono-text-base);
  font-weight: var(--mono-weight-normal);
  line-height: var(--mono-leading-normal);
  color: var(--mono-text);
  background-color: var(--mono-bg);
  min-height: 100vh;
}
```

---

## Typography

### Font Families

- **UI font**: `Inter`, `System UI`, `-apple-system` for labels and navigation.
- **Data font**: `JetBrains Mono`, `SF Mono`, `ui-monospace` for tables, code, and metrics.

### Heading Styles

```css
.mono-h1 {
  font-size: var(--mono-h1);
  font-weight: var(--mono-weight-semibold);
  line-height: var(--mono-leading-tight);
  letter-spacing: var(--mono-tracking-tight);
}

.mono-h2 {
  font-size: var(--mono-h2);
  font-weight: var(--mono-weight-semibold);
  line-height: var(--mono-leading-tight);
  letter-spacing: var(--mono-tracking-tight);
}

.mono-h3 {
  font-size: var(--mono-h3);
  font-weight: var(--mono-weight-semibold);
  line-height: var(--mono-leading-snug);
}

.mono-h4 {
  font-size: var(--mono-h4);
  font-weight: var(--mono-weight-medium);
  line-height: var(--mono-leading-snug);
  text-transform: uppercase;
  letter-spacing: var(--mono-tracking-wider);
  color: var(--mono-muted);
}
```

### Text Utilities

```css
.mono-text-xs { font-size: var(--mono-text-xs); }
.mono-text-sm { font-size: var(--mono-text-sm); }
.mono-text-base { font-size: var(--mono-text-base); }
.mono-text-lg { font-size: var(--mono-text-lg); }
.mono-text-xl { font-size: var(--mono-text-xl); }

.mono-text-muted { color: var(--mono-muted); }
.mono-text-mono { font-family: var(--mono-font-data); }
```

---

## Links

```css
.mono-link {
  color: var(--mono-text);
  text-decoration: underline;
  text-decoration-color: var(--mono-border);
  text-underline-offset: 2px;
  transition: color var(--mono-transition-fast),
              text-decoration-color var(--mono-transition-fast);
}

.mono-link:hover {
  color: var(--mono-accent);
  text-decoration-color: var(--mono-accent);
}

.mono-link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--mono-border-2) var(--mono-border-focus);
  border-radius: var(--mono-radius-sm);
}

/* Subtle link (no underline until hover) */
.mono-link--subtle {
  text-decoration: none;
}

.mono-link--subtle:hover {
  text-decoration: underline;
  text-decoration-color: var(--mono-border-strong);
}
```

---

## Accessibility & Focus States

All interactive elements must have visible focus indicators:

```css
/* Base focus style — use on all interactive elements */
.mono-focus:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--mono-border-2) var(--mono-border-focus);
}

/* Apply to common elements */
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--mono-border-2) var(--mono-border-focus);
}

/* Skip link for keyboard users */
.mono-skip-link {
  position: absolute;
  top: -100%;
  left: var(--mono-space-4);
  padding: var(--mono-space-2) var(--mono-space-4);
  background: var(--mono-accent);
  color: var(--mono-bg);
  font-weight: var(--mono-weight-medium);
  border-radius: var(--mono-radius-sm);
  z-index: 9999;
}

.mono-skip-link:focus {
  top: var(--mono-space-4);
}
```

### Accessibility Guidelines

- **Contrast**: Maintain WCAG AA contrast (4.5:1 for text, 3:1 for large text).
- **Focus visible**: Never remove focus outlines without replacement.
- **Keyboard nav**: All interactive elements must be reachable via Tab.
- **Reduced motion**: Respect user preference:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Transitions

Use consistent, subtle transitions:

```css
/* Transition tokens */
--mono-transition-fast: 100ms ease;   /* micro-interactions */
--mono-transition-base: 150ms ease;   /* default */
--mono-transition-slow: 300ms ease;   /* larger elements */

/* Common patterns */
.mono-interactive {
  transition: 
    color var(--mono-transition-fast),
    background-color var(--mono-transition-fast),
    border-color var(--mono-transition-fast);
}

/* Hover lift (subtle) */
.mono-lift {
  transition: transform var(--mono-transition-base);
}
.mono-lift:hover {
  transform: translateY(-1px);
}
```

### Transition Guidelines

- **Keep it subtle**: 100-150ms for most interactions.
- **No decorative animations**: Motion should indicate state change.
- **Respect reduced motion**: Always include the media query.

---

## Borders

### Border Styles

```css
/* Default border */
.mono-border {
  border: var(--mono-border-1) solid var(--mono-border);
}

/* Subtle divider */
.mono-divider {
  border: none;
  border-bottom: var(--mono-border-1) solid var(--mono-border-muted);
}

/* Panel with border */
.mono-panel {
  background-color: var(--mono-panel);
  border: var(--mono-border-1) solid var(--mono-border);
  border-radius: var(--mono-radius-md);
}

/* Input field */
.mono-input {
  background-color: transparent;
  border: var(--mono-border-1) solid var(--mono-border);
  border-radius: var(--mono-radius-sm);
  padding: var(--mono-space-2) var(--mono-space-3);
  font-family: inherit;
  font-size: var(--mono-text-sm);
  color: var(--mono-text);
  transition: border-color var(--mono-transition-fast);
}

.mono-input:hover {
  border-color: var(--mono-border-strong);
}

.mono-input:focus {
  border-color: var(--mono-border-focus);
  outline: none;
}

.mono-input::placeholder {
  color: var(--mono-muted);
}
```

### Border Guidelines

- **Default**: 1px solid `--mono-border` for most elements.
- **Hover**: Lighten to `--mono-border-strong` on interactive elements.
- **Focus**: Use 2px outline via box-shadow for accessibility.
- **Dividers**: Use `--mono-border-muted` for subtle horizontal rules.
- **No shadows**: Prefer borders over box-shadows for separation.

---

## Component Sizing

Monochrome UI uses a **context-driven density scale**. Components come in three sizes to match their surroundings.

### Size Scale

| Size | Font Size | Padding (v / h) | Height | Use Case |
|------|-----------|-----------------|--------|----------|
| `--sm` | `--mono-text-xs` | `space-0` / `0.375rem` | ~20px | Table cells, dense lists |
| (default) | `--mono-text-xs` | `space-1` / `space-2` | ~24px | Cards, filters, standard UI |
| `--lg` | `--mono-text-sm` | `0.375rem` / `space-3` | ~32px | Page headers, hero sections |

### Decision Logic: "Where does it live?"

```
┌─────────────────────────────────────────────────────────┐
│  Is it inside a data table or dense list?               │
│  → Use SMALL (--sm)                                     │
│    Preserves row height; maximizes data density.        │
├─────────────────────────────────────────────────────────┤
│  Is it in a card, form, or filter bar?                  │
│  → Use DEFAULT (no modifier)                            │
│    Standard hit target; balanced readability.           │
├─────────────────────────────────────────────────────────┤
│  Is it next to an H1/H2 or in a hero section?           │
│  → Use LARGE (--lg)                                     │
│    Visual balance with large typography.                │
└─────────────────────────────────────────────────────────┘
```

### Sizing Tokens (Optional)

Add these if you need explicit height control:

```css
:root {
  --mono-size-sm: 20px;
  --mono-size-md: 24px;
  --mono-size-lg: 32px;
}
```

---

## Components

### Buttons / Pills

```css
.mono-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--mono-space-2);
  padding: var(--mono-space-2) var(--mono-space-4);
  font-family: var(--mono-font-ui);
  font-size: var(--mono-text-sm);
  font-weight: var(--mono-weight-medium);
  color: var(--mono-text);
  background-color: transparent;
  border: var(--mono-border-1) solid var(--mono-border);
  border-radius: var(--mono-radius-sm);
  cursor: pointer;
  transition: 
    color var(--mono-transition-fast),
    background-color var(--mono-transition-fast),
    border-color var(--mono-transition-fast);
}

/* Small — for toolbars, table actions */
.mono-btn--sm {
  padding: var(--mono-space-0) var(--mono-space-2);
  font-size: var(--mono-text-xs);
  gap: var(--mono-space-1);
}

/* Large — for primary actions, hero CTAs */
.mono-btn--lg {
  padding: var(--mono-space-3) var(--mono-space-6);
  font-size: var(--mono-text-base);
}

.mono-btn:hover {
  border-color: var(--mono-border-strong);
}

.mono-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--mono-border-2) var(--mono-border-focus);
}

/* Active/selected state */
.mono-btn--active,
.mono-btn.is-active {
  background-color: var(--mono-accent);
  color: var(--mono-bg);
  border-color: var(--mono-accent);
}

/* Pill variant — "pill" = compact inline toggle, not rounded shape */
.mono-pill {
  padding: var(--mono-space-1) var(--mono-space-3);
  border-radius: var(--mono-radius-lg);
  background-color: var(--mono-pill);
}
```

### Panels / Cards

```css
.mono-card {
  background-color: var(--mono-panel);
  border: var(--mono-border-1) solid var(--mono-border);
  border-radius: var(--mono-radius-md);
  padding: var(--mono-space-4);
}

.mono-card--interactive {
  cursor: pointer;
  transition: border-color var(--mono-transition-fast);
}

.mono-card--interactive:hover {
  border-color: var(--mono-border-strong);
}

.mono-card--interactive:focus-visible {
  outline: none;
  box-shadow: 0 0 0 var(--mono-border-2) var(--mono-border-focus);
}
```

### Tables

```css
.mono-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--mono-font-data);
  font-size: var(--mono-text-sm);
  line-height: var(--mono-leading-tight);
}

.mono-table th {
  text-align: left;
  font-weight: var(--mono-weight-medium);
  color: var(--mono-muted);
  padding: var(--mono-space-2) var(--mono-space-3);
  border-bottom: var(--mono-border-1) solid var(--mono-border);
}

.mono-table td {
  padding: var(--mono-space-2) var(--mono-space-3);
  border-bottom: var(--mono-border-1) solid var(--mono-border-muted);
}

.mono-table tr:last-child td {
  border-bottom: none;
}

/* Right-align numeric columns */
.mono-table--numeric td:last-child,
.mono-table--numeric th:last-child {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

### Tags

```css
.mono-tag {
  display: inline-flex;
  align-items: center;
  font-family: var(--mono-font-data);
  font-size: var(--mono-text-xs);
  color: var(--mono-muted);
  background-color: var(--mono-pill);
  padding: var(--mono-space-1) var(--mono-space-2);
  border-radius: var(--mono-radius-sm);
  border: var(--mono-border-1) solid var(--mono-border);
}

/* Small — for table cells, dense lists */
.mono-tag--sm {
  padding: var(--mono-space-0) 0.375rem;
}

/* Large — for headers, hero sections */
.mono-tag--lg {
  font-size: var(--mono-text-sm);
  padding: 0.375rem var(--mono-space-3);
}
```

---

## Class Name Convention

- Prefix all classes with `mono-`.
- Use BEM-style names: `mono-block__element--modifier`.
- Keep state classes explicit: `is-active`, `is-muted`, `is-disabled`.

```css
.mono-table {}
.mono-table__header {}
.mono-pill--active {}
.mono-row.is-muted {}
```

---

## Example Skeleton

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monochrome UI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    /* Paste complete CSS variables here */
  </style>
</head>
<body>
  <a href="#main" class="mono-skip-link">Skip to content</a>
  
  <div class="mono-page">
    <header class="mono-header">
      <h1 class="mono-h1">Dashboard</h1>
      <div class="mono-toggle">
        <button class="mono-pill">Volume</button>
        <button class="mono-pill mono-pill--active">Open Interest</button>
      </div>
    </header>
    
    <main id="main">
      <section class="mono-panel">
        <table class="mono-table mono-table--numeric">
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Item A</td>
              <td>1,234</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  </div>
</body>
</html>
```

---

## Do / Don't

**Do**
- Use grayscale tokens and the defined variables.
- Keep UI chrome minimal and consistent.
- Prefer monospace for any data or metrics.
- Include visible focus states on all interactive elements.
- Support both dark and light themes.
- Respect `prefers-reduced-motion`.

**Don't**
- Introduce multiple accent colors.
- Use heavy shadows or glossy gradients.
- Overcomplicate layouts with decorative elements.
- Remove focus outlines without replacement.
- Use transitions longer than 300ms.

---

## When To Use

- Data dashboards, monitoring, analytics, and system status UIs.
- Internal tools where clarity and density matter most.
- Developer tools and admin interfaces.
- Any interface where data readability is paramount.
