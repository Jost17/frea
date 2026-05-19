import { beforeAll, describe, expect, test } from "bun:test";
import { app } from "../src/app";
import { getInvoice, getInvoiceItems, roundToEuro } from "../src/db/invoice-queries";
import { db, initializeSchema } from "../src/db/schema";

beforeAll(() => {
  initializeSchema();
  db.run("UPDATE settings SET onboarding_complete = 1 WHERE id = 1");
});

function postForm(path: string, fields: Record<string, string | string[]>) {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(fields)) {
    if (Array.isArray(val)) {
      for (const v of val) params.append(key, v);
    } else {
      params.append(key, val);
    }
  }
  return app.fetch(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }),
  );
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

function seedClient(): number {
  const res = db
    .query<{ id: number }, []>(
      `INSERT INTO clients (name, address, postal_code, city, email)
       VALUES ('Testfirma AG','Teststr. 1','10115','Berlin','test@ag.de') RETURNING id`,
    )
    .get();
  if (!res) throw new Error("client seed failed");
  return res.id;
}

let _seedCounter = 0;

function seedProject(clientId: number): number {
  const code = `TP-${++_seedCounter}`;
  const res = db
    .query<{ id: number }, [number, string]>(
      `INSERT INTO projects (client_id, name, code, daily_rate, start_date)
       VALUES (?,'Testprojekt',?,800,'2026-01-01') RETURNING id`,
    )
    .get(clientId, code);
  if (!res) throw new Error("project seed failed");
  return res.id;
}

function seedTimeEntry(projectId: number, days = 1): number {
  const res = db
    .query<{ id: number }, [number, number]>(
      `INSERT INTO time_entries (project_id, date, duration, description, billable)
       VALUES (?, '2026-01-15', ?, 'Entwicklung', 1) RETURNING id`,
    )
    .get(projectId, days);
  if (!res) throw new Error("time entry seed failed");
  return res.id;
}

// ─── Invoice CRUD integration ─────────────────────────────────────────────────

