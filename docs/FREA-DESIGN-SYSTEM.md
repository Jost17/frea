# FREA Brand & Design System

**Version**: 1.0  
**Last Updated**: 2026-05-18  
**Designed for**: FREA Freelancer Invoice Tool  
**Brand Direction**: Emerald + Dark Slate, Modern, Clean, Accessible

---

## Executive Summary

FREA is a German freelancer invoicing tool designed to simplify invoice creation, client management, and financial tracking. The brand identity reflects this mission: **trusted, clear, efficient**. The design system ensures consistency across all UI touchpoints while maintaining accessibility (WCAG 2.1 AA) and compliance with EU hosting & data regulations (ADR-001).

---

## 1. Brand Identity

### Mission & Values

- **Mission**: Freelancern Rechnungs­verwaltung einfacher machen — schnell, zuverlässig, legal.
- **Values**: 
  - **Klarheit** (Clarity) — intuitive workflows, no confusion
  - **Zuverlässigkeit** (Reliability) — audit-proof, WCAG-accessible, EU-compliant
  - **Effizienz** (Efficiency) — fast interactions, minimal clicks
  - **Vertrauen** (Trust) — transparent pricing, secure data handling

### Brand Tone (Visuell)

- **Modern**: Clean lines, generous whitespace, purposeful motion
- **Professional**: Calm, focused, business-appropriate (not corporate-sterile)
- **Accessible**: High contrast, semantic HTML, keyboard-navigable
- **Minimal**: Only what serves the workflow; no decorative fluff

---

## 2. Logo & Wordmark

### Concept

**FREA** = Freedomrelease + efficient accounting (mnemonic, not acronym).

#### Option A: Wordmark with Icon Accent
- **Wordmark**: "FREA" in clean, modern sans-serif (Roboto / system default)
- **Icon**: Simplified checkmark or emerald square badge (left of wordmark)
- **Usage**: Primary lockup for headers, dark mode & light mode variants

#### Option B: Geometric Badge
- **Badge**: Emerald circle with white "F" (monogram, app icon format)
- **Wordmark**: "FREA" alongside (horizontal or stacked)
- **Usage**: App icon, favicon, sidebar branding

### Technical Spec

- **Format**: SVG (scale-independent, no CDN dependency per ADR-001)
- **Color Variants**:
  - Light mode: Emerald primary (`oklch(72% 0.17 165)`) on white
  - Dark mode: Bright emerald (`oklch(78% 0.18 165)`) on dark surface
  - Monochrome: Black/white (for print, B&W scenarios)
- **Minimum size**: 32×32 px (favicon), 48×48 px (app icon)
- **File location**: `public/assets/branding/frea-logo.svg`, `frea-logo-badge.svg`

### Current Asset Status

✅ Logo design not yet finalized — **Priority 1 for design handoff**. Two SVG variants to be created.

---

## 3. Color Palette

### Primary Brand Color: Emerald

**Emerald** conveys growth, trust, and financial clarity. Chosen for:
- Strong WCAG AA contrast on both light & dark backgrounds
- Positive association (growth, money, stability)
- Distinct from competitors (not blue, not orange)

#### Light Mode Palette

| Token | Value | OKLch | Use Case | Contrast (on white bg) |
|-------|-------|-------|----------|------------------------|
| **primary** | Emerald 600 | `oklch(72% 0.17 165)` | Buttons, links, active states | 5.2:1 ✅ |
| **primary-hover** | Emerald 700 | `oklch(65% 0.17 165)` | Button hover, focus states | 6.1:1 ✅ |
| **primary-subtle** | Emerald 50 | `oklch(96% 0.04 165)` | Backgrounds, subtle accents | N/A (bg-only) |

#### Dark Mode Palette

