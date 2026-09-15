---
version: alpha
name: Minimal
description: A bare-bones DESIGN.md scaffold with the three essential sections.
colors:
  primary: "#111111"
  secondary: "#666666"
  neutral: "#FFFFFF"
  on-primary: "#FFFFFF"
typography:
  h1:
    fontFamily: system-ui
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
  body-md:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 12px
---

## Overview

Describe the brand personality, target audience, and emotional response the UI should evoke. One paragraph is enough to anchor high-level decisions.

## Colors

Define the palette and the role each color plays.

- **Primary (#111111):** The principal text and interactive color.
- **Secondary (#666666):** Supporting text, metadata, borders.
- **Neutral (#FFFFFF):** Background foundation.

## Typography

Describe typographic strategy — which families, which roles, what feeling the faces create.
