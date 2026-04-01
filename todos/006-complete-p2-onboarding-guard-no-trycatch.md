---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, error-handling, middleware]
dependencies: []
---

# 006 — `onboardingGuard` ohne try/catch — DB-Fehler ohne Kontext im Log

## Problem Statement

`onboardingGuard` ruft `isOnboardingComplete()` ohne try/catch auf. Jeder SQLite-Fehler (DB locked, disk full, Schema-Mismatch) propagiert durch den Guard ohne Kontext-Log. Der globale Error-Handler fängt es zwar, aber der Log-Eintrag enthält keinen Hinweis dass der Fehler im Guard passiert ist.

## Findings

**Location:** `src/middleware/onboarding-guard.ts:13`

```typescript
export const onboardingGuard: MiddlewareHandler = async (c, next) => {
  // ...
  if (!isOnboardingComplete()) { // ← kein try/catch
    return c.redirect("/onboarding");
  }
  return next();
};
```

Jeder Request (außer /api/, /static/, /onboarding) löst diesen DB-Call aus. Ein transienter SQLite-Fehler bringt das gesamte Routing zum Erliegen mit einem generischen 500 — ohne Log-Zeile die auf den Guard zeigt.

## Proposed Solutions

### Option A: Fail-Open mit Logging (empfohlen für Resilience, 15 min)
```typescript
let complete: boolean;
try {
  complete = isOnboardingComplete();
} catch (err) {
  console.error("[onboardingGuard] DB check failed, failing open:", err);
  return next(); // App bleibt nutzbar bei transientem DB-Fehler
}
```
**Pros:** Resilient, App bleibt bei flaky DB bedienbar  
**Cons:** Könnte unfertige Einrichtung durchlassen  
**Effort:** Small | **Risk:** Low

### Option B: Fail-Closed mit Logging (strenger)
```typescript
try {
  complete = isOnboardingComplete();
} catch (err) {
  console.error("[onboardingGuard] DB check failed:", err);
  throw err; // Globaler Handler zeigt 500
}
```
**Pros:** Konsistenteres Verhalten  
**Cons:** App komplett unnutzbar bei DB-Fehler  
**Effort:** Small | **Risk:** Low

## Acceptance Criteria

- [ ] DB-Fehler im Guard erzeugt Log-Eintrag mit `[onboardingGuard]` Prefix
- [ ] Kein Log-Verlust wenn der Guard-Check fehlschlägt

## Work Log

- 2026-04-01: Gefunden via Silent-Failure-Hunter (PR #10)

## Resources

- PR: https://github.com/Jost17/frea/pull/10
