---
status: pending
priority: p3
issue_id: "027"
tags: [code-review, cleanup, nice-to-have]
dependencies: []
---

# 027 — P3 Cleanup Bundle (multiple minor findings)

## Problem Statement

Sammlung kleinerer Findings aus dem PR #20 Review, die einzeln zu klein für eigene Todos sind, zusammen aber eine lohnende Cleanup-Session ergeben.

## Findings

### 27a — Inline JS Handlers in `invoice-pages.ts` sind CSP-unfriendly
**Files:** `src/templates/invoice-pages.ts:198, 217`

`onchange="toggleAllEntries(this, ${project.id}, ${vatRate}, ${isKleinunternehmer})"` interpoliert JS-Werte als Attribute. Wenn eine strikte CSP (`script-src 'self'`) eingeführt wird, bricht das. Fix: `data-*` Attribute + globaler Event-Delegator in `src/styles/` oder eigenem JS-File.
**Effort:** 15 min

### 27b — `fontSizeClass` / `paperClass` haben je nur 1 Caller
**File:** `src/templates/invoice-shared.ts:35+`

Beide werden nur in `invoice-detail.ts` aufgerufen. YAGNI-Verletzung ("drei ähnliche Zeilen > Abstraktion"). Inline in den Caller oder im selben File lassen.
**Effort:** 5 min | **LOC:** -12

### 27c — `reverse_charge` ist `z.number()` statt literal `0 | 1`
**File:** `src/validation/schemas.ts:150`

Aktuell: `reverse_charge: z.number().optional().default(0)` — akzeptiert `42` klaglos. Besser: `.pipe(z.literal(0).or(z.literal(1)))` oder boolean-input mit transform.
**Effort:** 5 min | **Depends on:** Todo 017 (wenn zurückgerollt wird, entfällt)

### 27d — `console.log` in Migrations (sollte `console.info`)
**File:** `src/db/schema.ts:195, 199`

CLAUDE.md-Regel "no `console.log` in production". Migrations sind Production-Code. Zu `console.info` upgraden.
**Effort:** 2 min | **Depends on:** Todo 025 (wenn `reminder_date` zurückgerollt wird, betrifft nur 1 Zeile)

### 27e — `invoice-status.ts` `alias` Parameter unvalidiert
**File:** `src/db/invoice-status.ts:6-9`

`overdueInvoiceWhere(alias?)` interpoliert alias direkt in SQL. Aktuell nur mit hardcoded `"i"` aufgerufen, aber Funktionssignatur lädt zu Missbrauch ein. Add: `if (alias && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) throw new Error(...)`.
**Effort:** 2 min

### 27f — `docs/` Struktur drift (no categorization)
**Path:** `docs/deployment-workflow.md`, `docs/runbook-local-server.md`, `docs/adr/`, `docs/solutions/`

Docs wachsen, aber Top-Level hat keine klare Struktur. Vorschlag: `docs/runbooks/`, `docs/ops/`, `docs/adr/`, `docs/solutions/` als Kategorien. Nicht blocking.
**Effort:** 5 min rename

### 27g — No migration version tracking
**File:** `src/db/schema.ts`

Migrations sind conditionally via `PRAGMA table_info` + `ALTER TABLE`. Funktioniert solange streng forward, aber kein `_migrations` Table für Versioning. Wenn Migration #4 mit #3 Reihenfolge-Abhängigkeit kommt, gibt's Drift-Risiko.
**Effort:** 30 min | **Defer:** OK bis nächste Migration-Welle

### 27h — `onboardingDone` module-level mutable cache
**File:** `src/middleware/onboarding-guard.ts:7`

Verstößt gegen Immutability-Regel. Für Single-User Localhost-Tool akzeptabel, aber flagged.
**Effort:** 15 min if fixed (use closure or WeakMap) | **Defer:** OK für now

### 27i — `withToastQuery` fake-base-URL pattern
**File:** `src/utils/toast.ts:11-16`

`new URL(path, "http://localhost")` nur für URLSearchParams-Stringification. Smell. **Entfällt, wenn Todo 024 ausgeführt wird** (toast.ts gelöscht).

### 27j — Barrel `src/templates/index.ts` Removal
**Status:** Korrekt entfernt. Kein Finding — nur positiver Hinweis. Tree-shaking + grep-Better. Dokumentieren als Pattern für neue Entwickler.

## Proposed Action

Single Cleanup-PR nach Merge von P1/P2 Fixes. Jeder Punkt ist unabhängig und kann als 1-Minuten-Commit behandelt werden. Review im Batch.

## Acceptance Criteria

- [ ] 27a — Inline JS → data-* attributes (optional, CSP-ready)
- [ ] 27b — fontSizeClass/paperClass inlined
- [ ] 27c — reverse_charge als literal (nach 017 Entscheidung)
- [ ] 27d — console.log → console.info
- [ ] 27e — alias validation in invoice-status.ts
- [ ] 27f — docs Kategorisierung (optional)
- [ ] 27g — deferred
- [ ] 27h — deferred
- [ ] 27i — gelöst durch 024

## Work Log

- 2026-04-15: Bundled aus mehreren Review-Findings in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
