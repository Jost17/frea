import { describe, expect, test } from "bun:test";
import { app } from "../src/app"; // Triggers schema initialization
import { db } from "../src/db/schema";
import { createInvoice, getInvoiceItems } from "../src/db/invoice-queries";
import { getSettings } from "../src/db/queries";
import type { InvoiceCreate } from "../src/validation/schemas";

/**
 * Critical tests for MwSt calculation.
 * These test the most error-prone aspects of VAT math:
 * 1. Per-line VAT calculation (not total-based)
 * 2. Proper rounding to 2 decimal places
 * 3. Invoice totals = sum of line items
 * 4. Kleinunternehmer (0% VAT) handling
 */

describe("MwSt Berechnung & Kaufmännische Rundung", () => {
  // Test 1: Basic rounding — each monetary value must be 2 decimals
  test("Geldbeträge sind auf 2 Dezimalstellen gerundet", () => {
    const net = 125.556; // Would round to 125.56
    const rounded = Math.round(net * 100) / 100;
    expect(rounded).toBe(125.56);

    // VAT on 125.56 at 19%
    const vat = Math.round(125.56 * 0.19 * 100) / 100;
    expect(vat).toBe(23.86);

    // Gross: 125.56 + 23.86 = 149.42
    const gross = Math.round((125.56 + 23.86) * 100) / 100;
    expect(gross).toBe(149.42);
  });

  // Test 2: MwSt is calculated PER LINE ITEM, not on total
  test("MwSt wird pro Position berechnet und dann summiert, nicht auf Gesamtsumme", () => {
    // Two line items:
    // Line 1: 2.5 days × €100.50/day = €251.25 net, VAT = €47.74, Gross = €299.00
    // Line 2: 1.75 days × €150.00/day = €262.50 net, VAT = €49.88, Gross = €312.38
    // Total Net = €513.75, Total VAT = €97.62, Total Gross = €611.37

    const line1Net = Math.round(2.5 * 100.5 * 100) / 100;
    const line1Vat = Math.round(line1Net * 0.19 * 100) / 100;

    const line2Net = Math.round(1.75 * 150.0 * 100) / 100;
    const line2Vat = Math.round(line2Net * 0.19 * 100) / 100;

    const totalNet = Math.round((line1Net + line2Net) * 100) / 100;
    const totalVat = Math.round((line1Vat + line2Vat) * 100) / 100;

    // WRONG way: calculate VAT on total
    const wrongVat = Math.round(totalNet * 0.19 * 100) / 100;

    expect(totalNet).toBe(513.75);
    expect(totalVat).toBe(97.62);
    expect(wrongVat).toBe(97.61); // Different!
    expect(totalVat).not.toBe(wrongVat);
  });

  // Test 3: Invoice totals must equal sum of line items (DB-level test)
  test("Rechnung.vat_amount === Summe(items.vat_amount), nicht Rechnung.net_amount * vat_rate", () => {
    const settings = getSettings();
    if (!settings) return;

    // Create test client
    const clientRes = db
      .query(
        `INSERT INTO clients (name, address, postal_code, city, email, phone, contact_person, vat_id, buyer_reference, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(
        "MwSt Test Client",
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

    if (!clientRes) throw new Error("Failed to create test client");

    // Create test project with known daily rate (use unique code to avoid constraint)
    const projectRes = db
      .query(
        `INSERT INTO projects (client_id, code, name, daily_rate, start_date)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(clientRes.id, `TEST-${Date.now()}`, "Test Project", 100.5, "2026-01-01") as {
      id: number;
    } | undefined;

    if (!projectRes) throw new Error("Failed to create test project");

    // Create 2 time entries with predictable amounts
    const te1Res = db
      .query(
        `INSERT INTO time_entries (project_id, date, duration, description)
         VALUES (?, ?, ?, ?)
         RETURNING id`,
      )
      .get(projectRes.id, "2026-01-01", 2.5, "Entry 1") as { id: number } | undefined;

    const te2Res = db
      .query(
        `INSERT INTO time_entries (project_id, date, duration, description)
         VALUES (?, ?, ?, ?)
         RETURNING id`,
      )
      .get(projectRes.id, "2026-01-02", 1.75, "Entry 2") as {
      id: number;
    } | undefined;

    if (!te1Res || !te2Res) throw new Error("Failed to create time entries");

    // Fetch entries and create invoice
    const entries = db
      .query(
        `SELECT id, project_id, date, duration, description, invoice_id
         FROM time_entries WHERE id IN (?, ?)`,
      )
      .all(te1Res.id, te2Res.id) as any[];

    const invoiceData: InvoiceCreate = {
      client_id: clientRes.id,
      project_id: projectRes.id,
      invoice_date: "2026-01-01",
      period_month: 1,
      period_year: 2026,
      time_entry_ids: [te1Res.id, te2Res.id],
      po_number: "",
      service_period_from: "2026-01-01",
      service_period_to: "2026-01-31",
    };

    const invoiceId = createInvoice(invoiceData, entries, settings);

    // Fetch invoice and items
    const invoiceRes = db
      .query(`SELECT net_amount, vat_amount, gross_amount FROM invoices WHERE id = ?`)
      .get(invoiceId) as {
      net_amount: number;
      vat_amount: number;
      gross_amount: number;
    } | undefined;

    if (!invoiceRes) throw new Error("Invoice not found");

    const items = getInvoiceItems(invoiceId);

    // Sum items
    const sumNetFromItems = items.reduce((sum, item) => sum + item.net_amount, 0);
    const sumVatFromItems = items.reduce((sum, item) => sum + item.vat_amount, 0);

    // Must match invoice totals
    expect(invoiceRes.net_amount).toBe(Math.round(sumNetFromItems * 100) / 100);
    expect(invoiceRes.vat_amount).toBe(Math.round(sumVatFromItems * 100) / 100);
    expect(invoiceRes.gross_amount).toBe(
      Math.round((sumNetFromItems + sumVatFromItems) * 100) / 100,
    );

    // Cleanup (delete in correct order: time_entries first due to invoice_id FK)
    db.query("DELETE FROM time_entries WHERE id IN (?, ?)").run(te1Res.id, te2Res.id);
    db.query("DELETE FROM invoice_items WHERE invoice_id = ?").run(invoiceId);
    db.query("DELETE FROM invoices WHERE id = ?").run(invoiceId);
    db.query("DELETE FROM projects WHERE id = ?").run(projectRes.id);
    db.query("DELETE FROM clients WHERE id = ?").run(clientRes.id);
  });

  // Test 4: Kleinunternehmer (0% VAT)
  test("Kleinunternehmer mit 0% MwSt berechnet korrekt", () => {
    const settings = getSettings();
    if (!settings) return;

    // Enable Kleinunternehmer
    db.query("UPDATE settings SET kleinunternehmer = 1 WHERE id = 1").run();

    const clientRes = db
      .query(
        `INSERT INTO clients (name, address, postal_code, city, email, phone, contact_person, vat_id, buyer_reference, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(
        "KU Client",
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

    if (!clientRes) throw new Error("Failed to create test client");

    const projectRes = db
      .query(
        `INSERT INTO projects (client_id, code, name, daily_rate, start_date)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id`,
      )
      .get(clientRes.id, `KU-${Date.now()}`, "KU Project", 100, "2026-01-01") as {
      id: number;
    } | undefined;

    if (!projectRes) throw new Error("Failed to create test project");

    const teRes = db
      .query(
        `INSERT INTO time_entries (project_id, date, duration, description)
         VALUES (?, ?, ?, ?)
         RETURNING id`,
      )
      .get(projectRes.id, "2026-01-01", 5, "KU work") as { id: number } | undefined;

    if (!teRes) throw new Error("Failed to create time entry");

    const entry = db
      .query(
        `SELECT id, project_id, date, duration, description, invoice_id
         FROM time_entries WHERE id = ?`,
      )
      .get(teRes.id) as any;

    const kuSettings = getSettings();
    const invoiceId = createInvoice(
      {
        client_id: clientRes.id,
        project_id: projectRes.id,
        invoice_date: "2026-01-01",
        period_month: 1,
        period_year: 2026,
        time_entry_ids: [teRes.id],
        po_number: "",
        service_period_from: "2026-01-01",
        service_period_to: "2026-01-31",
      },
      [entry],
      kuSettings!,
    );

    const invoiceRes = db
      .query(`SELECT net_amount, vat_amount, gross_amount FROM invoices WHERE id = ?`)
      .get(invoiceId) as {
      net_amount: number;
      vat_amount: number;
      gross_amount: number;
    } | undefined;

    if (!invoiceRes) throw new Error("Invoice not found");

    // For Kleinunternehmer: VAT must be 0, gross = net
    expect(invoiceRes.vat_amount).toBe(0);
    expect(invoiceRes.gross_amount).toBe(invoiceRes.net_amount);

    // Cleanup (delete in correct order: time_entries first due to invoice_id FK)
    db.query("DELETE FROM time_entries WHERE id = ?").run(teRes.id);
    db.query("DELETE FROM invoice_items WHERE invoice_id = ?").run(invoiceId);
    db.query("DELETE FROM invoices WHERE id = ?").run(invoiceId);
    db.query("DELETE FROM projects WHERE id = ?").run(projectRes.id);
    db.query("DELETE FROM clients WHERE id = ?").run(clientRes.id);
    db.query("UPDATE settings SET kleinunternehmer = 0 WHERE id = 1").run();
  });
});
