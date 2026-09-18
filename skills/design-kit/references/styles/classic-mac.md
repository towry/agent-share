# Classic Mac OS UI (System 1–7)

## Overview

Classic Mac OS UI recreates the black-and-white Macintosh system-software look from System 1 through System 7: content lives in beveled windows with striped title bars, depth comes from 1px inset highlights and hard offset shadows instead of blur, and type is a small humanist sans in the Chicago/Charcoal/Geneva lineage on a desktop-gray canvas. The look is nostalgic and friendly while staying fully legible, and it pairs naturally with pixel-art icons.

Reference implementation studied: hub.v2core.com (a public feed styled as a classic Mac desktop).

## Core Principles

- **Window chrome first**: every grouping of content sits in a "window" with a striped title bar; the page is a desktop holding windows.
- **White frame inside**: window content sits in a white inset panel with its own 1px outline; almost nothing floats bare on the desktop gray.
- **Bevels, not gradients**: depth is faked with paired inset shadows — white highlight top-left, gray shadow bottom-right.
- **Hard shadows only**: offset solid shadows (`2px 2px 0`) with zero blur; nothing floats on a soft glow.
- **Ink, not black**: outlines and text use near-black `#262626`; reserve pure `#000` for rare emphasis.
- **Small weight-driven type**: 12px sans default, hierarchy via bold and boxes rather than large headings.
- **Flat color fields**: `#ccc` desktop, `#ddd` panels, `#fff` content; the striped title bar is the only texture.

---

## Quick Start — Complete CSS Variables

Copy this block to get all Classic Mac OS tokens:

```css
:root {
  /* === Colors === */
  --mac-bg: #cccccc;        /* desktop canvas and window body */
  --mac-panel: #dddddd;     /* dialogs, buttons, title-bar stripe field */
  --mac-content: #ffffff;   /* cards, reading surfaces, inputs */
  --mac-ink: #262626;       /* borders, text */
  --mac-muted: #999999;     /* disabled text, soft bevel step */
  --mac-link: #333399;      /* classic link blue */
  --mac-note-bg: #ffffc9;   /* pale-yellow note banner */
  --mac-note-ink: #66511a;  /* note text */
  --mac-danger: #cc3333;    /* destructive accents */
  --mac-accent: #ffcc33;    /* star/flag highlight */
  --mac-hairline: #dddddd;  /* separators between feed posts */
  --mac-reply-bg: #f6f6f6;  /* indented reply rows */
  --mac-code-bg: #eeeeee;   /* inline code highlight */

  /* === Bevel steps (light → dark) === */
  --mac-bevel-light: #ffffff;  /* top-left highlight */
  --mac-bevel-mid: #aaaaaa;    /* button outer bevel, bottom-right */
  --mac-bevel-dark: #777777;   /* button outer bevel, bottom-right */
  --mac-bevel-shadow: #999999; /* window bottom-right bevel */

  /* === Borders & shadows === */
  --mac-border: 1px solid #262626;
  --mac-shadow-window: 2px 2px 0 #262626;
  --mac-shadow-card: 1px 1px 0 #262626;
  --mac-shadow-dialog: 2px 2px 0 rgba(0, 0, 0, 0.25);
  --mac-bevel-inset: inset 1px 1px 0 #ffffff, inset -1px -1px 0 #999999;
  --mac-bevel-frame: -1px -1px 0 #999999, 1px 1px 0 #ffffff;
  --mac-bevel-strip: inset 1px 1px 0 rgba(255, 255, 255, 0.6), inset -1px -1px 0 #aaaaaa;
  --mac-bevel-field: -1px -1px 0 #999999, -1px 0 0 #999999, 0 -1px 0 #999999, 1px 1px 0 #ffffff, 1px 0 0 #ffffff, 0 1px 0 #ffffff;

  /* === Typography === */
  --mac-font-ui: "Charcoal", "Chicago", "Geneva", "Lucida Grande", "Lucida Sans", Verdana, sans-serif;
  --mac-font-data: Monaco, "Courier New", monospace;
  --mac-text-xs: 11px;   /* code, metadata */
  --mac-text-sm: 12px;   /* default UI text */
  --mac-text-lg: 18px;   /* page titles */
  --mac-leading: 1.45;
  --mac-weight-normal: 400;
  --mac-weight-bold: 700;

  /* === Spacing === */
  --mac-space-1: 4px;
  --mac-space-2: 6px;    /* compact card padding */
  --mac-space-3: 8px;
  --mac-space-4: 12px;
  --mac-space-6: 22px;   /* gap between stacked windows */
  --mac-space-8: 24px;   /* page top padding */

  /* === Radius === */
  --mac-radius-square: 0;   /* windows, cards, inputs, title bars */
  --mac-radius-button: 3px; /* buttons only, per the reference site */
}
```

