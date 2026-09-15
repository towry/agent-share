---
version: alpha
name: Modern SaaS
description: Clean neutrals with a confident indigo accent. Inter throughout. Designed for productivity tools and data-dense dashboards.
colors:
  primary: "#4F46E5"
  secondary: "#64748B"
  tertiary: "#0EA5E9"
  neutral: "#F8FAFC"
  surface: "#FFFFFF"
  on-surface: "#0F172A"
  on-primary: "#FFFFFF"
  border: "#E2E8F0"
  success: "#10B981"
  warning: "#F59E0B"
  error: "#EF4444"
typography:
  h1:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  "2xl": 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 8px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 8px
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 10px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
---

## Overview

Calm, confident, data-dense. Built for productivity — every pixel earns its keep. The visual language prioritizes scannability over decoration: generous whitespace, tight type, and a single accent color for primary actions and selection states.

## Colors

A neutral-dominant palette with a single saturated accent.

- **Primary (#4F46E5):** Indigo — primary actions, active states, selection highlights.
- **Secondary (#64748B):** Slate — supporting text, inactive states.
- **Tertiary (#0EA5E9):** Sky — informational callouts, links.
- **Neutral (#F8FAFC):** Page background — near-white with a cool undertone.
- **Surface (#FFFFFF):** Card and input surfaces.
- **Success / Warning / Error:** Standard semantic colors for status feedback.

## Typography

Inter is the workhorse — its optical sizing and geometric construction make it equally legible at 11px (table cells) and 36px (dashboard headlines).

- **Headlines:** Inter Bold/Semibold with negative letter-spacing for density.
- **Body:** Inter Regular at 14px — the standard reading size for tools.
- **Labels:** Inter Medium at 13px for form labels, table headers, buttons.
- **Mono:** JetBrains Mono for IDs, code snippets, and numeric data.

## Layout

12-column grid with 24px gutters; max content width 1280px. Dense default — 8px base spacing unit with a 4px half-step. Dashboards lean on card containers with 16px internal padding.

## Elevation & Depth

Flat by default. Depth comes from borders (1px `border` token) and background contrast (surface-on-neutral) rather than shadows. Reserve soft shadows for modals and menus only.

## Shapes

Subtle rounding (6px default) — enough to feel modern and friendly without losing crispness. Full-round (9999px) only for pills and avatars.

## Components

Primary button: indigo fill, white text. Secondary: white surface, ink text, visible border. Inputs: white surface with border; focus state uses primary color.

## Do's and Don'ts

- Do use the primary color sparingly — one primary action per view.
- Don't mix serif and sans families on the same screen.
- Do maintain at least 4.5:1 contrast for body text (WCAG AA).
- Don't introduce new radii — stick to the 4/6/8/full scale.
- Do use the mono family only for code, IDs, and numeric data.
