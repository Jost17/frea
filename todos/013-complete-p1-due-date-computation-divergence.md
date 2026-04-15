---
status: pending
priority: p1
issue_id: "013"
tags: [code-review, invoices, data-integrity]
dependencies: []
---

# 013 — `due_date` Computation divergiert zwischen GET preview und POST create, plus dead form field

## Problem Statement

Das Invoice-Create-Formular rendert ein `due_date` Input, das nie validiert wird und nie in der DB landet. Gleichzeitig existieren zwei unterschiedliche Due-Date-Berechnungen (Preview-Handler vs. `createInvoice`), die unter bestimmten Bedingungen auseinanderlaufen — der User sieht in der Preview ein anderes Datum als später in der erstellten Rechnung steht.

## Findings

**Location 1 — GET handler (preview):** `src/routes/invoices.ts:143-147`

```ts
const dueDate = new Date(Date.now() + paymentDays * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];
// ...interpolated in form: value="${dueDate}"
```
- Basiert auf `Date.now()` ("heute"), nicht auf `invoice_date`
- Millisekunden-Arithmetik ist DST-naiv
- Input-Feld geht in die Form...

**Location 2 — POST handler:** `src/routes/invoices.ts:190-256` + `src/validation/schemas.ts:140-151` (`invoiceCreateSchema`)
- `invoiceCreateSchema` **hat kein `due_date` Feld** → beim safeParse wird es verworfen
- Der POST-Handler liest `due_date` auch nie aus der Form

**Location 3 — DB layer:** `src/db/invoice-queries.ts:73-76`

```ts
const dueDate = new Date(data.invoice_date);
dueDate.setDate(dueDate.getDate() + paymentDays);
```
- Basiert auf `data.invoice_date` (nicht heute)
- `setDate()` ist DST-sensitive

**Konsequenz:** Sobald der User `invoice_date` im Formular auf ein nicht-heutiges Datum ändert (z.B. rückwirkende Rechnung), zeigt die Preview `heute + 14 Tage`, die gespeicherte Rechnung hat aber `invoice_date + 14 Tage`. Diese Werte divergieren still, ohne jegliche Warnung.

**Bonus:** Das `due_date` Input-Feld ist komplett dead code — User editiert → wird ignoriert. Schlechtes UX-Signal.

**Gefunden von:** kieran-typescript-reviewer (P1-2), implizit von mehreren anderen.

## Proposed Solutions

### Option A: `due_date` aus Form entfernen, als computed-only behandeln (empfohlen, 15 min)

1. In der Form das `due_date` Input komplett löschen — stattdessen Label: "Fällig am: wird aus Rechnungsdatum + Zahlungsziel berechnet"
2. Im GET-Handler die ms-Math durch `setDate()`-basierte Computation ersetzen (konsistent mit DB-Layer)
3. `roundToEuro` + Due-Date-Helper in gemeinsames `src/utils/invoice-date.ts` oder direkt im DB-Layer

**Effort:** Small | **Risk:** Low

### Option B: `due_date` user-editierbar machen

1. `due_date` in `invoiceCreateSchema` aufnehmen (`z.string().date()`)
2. `createInvoice` akzeptiert override → wenn gesetzt, überschreibt Computation
3. Preview berechnet nur Default

**Effort:** Medium | **Risk:** Medium (mehr Testfläche) | **Use case:** Custom payment terms pro Rechnung

**Empfehlung:** Option A. Payment-Days sind pro Kunde konfiguriert — der User sollte das Default nicht pro Rechnung überschreiben können. Falls doch, separater PR.

## Acceptance Criteria

- [ ] Entscheidung: Option A oder B
- [ ] Eine einzige Due-Date-Compute-Funktion im Code (keine Duplikate)
- [ ] DST-safe Implementation (Test: Rechnung über DST-Wechsel hinweg hat korrektes Datum)
- [ ] Wenn Option A: dead Input-Feld entfernt, Label erklärt Computation
- [ ] Wenn Option B: `due_date` in Schema validiert, POST akzeptiert, DB speichert User-Value
- [ ] Manueller Test: Preview und gespeicherte Rechnung zeigen identisches Datum

## Work Log

- 2026-04-15: Gefunden von kieran-typescript-reviewer in PR #20 review

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Betroffene Dateien: `src/routes/invoices.ts`, `src/db/invoice-queries.ts`, `src/validation/schemas.ts`
