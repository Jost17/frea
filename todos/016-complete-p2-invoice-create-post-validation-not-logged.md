---
status: pending
priority: p2
issue_id: "016"
tags: [code-review, consistency, error-handling, silent-failure]
dependencies: []
---

# 016 — Invoice create POST divergiert vom Sibling-Route Mutation-Pattern

## Problem Statement

`POST /rechnungen/create` rollt Form-Parsing und Validation-Error-Handling selbst, statt das projekt-etablierte Muster von `clients.ts` / `projects.ts` / `times.ts` zu nutzen. Resultat: Kein Server-Log bei Zod-Failures, inkonsistenter HTTP-Status (400 statt 422), doppelte Form-Parse-Logik.

## Findings

**Location:** `src/routes/invoices.ts:190-256`

```ts
const formData = await c.req.formData();
const timeEntryIds = formData.getAll("time_entry_ids").map(/* ... */);
// ... weitere formData.get() Calls ...

const rawData = { /* hand-built object */ };
const parsed = invoiceCreateSchema.safeParse(rawData);
if (!parsed.success) {
  const errors = parsed.error.issues.map((i) => i.message).join(", ");
  return c.text(`Validierungsfehler: ${errors}`, 400);
}
```

**Vergleich mit `src/routes/clients.ts:141-153`** (das Muster):
```ts
try {
  const body = await c.req.formData();
  const fields = parseFormFields(body, CLIENT_FIELDS);
  const data = clientCreateSchema.parse(fields);  // throws ZodError
  insertClient(data);
  return c.redirect("/kunden");
} catch (err) {
  return handleMutationError(c, err, "Kunde konnte nicht erstellt werden");
}
```

**Inkonsistenzen:**
1. **Kein Logging bei Zod failure** — wenn Form wegen Template-Bug malformed data schickt, gibt's null Trace. `handleMutationError` würde ZodError via `logAndRespond` loggen.
2. **HTTP 400 vs. 422** — `clients`/`projects`/`times` geben 422 bei Validation, `invoices.ts` 400.
3. **`safeParse` vs. `parse`+throw** — der Rest der Codebase wirft ZodError und lässt `handleMutationError` es abfangen.
4. **`parseFormFields` nicht genutzt** — der shared Helper, der Form→typed object konvertiert. `invoices.ts` rollt raw `formData.get("field")` Calls.

**Gefunden von:** silent-failure (P2-4), code-reviewer (P2-4).

## Proposed Solutions

### Option A: Full alignment mit Sibling Pattern (empfohlen, 20 min)

```ts
app.post("/rechnungen/create", async (c) => {
  try {
    const formData = await c.req.formData();

    // time_entry_ids ist multi-value, bleibt separat
    const timeEntryIds = formData
      .getAll("time_entry_ids")
      .map((id) => Number(id))
      .filter((n) => Number.isInteger(n) && n > 0);

    const fields = parseFormFields(formData, INVOICE_CREATE_FIELDS);
    const data = invoiceCreateSchema.parse({ ...fields, time_entry_ids: timeEntryIds });

    // ... ownership check + createInvoice ...

    return c.redirect("/rechnungen");
  } catch (err) {
    return handleMutationError(c, err, "Rechnung konnte nicht erstellt werden");
  }
});
```

Plus: `INVOICE_CREATE_FIELDS` descriptor konstante hinzufügen (siehe clients.ts:14-27 pattern).

**Effort:** Medium | **Risk:** Low

## Acceptance Criteria

- [ ] `parseFormFields` helper wird genutzt
- [ ] `invoiceCreateSchema.parse()` (throws) statt `.safeParse()`
- [ ] Outer `try/catch` mit `handleMutationError` als einziger Error-Path
- [ ] HTTP-Status: 422 für Validation, 500 für System-Errors
- [ ] Server-Log enthält Zod-Error bei Validation-Failure
- [ ] `INVOICE_CREATE_FIELDS` descriptor-konstante hinzugefügt
- [ ] Manueller Test: POST mit missing field → 422 + Log-Eintrag

## Work Log

- 2026-04-15: Gefunden von silent-failure-hunter + code-reviewer in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Referenz: `src/routes/clients.ts:141-153`, `src/routes/projects.ts`, `src/routes/times.ts`
- Betroffene Datei: `src/routes/invoices.ts:190-256`
