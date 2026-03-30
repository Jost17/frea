---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, performance, architecture]
dependencies: []
---

# Redundant Overdue Query on Dashboard Route

## Problem Statement

`navContextMiddleware` runs on `/` and calls `getOverdueInvoiceCount()`. The dashboard handler then calls `getDashboardStats()` which includes the same count. The middleware result is ignored — wasted DB query on every dashboard load.

## Findings

- **Performance Oracle**, **Architecture Strategist**, **Code Simplicity**: All flagged this redundancy.

**Affected files:**
- `src/index.ts` (middleware binding for `/`)
- `src/routes/dashboard.ts` (line 29 — uses stats.overdue_invoices_count directly)

## Proposed Solutions

### Option A: Exclude dashboard from middleware
Remove `app.use("/", navContextMiddleware)` from index.ts. Dashboard already passes its own overdueCount to Layout.

### Option B: Conditional middleware skip
Have middleware check if overdueCount is already set before querying.

- **Effort:** Small (5 min)
- **Risk:** Low

## Acceptance Criteria

- [ ] Dashboard page executes only one overdue count query
- [ ] Nav badge still shows correct overdue count on all routes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|

## Resources

- `src/index.ts`
- `src/routes/dashboard.ts:29`
- `src/middleware/nav-context.ts`
