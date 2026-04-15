---
status: pending
priority: p2
issue_id: "019"
tags: [code-review, validation, dry, iban]
dependencies: []
---

# 019 — Doppelte `onboardingSchema` mit schwächerer IBAN-Validation

## Problem Statement

`src/routes/onboarding.ts` deklariert ein lokales `onboardingSchema`, das `onboardingCompletionSchema` aus `validation/schemas.ts` dupliziert — mit einer **schwächeren IBAN-Validierung** (nur Format-Regex statt MOD-97 Checksum). Der Schema-Kommentar in `schemas.ts` sagt wörtlich "single source of truth for guard + wizard" — dieser PR erschafft eine zweite Kopie.

## Findings

**Location 1 — lokale Kopie:** `src/routes/onboarding.ts:25-43`

```ts
const onboardingSchema = z.object({
  // ...
  iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, "Ungültige IBAN"),
  // ...
});
```

**Location 2 — shared schema:** `src/validation/schemas.ts:238` (`onboardingCompletionSchema`)

```ts
export const onboardingCompletionSchema = z.object({
  // ...
  iban: z.string().refine(isValidIban, "Ungültige IBAN (Checksum-Fehler)"),
  // ...
}).refine(
  (data) => data.tax_number || data.ust_id,
  "Entweder Steuernummer oder USt-IdNr. erforderlich",
);
```

`isValidIban` macht MOD-97 Checksum (echte IBAN-Validation). Die Regex-only Variante akzeptiert `DE00BANKBANK` (syntaktisch ok, mathematisch falsch).

**Location 3 — duplizierte Business-Rule:** `src/routes/onboarding.ts:61`

```ts
if (!data.tax_number && !data.ust_id) {
  throw new AppError("Steuernummer oder USt-IdNr. erforderlich", 400);
}
```
Dieselbe Regel ist schon im `.refine()` des shared schema. Dead duplicate.

**Konsequenz:**
- User kann Onboarding mit mathematisch ungültiger IBAN abschließen wenn UI-Wizard die lokale Schema-Kopie nutzt
- Zwei IBAN-Validierungs-Quellen können drift

**Gefunden von:** code-reviewer (P2-3). Eine existierende Security-Solution `docs/solutions/security-issues/multi-agent-review-host-spoofing-iban-validation.md` warnt ausdrücklich vor genau diesem Drift.

## Proposed Solutions

### Option A: Lokale Kopie löschen, shared schema importieren (empfohlen, 10 min)

```ts
import { onboardingCompletionSchema } from "../validation/schemas";

// ...
const data = onboardingCompletionSchema.parse(fields);
// tax_number/ust_id Check entfällt — .refine() im shared schema erledigt das
```

**Effort:** Small | **Risk:** Low (strengere Validation ist Upgrade, nicht Breaking)

## Acceptance Criteria

- [ ] `onboardingSchema` lokal in `routes/onboarding.ts` gelöscht
- [ ] Import aus `validation/schemas.ts`
- [ ] Manueller `tax_number || ust_id` Check entfernt
- [ ] Manueller Test: IBAN mit falscher Checksum → 422
- [ ] Manueller Test: Valid IBAN → Onboarding durchläuft

## Work Log

- 2026-04-15: Gefunden von code-reviewer in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Related: `docs/solutions/security-issues/multi-agent-review-host-spoofing-iban-validation.md`
- Betroffene Dateien: `src/routes/onboarding.ts`, `src/validation/schemas.ts`