## Colors

| Token | Value | Used for |
|---|---|---|
| desktop | `#cccccc` | page background, window body |
| panel | `#dddddd` | dialogs, buttons, title-bar stripe field |
| content | `#ffffff` | cards, reading surfaces, inputs |
| hairline | `#dddddd` | separators between feed posts |
| reply | `#f6f6f6` | indented reply rows |
| code | `#eeeeee` | inline code highlight |
| ink | `#262626` | all borders and text |
| muted | `#999999` | disabled text, window bevel shadow step |
| link | `#333399` | links; keep default underline |
| note | `#ffffc9` on `#66511a` | pale-yellow note/warning banner |
| danger | `#cc3333` | destructive actions |
| accent | `#ffcc33` | stars, flags, small highlights |

Rules:

- Text and borders are `#262626`, never `#000`; the softer ink keeps 1px outlines from vibrating.
- Secondary text (ids, timestamps, counts) is `#666` on white; disabled controls are `#999` on `#ddd`.
- The only blues are the link `#333399` and its light tint `#9999fe` for focus rings; everything else stays grayscale plus the yellow notes.
- Bevel steps must stay in the `#fff → #aaa → #999 → #777 → #888` band; a saturated bevel breaks the period look.

## Typography

### Font Stack

```css
font-family: "Charcoal", "Chicago", "Geneva", "Lucida Grande", "Lucida Sans", Verdana, sans-serif;
font-family: Monaco, "Courier New", monospace; /* code and data */
```

- `Charcoal` (Mac OS 8/9) and `Chicago` (System 1–7) are the period-accurate faces; modern systems fall through to `Geneva`/`Verdana`, which keeps the humanist proportions. Load a Chicago-style web font if the bitmap feel matters.
- Default body text is `12px/1.45`; bump to `16px` on touch inputs to prevent mobile zoom.

### Hierarchy

- **Page title**: bold, `18px`, plain ink — no decorative heading colors.
- **Window title**: bold `12px`, centered inside the striped title bar.
- **Buttons**: bold `12px`; weight is what makes them read as buttons.
- **Metadata / code**: `11px` Monaco monospace.

## Layout

### Desktop Column

```css
.desk { max-width: 640px; margin: 0 auto; }
body { padding: 24px 12px 48px; background: #cccccc; }
```

- Content stacks as full-width windows with `22px` gaps.
- At `1060px` and wider, split into a flex row: `640px` main column plus a `360px` sidebar that sticks at `top: 24px`.

### Window Anatomy

Every window is: 1px ink border → title bar (left control box, stripes, centered bold title, stripes) → white content frame with a 4px gray margin. The frame — not the gray body — holds the content, and its bevel is inverted (`#999` top-left, `#fff` bottom-right) so it reads as pressed into the window. Dialogs may add a second control box on the right.

## Components

### Window with Striped Title Bar

```html
<section class="window">
  <div class="titlebar">
    <span class="tbox" role="button" aria-label="Close"></span>
    <span class="stripe"></span>
    <span class="title">Reports</span>
    <span class="stripe"></span>
  </div>
  <div class="frame">
    <div class="pad">…content…</div>
  </div>
</section>
```

```css
.window { max-width: 640px; margin: 0 auto 22px; background: #cccccc; border: 1px solid #262626;
  box-shadow: 2px 2px 0 #262626, inset 1px 1px 0 #ffffff, inset -1px -1px 0 #999999; }
.titlebar { display: grid; grid-template-columns: auto 1fr auto 1fr auto; align-items: center; gap: 4px; padding: 2px 4px; }
.title { font-weight: 700; line-height: 13px; padding: 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stripe { height: 12px; min-width: 8px; background-color: #dddddd;
  background-image: linear-gradient(#ffffff, #ffffff 50%, #777777 50%, #777777); background-size: 100% 2px; }
.tbox { width: 9px; height: 9px; border: 1px solid #262626; background: #dddddd;
  box-shadow: inset 1px 1px 0 #ffffff, inset -1px -1px 0 #888888; }
.tbox.zoom::after { content: ""; display: block; width: 7px; height: 7px; border: 1px solid #262626; }
.frame { margin: 0 4px 4px; border: 1px solid #262626; background: #ffffff;
  box-shadow: -1px -1px 0 #999999, 1px 1px 0 #ffffff; }
.pad { padding: 12px 14px; }
```

### Button