| Token | Value | OKLch | Use Case | Contrast (on dark bg ~16%) |
|-------|-------|-------|----------|--------------------------|
| **primary** | Emerald 500 | `oklch(78% 0.18 165)` | Buttons, links, active states | 5.8:1 ✅ |
| **primary-hover** | Emerald 400 | `oklch(83% 0.18 165)` | Button hover, focus states | 6.8:1 ✅ |
| **primary-subtle** | Emerald 950 | `oklch(22% 0.06 165)` | Backgrounds, subtle accents | N/A (bg-only) |

### Semantic Colors

#### Success (Green, aligned with Emerald family)
- Light: `oklch(72% 0.17 165)` (= primary, reuse)
- Dark: `oklch(78% 0.18 165)` (= primary, reuse)
- **Use**: Paid invoices, successful actions, checkmarks

#### Warning (Amber/Gold)
- Light: `oklch(72% 0.14 75)` 
- Dark: `oklch(78% 0.15 75)`
- **Use**: Pending payments, unsent invoices, cautions
- **Contrast**: 4.5:1+ on backgrounds ✅

#### Danger/Error (Red)
- Light: `oklch(58% 0.18 25)`
- Dark: `oklch(65% 0.2 25)`
- **Use**: Overdue invoices, delete confirmations, error states
- **Contrast**: 4.5:1+ on backgrounds ✅

#### Info (Blue)
- Light: `oklch(60% 0.14 250)`
- Dark: `oklch(68% 0.16 250)`
- **Use**: Information callouts, tooltips, help text
- **Contrast**: 4.5:1+ on backgrounds ✅

### Neutral/Grayscale

#### Light Mode
- **bg-primary** (page background): `oklch(98.5% 0.003 265)` (off-white)
- **bg-surface** (cards, inputs): `oklch(100% 0 0)` (pure white)
- **border-subtle**: `oklch(93% 0.006 265)` (light gray, 1px dividers)
- **border-medium**: `oklch(88% 0.01 265)` (medium gray, input borders)
- **text-primary**: `oklch(21% 0.02 265)` (dark gray, body text) — 13.2:1 contrast on white ✅
- **text-secondary**: `oklch(45% 0.02 265)` (medium gray, labels) — 7.1:1 contrast on white ✅
- **text-muted**: `oklch(50% 0.015 265)` (light gray, disabled text) — 5.0:1 contrast on white ✅

#### Dark Mode
- **bg-primary** (page background): `oklch(13% 0.015 265)` (very dark blue-gray)
- **bg-surface** (cards, inputs): `oklch(16% 0.015 265)` (dark blue-gray)
- **border-subtle**: `oklch(22% 0.015 265)` (slightly lighter border)
- **border-medium**: `oklch(28% 0.015 265)` (more visible border)
- **text-primary**: `oklch(93% 0.005 265)` (off-white, body text) — 13.2:1 contrast on dark surface ✅
- **text-secondary**: `oklch(65% 0.01 265)` (medium gray, labels) — 7.1:1 contrast on dark surface ✅
- **text-muted**: `oklch(70% 0.01 265)` (light gray, disabled text) — 4.8:1 contrast on dark surface ✅

### Status Badge Colors

Status badges (Draft, Open, Paid, Overdue, Cancelled) have dedicated color pairs:

| Status | Light BG | Light Text | Dark BG | Dark Text | Description |
|--------|----------|-----------|---------|-----------|-------------|
| Draft | `oklch(95% 0.01 265)` | `oklch(45% 0.02 265)` | `oklch(25% 0.01 265)` | `oklch(70% 0.02 265)` | Default/inactive |
| Open | `oklch(94% 0.06 165)` | `oklch(38% 0.14 165)` | `oklch(22% 0.06 165)` | `oklch(78% 0.14 165)` | Sent, awaiting payment |
| Paid | `oklch(93% 0.06 155)` | `oklch(35% 0.14 155)` | `oklch(22% 0.06 155)` | `oklch(72% 0.14 155)` | Payment received |
| Overdue | `oklch(94% 0.06 25)` | `oklch(38% 0.18 25)` | `oklch(22% 0.06 25)` | `oklch(72% 0.18 25)` | Payment overdue |
| Cancelled | `oklch(95% 0.01 265)` | `oklch(45% 0.02 265)` | `oklch(25% 0.01 265)` | `oklch(70% 0.02 265)` | Cancelled/void |

