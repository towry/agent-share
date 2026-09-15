
# Paper UI Style

## Overview

Paper UI is a reading-first design system optimized for long-form content — blog posts, research papers, documentation, and essays. It creates the feeling of reading a well-typeset document on high-quality paper: centered text, generous margins, warm tones, and minimal chrome.

The design philosophy centers on **content as the hero**. Every decision serves readability and focus. There are no distracting sidebars, no heavy borders, no decorative gradients — just text, hierarchy, and whitespace.

## Core Principles

- **Paper metaphor**: Clean white background for a crisp, code-editor-like reading environment.
- **Centered reading column**: Narrow, fixed-width content area (~640px) centered on the page.
- **Serif for body, sans for headings**: Classic editorial pairing for authority and readability.
- **Generous whitespace**: Ample margins and line-height create a calm, unhurried reading pace.
- **Minimal chrome**: No shadows, no heavy borders, no decorative elements.

---

## Quick Start — Complete CSS Variables

Copy this block to get all Paper UI tokens:

```css
:root {
  color-scheme: light;

  /* === Colors === */
  --paper-bg: #ffffff;            /* Pure white — unified with Claude Code light theme */
  --paper-surface: #fafafa;       /* Off-white for cards/panels */
  --paper-text: #141413;          /* Near-black for maximum readability */
  --paper-text-muted: #6b6b6b;    /* Secondary text, captions */
  --paper-accent: #1a1a1a;        /* Links, emphasis */
  --paper-border: #e5e5e0;        /* Subtle dividers */
  --paper-border-light: #f0f0ec;  /* Very subtle separators */

  /* === Typography === */
  --paper-font-heading: "Inter", "Helvetica Neue", Arial, sans-serif;
  --paper-font-body: "Georgia", "Times New Roman", "Crimson Text", serif;
  --paper-font-mono: "JetBrains Mono", "SF Mono", ui-monospace, monospace;

  /* Font sizes */
  --paper-text-xs: 0.875rem;      /* 14px — captions, metadata */
  --paper-text-sm: 1rem;          /* 16px — small UI text */
  --paper-text-base: 1.0625rem;   /* 17px — base reference */
  --paper-text-body: 1.125rem;    /* 18px — optimal body reading size */
  --paper-text-lg: 1.25rem;       /* 20px — lead paragraphs */

  /* Headings */
  --paper-h1: 3.5rem;             /* 56px — article title */
  --paper-h2: 1.75rem;            /* 28px — section headings */
  --paper-h3: 1.3125rem;          /* 21px — subsections */
  --paper-h4: 1.125rem;           /* 18px — minor headings */

  /* Line heights */
  --paper-leading-none: 1;
  --paper-leading-tight: 1.1;     /* Headings */
  --paper-leading-snug: 1.25;     /* Subheadings */
  --paper-leading-normal: 1.55;   /* Body text (~28px for 18px font) */
  --paper-leading-relaxed: 1.75;  /* Spacious body */

  /* Font weights */
  --paper-weight-normal: 400;
  --paper-weight-medium: 500;
  --paper-weight-semibold: 600;
  --paper-weight-bold: 700;

  /* Letter spacing */
  --paper-tracking-tight: -0.02em;
  --paper-tracking-normal: 0;
  --paper-tracking-wide: 0.025em;

  /* === Spacing === */
  --paper-space-1: 0.25rem;       /* 4px */
  --paper-space-2: 0.5rem;        /* 8px */
  --paper-space-3: 0.75rem;       /* 12px */
  --paper-space-4: 1rem;          /* 16px */
  --paper-space-6: 1.5rem;        /* 24px */
  --paper-space-8: 2rem;          /* 32px */
  --paper-space-12: 3rem;         /* 48px */
  --paper-space-16: 4rem;         /* 64px */
  --paper-space-24: 6rem;         /* 96px */

  /* === Layout === */
  --paper-content-max: 640px;     /* Optimal reading width */
  --paper-page-padding: 1.5rem;   /* Mobile padding */

  /* === Transitions === */
  --paper-transition-fast: 100ms ease;
  --paper-transition-base: 150ms ease;
}
```

---

## Layout

### Centered Reading Column

The defining feature of Paper UI is a narrow, centered content column:

```css
.paper-container {
  max-width: var(--paper-content-max);
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--paper-page-padding);
  padding-right: var(--paper-page-padding);
}
```

### Page Structure

