---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, performance, architecture, middleware]
dependencies: []
---

# 008 — `isOnboardingComplete()` löst DB-Query bei JEDEM Request aus — kein Caching

## Problem Statement

Der `onboardingGuard` ruft `isOnboardingComplete()` → `getSettings()` auf jedem nicht-skipped Request auf. Das ist ein synchrones SQLite-Read bei jedem Seitenaufruf, Form-Submit und Navigation. Die Settings-Zeile (id=1) ändert sich nur wenn der User die Einstellungen speichert — sie ist ein perfekter Candidate für process-lifetime Caching.

## Findings

**Location:** `src/middleware/onboarding-guard.ts:13`, `src/db/queries.ts:80-93`

Der Ablauf für jeden Request:
```
Request → onboardingGuard → isOnboardingComplete() → getSettings() → SELECT FROM settings WHERE id=1
```

**Performance:** Für ein Single-User Local Tool gering. Aber das Muster ist architecturally unsound: die "Is setup complete?"-Frage wird mit einem Live-DB-Round-Trip beantwortet bei dem die Antwort sich seit dem letzten Request nicht geändert haben kann.

## Proposed Solutions

### Option A: Module-Level Boolean Cache (empfohlen, 20 min)
```typescript
// queries.ts
let _onboardingComplete: boolean | null = null;

export function isOnboardingComplete(): boolean {
  if (_onboardingComplete !== null) return _onboardingComplete;
  // ... DB check ...
  _onboardingComplete = result;
  return result;
}

export function invalidateOnboardingCache(): void {
  _onboardingComplete = null;
}

// updateSettings() ruft invalidateOnboardingCache() auf nach dem DB-Write
```
**Pros:** Zero-Dependency, eliminiert wiederholte DB-Queries komplett  
**Cons:** Process-Neustart nötig um Cache zu invalidieren (aber updateSettings tut das)  
**Effort:** Small | **Risk:** Low

### Option B: Middleware einmalig beim App-Start prüfen
Beim App-Start (in `src/index.ts`) einmal `isOnboardingComplete()` prüfen und als AppEnv-Variable speichern.  
**Cons:** Kann nicht auf Laufzeit-Änderungen reagieren  
**Effort:** Small | **Risk:** Medium

## Acceptance Criteria

- [ ] `isOnboardingComplete()` löst nach dem ersten Call keinen weiteren DB-Read aus bis `updateSettings()` aufgerufen wird
- [ ] Nach `updateSettings()` → nächster Call auf `isOnboardingComplete()` liest frisch aus DB

## Work Log

- 2026-04-01: Gefunden via Architecture-Review (PR #10)

## Resources

- PR: https://github.com/Jost17/frea/pull/10
- Past solution: `docs/solutions/architecture/scaffold-review-patterns.md` (middleware query performance)
