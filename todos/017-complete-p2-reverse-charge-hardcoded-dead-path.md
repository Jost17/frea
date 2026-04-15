---
status: pending
priority: p2
issue_id: "017"
tags: [code-review, incomplete-feature, invoices, dead-code]
dependencies: []
---

# 017 — `reverse_charge` hart auf 0 gesetzt → §13b UStG Rendering ist dead code

## Problem Statement

Die PR fügt `reverse_charge` Spalte, Schema-Feld, Validation-Rule und §13b-Rendering im `invoice-detail.ts` hinzu — aber der Create-POST setzt `reverse_charge: 0` hart im Code. Resultat: §13b-Rechnungen können über den Wizard nicht erstellt werden, und der §13b-Notice-Branch im Detail-Template ist unreachable.

## Findings

**Location 1 — hardcoded 0:** `src/routes/invoices.ts:216`

```ts
reverse_charge: 0,
```

**Location 2 — dead rendering branch:** `src/templates/invoice-detail.ts:147-152`

```ts
${invoice.reverse_charge === 1
  ? html`<p>Nach §13b UStG schuldet der Leistungsempfänger die Umsatzsteuer.</p>`
  : ""}
```
Wird niemals getriggert, weil keine Rechnung je mit `reverse_charge=1` erstellt wird.

**Location 3 — Schema:** `src/validation/schemas.ts:150` nimmt `reverse_charge: z.number().optional().default(0)` an → kein UI-Pfad setzt ≠ 0.

**Konsequenz:**
- Feature ist inkomplett — halb implementiert, halb dead code
- Falscher Eindruck, dass §13b-Handling funktioniert
- Ein aufmerksamer Reviewer fragt: "Warum ist die Spalte im Schema wenn sie nicht gesetzt werden kann?"

**Gefunden von:** kieran-ts (P2-3), code-simplicity (P2).

## Proposed Solutions

### Option A: Feature fertigstellen (empfohlen wenn §13b-Use-Case real ist, 30 min)

1. Checkbox "Leistung nach §13b UStG (Reverse Charge)" im Wizard-Step 2 hinzufügen
2. Form field `reverse_charge` → Schema akzeptiert als boolean/0/1
3. POST-Handler liest Wert aus Form statt hart 0
4. Wenn `reverse_charge=1`: alle line-items VAT auf 0 setzen, Netto = Brutto

**Pro:** §13b-Workflow funktioniert
**Con:** Zusätzliche Testfläche, Edge-Cases (Mischform §19 + §13b darf nicht gleichzeitig sein)
**Effort:** Medium | **Risk:** Medium

### Option B: Dead Feature komplett zurückrollen (empfohlen wenn §13b niet priorisiert, 10 min)

1. `reverse_charge` aus `schema.ts` Migration entfernen
2. Feld aus `invoiceCreateSchema` löschen
3. `createInvoice` ohne `reverse_charge` Parameter
4. Dead Branch aus `invoice-detail.ts:147-152` löschen

**Pro:** Konsistenz, keine dead code
**Con:** Wenn §13b später kommt, muss Migration neu
**Effort:** Small | **Risk:** Low (unless DB already has the column in prod)

### Empfehlung

Entscheidung braucht Product-Input: Ist §13b ein aktueller Need?
- **Ja** → Option A (Feature vervollständigen)
- **Später** → Option B (zurückrollen), separates Feature-PR wenn Zeit kommt
- **Jetzt, aber nicht in diesem PR** → mindestens dead branch aus `invoice-detail.ts` löschen und TODO-Kommentar auf Schema

## Acceptance Criteria

- [ ] Entscheidung A/B dokumentiert
- [ ] Wenn A: Checkbox + Form-Binding + Tests für §13b-Path
- [ ] Wenn A: §13b + §19 mutually exclusive validiert
- [ ] Wenn B: Schema-Migration rückgängig (inkl. Downgrade-Pfad falls prod deploy)
- [ ] Wenn B: Dead branch in `invoice-detail.ts` gelöscht
- [ ] Kein hardcoded `reverse_charge: 0` mehr

## Work Log

- 2026-04-15: Gefunden von kieran-typescript-reviewer + code-simplicity-reviewer in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Commit Message: "feat(invoices): handle Kleinunternehmer §19 and reverse charge §13b UStG"
- Betroffene Dateien: `src/routes/invoices.ts`, `src/templates/invoice-detail.ts`, `src/validation/schemas.ts`, `src/db/schema.ts`
