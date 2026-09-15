---
version: alpha
name: Editorial
description: High-contrast neutrals with a single earth-toned accent. Evokes a premium matte finish — broadsheet newspaper or contemporary gallery.
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
  on-primary: "#F7F5F2"
  on-tertiary: "#FFFFFF"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  h2:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.1em
rounded:
  sm: 4px
  md: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 12px
---

## Overview

Architectural Minimalism meets Journalistic Gravitas. The UI evokes a premium matte finish — a high-end broadsheet or a contemporary gallery. Space is generous, type is considered, and a single accent drives attention without shouting.

## Colors

The palette is rooted in high-contrast neutrals and a single earth-toned accent color.

- **Primary (#1A1C1E):** Deep ink for headlines and core text — maximum readability and permanence.
- **Secondary (#6C7278):** Sophisticated slate for borders, captions, and metadata.
- **Tertiary (#B8422E):** "Boston Clay" — the sole driver of interaction, used exclusively for primary actions and critical highlights.
- **Neutral (#F7F5F2):** Warm limestone foundation, softer than pure white.

## Typography

Two families do the work: Public Sans for narrative; Space Grotesk for technical labels.

- **Headlines:** Public Sans Semi-Bold, tight letter-spacing, for institutional authority.
- **Body:** Public Sans Regular at 16px — contemporary professionalism and long-form readability.
- **Labels:** Space Grotesk uppercase with generous letter-spacing, reserved for timestamps, metadata, and technical data.

## Layout

Fluid grid on mobile; fixed-max-width grid at 1200px on desktop. Strict 8px spacing scale with a 4px half-step for micro-adjustments. Generous 24–32px internal padding on cards.

## Shapes

Architectural sharpness. All interactive elements, containers, and inputs use a minimal 4px corner radius — just enough softness to feel modern while maintaining a rigid, engineered aesthetic.

## Components

Primary actions use Boston Clay; secondary actions reverse into a neutral surface with primary ink text. Both use the same small radius to keep the shape language uniform.

## Do's and Don'ts

- Do reserve the tertiary color for the single most important action per screen.
- Don't mix radii — stick to 4px everywhere.
- Do maintain WCAG AA contrast (4.5:1 minimum for body text).
- Don't use more than two typographic families on a single screen.
