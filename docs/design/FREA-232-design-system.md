# FREA-232: Design System — Single Source of Truth

**Version:** 1.0  
**Date:** 2026-05-19  
**Status:** Active (Phases 1–5)

---

## Overview

This document defines the unified design system for FREA-232 modernization across all screens. All phases (1–5) reuse the same components, tokens, and patterns to guarantee visual and behavioral consistency.

---

## Core Components (Reusable)

### 1. Card Component (`src/templates/components/card.ts`)

**Usage:** Lists, Grids, Dashboard metrics

**Structure:**
```typescript
export interface CardProps {
  title: string              // Large, primary color (text-lg font-semibold)
  subtitle?: string          // Secondary (text-sm text-secondary)
  content?: HTMLContent      // Flexible middle area
  footer?: HTMLContent       // Actions, metadata (text-xs)
  onClick?: string           // href for navigation
}

export function Card({ title, subtitle, content, footer, onClick }: CardProps)
```

**Styling:**
- Border: `border border-border-subtle`
- Background: `bg-bg-surface`
- Padding: `p-6` (generous whitespace)
- Border-radius: `rounded-lg`
- Hover: `hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer`
- Transition: `transition-all duration-300`

**Examples:**
- InvoiceCard (Phase 1)
- ClientCard (Phase 2)
- ProjectCard (Phase 3)
- MetricCard (Phase 4)

---

### 2. Badge Component (`src/templates/components/badge.ts`)

**Usage:** Status indicators (consistent everywhere)

**Semantic Status Colors:**
- **Draft:** `bg-gray-100 text-gray-800` (neutral)
- **Open/Sent:** `bg-blue-50 text-blue-700` (info)
- **Paid:** `bg-green-50 text-green-700` (success)
- **Overdue:** `bg-red-50 text-red-700` (danger)

**Pattern:** Every screen uses the same `statusBadge()` function from `invoice-shared.ts`.

---

### 3. Grid Container (Responsive Layout)

**Usage:** All list screens (Rechnungen, Kunden, Projekte, etc.)

**CSS Classes:**
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;  /* --gap-card-grid */
}

/* Breakpoints */
@media (max-width: 640px) {
  /* 1 column */
}

@media (min-width: 641px) and (max-width: 1024px) {
  /* 2 columns */
}

@media (min-width: 1025px) {
  /* 3 columns */
}
```

**Usage:**
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  ${items.map(item => Card({ ... }))}
</div>
```

---

## Design Tokens (Enforced)

### Colors

All colors sourced from `src/styles/input.css` `@theme` section. **No hardcoding.**

| Token | CSS Variable | Usage |
|-------|---|---|
| Primary | `--color-primary` | Amounts, CTAs, important text |
| Secondary | `--color-text-secondary` | Subtitles, metadata |
| Muted | `--color-text-muted` | Dates, least important info |
| Danger | `--color-accent-danger` | Overdue, errors |
| Success | `--color-accent-success` | Paid, positive status |
| Info | `--color-accent-info` | Open, neutral status |
| Surface | `--color-bg-surface` | Card backgrounds |
| Border | `--color-border-subtle` | Card borders |

### Spacing

| Token | Value | Usage |
|-------|---|---|
| Card Padding | `p-6` | Inside all cards |
| Card Gap | `gap-4` | Between cards in grid |
| Section Margin | `mb-8` | Between major sections |
| Field Margin | `mb-3` | Between form fields |

### Shadows & Effects

| Token | CSS | Usage |
|---|---|---|
| Card Hover | `shadow-card-hover` | Hover state for cards |
| Translate on Hover | `hover:-translate-y-0.5` | Lift effect (modern) |
| Transition | `transition-all duration-300` | Smooth animation |

---

## Patterns (Applied Everywhere)

### 1. Card-Based Lists (Instead of Tables)

**Old Pattern:**
```html
<table>
  <thead><tr><th>Name</th><th>Email</th>...</tr></thead>
  <tbody><tr><td>...</td></tr></tbody>
</table>
```

