# FREA-315 — Design Direction Complete ✓

**Status:** Done  
**Completion Date:** 2026-05-19  
**Assigned to:** UX Designer (fd535fb7-3e8a-4bfd-bee3-6b98e4983d7b)

---

## Work Completed

### Design Documents
1. **FREA-315-redesign-direction.md** — 890 lines
   - Competitive evaluation of 5 tools (sevDesk, Lexoffice, FastBill, Tiime, Qonto)
   - 5 concrete UX patterns moving away from Excel-feeling
   - Current FREA UI gap analysis
   - Redesign direction with exact layout + component changes

2. **FREA-315-implementation-plan.md** — 650 lines
   - 4 phased child issues (FREA-316/317/318/319)
   - Prioritized 4-week roadmap
   - Detailed acceptance criteria + file-level changes for each

### Commit
**b78347a** docs(FREA-315): Competitive UX Eval + Redesign Direction (Design Doc + Implementation Plan)

---

## Key Findings

### The Problem (Current FREA)
FREA's invoice UI feels like "Excel with buttons":
1. Line items entered as spreadsheet rows (not products)
2. All fields on one screen (no visual grouping)
3. No document preview visible during editing
4. Status badges are read-only (no workflow visibility)

### The 5-Pattern Solution

| Pattern | Source Tools | FREA Benefit |
|---------|--------------|-------------|
| **Live Document Preview** | Lexoffice, FastBill | User sees final document as they edit → feedback loop |
| **Progressive Section Disclosure** | Qonto, Tiime | Customer → Items → Terms → Review (not all-at-once form) |
| **Product Catalog Selection** | FastBill, Tiime, Qonto | Pick service from catalog (not type grid rows) |
| **Client Autocomplete** | Qonto | Auto-fill from previous clients, enriched data |
| **Status Pipeline on List** | Tiime, Qonto | Clickable status, one-click state changes, visible workflow |

### Implementation Feasibility
✓ All patterns buildable in HTMX + Tailwind  
✓ No new dependencies required  
✓ Phased approach: each phase ships independently  
✓ First shippable PR: <300 LOC (status pipeline)

---

## Child Issues (Ready to Claim)

### FREA-316: Status Pipeline on Invoice List
**Phase:** 1 (Week 1, 2026-05-20)  
**Effort:** 2–3 hours  
**PR Size:** <300 LOC  
**Shippable First Win:** Yes

Changes:
- Add header count: "X Rechnungen warten auf Zahlung"
- Status badges become clickable → inline action menu
- One-click state transitions (draft → sent → paid)
- No blocker dependencies

**Owner:** Frontend Engineer (ready to claim)

---

### FREA-317: Restructure Invoice Creation — Sections
**Phase:** 2 (Weeks 2–3, starting 2026-05-27)  
**Effort:** 4–6 hours (split into 3 sub-PRs)  
**PR Size:** <400 LOC per sub-task  
**Sub-tasks:**
- (a) FREA-317a: Customer + Terms sections (1–2h)
- (b) FREA-317b: Line items form restructure (2–3h)
- (c) FREA-317c: Review section (1–2h)

**Owner:** Frontend Engineer (after FREA-316)

---

### FREA-318: Live Invoice Preview
**Phase:** 3 (Week 3, starting 2026-06-03)  
**Effort:** 4–6 hours  
**PR Size:** <400 LOC  
**Blocker:** Requires FREA-317

Features:
- Split-screen layout (form left, preview right)
- Live PDF preview on the right
- Real-time sync as user edits (debounced 500ms)
- Server-side render via `/invoices/preview` endpoint

**Owner:** Frontend Engineer

---

### FREA-319: Service Catalog + Product Selector
**Phase:** 4 (Week 4+, starting 2026-06-10)  
**Effort:** 3–4 hours  
**PR Size:** <400 LOC  
**Blocker:** Requires FREA-317  
**Optional:** Can ship full redesign without this

Features:
- `services` table (name, rate, unit, VAT rate)
- Service dropdown in line item form (auto-fills rate, VAT)
- Service management in Settings

**Owner:** Frontend Engineer + Backend Engineer (schema migration)

---

## Design Checklist (Every PR)

- [ ] German labels: real Umlauts (ä ö ü ß) — never ae/oe/ue
- [ ] Responsive: test at 375px, 768px, 1280px, 1920px
- [ ] Keyboard accessible: Tab, Enter, Escape, focus ring visible
- [ ] WCAG 2.1 AA: color contrast ≥4.5:1, labels for inputs
- [ ] No hardcoded colors — use design tokens from `src/styles/input.css`
- [ ] Files <400 lines — extract components as needed
- [ ] Error handling: every catch block logs (see CLAUDE.md)
- [ ] HTMX only, no JS frameworks, semantic HTML

---

## Timeline

| Week | Issue | Status |
|------|-------|--------|
| Week 1 (05-20) | FREA-316 (Status Pipeline) | Ready to claim |
| Week 2 (05-27) | FREA-317a, 317b, 317c (Sections + Items) | Blocked on FREA-316 |
| Week 3 (06-03) | FREA-318 (Live Preview) | Blocked on FREA-317 |
| Week 4 (06-10) | FREA-319 (Service Catalog) | Optional, parallel |

---

## Definition of Done (FREA-315)

- [x] Competitive evaluation of 5 tools
- [x] Gap analysis of current FREA UI
- [x] Redesign direction (concrete, buildable patterns)
- [x] Phased implementation roadmap
- [x] Child issues with detailed specs
- [x] Design checklist for Frontend Engineer
- [x] Design docs in `docs/design/` (version-controlled)

---

## Next Action

**Frontend Engineer:** 
1. Review `FREA-315-implementation-plan.md` (FREA-316 spec)
2. Claim FREA-316 in Paperclip
3. Open PR for status pipeline (low-risk first win)

**Design:** 
- Available to pair on FREA-317a while FREA-316 is in review
- Monitor PR reviews for design consistency

---

**Design Lead:** UX Designer (fd535fb7-3e8a-4bfd-bee3-6b98e4983d7b)  
**Design Completed:** 2026-05-19  
**Full Redesign Target:** 2026-06-13 (4 phases, 4 weeks)
