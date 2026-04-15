---
status: pending
priority: p2
issue_id: "015"
tags: [code-review, validation, consistency]
dependencies: []
---

# 015 — POST `/rechnungen/:id/status` bypasst `invoiceStatusUpdateSchema`

## Problem Statement

Der UI-facing Status-Update-Handler rollt eine Hand-gestrickte Type-Narrowing mit String-Literal-Vergleich statt das existierende `invoiceStatusUpdateSchema` zu nutzen. Das verletzt Projekt-Regel #3 ("Zod for all inputs") und widerspricht `src/routes/api.ts:103`, das für dieselbe Operation **das Schema korrekt verwendet**.

## Findings

**Location:** `src/routes/invoices.ts:303-312`

```ts
const body = await c.req.parseBody();
const status = typeof body === "object" && body !== null
  ? (body as Record<string, unknown>).status
  : undefined;
if (status !== "sent" && status !== "paid" && status !== "cancelled") {
  return c.text("Ungültiger Status", 400);
}
updateInvoiceStatus(id, status as "sent" | "paid" | "cancelled");
```

Vergleich mit `src/routes/api.ts:103` (die API-Variante derselben Route):
```ts
const parsed = invoiceStatusUpdateSchema.safeParse(await c.req.json());
if (!parsed.success) return logAndRespond(c, parsed.error, "Ungültiger Status", 422);
updateInvoiceStatus(id, parsed.data.status);
```

**Aktuell safe** (weil der Whitelist tight ist und `updateInvoiceStatus` eigene Transition-Guards via `VALID_TRANSITIONS` hat — `src/db/invoice-queries.ts:200`). Aber:

1. Der `as`-Cast ist unnötig sobald Zod narrowt
2. Die Hand-Logik kann drift: wenn Schema erweitert wird (z.B. neuer Status "refunded"), muss die UI-Route manuell nachgezogen werden
3. Kein Server-side Log beim invalid-status path
4. Inkonsistent mit Sibling-Route im gleichen Projekt

**Gefunden von:** kieran-ts (P2-1), security-sentinel (P2-1), silent-failure (P2-6), code-reviewer (P3-6).

## Proposed Solutions

### Option A: Schema parse mit parseBody als Quelle (empfohlen, 5 min)

```ts
const body = await c.req.parseBody();
const parsed = invoiceStatusUpdateSchema.safeParse({ status: body.status });
if (!parsed.success) {
  return logAndRespond(c, parsed.error, "Ungültiger Status", 422);
}
updateInvoiceStatus(id, parsed.data.status);
```

**Effort:** Small | **Risk:** Low

## Acceptance Criteria

- [ ] UI-Route nutzt `invoiceStatusUpdateSchema`
- [ ] Kein `as` type-cast mehr
- [ ] ZodError wird geloggt (via `logAndRespond`)
- [ ] HTTP-Status auf 422 (konsistent mit API-Route)
- [ ] Manueller Test: POST mit invalid status → 422, Log-Eintrag vorhanden

## Work Log

- 2026-04-15: Gefunden von 4 Reviewern in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Referenz: `src/routes/api.ts:103` (correct usage)
- Betroffene Datei: `src/routes/invoices.ts:303-312`
