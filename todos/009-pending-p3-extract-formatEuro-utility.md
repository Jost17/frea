---
status: pending
priority: p3
issue_id: "009"
tags: [code-review, refactor]
dependencies: []
---

# Extract formatEuro to Shared Utility

## Problem Statement

`formatEuro()` is defined locally in `dashboard.ts`. Currency formatting will be needed in invoice detail views, PDF generation, and email templates.

## Findings

- **TypeScript Reviewer**: Extract to `src/utils/format.ts` to prevent future duplication.

**Affected file:** `src/routes/dashboard.ts` (lines 10-17)

## Proposed Solutions

Move to `src/utils/format.ts`:
```typescript
export function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", {
    style: "currency", currency: "EUR",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}
```

- **Effort:** Small (5 min)
- **Risk:** None

## Acceptance Criteria

- [ ] formatEuro in shared utility file
- [ ] dashboard.ts imports from utility

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|

## Resources

- `src/routes/dashboard.ts:10-17`
