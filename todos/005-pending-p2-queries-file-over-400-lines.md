---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, architecture, file-organization]
dependencies: []
---

# queries.ts at 552 Lines Violates 400-Line Rule

## Problem Statement

`queries.ts` is now 552 lines, 38% over the project's 400-line maximum. Will worsen as more invoice features are added (PDF generation, reminders).

## Findings

- **Architecture Strategist**: Extract `invoice-queries.ts` to establish entity-per-file pattern consistent with `dashboard-queries.ts`.

**Affected file:** `src/db/queries.ts`

## Proposed Solutions

### Extract `src/db/invoice-queries.ts`
Move all invoice-related queries (`createInvoice`, `getInvoice`, `getInvoiceItems`, `getAllInvoices`, `updateInvoiceStatus`, `VALID_TRANSITIONS`, `InvoiceListItem`) into a new file.

Resulting structure:
```
src/db/
  schema.ts              -- DDL + connection
  queries.ts             -- settings, clients, projects, time entries, audit log
  invoice-queries.ts     -- all invoice CRUD + list + status
  dashboard-queries.ts   -- aggregated dashboard stats
```

- **Effort:** Medium (30 min — move functions, update imports)
- **Risk:** Low (pure refactor, no logic changes)

## Acceptance Criteria

- [ ] queries.ts under 400 lines
- [ ] invoice-queries.ts contains all invoice functions
- [ ] All imports updated across routes
- [ ] No functional changes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|

## Resources

- `src/db/queries.ts` (552 lines)
- CLAUDE.md rule: "Files < 400 lines"
