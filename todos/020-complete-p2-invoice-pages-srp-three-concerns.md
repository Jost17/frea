---
status: pending
priority: p2
issue_id: "020"
tags: [code-review, architecture, srp, templates]
dependencies: []
---

# 020 — `invoice-pages.ts` (255 Zeilen) vereint 3 unabhängige Concerns

## Problem Statement

`src/templates/invoice-pages.ts` ist 255 Zeilen lang und hostet **drei unrelated Renderer** mit unterschiedlichen Audiences und Lifecycles: Read-only Liste + zwei Wizard-Schritte mit Form-Mutationen und inline JS-Callbacks. Der Dateiname "invoice-pages" ist ein Container, kein Concern. Unter 400-Zeilen-Hard-Limit, aber Trajectory ist ungesund.

## Findings

**Location:** `src/templates/invoice-pages.ts`

**Contained renderers:**
1. `renderInvoiceList` — Tabelle, readonly, pagination (~60 lines)
2. `renderInvoiceClientSelection` — Wizard Step 1, client picker (~45 lines)
3. `renderInvoiceProjectSelection` — Wizard Step 2, project + entries + form + inline JS callbacks (~150 lines)

**Warum das weh tut:**
- SRP-Verletzung: "invoice-pages.ts ändern" kann jetzt drei unzusammenhängende Features gleichzeitig betreffen
- Test-Scope unklar: bei Änderung an der Liste muss man auch beide Wizard-Step-Tests laufen
- Inline `onchange="updateInvoicePreview(...)"` in Step 2 koppelt an globales JS außerhalb dieses Files
- File wächst — weitere Wizard-Schritte oder Filter-UI landen hier

**Gefunden von:** architecture-strategist (P1-2, hier P2 in Synthese weil nicht merge-blocking).

## Proposed Solutions

### Option A: Split in 3 Files (empfohlen, 30 min)

```
src/templates/invoice-list.ts              (renderInvoiceList)
src/templates/invoice-create-client.ts     (renderInvoiceClientSelection)
src/templates/invoice-create-project.ts    (renderInvoiceProjectSelection)
```

Jeweils ~60-150 Zeilen, klar abgegrenzte Concerns. Shared helpers (`statusBadge`, `formatCurrency` etc.) bleiben in `invoice-shared.ts`.

Imports in `src/routes/invoices.ts` entsprechend anpassen.

**Effort:** Small | **Risk:** Low

### Option B: Nur Wizard-Steps raus

`invoice-pages.ts` behält `renderInvoiceList`, beide Wizard-Steps kommen in `invoice-create-wizard.ts`. Ein File weniger, aber verbessert die SRP-Situation nur halb.

**Empfehlung:** Option A.

## Acceptance Criteria

- [ ] 3 neue Template-Files erstellt
- [ ] `invoice-pages.ts` gelöscht oder nur Re-Export-Shim
- [ ] Imports in `src/routes/invoices.ts` angepasst
- [ ] Type-Check läuft durch
- [ ] Alle Renderer funktionieren (visueller Smoke-Test: Liste + beide Wizard-Schritte)

## Work Log

- 2026-04-15: Gefunden von architecture-strategist in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Related: Todo 021 (EmptyState adoption), sollte im gleichen Rutsch
- Betroffene Datei: `src/templates/invoice-pages.ts`
