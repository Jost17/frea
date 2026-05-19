# FREA-315: Competitive UX Evaluation + Redesign Direction

**Date:** 2026-05-19  
**Status:** Design Direction Ready  
**Version:** 1.0

---

## Executive Summary

FREA's invoice UI currently feels like "Excel with buttons." This document identifies 5 concrete UX patterns from competitors (sevDesk, Lexoffice, FastBill, Tiime, Qonto) that move away from that feeling, analyzes FREA's current gaps, and proposes a redesign direction with specific, buildable patterns.

**Key finding:** The gap is not visual polish (colors, spacing) — it's **structural**: FREA uses table rows for line items, all fields on one screen, no persistent preview, and no status-at-a-glance dashboard. Competitors solve this with (1) progressive section disclosure, (2) live document preview, (3) product/service catalog selection, and (4) status pipelines in the list view.

---

## Part 1: Competitive UX Patterns (Research)

### Pattern Summary Table

| Tool | Layout | Input Density | Anti-Excel Differentiator | Implementation Effort |
|------|--------|----------------|--------------------------|----------------------|
| **sevDesk** | Single-page form + PDF templates (separate tool) | High (15–20 zones) | Sequential numbering + PDF design separation | Low — no UI restructure |
| **Lexoffice** | Two-step with split-screen live preview | Moderate (10–14 primary fields) | **The persistent preview: you always see the real document** | High — split-pane architecture |
| **FastBill** | Single-screen + optional toggled preview; separate template editor | High (denser than Lexoffice) | Service catalog for line items; free-form layout designer | Medium — preview optional, not default |
| **Tiime** | Progressive, mobile-first (minimal fields per screen) | Low ("essentials only") | Quote→Invoice one-click; payment notification closes the loop | Medium — mobile-origin, cloud-native |
| **Qonto** | Four-section sequential cards within banking dashboard | Low per section (deep model, progressive disclosure) | **Client autocomplete from public B2B registry; IBAN embedded in invoice** | High — requires bank data integration |

### The 5 Concrete Patterns Moving Away from Excel

**1. Persistent Live Document Preview (Lexoffice, FastBill)**
- User sees rendered PDF/document *alongside* the form, not hidden in a modal
- Every keystroke updates the preview in real-time
- Preview shows DIN 5008 letter layout, watermarks, page breaks — not a form summary
- Mental model shift: "I'm writing a legal document" instead of "I'm filling a grid"
- **FREA Gap:** No preview at all. User fills form, submits, then views the PDF. No feedback loop.

**2. Progressive Section Disclosure (Qonto, Tiime)**
- Instead of "all fields on one page," structure as sequential cards: Customer → Line Items → Terms → Finalize
- Each section title is explicit (e.g., "Rechnungsempfänger", "Leistungen")
- Optional fields collapse by default, revealed on demand
- **FREA Gap:** All fields cramped into one or two pages. No visual section boundaries.

**3. Line Items as Product Catalog, Not Grid Rows (FastBill, Tiime, Qonto)**
- Users pick from a service/product catalog, not type into table rows
- Each line item shows: service name (structured), description (flexible), qty, unit, rate, VAT, discount
- This transforms "add a row" into "add a product" — the language itself signals structure
- **FREA Gap:** Inline table rows with text entry. No catalog. No differentiation between structured (rate) and free-text (description).

**4. Client Autocomplete from External Data (Qonto)**
- When user types client name, lookup auto-populates company details from public B2B registry
- Eliminates manual client data entry (address, VAT ID)
- For FREA MVP: start with autocomplete from *previously used clients*, which is still a win
- **FREA Gap:** Dropdown from stored clients only. No data enrichment.

**5. Status as a Pipeline in the List View (Tiime, Qonto)**
- Invoice list shows status column with badge colors: draft (neutral) → sent (yellow) → paid (green) / overdue (red)
- One-click state changes directly in the list (no edit flow required)
- Dashboard shows "3 unpaid, 1 overdue, 5 paid" at a glance
- **FREA Gap:** Status badges exist but they're post-creation artifacts, not an active workflow pipeline.

---

## Part 2: Gap Analysis — Current FREA UI

### Invoice Creation Flow (Current)