```css
.btn { box-sizing: border-box; min-width: 58px; height: 20px; padding: 2px 13px; background: #dddddd;
  color: #262626; font: 700 12px/14px var(--mac-font-ui); text-align: center; text-decoration: none;
  border: 1px solid #262626; border-radius: 3px;
  box-shadow: inset 1px 1px 0 #dddddd, inset -1px -1px 0 #777777, inset 2px 2px 0 #ffffff, inset -2px -2px 0 #aaaaaa; }
.btn:active { background: #666666; color: #ffffff;
  box-shadow: inset 1px 1px 0 #444444, inset -1px -1px 0 #888888, inset 2px 2px 0 #555555, inset -2px -2px 0 #777777; }
.btn:disabled { color: #999999; }
.btn.default { outline: 2px solid #262626; outline-offset: 1px; border-radius: 4px; }
```

The four-stop inset bevel is the signature; a flat gray button reads as modern, not classic. The pressed state inverts to a dark field with white text — keep both. A form's primary action takes the `.default` double outline, the classic Mac "default button" mark.

### Text Input

```css
.field, .area { box-sizing: border-box; padding: 2px 5px; font: 400 12px/16px var(--mac-font-ui); background: #ffffff;
  color: #262626; border: 1px solid #262626; border-radius: 0;
  box-shadow: -1px -1px 0 #999999, -1px 0 0 #999999, 0 -1px 0 #999999,
              1px 1px 0 #ffffff, 1px 0 0 #ffffff, 0 1px 0 #ffffff; }
.area { width: 100%; height: 56px; resize: vertical; }
.field:focus, .area:focus { outline: none; }
```

Fields are white, square, and pressed-in with a six-stop bevel — dark `#999` on the top/left edges, white on the bottom/right. No focus glow and no focus ring; the default button carries the emphasis instead.

### Embed / Link Card

```css
.card { display: flex; border: 1px solid #262626; background: #ffffff; box-shadow: 1px 1px 0 #262626; }
.card-thumb { flex: none; width: 64px; border-right: 1px solid #262626; }
.card-body { min-width: 0; padding: 6px 9px; }
.card-title { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
```

Used for link previews inside posts, sitting on the white frame; the 64px thumbnail column is separated by a 1px rule, not a gap.

### Feed Post Row

The feed is rows, not cards: posts sit on the white frame, separated by `#dddddd` hairlines.

```css
.post { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 10px; padding: 10px 12px 11px; border-bottom: 1px solid #dddddd; }
.post.reply { padding-left: 36px; background: #f6f6f6; border-left: 1px solid #dddddd; }
.av { width: 32px; height: 32px; border: 1px solid #262626; background: #dddddd; }
.av img { width: 30px; height: 30px; image-rendering: pixelated; }
.meta { color: #666666; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta b { color: #262626; font-size: 12px; }
.foot { margin-top: 5px; font-size: 11px; display: flex; gap: 10px; color: #666666; }
```

One line of meta first — bold 12px display name, 11px Monaco id, then a link-colored timestamp — body text, then an 11px `#666` footer with reply count and latest-reply preview. Replies indent on `#f6f6f6` with a left hairline.

### Chrome Strips (Search / Pager)

`#dddddd` strips pinned inside the window frame, above and below lists, each with a faint inset bevel and 1px ink rules:

```css
.find, .pager { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: #dddddd;
  box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.6), inset -1px -1px 0 #aaaaaa; }
.find { border-bottom: 1px solid #262626; }
.pager { border-top: 1px solid #262626; font-size: 11px; color: #333333; }
```

The search row pairs the input with a Search button and a pixel bell; the pager centers its stats and right-aligns the Next button.

### Pixel Icons

Draw small icons (bell, arrows, glyphs) as inline SVGs made of 1px rects with `shape-rendering: crispEdges`, black `#262626` with `#ffcc33` fills where the design calls for it. Raster avatars must keep `image-rendering: pixelated` so photos stay crunchy at 30px.

### Note / Warning Banner

```css
.note { padding: 6px 8px; background: #ffffc9; color: #66511a; border: 1px solid #262626;
  box-shadow: inset 1px 1px 0 #ffffff; }
```

## Shapes and Depth

| Element | Depth recipe |
|---|---|
| Window | 1px ink border + `2px 2px 0 #262626` shadow + inset `#fff`/`#999` bevel |
| Dialog | same, with `2px 2px 0 rgba(0, 0, 0, 0.25)` shadow |
| Button | 4-stop inset bevel (`#ddd`/`#777`/`#fff`/`#aaa`); pressed inverts to `#666` field |
| Default button | adds `outline: 2px solid #262626` with 1px offset |
| Control box | 9px square, inset `#fff`/`#888` bevel |
| Content frame | white panel, inverted bevel (`-1px -1px 0 #999, 1px 1px 0 #fff`) |
| Input / textarea | six-stop pressed-in bevel, `#999` top-left / `#fff` bottom-right |
| Search & pager strips | `#ddd` field, faint inset bevel, 1px ink rule on the list side |
| Card | flat white + `1px 1px 0 #262626` shadow |