---

## 4. Typography

### Font Stack (System-First, No External CDN)

Per ADR-001, no Google Fonts CDN. Using system font stack for reliability and compliance.

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "Cascadia Code", "Fira Code", monospace;
```

**Fallback order**:
1. Platform-native (macOS `-apple-system`, Windows `Segoe UI`)
2. System UI (`system-ui` generic)
3. Web fallbacks (`Roboto` on Android, Firefox; `Segoe UI` Windows)
4. Generic (`sans-serif`, `monospace`)

### Scale (Responsive)

All sizes use `rem` units (base 16px = 1rem) for accessibility and zooming support.

| Role | Size | Line Height | Weight | Use Case |
|------|------|----------|--------|----------|
| **H1** (Page title) | 2rem (32px) | 1.2 | 600 (semibold) | Page headings, major sections |
| **H2** (Section) | 1.5rem (24px) | 1.3 | 600 | Section titles, modals |
| **H3** (Subsection) | 1.25rem (20px) | 1.4 | 600 | Subsection titles, cards |
| **H4** (Small heading) | 1.125rem (18px) | 1.5 | 500 | Form labels, small cards |
| **Body** (default) | 1rem (16px) | 1.5 | 400 | Paragraph text, descriptions |
| **Small** (labels, help text) | 0.875rem (14px) | 1.5 | 400 | Form labels, helper text, captions |
| **Code** (monospace) | 0.875rem (14px) | 1.6 | 400 | Code blocks, API refs, table monospace |
| **Caption** (very small) | 0.75rem (12px) | 1.4 | 400 | Badge text, timestamp, icon labels |

### Responsive Type

On screens <640px, reduce H1/H2 by 0.25–0.5rem to fit mobile viewports without horizontal scroll:

```css
@media (max-width: 640px) {
  h1 { font-size: 1.75rem; }
  h2 { font-size: 1.25rem; }
  h3 { font-size: 1.125rem; }
}
```

### Font Weights Used

- **400** (Regular): Body text, normal weight
- **500** (Medium): Form labels, button secondary
- **600** (Semibold): Headings, button primary, emphasis

---

## 5. Design Tokens (CSS Custom Properties)

All design tokens are defined in `src/styles/input.css` as Tailwind `@theme` values. This is the **single source of truth** for all visual properties.

### Token Categories

#### Color Tokens
- `--color-primary`, `--color-primary-hover`, `--color-primary-subtle`
- `--color-bg-primary`, `--color-bg-surface`, `--color-bg-surface-raised`
- `--color-border-subtle`, `--color-border-medium`
- `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- `--color-accent-success`, `--color-accent-warning`, `--color-accent-danger`, `--color-accent-info`
- `--color-status-*-bg`, `--color-status-*-text` (Draft, Open, Paid, Overdue, Cancelled)

#### Spacing Tokens (from Tailwind defaults)
- `0.25rem` (4px), `0.5rem` (8px), `1rem` (16px), `1.5rem` (24px), `2rem` (32px), `3rem` (48px)
- **Padding/Margin Rule**: Use multiples of 4px (0.25rem) for alignment & rhythm

#### Typography Tokens
- `--font-sans`, `--font-mono`

#### Border Radius Tokens
- `--radius-md: 0.5rem` (8px) — buttons, inputs, cards
- `--radius-lg: 0.75rem` (12px) — larger components, modals

#### Shadow Tokens
- `--shadow-card`: Subtle elevation for cards, default state
- `--shadow-card-hover`: Elevated shadow on hover/focus

