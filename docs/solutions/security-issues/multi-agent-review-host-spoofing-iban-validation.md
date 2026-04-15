---
title: "Multi-Agent Code Review: Host-Header Spoofing, IBAN Validation & Architectural Merge"
category: security-issues
date: 2026-04-02
tags:
  - host-header-spoofing
  - socket-level-verification
  - iban-validation
  - input-validation
  - fail-closed
  - error-handling
  - schema-duplication
  - merge-conflict-resolution
  - code-deduplication
  - multi-agent-review
severity: critical
components:
  - src/routes/api.ts
  - src/middleware/onboarding-guard.ts
  - src/db/queries.ts
  - src/db/invoice-queries.ts
  - src/middleware/error-handler.ts
  - src/validation/schemas.ts
  - src/utils/form-parser.ts
resolution_time: ~4h
related_issues:
  - "PR #10: feat(onboarding): Onboarding-Flow, Hilfstexte & Leerzustaende"
  - "Issue #14: Extract OnboardingPage template"
  - "Issue #15: Extract EmptyState helper"
  - "Issue #16: Type-safe VALID_TRANSITIONS"
  - "Issue #17: Consistent .safeParse()"
  - "Issue #18: Rename isFirstTimeUser to hasNoClients"
related_docs:
  - docs/solutions/architecture/scaffold-review-patterns.md
  - docs/solutions/process-issues/pr-testplan-checkboxes-before-merge.md
---

# Multi-Agent Code Review: Host-Header Spoofing, IBAN Validation & Architectural Merge

## Problem

PR #10 on Jost17/frea (Bun + Hono + SQLite freelancer invoicing tool, 24 files, +1530/-156) added onboarding flow, invoice API, help texts, and empty states. A 5-agent parallel code review uncovered 2 critical, 6 important, and 5 nice-to-have findings. After fixing all P1/P2 issues, main had diverged with a different onboarding architecture, requiring non-trivial merge conflict resolution.

## Root Causes

### P1-A: Host Header Localhost Guard Trivially Bypassable

The `requireLocalhost` middleware checked `c.req.header("host")` -- a client-controlled HTTP header. Any HTTP client can set `Host: localhost` from any IP address, making the entire access control mechanism useless.

```typescript
// VULNERABLE: Host header is client-controlled
const host = c.req.header("host") ?? "";
if (!host.startsWith("localhost")) {
  return c.json({ error: "Forbidden" }, 403);
}
```

**Why this matters:** All write endpoints (`PUT /api/settings/company`, `PATCH /api/invoices/:id/status`) were effectively unauthenticated. IBAN, BIC, and tax data were writable from any network location.

### P1-B: Unvalidated Invoice Status Returns Silent Empty Results

`GET /api/invoices?status=bogus` returned `200 []` instead of `400`. Users see an empty invoice list and believe they have no invoices -- a silent data loss from the user's perspective.

### P2 Root Causes (6)

- **P2-A:** Onboarding guard failed open on DB error -- `next()` called, users reach pages that cascade-fail
- **P2-B:** `isOnboardingComplete()` duplicated field checks from `onboardingSchema` in 3 places
- **P2-C:** Identical ZodError/AppError/fallback catch blocks in 6 route handlers
- **P2-D:** IBAN regex validated format but not MOD-97 checksum (ISO 13616)
- **P2-E:** `parseFormFields` coerced File objects to `"[object File]"` via `String()`
- **P2-F:** `InvoiceListItem` interface defined in data layer instead of type layer

## Solution

### P1-A Fix: Socket-Level IP Check

Replace header check with Bun's `getConnInfo()` which reads the actual TCP socket remote address:

```typescript
import { getConnInfo } from "hono/bun";

const requireLocalhost: MiddlewareHandler = async (c, next) => {
  const info = getConnInfo(c);
  const addr = info.remote.address ?? "";
  if (addr !== "127.0.0.1" && addr !== "::1" && addr !== "localhost") {
    return c.json({ error: "Forbidden" }, 403);
  }
  return next();
};
```

**Key insight:** HTTP headers are untrusted user input. Socket remote address comes from the kernel's TCP/IP state and cannot be spoofed by the client.

### P1-B Fix: Allowlist Validation with 400

```typescript
export const VALID_INVOICE_FILTER_VALUES = new Set([
  "open", "overdue", "draft", "sent", "paid", "cancelled",
]);

// In route handler
if (status && !VALID_INVOICE_FILTER_VALUES.has(status)) {
  throw new AppError(
    `Ungultiger Status-Filter '${status}'. Erlaubt: ${[...VALID_INVOICE_FILTER_VALUES].join(", ")}`,
    400,
  );
}
```

### P2-A Fix: Fail-Closed Guard

