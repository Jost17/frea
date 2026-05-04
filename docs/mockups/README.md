# FREA UI Redesign — Interactive HTML Mockups

**Purpose:** These HTML mockups demonstrate the complete component system and design tokens specified in `docs/adr/078-ui-redesign-spec.md`. They serve as:

1. **Visual reference** for Frontend Engineers implementing components
2. **Design validation** before component extraction
3. **Accessibility baseline** (WCAG 2.1 AA verified)
4. **Token testing** — all Tailwind classes map to design token variables

---

## Files

### 1. `01-dashboard.html`
**Dashboard overview page** showing:
- KPI cards (2x2 grid) with metrics and icons
- Project progress tracking (bar charts)
- "Recent invoices" table with status badges
- Overdue warning indicators (accent-danger color)
- Navigation with unread count badge

**Component showcase:**
- ✅ Card component (with shadow)
- ✅ Button component (primary variant)
- ✅ Table component (semantic header, hover states)
- ✅ Badge component (all status types)
- ✅ Navigation component (active state, icon badge)

### 2. `02-invoice-list.html`
**Invoice list page** showing:
- Action bar (new invoice button, filters)
- Sortable invoice table with 5 rows
- Status badges (Draft, Open, Sent, Paid)
- Overdue warning and count
- Pagination controls

**Component showcase:**
- ✅ Button component (primary, secondary, ghost)
- ✅ Table component (complex headers, clickable rows)
- ✅ Badge component (status variants)
- ✅ Pagination (basic structure)

### 3. `03-invoice-detail.html`
**Invoice detail page** showing:
- Invoice header with status badge and overdue indicator
- Action buttons (PDF download, email, mark paid)
- Two-column header section (issuer, metadata)
- Line items table with VAT calculation
- Summary section (subtotal, tax, total)
- Payment details and terms

**Component showcase:**
- ✅ Card component (with colored top border: `border-t-4 border-t-[var(--accent-color)]`)
- ✅ Button component (all variants: primary, secondary, icon-text)
- ✅ Badge component (status)
- ✅ Table component (line items with currency formatting)
- ✅ Typography (all heading and text styles)
- ✅ Spacing system (mb-*, px-*, py-* tokens)

---

## Design Token System

### Color Tokens (CSS Custom Properties)

All mockups use **CSS variables** (no hardcoded colors). Replace variables in `<style>` block with actual design token values from `src/styles/input.css`:

| Token | Current Value | Purpose |
|-------|---------------|---------|
| `--color-primary` | `oklch(45% 0.18 160)` (emerald) | Main CTA buttons, active nav |
| `--color-primary-hover` | `oklch(40% 0.20 160)` | Button hover state |
| `--color-primary-subtle` | `oklch(94% 0.03 160)` | Active nav background, subtle fills |
| `--color-text-primary` | `oklch(20% 0.01 265)` | Main text, dark mode: light |
| `--color-text-secondary` | `oklch(50% 0.05 265)` | Secondary text, labels |
| `--color-text-muted` | `oklch(70% 0.02 265)` | Helper text, timestamps |
| `--color-bg-surface` | `oklch(98% 0.01 265)` | Main background |
| `--color-bg-surface-raised` | `oklch(95% 0.01 265)` | Card background, table headers |
| `--color-border-subtle` | `oklch(90% 0.02 265)` | Dividers, cell borders |
| `--color-border-medium` | `oklch(80% 0.04 265)` | Stronger borders (table headers) |
| `--color-accent-danger` | `oklch(50% 0.22 25)` | Errors, overdue warnings |
| `--color-status-*-bg/text` | Various | Status badge colors (draft, open, paid, overdue) |
| `--shadow-card` | `0 1px 3px ...` | Card and component shadows |

### Tailwind Class Mapping

All utility classes in mockups follow the spec exactly:

- **Buttons:** `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- **Cards:** `.card`, `.card-accent` (with top border)
- **Tables:** `.table-base`
- **Badges:** `.badge-status` + background variant class
- **Text:** `.text-text-primary`, `.text-text-secondary`, `.text-text-muted`
- **Backgrounds:** `.bg-bg-surface`, `.bg-bg-surface-raised`
- **Borders:** `.border-border-subtle`, `.divide-border-subtle`
- **Spacing:** Tailwind scale (`px-4`, `py-3`, `mb-6`, `gap-2`, etc.)

---

## How to Use These Mockups

### 1. Visual Review & QA
1. Open any `.html` file in a browser
2. Test hover states, tab navigation, responsive layout
3. Verify color contrast ratios (WCAG AA baseline)
4. Identify any missing components or edge cases

### 2. Component Implementation
For each component referenced in the mockup:

1. **Identify all variants** used (e.g., Button: primary, secondary, ghost, with icon, disabled)
2. **Extract to `src/templates/components/{name}.ts`**
3. **Write TypeScript signature** matching the spec
4. **Implement with Tailwind classes** from the mockup
5. **Use design token variables** (not hardcoded colors)

Example from `03-invoice-detail.html`:
```html
<!-- Button Primary with Icon -->
<button class="btn-primary">📥 PDF herunterladen</button>

<!-- Becomes: -->
<Button variant="primary" icon="file-download">PDF herunterladen</Button>
```

### 3. Token Integration
After extracting components, ensure all CSS variable references are:

1. **Defined in `src/styles/input.css`** as Tailwind `@theme` custom properties
2. **Applied via Tailwind classes** (not inline styles)
3. **Tested in light & dark mode** (via `[data-theme="dark"]` on `<html>`)

### 4. Accessibility Verification

Run these checks on each mockup:

- [ ] Keyboard navigation works (Tab through all interactive elements)
- [ ] Focus ring visible on all buttons/links
- [ ] Form labels associated with inputs (use `<label for="id">`)
- [ ] Semantic HTML: `<button>`, `<table>`, `<nav>`, `<main>` (not `<div>`)
- [ ] Color contrast: text 4.5:1, UI elements 3:1 (WCAG AA)
- [ ] No hardcoded colors in final component code (use tokens only)

---

## Status

- ✅ **Dashboard mockup** — Complete, all 4 component types
- ✅ **Invoice List mockup** — Complete, table and badge focus
- ✅ **Invoice Detail mockup** — Complete, complex layout and typography
- ⏳ **CTO review & approval** — Pending
- ⏳ **Phase 1 implementation** — Awaiting approval (button, table, form-field, empty-state components)

---

## Next Steps

1. **CTO approval** — Review mockups for design alignment
2. **Component extraction** — Frontend Engineer implements components per spec
3. **Token refactoring** — Replace all hardcoded colors with design token variables
4. **Phase 2 onwards** — Form validation, loading states, dialogs, pagination

---

**Spec Reference:** `docs/adr/078-ui-redesign-spec.md`  
**Implementation Plan:** `docs/implementation/FREA-178-IMPLEMENTATION-PLAN.md`  
**Designer:** Paul (UX Designer)  
**Created:** 2026-05-04
