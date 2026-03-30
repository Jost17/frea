---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, security, typescript, input-validation]
dependencies: []
---

# Unvalidated Status Filter on GET /api/invoices

## Problem Statement

The `status` query parameter on `GET /api/invoices?status=...` is passed directly to `getAllInvoices()` without validation. Any arbitrary string (e.g., `?status=banana`) silently returns an empty result set. While parameterized queries prevent SQL injection, this violates the project's "Zod for all inputs" rule and was flagged by 4 out of 5 review agents.

## Findings

- **TypeScript Reviewer**: Function accepts `string | undefined` — no type narrowing
- **Security Sentinel**: Input validation gap, violates defense-in-depth
- **Architecture Strategist**: Violates project rule "Zod for all inputs"
- **Code Simplicity**: Semantically sloppy, should return 422 for invalid values

**Affected files:**
- `src/routes/api.ts` (line 21)
- `src/db/queries.ts` (line 486 — function signature)

## Proposed Solutions

### Option A: Zod schema validation in route (Recommended)
```typescript
const invoiceFilterSchema = z.object({
  status: z.enum(["open", "overdue", "draft", "sent", "paid", "cancelled"]).optional(),
});
```
- **Pros:** Consistent with PATCH endpoint pattern, type-safe
- **Cons:** None
- **Effort:** Small (10 min)
- **Risk:** None

### Option B: Allowlist Set in route handler
```typescript
const ALLOWED_STATUS_FILTERS = new Set(["open", "overdue", "draft", "sent", "paid", "cancelled"]);
if (status && !ALLOWED_STATUS_FILTERS.has(status)) {
  throw new AppError("Ungueltiger Status-Filter", 400);
}
```
- **Pros:** Simple, no extra schema
- **Cons:** Less consistent with Zod pattern used elsewhere
- **Effort:** Small (5 min)
- **Risk:** None

## Recommended Action

Option A — Zod schema. Consistent with project patterns.

## Acceptance Criteria

- [ ] Invalid status values return 400/422 error
- [ ] Valid filter values still work correctly
- [ ] `getAllInvoices` function signature uses typed parameter

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|

## Resources

- PR #6: https://github.com/Jost17/frea/pull/6
- `src/routes/api.ts:21`
- `src/db/queries.ts:486`