```typescript
} catch (err) {
  console.error("[onboarding-guard] DB check failed, returning 503:", err);
  return c.html(html`...Datenbankfehler...`, 503);
}
```

### P2-C Fix: Extracted `handleMutationError` Helper

Reduced 6x duplicated catch blocks to single-line calls:

```typescript
// error-handler.ts
export function handleMutationError(c: Context, err: unknown, fallbackMsg: string): Response {
  if (err instanceof AppError) throw err;
  if (err instanceof ZodError) {
    const msg = err.issues[0]?.message ?? "Ungultige Eingabe";
    return logAndRespond(c, err, msg, 422);
  }
  return logAndRespond(c, err, fallbackMsg, 500);
}

// Usage in routes (was 5 lines, now 1)
} catch (err) {
  return handleMutationError(c, err, "Kunde konnte nicht erstellt werden");
}
```

### P2-D Fix: IBAN MOD-97 Checksum (ISO 13616)

```typescript
function isValidIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}
```

### Merge Conflict Resolution

Main diverged with a different onboarding architecture during the review:

| Component | PR #10 | Main |
|-----------|--------|------|
| Onboarding | Field-based checks, `/onboarding` wizard | DB flag `onboarding_complete`, via `/einstellungen` |
| Invoices | Functions in `queries.ts` | Extracted to `invoice-queries.ts` |
| Dashboard | Empty state only | KPI cards (revenue, clients, overdue) |

**Strategy:** Take main's architecture as base, merge PR's security improvements and new endpoints into main's structure. Specifically:
1. Kept main's DB-flag onboarding (simpler, explicit)
2. Added `getAllInvoices` + `updateInvoiceStatus` to `invoice-queries.ts` (main's extracted module)
3. Merged dashboard first-time hint into main's KPI layout
4. Applied all security fixes (socket guard, IBAN, fail-closed) on top of main

## Review Process

Five specialized agents ran in parallel (~75 seconds total):

| Agent | Role | Key Finding |
|-------|------|-------------|
| kieran-typescript-reviewer | Type safety, patterns | Host bypass, schema drift |
| security-sentinel | Vulnerabilities, auth | Host bypass, IBAN, CSRF |
| architecture-strategist | Structure, separation | Schema duplication, domain logic in data layer |
| silent-failure-hunter | Error suppression | Silent empty results, parseFormFields coercion |
| code-simplicity-reviewer | DRY, unnecessary complexity | 6x catch blocks, premature cache |

**High-confidence findings** were flagged by 3+ agents independently (P1-A by 3/5, P1-B by 3/5, schema duplication by 3/5).

## Prevention

### Hono + Bun Security Checklist

**Access Control**
- [ ] IP checks use `getConnInfo()`, never request headers
- [ ] Access guards fail closed (503) on error, not open
- [ ] No header-based access control (`Host`, `X-Forwarded-For`)

**Input Validation**
- [ ] Query params validated against allowlists; 400 for invalid values
- [ ] Financial data validated with checksums (IBAN: MOD-97, cards: Luhn)
- [ ] FormData fields checked for `typeof` before coercion
- [ ] Schema definitions centralized -- all contexts derive from same source

**Error Handling**
- [ ] No silent failures (empty 200 for missing/invalid data)
- [ ] Common catch patterns extracted to helpers
- [ ] All catch blocks log errors (no empty blocks)
- [ ] Client receives sanitized messages; logs contain full context

### Key Principles

1. **Never trust request headers for access control.** Headers are user input. Use socket-level info.
2. **Validate enum-like params against allowlists.** Silent empty results are worse than 400 errors.
3. **Guards that gate access must fail closed.** If you can't verify, deny.
4. **Format validation is not enough for financial data.** Always use algorithmic validation (checksums).
5. **Validation logic belongs in exactly one place.** Derive checks from schemas, don't duplicate.
6. **Extract common patterns early.** Six identical catch blocks is five too many.

## Cross-References

- **Prior review:** [scaffold-review-patterns.md](../architecture/scaffold-review-patterns.md) -- established baseline patterns (SQL injection prevention, type consolidation, transaction wrapping). This review found cases where those patterns weren't fully applied in subsequent development.
- **Process:** [pr-testplan-checkboxes-before-merge.md](../process-issues/pr-testplan-checkboxes-before-merge.md) -- testplan verification before merge. This review validates that multi-agent review should complement manual testplan checks.
- **P3 follow-ups:** GitHub issues [#14](https://github.com/Jost17/frea/issues/14), [#15](https://github.com/Jost17/frea/issues/15), [#16](https://github.com/Jost17/frea/issues/16), [#17](https://github.com/Jost17/frea/issues/17), [#18](https://github.com/Jost17/frea/issues/18)
