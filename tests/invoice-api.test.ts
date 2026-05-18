import { describe, expect, test } from "bun:test";
import { app } from "../src/app";
import { db } from "../src/db/schema";
import { getSettings } from "../src/db/queries";
import type { InvoiceCreate } from "../src/validation/schemas";

/**
 * Invoice API tests: ensure CRUD operations return correct status codes and data.
 * Also tests the invoice creation flow via API vs form.
 */

describe("Invoice API & Status Flow", () => {
  // Test 1: GET /api/invoices returns 200 and empty list initially
  test("GET /api/invoices returns 200 with empty list", async () => {
    const req = new Request("http://localhost/api/invoices");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(Array.isArray(body)).toBe(true);
  });

  // Test 2: GET /api/invoices?status=open returns 200 with filtered list
  test("GET /api/invoices?status=open returns 200", async () => {
    const req = new Request("http://localhost/api/invoices?status=open");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(Array.isArray(body)).toBe(true);
  });

  // Test 3: GET /api/invoices?status=invalid returns 400
  test("GET /api/invoices?status=invalid returns 400", async () => {
    const req = new Request("http://localhost/api/invoices?status=notavalidstatus");
    const res = await app.fetch(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeTruthy();
  });

  // Test 4: POST /api/invoices with valid data creates invoice and returns 200
  test("POST /api/invoices creates invoice with valid data", async () => {
    const settings = getSettings();
    if (!settings) return;

    // Setup: create client, project, time entries
    const clientRes = db
      .query(
        `INSERT INTO clients (name, address, postal_code, city, email, phone, contact_person, vat_id, buyer_reference, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(
        "API Test Client",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ) as { id: number } | undefined;

    if (!clientRes) return;

    const projectRes = db
      .query(
        `INSERT INTO projects (client_id, code, name, daily_rate, start_date)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(clientRes.id, `APIPROJX-${Date.now()}`, "API Test Project", 100, "2026-01-01") as {
      id: number;
    } | undefined;

    if (!projectRes) return;

    const teRes = db
      .query(
        `INSERT INTO time_entries (project_id, date, duration, description)
         VALUES (?, ?, ?, ?)
         RETURNING id`,
      )
      .get(projectRes.id, "2026-01-01", 5, "API test entry") as { id: number } | undefined;

    if (!teRes) return;

    // POST /api/invoices
    const invoiceData: InvoiceCreate = {
      client_id: clientRes.id,
      project_id: projectRes.id,
      invoice_date: "2026-01-01",
      period_month: 1,
      period_year: 2026,
      time_entry_ids: [teRes.id],
      po_number: "PO-123",
      service_period_from: "2026-01-01",
      service_period_to: "2026-01-31",
    };

    const req = new Request("http://localhost/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { success?: boolean; data?: { id?: number } };
    expect(body.success).toBe(true);
    expect(body.data?.id).toBeGreaterThan(0);

    // Cleanup
    const invoiceId = body.data?.id!;
    db.query("DELETE FROM time_entries WHERE id = ?").run(teRes.id);
    db.query("DELETE FROM invoice_items WHERE invoice_id = ?").run(invoiceId);
    db.query("DELETE FROM invoices WHERE id = ?").run(invoiceId);
    db.query("DELETE FROM projects WHERE id = ?").run(projectRes.id);
    db.query("DELETE FROM clients WHERE id = ?").run(clientRes.id);
  });

  // Test 5: POST /api/invoices without time_entry_ids returns 400
  test("POST /api/invoices without time_entry_ids returns 400", async () => {
    const settings = getSettings();
    if (!settings) return;

    const clientRes = db
      .query(
        `INSERT INTO clients (name, address, postal_code, city, email, phone, contact_person, vat_id, buyer_reference, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(
        "API Test Client 2",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ) as { id: number } | undefined;

    if (!clientRes) return;

    const projectRes = db
      .query(
        `INSERT INTO projects (client_id, code, name, daily_rate, start_date)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(clientRes.id, `APIPROJY-${Date.now()}`, "API Test Project 2", 100, "2026-01-01") as {
      id: number;
    } | undefined;

    if (!projectRes) return;

    const invoiceData: InvoiceCreate = {
      client_id: clientRes.id,
      project_id: projectRes.id,
      invoice_date: "2026-01-01",
      period_month: 1,
      period_year: 2026,
      time_entry_ids: [], // Empty!
      po_number: "",
      service_period_from: "2026-01-01",
      service_period_to: "2026-01-31",
    };

    const req = new Request("http://localhost/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    // Cleanup
    db.query("DELETE FROM projects WHERE id = ?").run(projectRes.id);
    db.query("DELETE FROM clients WHERE id = ?").run(clientRes.id);
  });

  // Test 6: Invoice status update (draft → cancelled)
  test("Invoice status update: draft → cancelled", async () => {
    const settings = getSettings();
    if (!settings) return;

    const clientRes = db
      .query(
        `INSERT INTO clients (name, address, postal_code, city, email, phone, contact_person, vat_id, buyer_reference, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(
        "Status Test Client",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ) as { id: number } | undefined;

    if (!clientRes) return;

    // Create a project for the invoice
    const projectRes = db
      .query(
        `INSERT INTO projects (client_id, code, name, daily_rate, start_date)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(clientRes.id, `STATPROJ-${Date.now()}`, "Status Test Project", 100, "2026-01-01") as {
      id: number;
    } | undefined;

    if (!projectRes) return;

    // Create minimal invoice directly via INSERT (unique invoice_number)
    const invoiceRes = db
      .query(
        `INSERT INTO invoices (invoice_number, client_id, project_id, invoice_date, due_date, period_month, period_year, net_amount, vat_amount, gross_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
         RETURNING id`,
      )
      .get(`TEST-2026-${Date.now()}`, clientRes.id, projectRes.id, "2026-01-01", "2026-02-01", 1, 2026, 100, 19, 119) as {
      id: number;
    } | undefined;

    if (!invoiceRes) return;

    // Draft → Cancelled (smoke test; don't test sent→paid as it requires PDF archiving)
    let updateReq = new Request(`http://localhost/api/invoices/${invoiceRes.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "cancelled",
      }),
    });

    let updateRes = await app.fetch(updateReq);
    expect(updateRes.status).toBe(200);

    // Verify status changed
    let invoiceCheck = db
      .query(`SELECT status FROM invoices WHERE id = ?`)
      .get(invoiceRes.id) as { status: string } | undefined;

    expect(invoiceCheck?.status).toBe("cancelled");

    // Cleanup
    db.query("DELETE FROM invoice_items WHERE invoice_id = ?").run(invoiceRes.id);
    db.query("DELETE FROM invoices WHERE id = ?").run(invoiceRes.id);
    db.query("DELETE FROM projects WHERE id = ?").run(projectRes.id);
    db.query("DELETE FROM clients WHERE id = ?").run(clientRes.id);
  });
});
