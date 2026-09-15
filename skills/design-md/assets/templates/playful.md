---
version: alpha
name: Playful
description: Vibrant, rounded, and energetic. Bold colors and soft corners for consumer-facing apps that want to feel delightful and approachable.
colors:
  primary: "#D6353B"
  secondary: "#007A71"
  tertiary: "#C84F1E"
  neutral: "#FFF8F0"
  surface: "#FFFFFF"
  on-surface: "#2C2C2C"
  on-primary: "#FFFFFF"
  accent-yellow: "#FFCE3E"
  accent-purple: "#5A3ED3"
typography:
  display-lg:
    fontFamily: Fraunces
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.03em
  h1:
    fontFamily: Fraunces
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.15
  h2:
    fontFamily: Fraunces
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
  body-md:
    fontFamily: Nunito
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.6
  body-sm:
    fontFamily: Nunito
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
  label-md:
    fontFamily: Nunito
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.3
rounded:
  sm: 8px
  md: 16px
  lg: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 14px
  button-secondary:
    backgroundColor: "{colors.accent-yellow}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    padding: 14px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 20px
  chip:
    backgroundColor: "{colors.accent-purple}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: 8px
---

## Overview

Warm, energetic, and unmistakably friendly. The visual language leans into saturated color and generous rounding — the product should feel like a greeting, not a form. Designed for consumer apps where delight is a feature, not a garnish.

## Colors

A coral primary sits on a warm off-white foundation, joined by a teal secondary and two supporting accents. The palette is deliberately high-energy.

- **Primary (#D6353B):** Deep coral — primary actions, brand moments. Tuned to clear WCAG AA on white.
- **Secondary (#007A71):** Teal — positive states, secondary actions.
- **Tertiary (#C84F1E):** Burnt orange — emphasis, highlights.
- **Neutral (#FFF8F0):** Warm ivory — page background, softer than pure white.
- **Accent Yellow (#FFCE3E):** Sun — secondary call-to-action, celebratory moments. Pair with dark ink only.
- **Accent Purple (#5A3ED3):** Iris — tags, categorization, novelty.

## Typography

A contrasting pair: Fraunces (serif with character) for headlines, Nunito (rounded sans) for body and UI.

- **Display & Headlines:** Fraunces Bold — expressive curves, slightly condensed for impact.
- **Body:** Nunito Medium at 16px — rounded terminals echo the shape language and keep the tone soft.
- **Labels:** Nunito Bold for buttons and tags.

## Layout

Generous whitespace; content breathes. Mobile-first fluid layouts. Components favor cards with 20px internal padding and ample vertical rhythm.

## Shapes

Soft everywhere. Default radius is 16px; buttons and chips are fully pill-shaped (9999px). Cards use 24px. Avoid sharp 90° corners except in dividers.

## Components

Primary buttons are pill-shaped coral. Secondary uses the yellow accent on ink for a warmer CTA option. Chips lean purple to pop against the ivory background.

## Do's and Don'ts

- Do lean on color — the palette is the personality.
- Don't use more than three accent colors in a single view — energy becomes noise.
- Do keep radii soft and consistent (8 / 16 / 24 / full).
- Don't use serif for body text — reserve Fraunces for headlines.
- Do maintain at least 4.5:1 contrast despite the saturation (check coral-on-white).
