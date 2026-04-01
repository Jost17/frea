---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, security, error-handling, typescript]
dependencies: []
---

# 003 — `instanceof Error` Catch leakt SQLite-Interna an User + falsche HTTP-Status-Codes

## Problem Statement

Alle POST-Mutation-Handler (clients, projects, times, settings) fangen mit `instanceof Error` und werfen den rohen Fehler als 400 `AppError` weiter. Damit landen SQLite-Fehlermeldungen wie `UNIQUE constraint failed: clients.email` oder `database is locked` als user-sichtbare 400-Fehlermeldungen — mit falschem Status und internen Schema-Details.

## Findings

**Locations:**
- `src/routes/clients.ts:150-155` und `:170-176`
- `src/routes/projects.ts:165-170` und `:185-191`
- `src/routes/times.ts:172-177` und `:192-198`
- `src/routes/settings.ts:321-327`

```typescript
} catch (err) {
  if (err instanceof Error) {
    // ⚠️ ZodError, SQLiteError, RangeError — alles wird hier gefangen
    console.error("[clients POST] Validation error:", err);
    throw new AppError(err.message, 400); // SQLite-Meldung → 400 → User sieht "UNIQUE constraint failed: clients.email"
  }
  return logAndRespond(c, err, "Kunde konnte nicht erstellt werden", 500);
}
```

**Sicherheitsrisiko:** `err.message` von `SQLiteError` enthält Spalten- und Tabellennamen. Das ist unbeabsichtigtes Information Disclosure.

**Semantik-Fehler:** Ein Disk-Full-Error bekommt Status 400 (Client-Fehler) statt 500 (Server-Fehler).

Das PR verwendet in `onboarding.ts` und `api.ts` bereits das korrekte `safeParse`-Pattern — diese Inkonsistenz muss bereinigt werden.

## Proposed Solutions

### Option A: ZodError spezifisch fangen (empfohlen, 45 min)
```typescript
import { ZodError } from "zod";

} catch (err) {
  if (err instanceof ZodError) {
    const msg = err.issues[0]?.message ?? "Ungültige Eingabe";
    return logAndRespond(c, err, msg, 422);
  }
  return logAndRespond(c, err, "Kunde konnte nicht erstellt werden", 500);
}
```
Alle DB-Fehler gehen an `logAndRespond` mit 500 — kein Leak.  
**Effort:** Small | **Risk:** Low

### Option B: Auf safeParse umstellen (konsistenter, 1h)
Alle betroffenen Handler auf `.safeParse()` statt `.parse()` umstellen, wie es `onboarding.ts` und `api.ts` tun. Dann ist kein `try/catch` für Validation-Fehler nötig.  
**Pros:** Konsistent mit restlichem PR-Code  
**Cons:** Etwas mehr Umbau  
**Effort:** Small | **Risk:** Low

## Acceptance Criteria

- [ ] Kein SQLite-Fehlertext gelangt als HTTP-400-Antwort zum User
- [ ] DB-Fehler geben 500 zurück, keine 400
- [ ] Zod-Validierungsfehler geben weiterhin nutzerfreundliche Deutsche Fehlermeldungen zurück
- [ ] Fix in clients.ts, projects.ts, times.ts, settings.ts

## Work Log

- 2026-04-01: Gefunden via TypeScript-Review + Silent-Failure-Hunter (PR #10)

## Resources

- PR: https://github.com/Jost17/frea/pull/10
- Gefunden von: kieran-typescript-reviewer + silent-failure-hunter agents
