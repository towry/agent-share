# Blueprint Editorial

## Overview

Blueprint Editorial is a technical reading and product UI style for interactive engineering content: articles, tutorials, developer tools, build dashboards, and visual explainers. It combines oversized editorial typography, blueprint-like line art, quiet gray surfaces, and soft product panels.

The design philosophy is **technical clarity with handcrafted warmth**. The page should feel like a well-typeset technical paper that can turn into an interactive engineering diagram when needed.

## Core Principles

- **Editorial first**: Lead with large serif titles, restrained metadata, generous whitespace, and readable body copy.
- **Blueprint structure**: Use thin lines, row dividers, graph-paper hints, and hand-drawn or diagrammatic line art to express systems.
- **Tonal ramps over gradients**: Prefer HSL gray and semantic color ramps. Do not rely on colorful gradients for hierarchy.
- **Soft product panels**: For dashboard-like UI, layer light gray page backgrounds, white cards, subtle borders, large radii, and low-opacity shadows.
- **Technical artifacts as UI**: Code, logs, files, timelines, command rows, and state diagrams are first-class components.

---

## Quick Start — Complete CSS Variables

```css
:root {
  color-scheme: light;

  /* === Colors: neutral ramp === */
  --be-gray-1: hsl(0, 0%, 99.0%);
  --be-gray-2: hsl(0, 0%, 97.3%);
  --be-gray-3: hsl(0, 0%, 95.1%);
  --be-gray-4: hsl(0, 0%, 93.0%);
  --be-gray-5: hsl(0, 0%, 90.9%);
  --be-gray-6: hsl(0, 0%, 88.7%);
  --be-gray-7: hsl(0, 0%, 85.8%);
  --be-gray-8: hsl(0, 0%, 78.0%);
  --be-gray-9: hsl(0, 0%, 56.1%);
  --be-gray-10: hsl(0, 0%, 52.3%);
  --be-gray-11: hsl(0, 0%, 43.5%);
  --be-gray-12: hsl(0, 0%, 9.0%);

  /* === Colors: semantic ramps === */
  --be-green-1: hsl(136, 50.0%, 98.9%);
  --be-green-3: hsl(139, 55.2%, 94.5%);
  --be-green-9: hsl(151, 55.0%, 41.5%);
  --be-green-11: hsl(153, 67.0%, 28.5%);
  --be-blue-9: hsl(206, 100%, 50.0%);
  --be-blue-11: hsl(211, 100%, 43.2%);
  --be-yellow-3: hsl(55, 100%, 90.9%);
  --be-yellow-9: hsl(53, 92.0%, 50.0%);
  --be-yellow-11: hsl(42, 100%, 29.0%);
  --be-red-9: hsl(358, 75.0%, 59.0%);

  /* === Surfaces === */
  --be-bg-page: var(--be-gray-3);
  --be-bg-canvas: var(--be-gray-1);
  --be-bg-panel: #ffffff;
  --be-bg-inset: var(--be-gray-2);
  --be-bg-code: var(--be-gray-1);

  /* === Text === */
  --be-text: #000000;
  --be-text-muted: var(--be-gray-11);
  --be-text-subtle: var(--be-gray-9);
  --be-text-inverse: var(--be-gray-1);

  /* === Borders and shadows === */
  --be-border-subtle: 1px solid var(--be-gray-5);
  --be-border-default: 1px solid var(--be-gray-6);
  --be-border-strong: 1px solid var(--be-gray-8);
  --be-shadow-paper: 0 8px 16px hsla(0, 0%, 0%, 0.03);
  --be-shadow-card: 0 1px 2px hsla(0, 0%, 0%, 0.08), 0 8px 24px hsla(0, 0%, 0%, 0.04);

  /* === Typography === */
  --be-font-serif: "PP Editorial New", ui-serif, Georgia, serif;
  --be-font-sans: Nunito, system-ui, -apple-system, sans-serif;
  --be-font-mono: "JetBrains Mono", "Maple Mono", ui-monospace, Menlo, Monaco, "Segoe UI Mono", "Roboto Mono", monospace;
  --be-text-sm: 0.875rem;
  --be-text-base: 1rem;
  --be-text-lg: 1.25rem;
  --be-text-xl: 1.5rem;
  --be-text-2xl: 1.875rem;
  --be-title-display: 4.5rem;
  --be-leading-body: 1.7;
  --be-leading-title: 1.1;

  /* === Spacing === */
  --be-space-1: 0.25rem;
  --be-space-2: 0.5rem;
  --be-space-3: 0.75rem;
  --be-space-4: 1rem;
  --be-space-5: 1.25rem;
  --be-space-6: 1.5rem;
  --be-space-8: 2rem;
  --be-space-12: 3rem;
  --be-space-16: 4rem;
  --be-space-24: 6rem;

  /* === Layout and shape === */
  --be-prose-width: 653px;
  --be-article-max: 1480px;
  --be-radius-sm: 4px;
  --be-radius-base: 6px;
  --be-radius-lg: 12px;
  --be-radius-shell: 24px;
  --be-radius-pill: 9999px;
}
```

---

## Colors

Use gray ramps as the main hierarchy system. `--be-gray-1` to `--be-gray-3` are page and canvas surfaces; `--be-gray-5` to `--be-gray-8` are borders and quiet separators; `--be-gray-9` to `--be-gray-11` are metadata; `--be-gray-12` or black is primary text.

