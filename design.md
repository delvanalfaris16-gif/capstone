# Design — SISKA

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre
modern-minimal

## Macrostructure family
- Marketing pages: Split Studio (login = diptych brand panel + form)
- App pages: Workbench (dashboard shell: N3 side-rail + topbar + view content)
- Content pages: n/a (no marketing/content routes)

## Theme
Custom OKLCH palette anchored on brand indigo-blue (hue 258), dark only.
- `--color-paper`   oklch(15% 0.012 258)
- `--color-paper-2` oklch(19% 0.013 258)
- `--color-paper-3` oklch(23% 0.013 258)
- `--color-ink`     oklch(93% 0.008 258)
- `--color-ink-2`   oklch(68% 0.010 258)
- `--color-ink-3`   oklch(58% 0.010 258)
- `--color-rule`    oklch(28% 0.012 258)
- `--color-accent`  oklch(64% 0.190 255)
- `--color-accent-ink` oklch(17% 0.020 258)
- `--color-focus`   oklch(64% 0.190 255)
- `--color-success` oklch(72% 0.190 145)
- `--color-success-ink` oklch(17% 0.020 145)
- `--color-warning` oklch(76% 0.160 75)
- `--color-danger`  oklch(65% 0.220 25)
- `--color-danger-ink` oklch(98% 0.005 25)

## Typography
- Display: Space Grotesk, weight 700, style normal, tracking -0.02em
- Body: Geist, weight 400
- Mono: JetBrains Mono, weight 400/500 (figures: amounts, NIS, dates — always tabular-nums)
- Type scale anchor: --text-display = clamp(2rem, 4vw + 1rem, 3.25rem)

## Spacing
4-point named scale. The values are in `tokens.css`. Pages must use named
tokens (`var(--space-md)`), never raw values.

## Motion
- Easings: --ease-out cubic-bezier(0.16,1,0.3,1), --ease-in cubic-bezier(0.7,0,0.84,0)
- Reveal pattern: view-switch fade + 8px rise, 220ms, once. No scroll reveals in app.
- Reduced-motion fallback: opacity-only, ≤ 150 ms.

## Microinteractions stance
- Silent success (inline note rows, never celebratory toasts)
- Hover translateY(-1px) on primary CTA only, 120ms
- Focus ring: 2px accent, instant, never animated
- Hover delay 800 ms · focus delay 0 ms

## CTA voice
- Primary CTA: solid accent fill, deep-ink text, pill radius, semibold, verb-first copy
- Secondary CTA: hairline outline, ink text, pill radius
- Danger: solid danger fill, white text

## Per-page allowances
- Marketing pages MAY use enrichment: none (typography only — no orbs, no mesh, no glass)
- App pages MUST NOT use enrichment — function carries the page
- Status is never color-only: dot/icon + text label

## What pages MUST share
- The wordmark (GraduationCap mark + SISKA in Space Grotesk 700)
- The accent colour and its placement (≤ 5 % per viewport)
- The display + body + mono fonts
- The CTA voice (pill, rhythm above)
- Section heading rhythm: micro-label + display heading, stacked, left-aligned

## What pages MAY differ on
- View content density (forms vs tables vs stat strips)
- Stat strip composition per role (hero figure spans 2 cols)

## Exports

### tokens.css
```css
:root {
  --color-paper:      oklch(15% 0.012 258);
  --color-paper-2:    oklch(19% 0.013 258);
  --color-paper-3:    oklch(23% 0.013 258);
  --color-ink:        oklch(93% 0.008 258);
  --color-ink-2:      oklch(68% 0.010 258);
  --color-ink-3:      oklch(48% 0.010 258);
  --color-rule:       oklch(28% 0.012 258);
  --color-accent:     oklch(64% 0.190 255);
  --color-accent-ink: oklch(17% 0.020 258);
  --color-focus:      oklch(64% 0.190 255);
  --color-success:    oklch(72% 0.190 145);
  --color-warning:    oklch(76% 0.160 75);
  --color-danger:     oklch(65% 0.220 25);

  --font-display: "Space Grotesk", "Geist", system-ui, sans-serif;
  --font-body:    "Geist", system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  --space-3xs: 0.25rem;  --space-2xs: 0.5rem;  --space-xs: 0.75rem;
  --space-sm:  1rem;     --space-md:  1.5rem;  --space-lg: 2rem;
  --space-xl:  3rem;     --space-2xl: 4.5rem;  --space-3xl: 7rem;

  --text-xs: 0.75rem;  --text-sm: 0.875rem; --text-md: 1.125rem;
  --text-lg: 1.375rem; --text-xl: 1.75rem;  --text-2xl: 2.25rem;
  --text-display: clamp(2rem, 4vw + 1rem, 3.25rem);

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --dur-micro: 120ms;
  --dur-short: 220ms;
  --dur-long: 420ms;
  --radius-card: 16px; --radius-pill: 999px; --radius-input: 10px;
}
```

### Tailwind v4 `@theme`
```css
@theme {
  --color-paper:   oklch(15% 0.012 258);
  --color-ink:     oklch(93% 0.008 258);
  --color-accent:  oklch(64% 0.190 255);
  --font-display:  "Space Grotesk", sans-serif;
  --font-body:     "Geist", sans-serif;
}
```

### DTCG `tokens.json`
```json
{
  "color": {
    "paper":  { "$value": "oklch(15% 0.012 258)", "$type": "color" },
    "ink":    { "$value": "oklch(93% 0.008 258)", "$type": "color" },
    "accent": { "$value": "oklch(64% 0.190 255)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Space Grotesk", "$type": "fontFamily" },
    "body":    { "$value": "Geist", "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1.5rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables
```css
:root {
  --background:         15% 0.012 258;
  --foreground:         93% 0.008 258;
  --primary:            64% 0.190 255;
  --primary-foreground: 17% 0.020 258;
  --muted:              28% 0.012 258;
  --muted-foreground:   68% 0.010 258;
  --border:             28% 0.012 258;
  --input:              28% 0.012 258;
  --ring:               64% 0.190 255;
  --radius:             10px;
}
```

## Provenance
Redesign of the SISKA Next.js + Supabase school-payment app (2026-09-19).
Routes preserved: `/` (login), `/dashboard` (6 views). Logic untouched.
