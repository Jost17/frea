# FREA-180: UI Redesign-Spec — Status Update

**Issue:** FREA-180 — UI Redesign-Spec: Komponenten-Inventar + 3-5 Screen-Mockups  
**Status:** Ready for CTO Review ✅  
**Branch:** `feat/FREA-180-mockup-htmls`  
**Commit:** e2f5d97  
**Date:** 2026-05-04

---

## Deliverables Completed

### ✅ Spec Document (FREA-178)
**File:** `docs/adr/078-ui-redesign-spec.md` (completed FREA-178)

- ✅ Komponenten-Inventar mit Varianten:
  - Button (primary, secondary, danger, ghost, icon, link, loading)
  - Card (base, header accent)
  - Table (semantic structure, hover, empty state)
  - Badge (all status types: draft, open, paid, overdue)
  - FormField (text, textarea, select, date, number, checkbox, radio)
  - EmptyState (icon, message, action)
  - Navigation (desktop, mobile, active state, badge)

- ✅ Typografie-System:
  - Font stack (system-ui, no CDN)
  - Type scale (H1-H3, Body, Small, Caption, Code)
  - Weight and line-height rules
  - Application examples per role

- ✅ Spacing-Skala:
  - Gap tokens (1–8)
  - Padding tokens (2–8)
  - Margin tokens (1–12)
  - Application patterns for forms, cards, sections

- ✅ Token-Anwendungsregeln:
  - Color tokens (mandatory usage table)
  - Deprecated Tailwind classes (cleanup list)
  - Shadow token application
  - Spacing token rules
  - Contrast ratios (WCAG AA verified)

### ✅ Interactive HTML Mockups (NEW — Phase 1 of FREA-180)
**Files:** `docs/mockups/*.html`

#### 1. Dashboard Mockup (`01-dashboard.html`)
- Full-page layout with header, nav, main content
- 4 KPI cards (2×2 grid) with metrics and icons
- Project progress section with bar charts
- "Recent Invoices" table (5 rows, status badges, hover states)
- Overdue warning indicators (accent-danger color)
- Navigation with unread badge

**Components demonstrated:**
- Card (4 variants: KPI, project, invoices)
- Button (primary variant for "Create", nav links)
- Table (with thead, tbody, hover effects, pagination)
- Badge (all status types: Open, Paid, Draft)
- Navigation (active state, icon badge)
- Typography (all heading levels, text sizes)

#### 2. Invoice List Mockup (`02-invoice-list.html`)
- Page header with breadcrumb nav
- Action bar (new button, filters)
- Full invoice table (5 rows with all status types)
- Overdue warning per row
- Pagination controls

**Components demonstrated:**
- Button (primary, secondary, disabled pagination)
- Table (complex headers, right-aligned amounts, row hover, clickable cells)
- Badge (Draft, Open, Sent, Paid status variants)

#### 3. Invoice Detail Mockup (`03-invoice-detail.html`)
- Header with invoice number, status badge, overdue warning
- Action buttons (PDF, email, mark paid) with icons
- Two-column header (issuer, invoice metadata)
- Line items table with currency formatting
- Summary section (subtotal, tax, total)
- Payment details and terms

**Components demonstrated:**
- Card (with accent top border: `border-t-4`)
- Button (all variants: primary, secondary, icon+text)
- Badge (status)
- Table (line items with VAT calculation)
- Typography (all roles: headers, body, secondary)
- Spacing system (consistent padding, margins, gaps)

### ✅ Design Token CSS System
All mockups use **CSS custom properties** (no hardcoded colors):

```css
--color-primary: oklch(45% 0.18 160)           /* FREA Emerald */
--color-text-primary: oklch(20% 0.01 265)      /* Dark mode compatible */
--color-bg-surface: oklch(98% 0.01 265)        /* Main background */
--color-status-open-bg: oklch(94% 0.06 165)    /* Status badges */
/* ... 15+ tokens total */
```

**Validation:**
- ✅ No hardcoded hex colors
- ✅ All Tailwind classes map to token variables
- ✅ Contrast ratios WCAG AA compliant (tested)
- ✅ Ready for light/dark mode toggle

### ✅ Documentation
**File:** `docs/mockups/README.md`

- Purpose of mockups (visual reference, design validation, accessibility)
- File-by-file breakdown with component showcase
- Design token system explanation
- Color token mapping table
- Tailwind class mapping
- Implementation guidance for Frontend Engineer
- Accessibility verification checklist

---

## Acceptance Criteria Status

**From FREA-180 Issue Description:**

- [x] Komponenten-Inventar mit allen Varianten → **COMPLETE (spec + mockups)**
- [x] Typografie + Spacing dokumentiert → **COMPLETE (spec)**
- [x] Token-Anwendungsregeln → **COMPLETE (spec)**
- [x] Mind. 3 Screen-Mockups → **COMPLETE (Dashboard, Invoice List, Invoice Detail)**
- [ ] CTO reviewed und approved → **PENDING**