**New Pattern:**
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  ${items.map(item => Card({
    title: item.name,
    subtitle: item.email,
    footer: <a href="/edit">Edit →</a>,
    onClick: `/detail/${item.id}`
  }))}
</div>
```

### 2. Status Badges (Consistent Semantics)

**Every screen:**
```typescript
import { statusBadge } from "../invoice-shared";

const badge = statusBadge("paid");  // Returns semantic HTML + colors
```

### 3. Hover & Focus (WCAG Compliant)

**Every clickable element:**
```html
<a href="/detail/${id}" 
   class="hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:rounded">
  Link Text
</a>
```

### 4. Whitespace & Hierarchy

**Every detail page:**
```html
<div class="space-y-8">
  <section>
    <h2 class="text-lg font-semibold mb-3">Section Title</h2>
    <!-- Content -->
  </section>
  
  <section>
    <h2 class="text-lg font-semibold mb-3">Next Section</h2>
    <!-- Content -->
  </section>
</div>
```

---

## Implementation Checklist (Per Phase)

Every phase follows this checklist:

- [ ] **Component Choice:** Use Card.ts or existing component, don't create new ones
- [ ] **Color Source:** All colors from `input.css` tokens, grep for `#` or `color:` and fix
- [ ] **Hover State:** `shadow-card-hover` + `translate-y` (not `scale`)
- [ ] **Status Badges:** Reuse `statusBadge()` from `invoice-shared.ts`
- [ ] **Responsive Grid:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for list screens
- [ ] **WCAG 2.1 AA:** Focus rings, semantic HTML, 4.5:1 contrast on text
- [ ] **Spacing:** Cards `p-6`, gaps `gap-4`, sections `mb-8`
- [ ] **No Hardcoding:** Zero hardcoded Tailwind classes like `gray-500` or `blue-600`
- [ ] **File Size:** <400 LOC per file, <800 LOC per module
- [ ] **Test:** Live dev server, hover state, focus state, mobile responsiveness

---

## Phase Rollout (1–5)

| Phase | Screen | Component | Status |
|-------|--------|-----------|--------|
| 1 | Rechnungen (List + Detail) | InvoiceCard + Section-Layout | ✅ Complete |
| 2 | Kunden-List | ClientCard + Grid | 📋 Ready |
| 3 | Projekte-Übersicht | ProjectCard + Grid | 📋 Ready |
| 4 | Dashboard | MetricCard + KPI-Layout | 📋 Ready |
| 5 | Zeit-Tracking + Polish | TimeCard (optional) + Detail-Polish | 📋 Ready |

---

## Consistency Audit

Before any phase ships, verify:

1. **Colors:** `grep -r "text-gray\|text-blue\|bg-gray\|bg-blue" src/templates/` → 0 results
2. **Hover:** All cards have `hover:shadow-card-hover hover:-translate-y-0.5`
3. **Focus:** All links have `focus:ring-2 focus:ring-primary`
4. **Grid:** List screens use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
5. **Spacing:** Cards have `p-6`, grids have `gap-4`, sections have `mb-8`
6. **Badges:** All status uses `statusBadge()` function

---

## Testing (Per Phase)

Before PR:

- [ ] Responsive: Test mobile (1 col), tablet (2 cols), desktop (3 cols)
- [ ] Hover: Cards lift with shadow
- [ ] Focus: Tab through and see focus rings
- [ ] Dark Mode: Check contrast in both themes
- [ ] Empty States: Render when no data
- [ ] Accessibility: Axe DevTools score A (no violations)

---

## References

- `docs/design/FREA-232-design-direction.md` — Direction & motivation
- `docs/design/FREA-232-vorher-nachher.md` — Visual mockups
- `src/templates/invoice-shared.ts` — Shared utilities (statusBadge, formatCurrency, etc.)
- `src/styles/input.css` — Token definitions (`@theme`)

---

**Last Updated:** 2026-05-19  
**Next Review:** After Phase 5 completion

All implementations must reference this document for consistency. No exceptions.
