# FREA-315: Child Implementation Issues

**Parent Issue:** FREA-315 — Competitive UX Eval + Redesign Direction  
**Design Doc:** [FREA-315-design-doc.md](./FREA-315-design-doc.md)  
**Assignee:** Frontend Engineer (51f6d705-13e9-4527-8563-8841ae7f8ec0)

---

## FREA-316: Status Pipeline on Invoice List

**Epic:** UX Redesign (move away from Excel-feeling)  
**Phase:** 1 (Foundation, low-risk)  
**Effort:** 2–3 hours  
**PR Size Limit:** <300 LOC

### Description

Add an active status workflow to the invoice list. Currently, status badges are read-only. This issue makes them *interactive* — users can change invoice status (draft → sent → paid) directly from the list view with one click.

### Acceptance Criteria

- [ ] Invoice list header shows summary count: "X Rechnungen warten auf Zahlung · Y überfällig"
- [ ] Each invoice row's status badge is clickable (pointer cursor, hover effect)
- [ ] Click status badge → opens inline action menu (HTMX popover)
- [ ] Action menu shows available transitions:
  - draft: "Versenden" (draft → sent)
  - sent: "Als bezahlt markieren" (sent → paid), "Zahlungserinnerung senden"
  - paid: — (no further transitions)
  - overdue: (same as "sent")
- [ ] Click action → HTMX POST `/invoices/{id}/status` → badge updates, list count refreshes
- [ ] Mobile (375px): status column still visible, badge still clickable
- [ ] No page reload required

### Design Guidance

- Status badge colors (existing):
  - draft: neutral gray
  - sent: warning yellow (if due date is in future) or danger red (if overdue)
  - paid: success green
- Popover menu: simple list of actions, each as a button, dismiss on click-outside (HTMX `hx-trigger="focusout"`)
- Header count: "X Rechnungen warten auf Zahlung" = count of (sent + draft with past due_date). Update dynamically on status change.

### Files to Modify

- `src/templates/invoice-list.ts` — add header count, make badge clickable
- `src/routes/invoices.ts` — add POST endpoint for status change (already exists, wire it)
- `src/styles/input.css` — add `.status-badge:hover { cursor: pointer; }` if not already present

### Test Plan

- [x] Load invoice list, verify status count displays correctly
- [x] Click a status badge, verify menu appears
- [x] Click "Versenden" action, verify invoice status changes to "sent" and badge color updates
- [x] Verify list count updates without page reload
- [x] Verify on mobile (375px): badge still clickable, menu appears at correct position

### Notes

- Reuse existing `statusBadge` component (src/templates/invoice-shared.ts)
- No database schema changes
- No new components required — use existing styling + HTMX `hx-on` for menu

---

## FREA-317: Restructure Invoice Creation — Sections

**Epic:** UX Redesign (move away from Excel-feeling)  
**Phase:** 2 (Creation flow restructure)  
**Effort:** 4–6 hours (may split into multiple PRs)  
**PR Size Limit:** <400 LOC per PR

### Description

Restructure the invoice creation flow from "all fields on one page" to "progressive section cards." This is the biggest structural change. Recommend splitting into 3 sequential PRs:

**(a) FREA-317a: Customer + Terms Sections**
**(b) FREA-317b: Line Items Restructure (table row → form input)**
**(c) FREA-317c: Review Section (summary cards)**

### Overview Structure (All 3 Sub-Tasks)

Invoice creation becomes 4-section flow:

1. **Customer Section** (required)
   - Dropdown: select from previous clients
   - Optional collapse: VAT ID, address (edit if needed)
   - Auto-advance to next section on selection

2. **Line Items Section** (required, ≥1 item)
   - Button: "+ Position hinzufügen"
   - Click → inline form appears
     - Service (dropdown of previous services, or free text)
     - Description (free text, optional)
     - Qty (number, default 1)
     - Rate (currency, auto-filled from service if selected)
     - VAT rate (dropdown: 0%, 7%, 19%, or custom)
   - List: compact rows (not spreadsheet table) with "×" delete button
   - Running total: "Netto: X · MwSt: Y · Brutto: Z" shown below list

3. **Terms Section** (optional, collapsed by default)
   - Invoice date (default: today)
   - Billing period (month/year, default: current)
   - Service period from/to (optional)
   - Reveal on click "Erweiterte Optionen"

4. **Review Section** (final)
   - Left: Live preview (Phase 3, skip for now)
   - Right: Summary + Actions
     - Totals: "Netto | MwSt | Brutto" (large, bold)
     - Validation checklist: "✓ Kunde" | "✓ Min. 1 Position" | "✓ Daten valid"
     - Buttons: "Als Entwurf speichern" (secondary) | "Versenden" (primary)