- Radius is `0` everywhere except buttons (`3px` on the reference).
- Shadow blur is always `0`. If a shadow looks soft, it is wrong.
- The only gradient allowed is the 2px-pixel title-bar stripe.

## Design Tokens — design-md Format

Lift this block into a project-root `DESIGN.md` when the style must survive across sessions or feed code generators. Validate with `npx @google/design.md lint DESIGN.md` (expect `orphaned-tokens` warnings for `colors.desktop` / `colors.muted` / `colors.danger` / `colors.accent` until your own components reference them).

```md
---
name: Classic Mac OS
description: Black-and-white Macintosh System 1–7 desktop look; beveled chrome, striped title bars, hard offset shadows.
colors:
  primary: "#333399"
  desktop: "#CCCCCC"
  panel: "#DDDDDD"
  content: "#FFFFFF"
  ink: "#262626"
  muted: "#999999"
  note-bg: "#FFFFC9"
  note-ink: "#66511A"
  danger: "#CC3333"
  accent: "#FFCC33"
typography:
  ui:
    fontFamily: "Charcoal, Chicago, Geneva, 'Lucida Grande', 'Lucida Sans', Verdana, sans-serif"
    fontSize: "12px"
    fontWeight: "400"
    lineHeight: "1.45"
  bold:
    fontFamily: "Charcoal, Chicago, Geneva, 'Lucida Grande', 'Lucida Sans', Verdana, sans-serif"
    fontSize: "12px"
    fontWeight: "700"
    lineHeight: "1.45"
  code:
    fontFamily: "Monaco, 'Courier New', monospace"
    fontSize: "11px"
    lineHeight: "1.3"
rounded:
  none: "0px"
  button: "3px"
components:
  Button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.bold}"
    rounded: "{rounded.button}"
    height: "20px"
  Input:
    backgroundColor: "{colors.content}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.none}"
    height: "20px"
  Card:
    backgroundColor: "{colors.content}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.none}"
    padding: "9px"
  Note:
    backgroundColor: "{colors.note-bg}"
    textColor: "{colors.note-ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.none}"
    padding: "8px"
---

## Overview

Recreates the black-and-white Macintosh System 1–7 desktop: gray canvas, beveled window chrome, striped title bars, hard offset shadows, and small Chicago-lineage type.

## Colors

Desktop gray `#CCCCCC` and panel gray `#DDDDDD` carry the chrome; white is reserved for content cards. Ink is near-black `#262626`, never pure black. Links use the classic blue `#333399`; pale yellow flags notes; `#CC3333` marks destructive actions.

## Typography

One humanist sans stack at 12px with weight-based hierarchy; bold marks titles, buttons, and emphasis. Code and data use Monaco at 11px.

## Layout

A centered 640px column of stacked windows with 22px gaps; two columns with a sticky 360px sidebar from 1060px up. Page padding is 24px top, 12px sides.

## Elevation & Depth

Depth comes from paired inset bevels — white top-left, gray bottom-right — plus hard offset shadows with zero blur.

## Shapes

Square corners everywhere; buttons alone take a 3px radius. All outlines are 1px ink.

## Components

Button, Input, Card, and Note form the core set; windows with striped title bars wrap every content group.

## Do's and Don'ts

Keep outlines 1px `#262626` and shadows hard-edged; do not add blur, soft shadows, gradients, or rounded panels.
```

## Do's and Don'ts

### Do

- Keep every outline 1px and ink `#262626`.
- Use paired inset bevels for anything raised, inverted bevels for anything pressed.
- Center bold titles inside striped title bars, with symmetric stripe runs.
- Give buttons bold 12px text and the 4-stop bevel.
- Wrap content in the white frame, and mark the primary action with the 2px double outline.
- Use monospace at 11px for data, keys, and metadata.

### Don't

- Don't blur shadows or round panels — both instantly read as modern UI.
- Don't float white cards directly on the desktop gray, and don't flatten fields to a single inset shadow.
- Don't introduce large heading sizes or decorative heading colors; hierarchy is weight and boxes.
- Don't use saturated fills beyond the yellow note and accent; chrome stays grayscale.
- Don't put content directly on the desktop gray without a window or card.

## When To Use

- Retro/nostalgic products, fan pages, small public feeds, guestbooks, and tools that want an "old computer" personality.
- Reports or dashboards that benefit from a strong, instantly recognizable visual identity.
- Avoid it for dense professional tools or content-heavy editorial sites where 12px chrome type and heavy outlines cost readability; use `blueprint-editorial` or `paper-ui-style` instead.
