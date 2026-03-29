---
title: "FREA Scaffold Review — Recurring Patterns and Fixes"
category: architecture
date: 2026-03-29
tags:
  - code-review
  - typescript
  - hono
  - sqlite
  - security
  - performance
modules:
  - db/queries
  - routes
  - validation
severity: mixed (4 critical, 6 important, 6 nice-to-have)
---

# FREA Scaffold Review — Recurring Patterns and Fixes

## Problem

Initial scaffold PR (14 commits, ~4,450 LOC, 48 files) for a Bun/Hono/HTMX/SQLite freelancer invoicing tool contained 16 issues across security, performance, architecture, and code quality — identified by 5 parallel review agents (TypeScript reviewer, security sentinel, performance oracle, architecture strategist, code simplicity reviewer).

## Root Causes

The issues fell into a few recurring anti-patterns common in rapid scaffold development:

1. **Dynamic SQL without defense-in-depth** — `Object.keys(data)` interpolated into SQL column names. Zod filtered at the route layer, but the query functions themselves had no allowlist.
2. **Multi-statement writes without transactions** — `createInvoice` performed 4+ INSERTs/UPDATEs across tables without `db.transaction()`. GoBD-relevant data integrity risk.
3. **Type system bypass** — `any` used in render helpers, defeating TypeScript's value proposition in the template layer where most bugs live.
4. **N+1 query patterns** — Nested loops fetching clients → projects → time entries with individual queries instead of JOINs.
5. **Dead infrastructure** — Audit log table with triggers but no write code. Config module imported nowhere.

## Solution

### 1. SQL Column Allowlists + Generic Update Helper

```typescript
const CLIENT_COLUMNS = new Set([
  "name", "address", "postal_code", "city", "country",
  "email", "phone", "contact_person", "vat_id", "buyer_reference", "notes",
]);

function safeUpdate(
  table: string,
  allowedColumns: ReadonlySet<string>,
  data: Record<string, unknown>,
  id: number,
): void {
  const entries = Object.entries(data).filter(
    ([k, v]) => v !== undefined && allowedColumns.has(k),
  );
  if (entries.length === 0) return;
  const fields = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v as SQLValue);
  db.query(`UPDATE ${table} SET ${fields} WHERE id = ?`).run(...values, id);
}
```

This eliminated 4 copy-pasted update functions AND added SQL injection protection.

### 2. Transaction Wrapping

```typescript
export function createInvoice(data, timeEntries, settings): number {
  return db.transaction(() => {
    // All INSERTs + UPDATEs now atomic
    // ... invoice, line items, time entry linking, settings update
  })();
}
```

5-minute fix with outsized impact on data integrity.

### 3. N+1 → JOIN Queries

```typescript
// Before: 1 + C + P queries (clients loop → projects loop → entries loop)
// After: 1 query
export function getAllUnbilledTimeEntries() {
  return db.query<TimeEntryWithContext, []>(`
    SELECT t.id, t.project_id, p.name as project_name,
           c.id as client_id, c.name as client_name,
           t.date, t.duration, t.description, t.billable
    FROM time_entries t
    JOIN projects p ON t.project_id = p.id AND p.archived = 0
    JOIN clients c ON p.client_id = c.id AND c.archived = 0
    WHERE t.invoice_id IS NULL
    ORDER BY c.name, p.name, t.date DESC
  `).all();
}
```

Then group in application code with `Map.groupBy()`.

### 4. Form Parsing Utility

```typescript
// Before: 11 lines of String(body.get("x") ?? "") per handler × 8 handlers
// After:
const data = parseFormFields(body, CLIENT_FIELDS);
const validated = clientSchema.parse({ ...data, country: "Deutschland" });
```

### 5. Type Consolidation

Single source of truth in `schemas.ts`:
- Zod schemas define input validation
- Types derived from Zod + intersection for DB row fields (`& { id: number; created_at: string }`)
- DB-only types (Invoice, InvoiceItem, AuditLog) as plain interfaces in same file
- Removed ~110 lines of duplicate interfaces from `schema.ts`

### 6. Infrastructure Fixes

- Server bound to `127.0.0.1` (was `0.0.0.0` — LAN-exposed IBAN/tax data)
- CSRF middleware added (`hono/csrf`)
- Delete links changed from `<a href>` (GET) to `<form method="post">` (POST)
- Audit log `appendAuditLog()` wired into all mutation operations
- Dead `config.ts` deleted
- Inline scripts extracted to `public/static/frea.js`
- Static asset cache headers added

## Prevention

1. **Always wrap multi-statement writes in `db.transaction()`** — especially for financial/GoBD data.
2. **Never interpolate `Object.keys()` into SQL** without an explicit column allowlist, even when upstream validation exists.
3. **No `any` in template/render functions** — these are where data display bugs live. Use `Entity | null` pattern.
4. **Prefer JOIN queries over nested loops** — if you see `for (client of clients) { getProjectsFor(client.id) }`, refactor to a single JOIN.
5. **One source of truth for types** — derive from Zod schemas, don't maintain parallel interfaces.
6. **Bind local tools to `127.0.0.1`** — Bun defaults to `0.0.0.0`.
7. **Run 5 specialized review agents in parallel** for comprehensive coverage: TypeScript reviewer, security sentinel, performance oracle, architecture strategist, code simplicity reviewer.

## Metrics

- **Net result:** -159 lines (591 added, 750 removed) while adding audit logging, CSRF, and new utility functions
- **TypeScript:** Zero errors after changes
- **Lint:** All TS issues resolved (remaining CSS issues are pre-existing Tailwind v4 syntax)
