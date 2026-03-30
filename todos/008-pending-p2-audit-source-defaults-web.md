---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, compliance, gobd]
dependencies: []
---

# Audit Log Source Defaults to "web" for API Calls

## Problem Statement

`updateInvoiceStatus` calls `appendAuditLog` without specifying `source`, so API-triggered status changes are logged as `source: "web"` instead of `source: "api"`. This affects GoBD audit trail accuracy.

## Findings

- **Security Sentinel**: Affects audit trail accuracy for compliance. Quick fix.

**Affected file:** `src/db/queries.ts` (line 551)

## Proposed Solutions

Pass source through to `updateInvoiceStatus`:
```typescript
export function updateInvoiceStatus(id: number, newStatus: ..., source: AuditLog["source"] = "web"): void {
  // ...
  appendAuditLog("invoice", id, "status_change", { from: row.status, to: newStatus }, source);
}
```

API route calls: `updateInvoiceStatus(id, parsed.data.status, "api")`

- **Effort:** Small (5 min)
- **Risk:** None

## Acceptance Criteria

- [ ] API-triggered status changes logged with source: "api"
- [ ] Web-triggered changes still logged with source: "web"

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|

## Resources

- `src/db/queries.ts:551`
- `src/routes/api.ts:42`
