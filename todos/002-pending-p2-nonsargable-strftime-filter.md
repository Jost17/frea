---
status: pending
priority: p2
issue_id: "002"
tags: [code-review, performance, sqlite]
dependencies: ["003"]
---

# Non-Sargable strftime() Filter in Dashboard CTE

## Problem Statement

The `cte_revenue` CTE wraps `invoice_date` in `strftime()`, preventing SQLite from using any index. Every dashboard load triggers a full table scan of all invoices for the revenue calculation.

## Findings

- **Performance Oracle**: Primary scalability risk in the PR. At 5,000+ invoices, dashboard loads could reach ~50ms+ just for this CTE.
- Current: `strftime('%Y-%m', invoice_date) = strftime('%Y-%m', 'now')`
- Should be: range predicate using `date('now', 'start of month')`

**Affected file:** `src/db/dashboard-queries.ts` (line 27)

## Proposed Solutions

### Option A: Range predicate (Recommended)
```sql
cte_revenue AS (
  SELECT COALESCE(SUM(gross_amount), 0) AS total
  FROM invoices
  WHERE status IN ('sent', 'paid')
    AND invoice_date >= date('now', 'start of month')
    AND invoice_date < date('now', 'start of month', '+1 month')
)
```
- **Pros:** Index-friendly, correct semantics
- **Cons:** None
- **Effort:** Small (5 min)
- **Risk:** None

## Acceptance Criteria

- [ ] Dashboard revenue query uses range predicate instead of strftime
- [ ] Composite index on `invoices(status, invoice_date)` covers this query (see #003)
- [ ] Revenue values unchanged for same data

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|

## Resources

- `src/db/dashboard-queries.ts:27`
