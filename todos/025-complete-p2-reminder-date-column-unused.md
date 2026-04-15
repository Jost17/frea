---
status: pending
priority: p2
issue_id: "025"
tags: [code-review, simplification, yagni, schema]
dependencies: []
---

# 025 — `reminder_date` Spalte ohne Consumer — speculative schema addition

## Problem Statement

Der PR fügt `reminder_date` Spalte zu `invoices` Tabelle + Migration + Schema-Feld hinzu. **Null Referenzen sonstwo im Code** — nie geschrieben, nie gelesen, nie angezeigt. Klassisches "design for hypothetical future requirements" und für eine Schema-Change besonders kostspielig, weil SQLite `DROP COLUMN` erst ab 3.35+ funktioniert.

## Findings

**Location 1 — Migration:** `src/db/schema.ts:199`
```ts
console.log("[migration] Added reminder_date column to invoices");
```

**Location 2 — Schema:** `src/validation/schemas.ts:176` (Invoice row type)
**Location 3 — CREATE TABLE:** `src/db/schema.ts:115` (reminder_date TEXT)

**Usage search:** Grep `reminder_date` across `src/` zeigt nur Schema/Migration-Locations. Niemand schreibt es, niemand liest es.

**Commit message:** "feat: add reverse_charge and reminder_date fields to invoices" — ehrlich, aber kein Consumer existiert im PR.

**Kosten der Spekulation:**
- Migration ist irreversibel (für ältere SQLite)
- Neue Dev muss beim Lesen des Schemas fragen "wofür ist das?"
- Wenn später andere Form braucht wird, war diese Migration für die Tonne

**Gefunden von:** code-simplicity-reviewer (P1 in ihrem Report, hier P2).

## Proposed Solutions

### Option A: Zurückrollen wenn noch nicht prod deployed (empfohlen, 10 min)

1. Migration aus `schema.ts:190-199` entfernen (nur die `reminder_date` Zeile)
2. `reminder_date` aus `schema.ts:115` (CREATE TABLE) entfernen
3. `reminder_date` aus Invoice row type in `schemas.ts` entfernen
4. Falls lokale Dev-DB die Spalte schon hat: `rm` der DB-File oder manuelles `ALTER TABLE invoices DROP COLUMN` (ab SQLite 3.35)

**Risk check:** Wenn der PR schon deployed ist und Production eine DB mit der Spalte hat, ist Rollback gefährlich. Status: PR noch nicht merged → sicher.

**Effort:** Small | **Risk:** Low (wenn PR nicht gemerged) / Medium (wenn in prod)

### Option B: Consumer hinzufügen (Mahnwesen-Feature)

Wenn Payment-Reminder-Feature wirklich geplant ist: im gleichen PR mindestens ein minimales Read-Path (Dashboard-Widget: "Überfällige Rechnungen ohne Mahnung") als Proof that the column is used. Nicht empfohlen — Scope-Creep.

**Empfehlung:** Option A.

## Acceptance Criteria

- [ ] `reminder_date` aus Migration entfernt
- [ ] `reminder_date` aus CREATE TABLE entfernt
- [ ] `reminder_date` aus Zod Invoice-Schema entfernt
- [ ] Keine Grep-Treffer für `reminder_date` außerhalb gelöschter Zeilen
- [ ] Lokale Dev-DB neu erstellt oder Spalte entfernt
- [ ] Dokumentation: Wenn Reminder-Feature später kommt, separate Migration

## Work Log

- 2026-04-15: Gefunden von code-simplicity-reviewer in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Betroffene Dateien: `src/db/schema.ts`, `src/validation/schemas.ts`
- Verwandte Todo: 017 (`reverse_charge` auch half-feature)
