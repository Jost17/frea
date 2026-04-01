---
status: pending
priority: p3
issue_id: "009"
tags: [code-review, typescript, naming]
dependencies: []
---

# 009 — `isFirstTimeUser()` ist semantisch falsch — zählt Clients, nicht Session-Freshness

## Problem Statement

`isFirstTimeUser()` gibt `true` zurück wenn die `clients`-Tabelle leer ist. Das beantwortet "Gibt es noch keine Kunden?" — nicht "Ist das ein neuer User?". Diese Bedeutungsverzerrung führt zu falschen Annahmen bei Callers.

## Findings

**Location:** `src/db/queries.ts:73-78`, `src/routes/dashboard.ts`

```typescript
export function isFirstTimeUser(): boolean {
  const result = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM clients").get();
  return (result?.count ?? 0) === 0;
}
```

**Problem-Szenarien:**
- User legt Kunden an → archived → `isFirstTimeUser()` gibt `false` (COUNT(*) zählt archived)
- Fresh-Install nach Datenlöschung → gibt `true` (kein Hinweis auf Experience-Level)
- Korrekte Interpretation: "Hat dieser User jemals einen Kunden gehabt?"

## Proposed Solutions

### Option A: Umbenennen (empfohlen, 10 min)
```typescript
export function hasNoClients(): boolean { ... }
// oder
export function clientsTableIsEmpty(): boolean { ... }
```
Alle Callsites entsprechend anpassen.  
**Effort:** Small | **Risk:** None

### Option B: Umbenennen + Kommentar
```typescript
/** Returns true when no clients exist yet. Used for first-run dashboard hint. */
export function hasNoClients(): boolean { ... }
```

## Acceptance Criteria

- [ ] Funktion heißt `hasNoClients()` oder ähnlich
- [ ] Alle Callsites aktualisiert
- [ ] Kein TypeScript-Fehler

## Work Log

- 2026-04-01: Gefunden via Architecture-Review (PR #10)

## Resources

- PR: https://github.com/Jost17/frea/pull/10
