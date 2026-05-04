# FREA-178: UI Redesign-Spec — Review Summary

**Status:** ✅ Ready for CTO Review  
**Date:** 2026-05-04  
**Deliverable:** `docs/adr/078-ui-redesign-spec.md`

---

## 📋 What's Included

The complete UI Redesign-Spec contains:

### 1. Component Inventory (Section 1)
- **Button:** Primary, Secondary, Danger, Ghost, Icon, Link
- **Card:** Base + Accent Variant (with colored top border)
- **Table:** Full structure, variants, accessibility specs
- **Badge:** All status types with token mapping (Draft, Sent, Paid, Overdue, Cancelled)
- **Form-Field:** Inputs, textareas, selects, dates, numbers + error/disabled states
- **EmptyState:** Standard structure for zero-data scenarios
- **Navigation:** Desktop (inline) + Mobile (drawer) layouts

### 2. Typography System (Section 2)
- **Type Scale:** H1–H3, Body, Small, Caption, Code
- **Font Stack:** Self-hosted (no CDN) with system fallbacks
- **Token Application:** Code examples for each role (headings, labels, helpers)

### 3. Spacing Scale (Section 3)
- **Gaps:** 1, 1.5, 2, 4, 6, 8 (rem)
- **Padding:** 2, 3, 4, 6, 8 (rem)
- **Margins:** 1, 2, 4, 6, 8, 12 (rem)
- **Rules:** Form groups (`mb-4`), sections (`mb-6`/`mb-8`), buttons (`gap-2`/`gap-4`)

### 4. Token Application Rules (Section 4)
- **Color Tokens:** Mandatory usage table (with "Never Use" column)
  - `var(--color-primary)` instead of `bg-blue-600`
  - `var(--color-text-primary)` instead of `text-gray-900`
  - `var(--color-accent-danger)` instead of `text-red-600`
  - Status badges via semantic tokens
- **Shadow Tokens:** `var(--shadow-card)` and `var(--shadow-card-hover)`
- **Contrast:** WCAG AA compliance (4.5:1 text, 3:1 UI elements)

### 5. Screen Mockups (Section 5)
- **Dashboard:** KPI cards (2×2), project progress bars, recent invoices table
- **Rechnungsliste (Invoice List):** Full-width table with status badges, pagination, action buttons
- **Rechnungsdetail (Invoice Detail):** Card layout with accent top-border, action buttons, line items table, summary section

---

## ✅ Acceptance Criteria Status

| Criterion | Status | Notes |
|-----------|--------|-------|
| Komponenten-Inventar mit Varianten | ✅ | Button, Card, Table, Badge, Form, EmptyState, Nav |
| Typografie + Spacing-System | ✅ | Type scale, spacing tokens, application rules |
| Token-Anwendungsregeln | ✅ | Color, shadow, spacing rules + contrast verification |
| 3+ Screen-Mockups | ✅ | Dashboard, Rechnungsliste, Rechnungsdetail (ASCII) |
| Keine externen Ressourcen | ✅ | Self-hosted fonts, Lucide icons only |
| CTO reviewed & approved | ⏳ | **BLOCKING** — Awaiting feedback |

---

## 🎯 Next Steps

### Phase 1: CTO Review (Current)
1. **Read** `docs/adr/078-ui-redesign-spec.md`
2. **Feedback** — Any changes to colors, spacing, or component structure?
3. **Approval** — Sign off on spec before implementation kickoff

### Phase 2: Component Extraction (After Approval)
1. Create `button.ts` component with all variants
2. Create `table.ts` component with semantic structure
3. Create `form-field.ts` component with label, input, error state
4. Refactor existing `empty-state.ts` to match spec

### Phase 3: Token Cleanup (After Approval)
1. Replace `bg-blue-600 → bg-primary` hardcodes across all templates
2. Replace `text-red-600 → text-accent-danger`
3. Replace badge hardcodes (`bg-gray-100 text-gray-700`) → semantic tokens
4. Verify all contrast ratios (WCAG AA)

### Phase 4: New Features (After Phase 3)
1. Form validation UI (error messages, validation states)
2. Loading spinners + HTMX indicator styling
3. Dialog/modal component (for destructive actions)
4. Pagination component (for long lists)

### Phase 5: Refinements (Polish)
1. Micro-animations (button hover, transitions)
2. Enhanced accessibility (keyboard navigation, ARIA labels)
3. Mobile responsive polish
4. Dark mode visual QA

---

## 📁 Related Files

- **Spec Document:** `docs/adr/078-ui-redesign-spec.md` (complete specification)
- **CTO Audit:** `docs/adr/076-cto-audit.md` (audit findings that inform this spec)
- **Design Tokens:** `src/styles/input.css` (current token definitions)
- **Reference Implementation:** `/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/freelancer_tool/` (for comparison)

---

## 🔄 How to Proceed

1. **Read the spec** (`docs/adr/078-ui-redesign-spec.md`)
2. **Provide feedback** — Create a comment or PR on FREA-178
3. **Approve** — Signal readiness for Phase 1/2 implementation
4. **Kick off** — Assign Phase 1 tasks (component extraction)

---

**Status:** This spec is complete and ready for CTO review. No further design work needed until feedback is received.

**Blocker:** CTO approval required before implementation kickoff.

---

Generated: 2026-05-04  
UX Designer: Paul  
Issue: FREA-178