```html
<body class="paper-page">
  <header class="paper-header">
    <!-- Site navigation — minimal, unobtrusive -->
  </header>

  <article class="paper-article">
    <header class="paper-article-header">
      <h1 class="paper-h1">Article Title</h1>
      <div class="paper-meta">
        <time>May 14, 2026</time>
        <span class="paper-meta-separator">·</span>
        <span>8 min read</span>
      </div>
    </header>

    <div class="paper-content">
      <!-- Main content -->
    </div>

    <footer class="paper-article-footer">
      <!-- Tags, author info, footnotes -->
    </footer>
  </article>
</body>
```

### Why 640px?

- **Optimal line length**: 50–75 characters per line is ideal for reading.
- **At 18px font**: 640px yields ~62 characters per line.
- **Research-backed**: Studies show readers comprehend best within this range.

---

## Typography

### Font Pairing

```css
/* Headings — clean sans-serif for authority */
.paper-h1, .paper-h2, .paper-h3, .paper-h4 {
  font-family: var(--paper-font-heading);
  color: var(--paper-text);
}

/* Body — warm serif for readability */
.paper-body {
  font-family: var(--paper-font-body);
  font-size: var(--paper-text-body);
  line-height: var(--paper-leading-normal);
  color: var(--paper-text);
}
```

### Heading Styles

```css
.paper-h1 {
  font-size: var(--paper-h1);
  font-weight: var(--paper-weight-bold);
  line-height: var(--paper-leading-tight);
  text-align: center;           /* Article title — centered */
  margin-bottom: var(--paper-space-4);
}

.paper-h2 {
  font-size: var(--paper-h2);
  font-weight: var(--paper-weight-semibold);
  line-height: var(--paper-leading-snug);
  margin-top: var(--paper-space-8);
  margin-bottom: var(--paper-space-2);
}

.paper-h3 {
  font-size: var(--paper-h3);
  font-weight: var(--paper-weight-semibold);
  line-height: var(--paper-leading-snug);
  margin-top: var(--paper-space-8);
  margin-bottom: var(--paper-space-2);
}

.paper-h4 {
  font-size: var(--paper-h4);
  font-weight: var(--paper-weight-semibold);
  line-height: var(--paper-leading-snug);
  margin-top: var(--paper-space-6);
  margin-bottom: var(--paper-space-2);
}
```

### Body Text

```css
.paper-paragraph {
  font-family: var(--paper-font-body);
  font-size: var(--paper-text-body);
  font-weight: var(--paper-weight-normal);
  line-height: var(--paper-leading-normal);
  color: var(--paper-text);
  margin-bottom: var(--paper-space-4);
  text-align: start;            /* Left-aligned for readability */
}

/* Lead paragraph — slightly larger */
.paper-lead {
  font-size: var(--paper-text-lg);
  line-height: var(--paper-leading-relaxed);
}
```

---

## Metadata & Info Blocks

### Article Header Meta

Centered below the title, small and muted:

```css
.paper-meta {
  text-align: center;
  font-family: var(--paper-font-heading);
  font-size: var(--paper-text-sm);
  color: var(--paper-text-muted);
  margin-bottom: var(--paper-space-12);
}

.paper-meta-separator {
  margin: 0 var(--paper-space-2);
}
```

### Tags / Categories

Small inline pills, minimal:

```css
.paper-tag {
  display: inline-block;
  font-family: var(--paper-font-heading);
  font-size: var(--paper-text-xs);
  font-weight: var(--paper-weight-medium);
  color: var(--paper-text-muted);
  background-color: var(--paper-surface);
  border: 1px solid var(--paper-border);
  padding: var(--paper-space-1) var(--paper-space-3);
  margin-right: var(--paper-space-2);
  margin-bottom: var(--paper-space-2);
  transition: background-color var(--paper-transition-fast),
              border-color var(--paper-transition-fast),
              color var(--paper-transition-fast);
  cursor: pointer;
}

.paper-tag:hover {
  background-color: var(--paper-border-light);
  border-color: var(--paper-text-muted);
  color: var(--paper-text);
}
```

---

## Links

```css
.paper-link {
  color: var(--paper-accent);
  text-decoration: underline;
  text-decoration-color: var(--paper-border);
  text-underline-offset: 3px;
  text-decoration-thickness: 1.5px;
  transition: text-decoration-color var(--paper-transition-fast),
              color var(--paper-transition-fast);
}

.paper-link:hover {
  text-decoration-color: var(--paper-accent);
}
```

---