**Current structure (from code inspection):**
- Single page, all fields at once
- Customer dropdown → dates (invoice date, billing period, service period) → line item table with inline editing → submit
- No preview (aside from printed/PDF output)
- No sections/boundaries — just layout via spacing
- Action buttons at bottom: "Abbrechen" / "Rechnung erstellen"

**Excel-feeling sources:**
1. **Line item table format** — users type into rows like a spreadsheet (date, duration, description, amount)
2. **No preview** — "does it look right?" requires opening the PDF separately
3. **All fields at once** — no cognitive grouping; user must track 15+ input zones
4. **Form-centric language** — "Rechnungsdatum", "Abrechnungsjahr", "Abrechnungsmonat" are form fields, not document concepts
5. **No status pipeline** — once created, invoice is a static object; no list-view workflow

### Invoice List (Current)

**Current structure:**
- Table with columns: Number | Customer | Amount | Status | Invoice Date | Due Date
- Status badges (draft/sent/paid, color-coded) exist but are read-only
- No actions on the list; edit requires opening the detail page

**Gaps:**
- No one-click status changes
- No "unpaid/overdue" count in header
- No visual pipeline (customer sees 2 "sent" invoices overdue)

### Design System (Current)

**FREA already has:**
- Card-based layout patterns (invoice detail uses cards)
- Spacing/typography hierarchy
- Status badge system (color-coded)
- Tailwind v4 + design tokens in `src/styles/input.css`

**Missing:**
- Progressive disclosure component (collapsible sections)
- Catalog/product selector component
- Split-screen layout template
- Live preview integration

---

## Part 3: Redesign Direction

### Design Principle: "From Grid to Document"

Instead of treating invoices as data to fill into forms, treat them as **legal documents with attached metadata**. The UI should reflect that:
- The document is the primary artifact (visible always)
- Data entry is secondary (form that produces the document)
- Status is a live workflow (not a post-creation label)

### Redesigned Invoice Creation Flow

**Step 0: Structure (in progress, not shown to user)**
- Create a hidden "invoice workspace" that holds:
  - Draft invoice PDF (rendered locally via client-side library or server-side tail call)
  - Current form state
  - Validation status

**Step 1: Customer Selection (New Section Card)**
- Title: "Rechnungsempfänger"
- Input: Customer dropdown with autocomplete
- Optional fields (collapsed): VAT ID, payment terms override
- Card footer: "Weiter zu Positionen" or auto-advance on selection
- Estimated size: 200px height

**Step 2: Line Items (New Section Card)**
- Title: "Leistungen"
- Input: "+ Position hinzufügen" button → modal or inline form
  - Use a simple form, not a table row
  - Fields: Service (dropdown from catalog), Description (free text), Qty, Rate, VAT rate
- List: Cards or compact rows (not spreadsheet table)
- Calculation: Net amount shown per row, VAT shown, subtotal shown
- Card footer: "Weiter zu Bedingungen"

**Step 3: Payment Terms (New Section Card, collapsed by default)**
- Title: "Zahlungsbedingungen" (optional section)
- Collapsed by default, reveal on demand
- Fields: Due date (calculated from invoice date + days), payment method, notes
- If no changes, auto-populate from settings

**Step 4: Review & Send (New Section Card, split layout)**
- **Left:** Live invoice preview (PDF-like render)
  - DIN 5008 layout, watermarks, page breaks
  - Updates as user edits sections above
  - Shows final calculated amounts
  
- **Right:** Action panel
  - Summary: Netto | MwSt | Brutto
  - Buttons: "Als Entwurf speichern" | "Versenden" (primary)
  - Validation checklist: "✓ Kunde ausgewählt" | "✓ Mindestens 1 Position" | "✓ Gültig bis Datum"

**Layout:** Sections stack vertically on mobile (375px), side-by-side preview on desktop (1280px+)

### Redesigned Invoice List

**Current:**
- Table with status badges (read-only)

**Redesigned:**
- Keep the table (compact, familiar for list view)
- Add to header: **"3 Rechnungen warten auf Zahlung · 1 überfällig"** (quick status count)
- Add to each row:
  - Status badge (unchanged) **but now clickable** → opens action menu
  - "⋮" (three-dot) menu with quick actions:
    - Change status (draft → sent, sent → paid, etc.)
    - Send reminder
    - Delete
