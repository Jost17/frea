---
status: pending
priority: p2
issue_id: "026"
tags: [code-review, architecture, layering, dry]
dependencies: []
---

# 026 — `computeProjectPreviews` + `roundToEuro` — Business-Logic im Route-Handler, dupliziert

## Problem Statement

`src/routes/invoices.ts` hostet `computeProjectPreviews` (Zeilen 37-85, ~48 Zeilen) und eine eigene `roundToEuro` Funktion — beide sind pure business logic (VAT-Math, Rundung) die nichts mit HTTP zu tun haben. Zusätzlich existiert `roundToEuro` schon in `src/db/invoice-queries.ts:17`. Das ist ein Layering-Verstoß (Route handelt Domain-Logic) plus DRY-Verstoß (Rundungs-Rule dupliziert).

## Findings

**Location 1:** `src/routes/invoices.ts:33-35` — `roundToEuro` #1
**Location 2:** `src/db/invoice-queries.ts:17-19` — `roundToEuro` #2 (identisch)
**Location 3:** `src/routes/invoices.ts:37-85` — `computeProjectPreviews` (VAT-Aggregation + Rundung)

**Warum das weh tut:**
- Route-Handler sollten orchestrieren, nicht rechnen. Die aktuelle `invoices.ts` ist bei **319 Zeilen** — unter dem 400-Limit, aber mit Business-Logic drin.
- Zwei `roundToEuro` können drift. Wenn jemand Kaufmännische Rundung anders implementiert (Banker's Rounding vs. Half-Away-From-Zero), entsteht ein Financial-Bug.
- `computeProjectPreviews` ist ein Wrapper um `getActiveProjectsForClient` + Aggregation — gehört als `previewInvoiceForClient` in den DB-Layer (gemeinsam mit `createInvoice`, das auch aggregiert).

**Gefunden von:** kieran-ts (P2-5), architecture-strategist (P3-1), code-simplicity (P3-1).

## Proposed Solutions

### Option A: Extract zu Domain-Layer (empfohlen, 20 min)

**Neu:** `src/domain/invoice-math.ts` oder Erweiterung in `src/db/invoice-queries.ts`

```ts
// Single source of truth for Kaufmännische Rundung
export function roundToEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

// Aggregation-Helper — wird von Preview + Create aufgerufen
export function previewInvoiceForClient(clientId: number): ProjectPreview[] {
  const projects = getActiveProjectsForClient(clientId);
  return projects.map(project => { /* VAT math, sum, round */ });
}
```

Dann in `routes/invoices.ts`:
- `roundToEuro` Duplikat löschen
- `computeProjectPreviews` löschen → `previewInvoiceForClient` importieren
- Route-File von 319 auf ~270 Zeilen

**Effort:** Medium | **Risk:** Low

### Option B: Nur `roundToEuro` dedupen

Minimal-Fix. Adressiert nur DRY, nicht Layering.

**Empfehlung:** Option A.

## Acceptance Criteria

- [ ] `roundToEuro` existiert an **genau einer** Stelle
- [ ] `computeProjectPreviews` lebt im Domain- oder DB-Layer
- [ ] `routes/invoices.ts` unter 300 Zeilen
- [ ] Keine Business-Logic mehr im Route-Handler (nur Orchestrierung + Response-Shaping)
- [ ] Tests (wenn vorhanden) laufen durch
- [ ] Manueller Test: Preview + Create geben identische Beträge aus

## Work Log

- 2026-04-15: Gefunden von kieran-typescript-reviewer, architecture-strategist, code-simplicity-reviewer in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Related: Scaffold Review #5 — "Type consolidation" (docs/solutions/architecture/scaffold-review-patterns.md)
- Betroffene Dateien: `src/routes/invoices.ts`, `src/db/invoice-queries.ts`
