---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, architecture, dry]
dependencies: ["005"]
---

# Overdue Business Rule Duplicated in 3 Locations

## Problem Statement

The "overdue invoice" definition (`status IN ('draft', 'sent') AND due_date < date('now')`) appears in three places. If the definition changes, all three must be updated.

## Findings

- **Architecture Strategist**: DRY violation, maintenance trap

**Locations:**
1. `src/db/queries.ts:92-101` — `getOverdueInvoiceCount()`
2. `src/db/dashboard-queries.ts:35-39` — `cte_overdue` CTE
3. `src/db/queries.ts:500-505` — `getAllInvoices("overdue")` branch

## Proposed Solutions

### Option A: Shared SQL constant
```typescript
export const OVERDUE_CONDITION = "i.status IN ('draft', 'sent') AND i.due_date < date('now')";
```
- **Effort:** Small
- **Risk:** Low

### Option B: Consolidate into single module (with #005)
Move overdue definition into `invoice-queries.ts` as single source of truth.
- **Effort:** Medium (part of #005 refactor)
- **Risk:** Low

## Acceptance Criteria

- [ ] Overdue condition defined in exactly one place
- [ ] All three query sites reference the single definition

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|

## Resources

- `src/db/queries.ts:92-101`
- `src/db/dashboard-queries.ts:35-39`
- `src/db/queries.ts:500-505`