- On mobile: Hide secondary columns (Invoice Date, Due Date), show customer + amount + status
- Optional: Add filter by status ("Alle · Entwürfe · Offen · Bezahlt")

### Design Tokens (Tailwind v4)

No new tokens needed. Use existing:
- **Section cards:** `border-border-subtle bg-bg-surface p-6 rounded-lg`
- **Section title:** `text-lg font-semibold text-text-primary`
- **Preview pane:** `bg-bg-surface-raised border border-border-subtle`
- **Action button (primary):** existing variant `:bg-primary hover:bg-primary-dark`
- **Status colors:** draft (gray), sent (yellow), paid (green), overdue (red) — already defined

---

## Part 4: Implementation Roadmap (Phased)

### Phase 1: Low-Risk Foundation (Week 1)
- [ ] Extract `<InvoiceLineItem>` component (currently inline rows)
- [ ] Add `<CollapsibleSection>` component (reusable for all progressively-disclosed fields)
- [ ] Update invoice-list template: add status header count + action menu
- [ ] Update dashboard to show "Pending invoices" summary card
- **Shippable PR:** Status quicklinks + header count on list

### Phase 2: Creation Flow Restructure (Week 2)
- [ ] Create new `invoice-create-layout.ts` template with 4-section structure
- [ ] Implement section components: `<CustomerSection>`, `<LineItemsSection>`, `<TermsSection>`, `<ReviewSection>`
- [ ] Wire customer autocomplete (start with previous clients)
- [ ] Wire line item form (basic, no catalog yet)
- [ ] Add client-side live validation (required fields, min 1 item)
- **Shippable PR(s):**
  - (a) Customer + Terms sections (low-risk, no calculation changes)
  - (b) Line Items restructure (table row → form input)
  - (c) Review section (no preview yet, just summary cards)

### Phase 3: Live Preview + Polish (Week 3)
- [ ] Integrate Playwright PDF rendering OR server-side tail call to `/invoices/{id}/pdf`
- [ ] Implement split-screen layout (form on right, preview on left)
- [ ] Sync form state to preview in real-time (HTMX `hx-trigger="change"` on form fields)
- [ ] Add validation checklist to Review section
- **Shippable PR:** Preview pane with live sync

### Phase 4: Product Catalog + Client Enrichment (Week 4)
- [ ] Add `services` table to schema (name, rate, VAT rate, unit)
- [ ] Implement service dropdown in LineItemsSection
- [ ] Extend client autocomplete to include address + VAT ID lookup (optional: from external API)
- **Shippable PR:** Catalog selector + enriched client data

---

## Part 5: Acceptance Criteria

### Design Direction Definition of Done

- [x] Competitive evaluation table (5 tools, 5 patterns)
- [x] Gap analysis mapped to current FREA code
- [x] Concrete redesign direction (sections, preview, status pipeline)
- [x] No abstract moodboards; all patterns are buildable in HTMX + Tailwind
- [x] Handoff document with prioritized child issues

### First Visible Ship Criterion

**"The first shippable PR moves the invoice list from static badges to an active status pipeline."**

Acceptance test:
```
1. User creates invoice → status = "draft"
2. User opens invoice list
3. User sees: "1 Rechnung warten auf Zahlung"
4. User clicks status badge → changes "draft" → "sent" inline (HTMX swap)
5. List updates; header count changes to "1 Rechnungen warten auf Zahlung" (now sent, not draft)
6. User sees one-click reminder action in status menu
```

This is smaller than a full restructure, ships visual/behavioral change in <400 LOC, and proves the pattern before tackling the creation flow.

---

## Part 6: Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Live preview requires PDF rendering — adds complexity | High | Start with server-side tail call to existing `/pdf` endpoint (no new rendering lib). Preview is Phase 3, not Phase 1. |
| Section disclosure requires new component (`<CollapsibleSection>`) | Medium | Use Tailwind `group-open` pseudo-class, minimal JS. Reusable across app. |
| Customer autocomplete requires data enrichment API | Medium | MVP: autocomplete only from previous clients (local). External API (B2B registry) is Phase 4 polish. |
| HTMX state sync between form and preview (real-time) | Medium | Use `hx-trigger="change"` with debounce (500ms). Server already calculates totals on POST; reuse that logic for live calc. |
| Line item deletion in form (vs. table row delete) — UX clarity | Low | Add "✕" button per row (visible on hover or always visible). Test with user. |