describe("Invoice CRUD — integration", () => {
  test("GET /rechnungen lists invoices (empty state)", async () => {
    const res = await app.fetch(new Request("http://localhost/rechnungen"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Rechnung");
  });

  test("GET /rechnungen/create returns client selection form", async () => {
    const res = await app.fetch(new Request("http://localhost/rechnungen/create"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Rechnung");
  });

  test("POST /rechnungen/create creates invoice and redirects to detail", async () => {
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const entryId = seedTimeEntry(projectId, 2);

    const res = await postForm("/rechnungen/create", {
      client_id: String(clientId),
      project_id: String(projectId),
      invoice_date: "2026-05-01",
      period_month: "5",
      period_year: "2026",
      po_number: "",
      time_entry_ids: [String(entryId)],
    });

    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toMatch(/^\/rechnungen\/\d+$/);

    const invoiceId = parseInt(location.split("/").pop()!, 10);
    const invoice = getInvoice(invoiceId);
    expect(invoice).not.toBeNull();
    expect(invoice!.status).toBe("draft");
    expect(invoice!.client_id).toBe(clientId);
  });

  test("GET /rechnungen/:id shows invoice detail", async () => {
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const entryId = seedTimeEntry(projectId);

    const createRes = await postForm("/rechnungen/create", {
      client_id: String(clientId),
      project_id: String(projectId),
      invoice_date: "2026-05-01",
      period_month: "5",
      period_year: "2026",
      po_number: "",
      time_entry_ids: [String(entryId)],
    });
    const invoiceId = parseInt((createRes.headers.get("location") ?? "").split("/").pop()!, 10);

    const res = await app.fetch(new Request(`http://localhost/rechnungen/${invoiceId}`));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Rechnung");
  });
});

// ─── Invoice item sum invariant ───────────────────────────────────────────────

describe("Invoice item sum invariant", () => {
  test("invoice.vat_amount === sum(items.vat_amount)", async () => {
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    // Multiple entries to test multi-line sum
    const entry1 = seedTimeEntry(projectId, 1);
    const entry2 = seedTimeEntry(projectId, 3);

    const createRes = await postForm("/rechnungen/create", {
      client_id: String(clientId),
      project_id: String(projectId),
      invoice_date: "2026-05-01",
      period_month: "5",
      period_year: "2026",
      po_number: "",
      time_entry_ids: [String(entry1), String(entry2)],
    });
    const invoiceId = parseInt((createRes.headers.get("location") ?? "").split("/").pop()!, 10);

    const invoice = getInvoice(invoiceId)!;
    const items = getInvoiceItems(invoiceId);

    const sumNet = roundToEuro(items.reduce((acc, i) => acc + i.net_amount, 0));
    const sumVat = roundToEuro(items.reduce((acc, i) => acc + i.vat_amount, 0));
    const sumGross = roundToEuro(items.reduce((acc, i) => acc + i.gross_amount, 0));

    expect(invoice.net_amount).toBe(sumNet);
    expect(invoice.vat_amount).toBe(sumVat);
    expect(invoice.gross_amount).toBe(sumGross);
    // Brutto = Netto + MwSt (max 0.01 Rundungsdifferenz über alle Zeilen)
    expect(Math.abs(invoice.gross_amount - (invoice.net_amount + invoice.vat_amount))).toBeLessThan(
      0.01 * items.length + 0.001,
    );
  });
});

// ─── E2E: Invoice status pipeline ────────────────────────────────────────────

describe("E2E: Invoice status pipeline (draft → sent → paid)", () => {
  async function createTestInvoice(): Promise<number> {
    const clientId = seedClient();
    const projectId = seedProject(clientId);
    const entryId = seedTimeEntry(projectId);

    const res = await postForm("/rechnungen/create", {
      client_id: String(clientId),
      project_id: String(projectId),
      invoice_date: "2026-05-01",
      period_month: "5",
      period_year: "2026",
      po_number: "",
      time_entry_ids: [String(entryId)],
    });
    return parseInt((res.headers.get("location") ?? "").split("/").pop()!, 10);
  }

  test("draft → sent via POST /:id/status", async () => {
    const id = await createTestInvoice();
    expect(getInvoice(id)!.status).toBe("draft");

    const res = await postForm(`/rechnungen/${id}/status`, { status: "sent" });
    expect(res.status).toBe(302);
    expect(getInvoice(id)!.status).toBe("sent");
  });

  test("sent → paid sets paid_date", async () => {
    const id = await createTestInvoice();
    await postForm(`/rechnungen/${id}/status`, { status: "sent" });

    const res = await postForm(`/rechnungen/${id}/status`, { status: "paid" });
    expect(res.status).toBe(302);

    const invoice = getInvoice(id)!;
    expect(invoice.status).toBe("paid");
    expect(invoice.paid_date).not.toBeNull();
  });

  test("paid → sent is rejected (invalid transition)", async () => {
    const id = await createTestInvoice();
    await postForm(`/rechnungen/${id}/status`, { status: "sent" });
    await postForm(`/rechnungen/${id}/status`, { status: "paid" });

    // After paid, no further transitions allowed
    await postForm(`/rechnungen/${id}/status`, { status: "sent" });
    // Should redirect back (AppError caught) or return 4xx — not 302 to a different page
    const invoice = getInvoice(id)!;
    expect(invoice.status).toBe("paid"); // unchanged
  });

  test("draft → cancelled is allowed", async () => {
    const id = await createTestInvoice();
    const res = await postForm(`/rechnungen/${id}/status`, { status: "cancelled" });
    expect(res.status).toBe(302);
    expect(getInvoice(id)!.status).toBe("cancelled");
  });

  test("draft → paid is rejected (skipping sent)", async () => {
    const id = await createTestInvoice();
    await postForm(`/rechnungen/${id}/status`, { status: "paid" });
    // Status must remain draft
    expect(getInvoice(id)!.status).toBe("draft");
  });

  test("full pipeline audit log has status_change entries", async () => {
    const id = await createTestInvoice();
    await postForm(`/rechnungen/${id}/status`, { status: "sent" });
    await postForm(`/rechnungen/${id}/status`, { status: "paid" });

    const logs = db
      .query<{ action: string; changes: string }, [string, number]>(
        "SELECT action, changes FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY id",
      )
      .all("invoice", id);

    const statusChanges = logs.filter((l) => l.action === "status_change");
    expect(statusChanges.length).toBeGreaterThanOrEqual(2);

    const [toSent, toPaid] = statusChanges;
    expect(JSON.parse(toSent.changes)).toMatchObject({ from: "draft", to: "sent" });
    expect(JSON.parse(toPaid.changes)).toMatchObject({ from: "sent", to: "paid" });
  });
});
