---
status: pending
priority: p2
issue_id: "018"
tags: [code-review, agent-parity, api]
dependencies: []
---

# 018 — Fehlender `POST /api/invoices` Endpoint → Agent-Parity Gap

## Problem Statement

Der PR fügt den vollständigen Invoice-Create-Wizard im UI (`POST /rechnungen/create`) hinzu, aber `src/routes/api.ts` exponiert **keinen** entsprechenden JSON-Endpoint. Ein Paperclip-Agent hat keine programmatische Möglichkeit, eine Rechnung zu erstellen — nur lesen (`GET /api/invoices`) und Status ändern (`PATCH /api/invoices/:id/status`). Das verletzt das Agent-Native-Parity-Prinzip.

## Findings

**Location:** `src/routes/api.ts`

**Vorhandene API-Endpoints:**
- GET `/api/health`
- GET `/api/dashboard/stats`
- GET `/api/invoices` (list)
- PATCH `/api/invoices/:id/status` (status transition)
- PUT `/api/settings/company`

**Fehlend:**
- POST `/api/invoices` — Rechnung erstellen

**Agent-Parity Regel:** Jede UI-Action sollte einem Agent via API verfügbar sein. Ausnahmen nur mit Dokumentation (z.B. "interaktiver Wizard mit Zwischenschritten").

**Onboarding ist abgedeckt:** Durch `PUT /api/settings/company` kann ein Agent die Onboarding-Felder setzen. Invoice-Create ist die einzige Lücke, die diese PR einführt.

**Gefunden von:** code-reviewer (P2-2 agent-parity check).

## Proposed Solutions

### Option A: POST /api/invoices spiegelt UI-Pfad (empfohlen, 30 min)

```ts
app.post("/api/invoices", async (c) => {
  try {
    const parsed = invoiceCreateSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return logAndRespond(c, parsed.error, "Ungültige Rechnungsdaten", 422);
    }

    // Gleiche Ownership-Check + computePreviews Logik wie UI-Route
    const project = getProject(parsed.data.project_id);
    if (!project || project.client_id !== parsed.data.client_id) {
      throw new AppError("Projekt gehört nicht zum ausgewählten Kunden", 400);
    }

    const allEntries = getTimeEntriesForProject(parsed.data.project_id);
    const entryMap = new Map(allEntries.map((e) => [e.id, e]));
    const missing = parsed.data.time_entry_ids.filter((id) => !entryMap.has(id));
    if (missing.length > 0) {
      throw new AppError(`Zeiteinträge nicht auffindbar: ${missing.join(", ")}`, 400);
    }

    const invoice = createInvoice({ ...parsed.data, /* computed fields */ });

    return c.json({
      success: true,
      data: { id: invoice.id, invoice_number: invoice.invoice_number },
    });
  } catch (err) {
    return handleMutationError(c, err, "Rechnung konnte nicht erstellt werden");
  }
});
```

**Effort:** Medium (depends on #012 und #016 fixes)
**Risk:** Low (requireLocalhost middleware schützt vor externen Zugriffen)

### Abhängigkeiten

Diese Todo sollte **nach** #012 (ownership check + N+1 fix) und #016 (sibling-route pattern) gemacht werden, weil der API-Handler die gleiche Business-Logik wiederverwenden muss. Konkret bedeutet das: die Business-Logik aus `invoices.ts` sollte in eine `createInvoiceFromInput(data)` Funktion extrahiert werden, die beide Routes aufrufen.

## Acceptance Criteria

- [ ] `POST /api/invoices` existiert in `api.ts`
- [ ] Nutzt `requireLocalhost` middleware
- [ ] Nutzt `invoiceCreateSchema.safeParse` mit JSON input
- [ ] Returned `{ success, data: { id, invoice_number } }` JSON
- [ ] Business-Logic (ownership, N+1 fix, preview-compute) ist zwischen UI und API geteilt
- [ ] Manueller Test: `curl -X POST http://127.0.0.1:4114/api/invoices -d '...'` funktioniert

## Work Log

- 2026-04-15: Gefunden von code-reviewer agent-parity check in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Dependencies: Todo 012, 016
- Related: `src/routes/api.ts:103` (status update parity pattern)