### Sub-Task (a): FREA-317a — Customer + Terms Sections

**Effort:** 1–2 hours  
**Files:**
- `src/templates/invoice-create-customer-section.ts` (new)
- `src/templates/invoice-create-terms-section.ts` (new)
- `src/templates/invoice-create-layout.ts` (new, replaces invoice-create-project.ts for multi-step UI)

**Acceptance:**
- [ ] Customer section renders with dropdown
- [ ] Terms section renders (collapsed by default)
- [ ] Both sections have `.section-card` styling (Tailwind)
- [ ] Form serializes to same JSON shape as current creation flow (backwards compatible)
- [ ] No calculation logic changed (backend still does totals)

**Notes:**
- Keep existing invoice-create-project.ts as fallback (don't delete)
- Wire to `/rechnungen/create` route conditionally (e.g., query param `?layout=sections` to test)

---

### Sub-Task (b): FREA-317b — Line Items Restructure

**Effort:** 2–3 hours  
**Files:**
- `src/templates/components/line-item-form.ts` (new, the "+ Position" form)
- `src/templates/components/line-item-list.ts` (new, compact row list, not table)
- `src/templates/invoice-create-line-items-section.ts` (new)

**Acceptance:**
- [ ] Line item form appears inline (not modal) when "+ Position" clicked
- [ ] Form has fields: Service | Description | Qty | Rate | VAT
- [ ] "Service" is a dropdown (pre-populated with projects from current user's projects table)
- [ ] Form validates: qty > 0, rate > 0, VAT valid
- [ ] "Add" button submits form, clears form, appends to list
- [ ] Delete button ("×") removes item, recalculates totals
- [ ] Running total updated in real-time (HTMX `hx-trigger="change"`)
- [ ] No spreadsheet table semantics (use `<div>` cards or semantic `<article>` per item)

**Notes:**
- Service dropdown sources from a "services" or "projects" table. Query for "services grouped by rate" or "project list sorted by recent use"
- Qty field: `type="number"` with min="0.01" step="0.01"
- Rate field: `type="number"` with formatting to currency on blur
- Delete button: confirm via `hx-confirm` modal to prevent accidental loss

---

### Sub-Task (c): FREA-317c — Review Section

**Effort:** 1–2 hours  
**Files:**
- `src/templates/invoice-create-review-section.ts` (new)

**Acceptance:**
- [ ] Review section shows grand totals (Netto | MwSt | Brutto) in large, bold typography
- [ ] Validation checklist displays (✓ or ✗ for each):
  - Customer selected
  - Min 1 line item
  - All required fields filled
- [ ] Buttons: "Als Entwurf speichern" | "Versenden"
- [ ] Form submission (Versenden) POSTs all section data as JSON to backend
- [ ] Backend receives data, creates invoice, redirects to detail page

**Notes:**
- No preview pane yet (Phase 3)
- Validation checklist is client-side (computed from form state) + server-side (returned as error if invalid)

---

## FREA-318: Live Invoice Preview in Creation

**Epic:** UX Redesign (move away from Excel-feeling)  
**Phase:** 3 (Polish, adds preview pane)  
**Effort:** 4–6 hours  
**PR Size Limit:** <400 LOC

### Description

Add a live invoice preview pane to the creation flow. As user fills in the form (Sections 1–3), the preview updates in real-time to show the final PDF rendering (DIN 5008 layout).

### Acceptance Criteria

- [ ] Review section layout: split-screen (form left, preview right) on desktop (≥1280px)
- [ ] Preview pane shows rendered invoice as it would appear in PDF (DIN 5008, watermarks, page breaks)
- [ ] Form changes trigger preview update (debounced 500ms to avoid spam)
- [ ] Preview is scroll-locked to top (user can scroll form without preview jumping)
- [ ] Mobile (375px): preview hides; becomes a collapsible "Preview" section below form
- [ ] Preview pane has zoom controls (optional): 75% | 100% | 125% buttons
- [ ] No layout shift when preview appears/updates

### Implementation Notes

**Option A (Simpler): Server-side render**
- On form change, HTMX POST current state to `/invoices/preview` endpoint
- Backend renders partial invoice HTML (same template as detail page, but without navigation chrome)
- HTMX swaps preview div
- Cost: one POST per form field change (debounced), fast (HTML render is cached)

**Option B (Complex): Client-side render**
- Use a JS library (e.g., `html2pdf` or `pdfkit`) to render from form data
- Sync happens in-browser, no POST needed
- Cost: larger JS bundle, potential UX lag on complex documents

**Recommend:** Option A (server-side) — simpler, leverages existing template, less JS.

### Test Plan

- [x] Fill customer section, verify preview updates with customer name
- [x] Add line item, verify preview shows item + calculated totals
- [x] Edit line item rate, verify preview totals recalculate
- [x] Verify split-screen on 1280px+, stacked on 375px
- [x] Verify preview doesn't shift when form is edited

### Files to Modify

- `src/templates/invoice-create-review-section.ts` — add preview pane layout
- `src/routes/invoices.ts` — add GET `/invoices/preview` endpoint (return HTML, not JSON)
- `src/styles/input.css` — add grid layout for split-screen (@media query)

### Blocker

Requires FREA-317 to be complete (needs section-based form structure)

---

## FREA-319: Service Catalog + Product Selector

**Epic:** UX Redesign (move away from Excel-feeling)  
**Phase:** 4 (Long-term, optional)  
**Effort:** 3–4 hours (backend + frontend)  
**PR Size Limit:** <400 LOC

### Description

Add a service catalog so users can pick from pre-defined services instead of typing rates. This transforms "line item entry" from ad-hoc to structured.

### Acceptance Criteria

- [ ] Create `services` table: id | name | description | rate | unit | vat_rate | user_id | created_at
- [ ] Invoice creation line-item form: Service dropdown (queries `services` table for current user)
- [ ] Selecting a service auto-fills: rate, unit, VAT rate
- [ ] Still allow free-text entry if service not found (fallback)
- [ ] Service management page (settings): list services, add/edit/delete
- [ ] Services persist per-user (different users see different catalogs)

### Design Guidance

- Service dropdown: use `<select>` or `<input list>` (HTML datalist for autocomplete)
- Service list in settings: simple table with columns: Name | Rate | Unit | VAT | Actions
- Add service button: opens inline form (reuse invoice line-item form structure)

### Test Plan

- [x] Create a service (Settings → Services → Add)
- [x] Create invoice, select service from dropdown, verify fields auto-fill
- [x] Edit service, verify it updates in future invoices
- [x] Delete service, verify line items with that service still display (orphan handling)

### Files to Modify

- `src/db/schema.sql` — add `services` table
- `src/routes/settings.ts` — add service management endpoints
- `src/templates/settings-services.ts` (new)
- `src/templates/invoice-create-line-items-section.ts` — wire dropdown to services table

### Blocker

Requires FREA-317 to be complete

### Notes

- Don't require a service to be selected (free-text rate entry should still work)
- Service catalog is user-scoped (not shared across users)
- Consider: recurring services (e.g., "Monthly retainer") vs. one-off time-based

---

## Scheduling & Sequencing

**Week 1 (Starting 2026-05-20)**
- FREA-316 (Status Pipeline) — low-risk, good first win
- Parallel: Design + Frontend pair on FREA-317a (Customer + Terms sections)

**Week 2 (Starting 2026-05-27)**
- FREA-317b (Line Items Restructure)
- FREA-317c (Review Section)

**Week 3 (Starting 2026-06-03)**
- FREA-318 (Live Preview)
- QA review of all Phase 1–3 work

**Week 4+ (Starting 2026-06-10)**
- FREA-319 (Service Catalog) — can run in parallel with bug fixes from QA

---

## Design Checklist for Frontend Engineer

Before submitting each PR:

- [ ] All German labels use real Umlauts (ä, ö, ü, ß) — no ae/oe/ue substitutes
- [ ] Responsive at 375px, 768px, 1280px, 1920px (test with `$B responsive` or browser devtools)
- [ ] Keyboard accessible: Tab through all inputs, Enter submits form, Escape closes modals
- [ ] Focus ring visible on all interactive elements (use Tailwind `focus:ring-2`)
- [ ] No hardcoded colors — use design tokens from `src/styles/input.css`
- [ ] WCAG 2.1 AA: color contrast ≥4.5:1 for text, labels associated with inputs
- [ ] HTMX: validate with `hx-validate` on inputs, show inline errors
- [ ] No JS frameworks — pure HTMX + Tailwind + semantic HTML
- [ ] Files <400 lines — extract components as needed
- [ ] Error handling: every catch block logs (see CLAUDE.md)
- [ ] Test locally with `/browse` before pushing (or manual browser test if browse unavailable)

---

## Appendix: Current Code References

**Invoice creation routes:** `src/routes/invoices.ts`  
**Current templates:** `src/templates/invoice-*.ts`  
**Components:** `src/templates/components/*.ts`  
**Design tokens:** `src/styles/input.css`  
**Schema:** `src/db/schema.sql`

---

**Design Doc Created:** 2026-05-19  
**Child Issues Prepared:** 2026-05-19  
**Next Step:** Frontend Engineer claims FREA-316, opens PR for status pipeline
