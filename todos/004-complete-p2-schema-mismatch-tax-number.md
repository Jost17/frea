---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, typescript, validation, api]
dependencies: []
---

# 004 — Schema-Mismatch: `settingsSchema` vs. `onboardingSchema` bei Steuernummer

## Problem Statement

`onboardingSchema` erlaubt: entweder `tax_number` oder `ust_id` (mindestens eines). `settingsSchema` erfordert `tax_number.min(1)`. Ein User der Onboarding nur mit `ust_id` abschließt, kann danach `PUT /api/settings/company` nie ohne 422 aufrufen — er ist aus der API ausgesperrt.

## Findings

**Location:** `src/validation/schemas.ts`, `src/routes/api.ts:36-48`, `src/routes/onboarding.ts`

Die beiden Schemas divergieren bei der Pflicht-Steuerdaten-Logik:
- Onboarding: `if (!tax_number && !ust_id) return 422` — Cross-Field-Check
- Settings-Schema: `tax_number: z.string().min(1, "Steuernummer erforderlich")` — Tax_number allein required

## Proposed Solutions

### Option A: settingsSchema anpassen (empfohlen, 30 min)
```typescript
// schemas.ts
const settingsSchema = z.object({
  tax_number: z.string().optional().default(""),
  ust_id: z.string().optional().default(""),
  // ...
}).superRefine((data, ctx) => {
  if (!data.tax_number?.trim() && !data.ust_id?.trim()) {
    ctx.addIssue({ code: "custom", message: "Steuernummer oder Ust-IdNr. erforderlich", path: ["tax_number"] });
  }
});
```
**Effort:** Small | **Risk:** Low

### Option B: Gemeinsame Tax-Validation extrahieren
`taxValidation` als shared Zod-Refinement, beide Schemas nutzen dieselbe Logik.  
**Pros:** DRY  
**Cons:** Etwas mehr Abstraktion  
**Effort:** Small | **Risk:** Low

## Acceptance Criteria

- [ ] User mit nur `ust_id` (kein `tax_number`) kann `PUT /api/settings/company` erfolgreich aufrufen
- [ ] User ohne beides (`tax_number` und `ust_id`) erhält klare Fehlermeldung
- [ ] Onboarding-Flow bleibt unverändert funktional

## Work Log

- 2026-04-01: Gefunden via Security-Review (PR #10)

## Resources

- PR: https://github.com/Jost17/frea/pull/10
