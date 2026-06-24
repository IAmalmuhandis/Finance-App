# Arzo — Brand Guide

A guide for building the Arzo app UI. Follow these tokens and rules so every
screen is visually consistent.

- **Name:** Arzo
- **Origin (tell only when asked):** Arzo comes from *Arziki*, the Hausa word for wealth and prosperity.
- **Essence:** Disciplined, warm, quietly premium. Prosperity through intention.
- **Tagline:** "Give every naira a job." (alt: "Keep more of what you earn.")
- **Personality:** calm, trustworthy, grown-up. Never flashy, never loud. Gold is used sparingly as the single bold accent.

---

## 1. Color

| Token | Hex | Use |
|---|---|---|
| Jade (primary) | `#0C4A3E` | Primary brand color, headers, primary buttons, key UI |
| Deep Jade | `#082E27` | Dark surfaces / dark-mode background, app bar on dark |
| Ink | `#11201B` | Primary text on light backgrounds |
| Slate (muted) | `#5B6B64` | Secondary text, captions, labels |
| Gold (accent) | `#C9A24B` | Accent only — the "Wealth Retained" figure, highlights, active state, logo crossbar |
| Gold Soft | `#EADFBE` | Subtle gold-tint fills / highlight backgrounds |
| Ivory (surface) | `#F6F4EE` | App background (light mode) |
| Cloud (card) | `#FFFFFF` | Elevated cards on ivory |
| Line | `#E6E1D5` | Borders and dividers on light |
| Positive | `#2E7D5B` | Positive deltas / growth indicators |
| Alert | `#B4543A` | Errors, "over 100%" warnings (muted clay-red, never harsh red) |

**Rule:** Gold is an accent, not a fill. Spend it in one place per screen — the
most important number or the single most important action. Primary buttons stay
jade.

### CSS variables (paste into the app)

```css
:root {
  --arzo-jade: #0C4A3E;
  --arzo-jade-deep: #082E27;
  --arzo-ink: #11201B;
  --arzo-slate: #5B6B64;
  --arzo-gold: #C9A24B;
  --arzo-gold-soft: #EADFBE;
  --arzo-ivory: #F6F4EE;
  --arzo-cloud: #FFFFFF;
  --arzo-line: #E6E1D5;
  --arzo-positive: #2E7D5B;
  --arzo-alert: #B4543A;

  --arzo-bg: var(--arzo-ivory);
  --arzo-surface: var(--arzo-cloud);
  --arzo-text: var(--arzo-ink);
  --arzo-text-muted: var(--arzo-slate);
}

[data-theme="dark"] {
  --arzo-bg: var(--arzo-jade-deep);
  --arzo-surface: var(--arzo-jade);
  --arzo-text: var(--arzo-ivory);
  --arzo-text-muted: #9DB1A8;
  --arzo-line: #1C4A40;
}
```

### Allocation palette (for the bucket bars / charts)

Cohesive green-to-gold family with one neutral. Use these specific colors per bucket:

| Bucket | Hex |
|---|---|
| Investment | `#0C4A3E` |
| Personal needs | `#3E7C6B` |
| Family | `#C9A24B` |
| Sadaqah | `#B5843A` |
| Emergency | `#6B7A6F` |

For custom buckets, cycle this same family rather than introducing new hues.

---

## 2. Typography

Load from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- **Display — `Fraunces`** (serif). Wordmark, screen titles, and big figures
  (the hero "Wealth Retained" number). Weights 500–600. Enable optical sizing.
- **UI / body — `Inter`** (sans). All labels, inputs, buttons, and table data.
  Use `font-variant-numeric: tabular-nums` everywhere naira amounts appear so
  columns align.

```css
--font-display: 'Fraunces', Georgia, 'Times New Roman', serif;
--font-ui: 'Inter', system-ui, -apple-system, sans-serif;
```

### Type scale (mobile-first)

| Role | Font / weight | Size |
|---|---|---|
| Hero figure (Wealth Retained) | Fraunces 600 | 40–48px |
| Screen title | Fraunces 600 | 28px |
| Section heading | Fraunces 600 | 20px |
| Body | Inter 400 | 16px |
| Amount in tables | Inter 500, tabular-nums | 16px |
| Label / caption | Inter 500 | 13px |
| Eyebrow (overline) | Inter 600, uppercase, letter-spacing 0.06em | 12px |

---

## 3. Logo & icon

The mark is an **"A"** that reads as an upward peak (growth), crossed by a single
**gold bar** (the split / allocation). The app icon is this mark, ivory on a jade
squircle, gold crossbar.

Primary app icon (use `arzo-icon.svg`):

```svg
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Arzo">
  <rect width="512" height="512" rx="120" fill="#0C4A3E"/>
  <path d="M150 372 L256 140 L362 372" stroke="#F6F4EE" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M191 284 L321 284" stroke="#C9A24B" stroke-width="34" stroke-linecap="round"/>
</svg>
```

**Color variants**
- On jade / dark: ivory "A", gold crossbar (as above).
- On ivory / light: jade "A" (`#0C4A3E`), gold crossbar — drop the jade rect or make it transparent/white.
- Monochrome (rare): single jade or single ivory, no crossbar contrast needed.

**Wordmark:** set "Arzo" in Fraunces SemiBold (600). On light, jade text; on dark,
ivory text. The icon carries the gold — keep the wordmark single-color.

**Lockup:** icon left, wordmark right, optically centered. Clear space around the
lockup = the height of the "A". Minimum icon size 24px.

**Don'ts:** don't recolor outside the palette, don't stretch or skew, don't add
drop shadows or gradients to the mark, don't put the gold mark on a gold/ivory-busy
background, don't rotate.

---

## 4. UI style

- **Corners:** cards 20px, buttons 14px, inputs 12px. Soft, modern, premium.
- **Buttons:** primary = jade fill, ivory text. Reserve a gold fill for at most
  one hero action per screen (e.g. "Save entry"); everything else jade or ghost.
- **Cards:** Cloud (`#FFFFFF`) on Ivory bg, 1px Line border, very soft shadow
  (or no shadow — prefer borders and tint for elevation).
- **Spacing:** 8pt grid (8 / 16 / 24 / 32).
- **Icons:** line style, ~1.75px stroke, rounded caps.
- **Motion:** gentle, 200–250ms ease-out. Respect `prefers-reduced-motion`.
- **Numbers:** always tabular-nums; prefix ₦; thousands separators.
- **Tone of copy:** plain, encouraging, never preachy. Empty states invite action.

---

## 5. Quick reference

- Brand color: Jade `#0C4A3E` · Accent: Gold `#C9A24B` · Surface: Ivory `#F6F4EE`
- Fonts: Fraunces (display) + Inter (UI)
- Icon: ivory "A" + gold crossbar on jade squircle
- One gold accent per screen. Keep everything else quiet.