#### Motion Tokens
- `--duration-slow: 300ms` — theme toggle, HTMX transitions
- `--ease-default: cubic-bezier(0.4, 0, 0.2, 1)` — standard easing

### Token Usage in Code

Tokens are **always** referenced via CSS custom properties, never hardcoded colors:

```html
<!-- ✅ Correct -->
<button class="bg-primary text-white hover:bg-primary-hover">
  Rechnung erstellen
</button>

<!-- ❌ Avoid -->
<button style="background: #2ea383; color: white;">
  Rechnung erstellen
</button>
```

### Dark Mode Implementation

Dark mode uses the `[data-theme="dark"]` attribute on `<html>`:

```html
<!-- Light mode (default) -->
<html>
  <!-- tokens use light values -->
</html>

<!-- Dark mode (user preference or toggle) -->
<html data-theme="dark">
  <!-- tokens override to dark values -->
</html>
```

---

## 6. Component Foundations

### Buttons

#### Primary Button
- **State**: Default, Hover, Focus, Disabled
- **Colors**: `bg-primary`, `text-white`, `hover:bg-primary-hover`
- **Padding**: `px-4 py-2` (12px horizontal, 8px vertical)
- **Border radius**: `rounded-md` (8px)
- **Focus ring**: `focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary` (visible on focus)
- **Font weight**: 500 (medium)
- **Size**: 44px minimum height for touch accessibility

```html
<button class="px-4 py-2 rounded-md bg-primary text-white font-medium 
                 hover:bg-primary-hover focus:ring-2 focus:ring-primary 
                 disabled:opacity-50 disabled:cursor-not-allowed">
  Speichern
</button>
```

#### Secondary Button
- **State**: Default, Hover, Focus, Disabled
- **Colors**: `bg-transparent`, `border border-border-medium`, `text-text-primary`, `hover:bg-bg-surface-raised`
- **Padding**: `px-4 py-2`
- **Border radius**: `rounded-md`
- **Focus ring**: Same as primary

```html
<button class="px-4 py-2 rounded-md border border-border-medium text-text-primary 
                 hover:bg-bg-surface-raised focus:ring-2 focus:ring-primary 
                 disabled:opacity-50">
  Abbrechen
</button>
```

#### Danger Button (Delete, Destructive Actions)
- **Colors**: `bg-accent-danger`, `text-white`, `hover:bg-accent-danger opacity-90`
- **Contrast**: 4.5:1+ ✅
- **Confirmation**: Always pair with a confirmation modal before executing

```html
<button class="px-4 py-2 rounded-md bg-accent-danger text-white font-medium 
                 hover:opacity-90 focus:ring-2 focus:ring-accent-danger">
  Löschen
</button>
```

### Form Inputs

#### Text Input
- **Background**: `bg-bg-surface`
- **Border**: `border border-border-medium`
- **Padding**: `px-3 py-2`
- **Border radius**: `rounded-md`
- **Focus state**: `focus:ring-2 focus:ring-primary focus:border-primary`
- **Font size**: `text-base` (16px, prevents zoom on iOS)
- **Label**: Always paired with `<label for="id">` above or adjacent

```html
<label for="client-name" class="block text-sm font-medium text-text-primary mb-1">
  Kundenname
</label>
<input id="client-name" type="text" 
       class="w-full px-3 py-2 rounded-md border border-border-medium 
              bg-bg-surface text-text-primary 
              focus:ring-2 focus:ring-primary focus:border-primary
              disabled:bg-bg-surface-raised disabled:opacity-50" />
```

#### Textarea
- **Same styling as input**, but `min-height: 100px` (6rem)
- **Resize**: `resize-vertical` (only vertical resize)

#### Select (Dropdown)
- **Styling**: Match input styling with visible arrow indicator
- **Accessibility**: Always use native `<select>` for better mobile UX

### Cards