## Base Styles

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
  font-family: var(--paper-font-body);
  font-size: var(--paper-text-base);
  font-weight: var(--paper-weight-normal);
  line-height: var(--paper-leading-normal);
  color: var(--paper-text);
  background-color: var(--paper-bg);
  min-height: 100vh;
}
```

---

## Spacing System

### Section Spacing

```css
.paper-section {
  margin-top: var(--paper-space-12);    /* 48px between sections */
  margin-bottom: var(--paper-space-12);
}

.paper-article-header {
  padding-top: var(--paper-space-16);   /* 64px top breathing room */
  padding-bottom: var(--paper-space-8);
}

.paper-article-footer {
  margin-top: var(--paper-space-16);
  padding-top: var(--paper-space-8);
  border-top: 1px solid var(--paper-border);
}
```

---

## Footnotes

```css
.paper-footnotes {
  margin-top: var(--paper-space-8);
  padding-top: var(--paper-space-8);
  border-top: 1px solid var(--paper-border);
}

.paper-footnote {
  font-family: var(--paper-font-body);
  font-size: var(--paper-text-sm);
  line-height: var(--paper-leading-normal);
  color: var(--paper-text-muted);
  margin-bottom: var(--paper-space-2);
}
```

---

## Dark Theme (Optional)

For night reading:

```css
[data-theme="dark"] {
  color-scheme: dark;

  --paper-bg: #0d0d0d;
  --paper-surface: #1a1a1a;
  --paper-text: #e8e8e6;
  --paper-text-muted: #888888;
  --paper-accent: #ffffff;
  --paper-border: #3a3a3a;
  --paper-border-light: #2a2a2a;
}
```

---

## Component Examples

### Article Card (Index Page)

```css
.paper-card {
  max-width: var(--paper-content-max);
  margin: 0 auto var(--paper-space-12);
  padding-bottom: var(--paper-space-8);
  border-bottom: 1px solid var(--paper-border);
  transition: border-color var(--paper-transition-fast);
}

.paper-card:hover {
  border-color: var(--paper-text-muted);
}

.paper-card-title {
  font-family: var(--paper-font-heading);
  font-size: var(--paper-h2);
  font-weight: var(--paper-weight-semibold);
  line-height: var(--paper-leading-snug);
  margin-bottom: var(--paper-space-2);
  transition: color var(--paper-transition-fast);
}

.paper-card:hover .paper-card-title {
  color: var(--paper-accent);
}

.paper-card-excerpt {
  font-family: var(--paper-font-body);
  font-size: var(--paper-text-body);
  line-height: var(--paper-leading-normal);
  color: var(--paper-text-muted);
  margin-bottom: var(--paper-space-3);
}
```

### Blockquote

```css
.paper-blockquote {
  margin: var(--paper-space-8) 0;
  padding-left: var(--paper-space-6);
  border-left: 3px solid var(--paper-border);
  font-style: italic;
  color: var(--paper-text-muted);
  transition: border-color var(--paper-transition-base);
}

.paper-blockquote:hover {
  border-color: var(--paper-text-muted);
}
```

### Button

```css
.paper-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--paper-space-2);
  padding: var(--paper-space-2) var(--paper-space-4);
  font-family: var(--paper-font-heading);
  font-size: var(--paper-text-sm);
  font-weight: var(--paper-weight-medium);
  color: var(--paper-text);
  background-color: transparent;
  border: 1.5px solid var(--paper-border);
  cursor: pointer;
  transition: background-color var(--paper-transition-fast),
              border-color var(--paper-transition-fast),
              color var(--paper-transition-fast);
}

.paper-btn:hover {
  background-color: var(--paper-border-light);
  border-color: var(--paper-text-muted);
}

.paper-btn:active {
  background-color: var(--paper-border);
}
```

---

## Class Name Convention

- Prefix all classes with `paper-`.
- Use semantic names: `paper-article`, `paper-content`, `paper-meta`.
- Keep modifiers explicit: `paper-lead`, `paper-text-muted`.

---

## Do / Don't

**Do**
- Use serif for body text and sans-serif for headings.
- Keep content width narrow (640px max) for readability.
- Center the article title; left-align body text.
- Use generous line-height (1.5–1.6) for body paragraphs.
- Add ample whitespace above headings.
- Keep the background clean white for a focused reading experience.

**Don't**
- Use full-width body text — it fatigues readers.
- Center body paragraphs — hard to track line starts.
- Add heavy shadows or borders — paper is flat.
- Use decorative fonts for body text.
- Crowd the page — whitespace is part of the design.

---

## When To Use

- Blog posts, essays, and long-form articles.
- Research papers and documentation.
- Newsletters and editorial content.
- Any interface where reading comprehension is the primary goal.