---

## Implementation Readiness

The 3 HTML mockups serve as the **living design specification** for Phase 1 (Component Extraction):

### For Frontend Engineer (CTO review pending):
1. **Button Component** — All 6 variants shown in invoice detail (primary, secondary, with icons, etc.)
2. **Table Component** — Two implementations: dashboard (simple), invoice detail (complex with VAT)
3. **Badge Component** — All 4 status types visible in list and detail views
4. **Card Component** — Multiple variants: KPI, invoice detail with accent border
5. **Navigation** — Active state and icon badge shown in all mockups

### Design Token Validation:
- ✅ All token variables defined and used consistently
- ✅ No Tailwind hardcodes (gray-200, blue-600, etc.)
- ✅ Status badge colors semantic (draft=gray, open=emerald, paid=green, overdue=red)
- ✅ Spacing follows 4px baseline (4, 8, 12, 16, 24, 32px)
- ✅ Typography hierarchy clear (H1 2xl, H2 xl, Body 1rem)

---

## Next Phase: Implementation (Awaiting CTO Approval)

Once approved, Frontend Engineer executes Phase 1:

1. Create `src/templates/components/button.ts` (6 variants)
2. Create `src/templates/components/table.ts` (semantic, accessible)
3. Create `src/templates/components/form-field.ts` (label, input, error)
4. Refactor `src/templates/components/empty-state.ts` to spec
5. Token cleanup: Replace all hardcoded colors (bg-blue-600 → bg-primary, etc.)
6. Run tests & verify contrast ratios

**Estimated duration:** Phase 1 = ~1 week

---

## Files Modified

```
docs/mockups/
  ├── 01-dashboard.html           [NEW] Dashboard mockup (288 lines)
  ├── 02-invoice-list.html        [NEW] Invoice list mockup (196 lines)
  ├── 03-invoice-detail.html      [NEW] Invoice detail mockup (433 lines)
  └── README.md                   [NEW] Implementation guide & token reference

docs/FREA-180-STATUS.md           [NEW] This status document
```

---

## Branch & PR

- **Branch:** `feat/FREA-180-mockup-htmls`
- **Commit:** e2f5d97
- **GitHub PR:** https://github.com/Jost17/frea/pull/new/feat/FREA-180-mockup-htmls

---

## Design Decisions & Rationale

### 1. Why HTML Mockups Instead of Figma?
- **Browser-testable:** Inspect contrast, keyboard nav, hover states live
- **Design-code parity:** HTML uses actual design tokens, not design tool abstractions
- **Developer-friendly:** Frontend Engineer can copy classes directly into components
- **Accessible:** Validates WCAG compliance at design phase, not post-implementation

### 2. Why CSS Variables for Tokens?
- Aligns with Tailwind's `@theme` custom properties feature
- Easy to toggle dark mode (via `[data-theme="dark"]`)
- Decoupled from Tailwind hardcodes (enables future token changes)
- EU compliance: Self-hosted, no CDN dependencies

### 3. Component Variants Shown
Each mockup demonstrates real usage patterns:
- **Dashboard:** Overview, at-a-glance metrics, links to detail pages
- **List:** Bulk view, filtering, status at-a-glance, pagination
- **Detail:** Comprehensive data, actions (PDF, email, mark paid), calculations

---

## CTO Review Checklist

For CTO approval, verify:

- [ ] Component inventory aligns with FREA's visual identity (FREA Emerald brand)
- [ ] Typography hierarchy is appropriate for German B2B audience (not too decorative)
- [ ] Status badge colors are distinct and meaningful (no color-alone accessibility issues)
- [ ] Spacing and padding feels professional and scannable
- [ ] Overdue warning (accent-danger) is prominent without being alarming
- [ ] Table layouts are compact but readable
- [ ] Card shadows and borders are subtle (Stripe/Linear aesthetic reference)
- [ ] WCAG contrast ratios confirmed (4.5:1 text, 3:1 UI)
- [ ] No external CDN dependencies (fonts, icons)
- [ ] Dark mode theming approach is sound (CSS variables)

---

## Questions for CTO

1. **Button styling:** Primary buttons are emerald (`oklch(45% 0.18 160)`). Acceptable saturation/lightness?
2. **Overdue indicator:** Currently red accent (`.text-accent-danger`). Alternative colors acceptable?
3. **Table row hover:** Currently `bg-bg-surface-raised`. Is this sufficient visual feedback or should hover shadow be stronger?
4. **Card padding:** Invoice detail uses `p-8` (2rem). For dense dashboards, is `p-6` (1.5rem) preferred?
5. **Navigation active state:** Currently uses `bg-primary-subtle`. Should it be underline instead?

---

**Status:** Ready for review  
**Designer:** Paul (UX Designer)  
**Updated:** 2026-05-04 14:30 UTC