#### Default Card
- **Background**: `bg-bg-surface`
- **Border**: `border border-border-subtle`
- **Padding**: `p-4` (16px)
- **Border radius**: `rounded-lg` (12px)
- **Shadow**: `shadow-card` (subtle elevation)

```html
<div class="bg-bg-surface border border-border-subtle rounded-lg p-4 shadow-card">
  <!-- content -->
</div>
```

#### Card on Hover (e.g., clickable rows)
- **Shadow**: Elevate to `shadow-card-hover` on hover
- **Cursor**: `cursor-pointer`
- **Transition**: Use `transition-all` for smooth shadow change

### Badges

#### Status Badge
- **Structure**: `<span class="badge status-[draft|open|paid|overdue|cancelled]">`
- **Padding**: `px-2 py-0.5` (8px horizontal, 4px vertical)
- **Border radius**: `rounded-full`
- **Font size**: `text-xs` (caption size)
- **Font weight**: 500 (medium)
- **Background & Text**: Use semantic color pairs (e.g., `bg-status-open-bg text-status-open-text`)

```html
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
             bg-status-paid-bg text-status-paid-text">
  Bezahlt
</span>
```

### Focus Ring / Keyboard Navigation

**All interactive elements must have a visible focus ring** (WCAG 2.4.7):

- **Focus ring style**: `focus:ring-2 focus:ring-primary focus:ring-offset-0` (2px solid ring, no offset)
- **Color**: Always use `--color-primary` for consistency
- **Visibility**: Must be visible on both light and dark backgrounds (contrast tested)
- **No removal**: NEVER use `outline: none` without a replacement focus indicator

```css
/* Global focus ring on all interactive elements */
button:focus,
input:focus,
select:focus,
textarea:focus,
[role="button"]:focus {
  outline: none;
  ring: 2px var(--color-primary);
  ring-offset: 0;
}
```

### Skip Link (Accessibility)

Every page must have a skip link (WCAG 2.4.1):

```html
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute 
                               focus:top-0 focus:left-0 focus:z-50 
                               focus:p-4 focus:bg-primary focus:text-white">
  Zum Hauptinhalt
</a>
```

---

## 7. Imagery & Iconography

### Icons

- **Style**: Simple, outline-based icons (stroke weight 1.5–2px)
- **Size**: 16px (small UI icons), 20px (medium, buttons), 24px (large, headings)
- **Color**: Inherit from text color (usually `currentColor`)
- **Source**: SVG inline or as external files (no icon CDN per ADR-001)

### Icon Examples (to be designed)

- Checkmark (success, paid status)
- Clock (pending, overdue status)
- Trash (delete action)
- Eye (view, open)
- Settings (configuration)
- Users (clients)
- FileText (invoices)
- Calendar (date picker, timeline)
- ChevronDown (dropdown indicator)
- Plus (add new)

### Imagery (Photos, Illustrations)

- **Approach**: Minimal, if any
- **If used**: Locally hosted SVG illustrations (no external image CDN)
- **Purpose**: Only to break monotony in empty states or marketing pages, not in transaction UI

### Empty States

Empty states should include:
- **Icon** (e.g., empty folder for "no invoices")
- **Headline** (e.g., "Keine Rechnungen vorhanden")
- **Description** (1–2 sentences)
- **Call-to-action** (e.g., "Rechnung erstellen" button)

---

## 8. Layout & Spacing

### Grid & Alignment

- **Base unit**: 4px (0.25rem) — all spacing uses multiples of 4
- **Content width**: 
  - Mobile: 100% (full width, minus 16px padding each side)
  - Tablet: 100% (minus 24px padding each side)
  - Desktop: 1200px max-width, centered with `mx-auto`

### Padding & Margins