Semantic colors should mark state, not brand decoration:

- **Green**: success, focus highlight, selected text-to-diagram correspondence.
- **Blue**: code syntax, links inside technical artifacts, active data flows.
- **Yellow**: in-progress status, timeline segment emphasis, warning-lite context.
- **Red**: destructive state or explicit error.

### Gradient Rule

Do not use decorative linear or radial gradients by default. This style gets depth from tonal ramps, thin borders, line art, and paper shadows. If a gradient is unavoidable, keep it near-neutral and functional, such as a subtle edge fade on scrollable code.

---

## Typography

### Article Heading

```css
.be-article-title {
  font-family: var(--be-font-serif);
  font-size: clamp(3rem, 6vw, var(--be-title-display));
  font-weight: 400;
  line-height: 1;
  color: var(--be-text);
}
```

### Body and Section Headings

```css
.be-body {
  font-family: var(--be-font-sans);
  font-size: var(--be-text-base);
  line-height: var(--be-leading-body);
  color: var(--be-text);
}

.be-section-title {
  font-family: var(--be-font-sans);
  font-size: var(--be-text-xl);
  font-weight: 500;
  line-height: 1.333;
  color: var(--be-text);
}

.be-meta {
  color: var(--be-text-muted);
}
```

### Code

```css
.be-code,
.be-pre {
  font-family: var(--be-font-mono);
  font-size: var(--be-text-sm);
  line-height: 1.5;
}
```

---

## Layout

### Article Layout

```css
.be-article {
  max-width: var(--be-article-max);
  margin: var(--be-space-16) auto 0;
  padding-inline: var(--be-space-5);
}

.be-prose {
  max-width: var(--be-prose-width);
}
```

Keep prose narrow even when diagrams span wider. Let interactive explainers break out of the prose column so the writing remains calm while the system model gets enough room.

### Product Shell

```css
.be-product-shell {
  background: var(--be-bg-page);
  border: var(--be-border-subtle);
  border-radius: var(--be-radius-shell);
}

.be-card {
  background: var(--be-bg-panel);
  border: var(--be-border-default);
  border-radius: var(--be-radius-lg);
  box-shadow: var(--be-shadow-card);
}
```

---

## Components

### Article Row

Use rows, not heavy cards, for editorial indexes. Pair a black line-art thumbnail with title, date, description, and a small directional affordance.

```css
.be-article-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(18rem, 0.7fr) auto;
  gap: var(--be-space-6);
  padding-block: var(--be-space-6);
  border-block-start: var(--be-border-subtle);
}
```

### Interactive Demo

```css
.be-demo {
  background: var(--be-bg-inset);
  border: var(--be-border-subtle);
  border-radius: var(--be-radius-lg);
}

.be-demo-file {
  background: var(--be-bg-panel);
  border: var(--be-border-subtle);
  border-radius: var(--be-radius-base);
  box-shadow: var(--be-shadow-paper);
}

.be-focus-highlight {
  background: var(--be-green-1);
  color: var(--be-green-11);
  box-shadow: 0 0 0 1px var(--be-green-9);
  border-radius: var(--be-radius-sm);
}
```

### Inline Code

```css
.be-inline-code {
  font-family: var(--be-font-mono);
  font-size: var(--be-text-sm);
  background: var(--be-bg-code);
  border-radius: var(--be-radius-sm);
  box-shadow: 0 0 0 1px hsla(0, 0%, 4%, 0.15);
  padding: 0.125rem 0.25rem;
}
```

### Segmented Tabs

```css
.be-tabs {
  display: inline-flex;
  gap: var(--be-space-1);
  background: var(--be-gray-2);
  border: var(--be-border-subtle);
  border-radius: 10px;
  padding: var(--be-space-1);
}

.be-tab[aria-selected="true"] {
  background: var(--be-bg-panel);
  box-shadow: 0 1px 3px hsla(0, 0%, 0%, 0.12);
}
```

### Build Timeline

```css
.be-timeline-step {
  background: var(--be-gray-3);
  border-radius: var(--be-radius-base);
}

.be-timeline-step[data-state="active"] {
  background: var(--be-yellow-3);
  color: var(--be-yellow-11);
}

.be-timeline-step[data-state="success"] {
  background: var(--be-green-9);
  color: var(--be-text-inverse);
}
```

---

## Shapes and Depth

- Use `4px` for inline code and small chips.
- Use `6px` for buttons, demo internals, and file cards.
- Use `12px` for cards, demos, and content panels.
- Use `24px` for large product shells.
- Use pill radius only for compact actions such as subscribe buttons or badges.

Depth should stay quiet: most surfaces use no shadow, file cards use `paper`, and product cards may use `card`. If the UI starts to look like layered SaaS chrome, reduce shadows before reducing borders.

---

## Do's and Don'ts

### Do

- Use oversized serif titles for article identity.
- Keep body copy in a narrow column with relaxed line-height.
- Use mono typography for commands, logs, file contents, hashes, and build output.
- Express systems with line art, thin borders, file metaphors, timelines, and state diagrams.
- Use semantic color sparingly and structurally.

### Don't

- Do not add colorful decorative gradients to create excitement.
- Do not use heavy shadows or glossy cards as the primary hierarchy device.
- Do not make every article teaser a rounded card; rows and dividers are more on-style.
- Do not replace hand-drawn or blueprint line art with generic filled icons.
- Do not use brand color as a large background wash unless the content specifically needs a state highlight.
