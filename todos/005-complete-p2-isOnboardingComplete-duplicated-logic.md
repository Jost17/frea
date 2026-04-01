---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, architecture, typescript, maintenance]
dependencies: ["004"]
---

# 005 — `isOnboardingComplete()` dupliziert Validierungslogik aus `onboardingSchema`

## Problem Statement

Die Completion-Prüfung in `queries.ts` (6 Feld-Checks) und die Schema-Validierung in `onboarding.ts` (Zod-Schema) sind zwei unabhängige Listen derselben Required-Fields. Sie divergieren bereits: `email`, `iban`, `bic` sind im Schema required, aber nicht in `isOnboardingComplete()`. Wenn ein Required-Field hinzukommt, muss es an zwei Stellen gepflegt werden — und wird garantiert an einer vergessen.

## Findings

**Locations:** `src/db/queries.ts:80-93`, `src/routes/onboarding.ts:25-43`

Felder im Schema required, NICHT in `isOnboardingComplete()`:
- `email` (Schema: `z.string().email()`)
- `iban` (Schema: required + Regex-Validierung)
- `bic` (Schema: `z.string().min(1)`)

**Risiko:** User füllt Onboarding aus → Guard lässt durch → aber Settings sind laut Schema unvollständig. Tritt auf wenn jemand `isOnboardingComplete()` erweitert ohne Schema zu kennen oder umgekehrt.

## Proposed Solutions

### Option A: `isOnboardingComplete()` aus Schema ableiten (empfohlen, 1h)
```typescript
// queries.ts — completion-relevant Felder als Zod-Subset-Schema
import { completionSchema } from "../validation/schemas";

export function isOnboardingComplete(): boolean {
  const settings = getSettings();
  if (!settings) return false;
  return completionSchema.safeParse(settings).success;
}
```
**Pros:** Single source of truth — Schema ist der Check  
**Cons:** Kleiner Overhead (Zod parse statt manueller Checks) — bei SQLite-Syncrequests marginal  
**Effort:** Medium | **Risk:** Low

### Option B: Kommentar + Expliziter Cross-Reference
Beide Stellen mit `// SYNC WITH: src/validation/schemas.ts onboardingSchema` kommentieren und Tests schreiben die beide Definitionen vergleichen.  
**Pros:** Kein Code-Umbau  
**Cons:** Maintainability-Problem bleibt, nur besser sichtbar  
**Effort:** Small | **Risk:** Medium

## Acceptance Criteria

- [ ] Jedes Required-Field aus `onboardingSchema` wird auch von `isOnboardingComplete()` geprüft
- [ ] Ein neues Required-Field muss nur an einer Stelle hinzugefügt werden
- [ ] Bestehende Onboarding-Flow-Tests bleiben grün

## Work Log

- 2026-04-01: Gefunden via Architecture-Review + Learnings-Researcher (PR #10)

## Resources

- PR: https://github.com/Jost17/frea/pull/10
- Past solution: `docs/solutions/architecture/scaffold-review-patterns.md`
