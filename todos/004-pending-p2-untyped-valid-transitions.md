---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, typescript, type-safety]
dependencies: []
---

# VALID_TRANSITIONS Uses Untyped Record<string, ...>

## Problem Statement

The `VALID_TRANSITIONS` map uses `Record<string, readonly string[]>` instead of `Record<InvoiceStatus, readonly InvoiceStatus[]>`. Adding a new status to the Invoice type won't trigger a compile error if it's missing from the transition map.

## Findings

- **TypeScript Reviewer**: Complete loss of type safety on the state machine. If a fifth status is added, TypeScript won't enforce adding it to transitions.

**Affected file:** `src/db/queries.ts` (lines 521-526)

## Proposed Solutions

```typescript
type InvoiceStatus = Invoice["status"];

const VALID_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
} as const;
```
- **Effort:** Small (5 min)
- **Risk:** None

## Acceptance Criteria

- [ ] VALID_TRANSITIONS keys and values use InvoiceStatus type
- [ ] Adding a new status to Invoice forces updating VALID_TRANSITIONS

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|

## Resources

- `src/db/queries.ts:521-526`
- `src/validation/schemas.ts:115` (Invoice type)
