---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, typescript, silent-failure]
dependencies: []
---

# 002 — Redirect zu `/${undefined}` wenn DB-Insert keine ID zurückgibt

## Problem Statement

`createClient()`, `createProject()` und `createTimeEntry()` geben `number | undefined` zurück. Die Aufrufer in den Route-Handlern prüfen nicht auf `undefined` und leiten direkt auf `/kunden/${id}` weiter — wenn `id` undefined ist, landet der User auf `/kunden/undefined` (404), kein Fehler wird geloggt.

## Findings

**Locations:**
- `src/routes/clients.ts:148`
- `src/routes/projects.ts:163`
- `src/routes/times.ts:170`

```typescript
// clients.ts
const id = createClient(validated);
return c.redirect(`/kunden/${id}`); // id könnte undefined sein → /kunden/undefined
```

```typescript
// queries.ts — Rückgabe
const result = stmt.get(/* ... */);
return result?.id; // undefined wenn INSERT kein id zurückgibt
```

**Warum kann das passieren?** Normalerweise wirft Bun's SQLite bei einem fehlgeschlagenen INSERT. Aber `result?.id` gibt undefined zurück wenn das INSERT-Returning-Ergebnis `null` ist — z.B. bei einem Schema-Mismatch oder silent constraint failure. Der Typ signalisiert das explizit (`number | undefined`).

## Proposed Solutions

### Option A: Guard mit AppError (empfohlen, 20 min)
```typescript
const id = createClient(validated);
if (!id) {
  throw new AppError("Kunde konnte nicht erstellt werden", 500);
}
return c.redirect(`/kunden/${id}`);
```
Gleicher Fix in `projects.ts` und `times.ts`.  
**Effort:** Small | **Risk:** None

### Option B: Throw in queries.ts direkt
`createClient` wirft stattdessen bei `!result?.id` selbst einen Error.  
**Pros:** Zentralisiert, Caller brauchen nichts zu ändern  
**Cons:** Versteckt den undefined-Rückgabetyp  
**Effort:** Small | **Risk:** Low

## Acceptance Criteria

- [ ] Kein Redirect auf `/kunden/undefined` möglich
- [ ] Bei fehlgeschlagenem Insert: saubere 500-Seite mit Fehlermeldung
- [ ] Fix in allen drei Routen: clients, projects, times

## Work Log

- 2026-04-01: Gefunden via TypeScript-Review + Silent-Failure-Hunter (PR #10)

## Resources

- PR: https://github.com/Jost17/frea/pull/10
- Gefunden von: kieran-typescript-reviewer + silent-failure-hunter agents
