---
status: pending
priority: p3
issue_id: "010"
tags: [code-review, performance, api-design]
dependencies: []
---

# No Pagination on Invoice List API

## Problem Statement

`getAllInvoices()` returns all rows without LIMIT/OFFSET. Acceptable for a solo freelancer with dozens of invoices, but will need pagination as data grows.

## Findings

- **Architecture Strategist**: Low priority now, prevents future refactor if added early.

## Proposed Solutions

Add optional `limit` and `offset` parameters to `getAllInvoices`:
```typescript
export function getAllInvoices(status?: InvoiceFilter, limit = 100, offset = 0): InvoiceListItem[]
```

- **Effort:** Small
- **Risk:** None

## Acceptance Criteria

- [ ] API supports `?limit=` and `?offset=` query params
- [ ] Default limit prevents unbounded queries

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|

## Resources

- `src/db/queries.ts:486`
- `src/routes/api.ts:20`