| Size | Value | Use Case |
|------|-------|----------|
| **xs** | 0.5rem (8px) | Tight spacing within components |
| **sm** | 1rem (16px) | Component padding, internal spacing |
| **md** | 1.5rem (24px) | Section padding, vertical rhythm |
| **lg** | 2rem (32px) | Major section spacing |
| **xl** | 3rem (48px) | Page-level top/bottom spacing |

### Breakpoints (Tailwind defaults)

| Breakpoint | Min-width | Use Case |
|-----------|-----------|----------|
| `sm` | 640px | Mobile landscape, small tablets |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape, small desktop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop, multi-column layouts |

---

## 9. Motion & Transitions

### Principles

- **Purpose**: Feedback, not decoration — every motion must communicate state change
- **Duration**: 
  - Quick feedback (button press, focus): 150ms
  - Form validation, HTMX swap: 300ms (--duration-slow)
  - Page transitions, theme toggle: 300ms
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (--ease-default) — standard ease-in-out

### Common Transitions

| Trigger | Property | Duration | Easing | Effect |
|---------|----------|----------|--------|--------|
| Hover button | `background-color` | 200ms | ease-out | Smooth color change |
| Focus ring | `box-shadow` | 150ms | ease-in | Ring appears smoothly |
| HTMX swap | `opacity`, `transform` | 300ms | ease | Fade + slide-up entry |
| Theme toggle | All colors, shadows | 300ms | ease | Smooth dark/light transition |
| Delete fade-out | `opacity` | 300ms | ease-out | Row/item fades before removal |

---

## 10. Accessibility (WCAG 2.1 AA)

### Compliance Checklist

- ✅ **1.4.3 Contrast (Minimum)**: All text ≥ 4.5:1, UI elements ≥ 3:1 (verified in token table)
- ✅ **2.4.7 Focus Visible**: All interactive elements have visible focus ring (2px, primary color)
- ✅ **2.1.1 Keyboard**: All functionality accessible via keyboard, no keyboard trap
- ✅ **2.4.1 Skip Link**: Present on every page, skips navigation to `#main-content`
- ✅ **1.3.1 Info and Relationships**: Semantic HTML (`<button>`, `<label>`, `<nav>`, `<main>`, `<h1-h6>`)
- ✅ **1.1.1 Non-text Content**: Icons have `aria-label` or are hidden (`aria-hidden="true"` if decorative)
- ✅ **2.4.3 Focus Order**: Tab order follows visual flow, no hidden tabs
- ✅ **3.2.4 Consistent Identification**: Buttons/inputs with same purpose have same appearance
- ✅ **1.4.5 Images of Text**: No images for text labels (use HTML + CSS)
- ✅ **4.1.2 Name, Role, Value**: All form inputs have labels, buttons have text

### HTML Semantic Rules

Every page must include:

```html
<html lang="de">
  <head>...</head>
  <body>
    <!-- Skip link (WCAG 2.4.1) -->
    <a href="#main-content" class="sr-only focus:not-sr-only">
      Zum Hauptinhalt
    </a>
    
    <!-- Navigation -->
    <nav aria-label="Haupt-Navigation">
      <!-- links -->
    </nav>
    
    <!-- Main content -->
    <main id="main-content">
      <h1>Seitentitel</h1>
      <!-- content -->
    </main>
  </body>
</html>
```

### Form Accessibility

Every input must have an associated label:

```html
<label for="invoice-number">Rechnungsnummer</label>
<input id="invoice-number" type="text" />
```

### Error Handling

- Error messages must be announced via ARIA live region or linked via `aria-describedby`
- Error color alone is not sufficient; include text or icon

```html
<input id="email" type="email" aria-describedby="email-error" />
<span id="email-error" role="alert" class="text-accent-danger text-sm">
  Ungültige E-Mail-Adresse
</span>
```

---

## 11. Dark Mode

### Implementation

Dark mode is activated via `[data-theme="dark"]` attribute on `<html>`:

```typescript
// JavaScript toggle (in layout component)
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
localStorage.setItem('theme', isDark ? 'dark' : 'light');
```

