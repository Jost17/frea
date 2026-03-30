---
status: pending
priority: p2
issue_id: "003"
tags: [code-review, performance, sqlite]
dependencies: []
---

# Missing Composite Index on invoices(status, invoice_date)

## Problem Statement

Every `getAllInvoices()` variant orders by `invoice_date DESC` and filters by `status`. The existing index `idx_invoices_status_due` covers `(status, due_date)` but not `invoice_date`. SQLite must filesort for every invoice list request.

## Findings

- **Performance Oracle**: Eliminates sort step for all invoice list queries. Significant at 500+ invoices.
- Covers: `getAllInvoices`, `cte_open_inv`, `cte_overdue`, and `cte_revenue` (after #002 fix)

**Affected file:** `src/db/schema.ts`

## Proposed Solutions

### Add composite index
```sql
CREATE INDEX IF NOT EXISTS idx_invoices_status_date ON invoices(status, invoice_date DESC);
```
- **Effort:** Trivial (1 line in schema)
- **Risk:** None

## Acceptance Criteria

- [ ] Index exists in schema.ts
- [ ] Invoice list queries use index (verify with EXPLAIN QUERY PLAN)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|

## Resources

- `src/db/schema.ts`