---

## Part 7: Design Decisions (Rationale)

### Why Progressive Sections (Qonto pattern) over Split-Screen (Lexoffice pattern)?

- **Lexoffice uses split-screen** (form right, preview left) because it's their global UI pattern
- **FREA stack:** HTMX + Tailwind (no React). Split-screen would require:
  - Fixed sidebar (sticky positioning challenges with HTMX)
  - Real-time form→preview sync (doable but complex)
  - Mobile: preview gets squeezed or hidden (bad UX)
  
- **FREA's win:** Progressive sections are *simpler to build* (sequential steps, each section self-contained) AND they *scale to mobile* (sections stack). Preview is shown in the final "Review" step (Phase 3), which is a reasonable UX (user can always scroll back if needed).

### Why Service Catalog (FastBill) over Smart Defaults (sevDesk)?

- sevDesk auto-fills invoice number and subject — low friction
- FastBill's catalog transforms "line item entry" from grid-like to structured
- For FREA (freelancer: time + projects), a catalog of "services" (hourly rates, project names) makes sense culturally
- **MVP:** Dropdown of *stored projects/services* (already have them in DB)
- **Future:** Extend to reusable templates per client

### Why Status Pipeline on List (Tiime) not Creation?

- Status changes are *post-creation*, not part of data entry
- Showing status on the list (not buried in detail page) makes it visible
- One-click pipeline (draft → sent → paid) in the list is **cheaper to build** (one HTMX endpoint swapping a badge)
- Aligns with how freelancers actually work: "show me what's unpaid"

---

## Appendix: Design Tokens Reference

All tokens already exist in `src/styles/input.css` (Tailwind v4 @theme). No new tokens needed.

```css
/* Existing that will be used */
@theme {
  --color-bg-primary: /* page background */
  --color-bg-surface: /* card background */
  --color-border-subtle: /* card border */
  --color-text-primary: /* headings, important text */
  --color-text-secondary: /* labels, secondary text */
  --color-accent-success: /* paid status */
  --color-accent-danger: /* overdue status */
  --color-accent-warning: /* pending/sent status */
}

/* Section card */
.section-card {
  @apply rounded-lg border border-border-subtle bg-bg-surface p-6;
}

/* Section title */
.section-title {
  @apply mb-4 text-lg font-semibold text-text-primary;
}
```

---

## Appendix: Child Issues Handoff

The following child issues are derived from the Redesign Direction (Part 4) and Roadmap:

1. **FREA-316: Status Pipeline on Invoice List** (Phase 1, Week 1)
   - Scope: Add status header count + clickable menu for status changes
   - Assignee: Frontend Engineer
   - Est. effort: 2–3 hours
   - PR size limit: <300 LOC
   
2. **FREA-317: Restructure Invoice Creation — Sections** (Phase 2, Week 2)
   - Scope: Extract customer + line items + terms into separate section cards
   - Assignee: Frontend Engineer
   - Est. effort: 4–6 hours
   - PR size limit: <400 LOC (may split into (a), (b), (c) above)

3. **FREA-318: Live Invoice Preview in Creation** (Phase 3, Week 3)
   - Scope: Add preview pane (right side) with live sync to form edits
   - Assignee: Frontend Engineer
   - Est. effort: 4–6 hours
   - Blocker: Requires FREA-317 to be complete

4. **FREA-319: Service Catalog + Product Selector** (Phase 4, Week 4)
   - Scope: Add `services` table, catalog dropdown for line items
   - Assignee: Frontend Engineer + Backend Engineer (DB schema)
   - Est. effort: 3–4 hours
   - Blocker: Requires FREA-317 to be complete

---

**Created:** 2026-05-19  
**Design Lead:** UX Designer (fd535fb7-3e8a-4bfd-bee3-6b98e4983d7b)  
**Next Step:** Frontend Engineer claims FREA-316, other issues populate backlog in Paperclip