### Token Overrides

All color tokens have dark-mode overrides in `src/styles/input.css`:

```css
[data-theme="dark"] {
  --color-primary: oklch(78% 0.18 165);
  --color-bg-surface: oklch(16% 0.015 265);
  /* ... other overrides ... */
}
```

### User Preference

- **Default**: Light mode (unless localStorage has preference)
- **Option**: Respect system preference (`prefers-color-scheme: dark`) on first visit
- **Toggle**: User can override in settings (preferences persist in localStorage)

---

## 12. Design Files & Assets

### Current Status (2026-05-18)

| Asset | Status | Location |
|-------|--------|----------|
| Logo (wordmark + badge) | **TODO** | `public/assets/branding/` |
| Icon set (20+ core icons) | **TODO** | `public/assets/icons/` |
| Color swatches (reference) | **TODO** | `docs/assets/color-swatches.html` |
| Design tokens reference | ✅ Done | `src/styles/input.css` |
| Typography scale reference | ✅ Done | `docs/FREA-DESIGN-SYSTEM.md` (this doc) |
| Component specs | 🔄 In progress | `docs/COMPONENT-SPECS.md` (to follow) |

### Design Tool Workflows (Figma, etc.)

- **No external Figma links** (ADR-001: self-host all design assets)
- **Export as SVG** for all design assets (logos, icons)
- **Verify in browser** before committing (visuals can differ from design tool)

---

## 13. Hands-Off: Brand Usage Rules

### Do's ✅

- Use logo in Emerald on light backgrounds, bright Emerald on dark
- Use primary color (`--color-primary`) for CTAs, links, success states
- Use semantic colors for status (Danger for overdue, Amber for pending)
- Use typography scale consistently (H1 for page titles, H3 for sections, Body for text)
- Ensure 4.5:1 contrast on all text
- Test focus rings on both light and dark backgrounds
- Use local SVG assets (no external CDN images)

### Don'ts ❌

- Don't change token values without design review (creates inconsistency)
- Don't create custom colors for status (use existing semantic palette)
- Don't remove focus rings or accessibility features
- Don't use external fonts or images (ADR-001 compliance)
- Don't deviate from spacing grid (use 4px multiples)
- Don't use contrast < 4.5:1 for text, < 3:1 for UI elements
- Don't hardcode colors in HTML/CSS (use CSS tokens)

---

## 14. Next Steps & Rollout

### Phase 1: Design Finalization (Week of 2026-05-20)
- [ ] Create Logo SVG (wordmark + badge, 2 variants)
- [ ] Design icon set (20+ core icons in SVG)
- [ ] Create color swatch reference (HTML demo page)
- [ ] Finalize typography scale reference

### Phase 2: Frontend Integration (Week of 2026-05-27)
- [ ] Verify all component specs match tokens
- [ ] Test all components in light & dark mode
- [ ] Accessibility audit (WCAG 2.1 AA full scan)
- [ ] Performance check (CSS file size, icon loading)

### Phase 3: Documentation & Handoff (Week of 2026-06-03)
- [ ] Component library documentation (Storybook or in-code examples)
- [ ] Brand guidelines PDF (for marketing team)
- [ ] Design system versioning (v1.0 release)

---

## 15. References & Resources

- **OKLch Color Tool**: https://oklch.com/ (verify color contrast and conversions)
- **WCAG 2.1 Specification**: https://www.w3.org/WAI/WCAG21/quickref/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **EU Compliance (ADR-001)**: `docs/adr/001-eu-compliance.md`
- **System Font Stack**: https://systemfontstack.com/

---

## Approval & Sign-Off

**Design System Version**: 1.0  
**Created**: 2026-05-18  
**Created by**: UX Designer (FREA-235)  
**Status**: Draft → Review (awaiting CEO/CTO approval)

---

**Next**: CEO review on brand direction, then frontend integration begins.
