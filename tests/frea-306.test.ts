import { describe, it, expect, beforeEach } from "bun:test";
import { createInvoice, getRemainingBalance, addPayment, getPayments } from "../src/db/invoice-queries";
import { initializeSchema, db } from "../src/db/schema";
import { getSettings } from "../src/db/queries";

describe("FREA-306: Reverse Charge & Partial Payments", () => {
  beforeEach(() => {
    initializeSchema();
    // Clean up test data
    db.run("DELETE FROM time_entries");
    db.run("DELETE FROM invoices");
    db.run("DELETE FROM invoice_items");
    db.run("DELETE FROM payments");
    db.run("DELETE FROM projects");
    db.run("DELETE FROM clients");
  });

  function createTestClient(name: string) {
    return db
      .query(
        "INSERT INTO clients (name, vat_id) VALUES (?, ?) RETURNING id",
      )
      .get(name, "DE123456789") as { id: number };
  }

  function createTestProject(clientId: number, dailyRate: number = 500) {
    return db
      .query(
        "INSERT INTO projects (client_id, code, name, daily_rate) VALUES (?, ?, ?, ?) RETURNING id",
      )
      .get(clientId, "TEST", "Test Project", dailyRate) as { id: number };
  }

  function createTestTimeEntry(projectId: number, duration: number = 1) {
    return db
      .query(
        "INSERT INTO time_entries (project_id, date, duration, description, billable) VALUES (?, ?, ?, ?, 1) RETURNING id",
      )
      .get(projectId, "2026-01-01", duration, "Test Work") as { id: number };
  }

  it("should create invoice with reverse_charge flag", () => {
    const settings = getSettings()!;
    const client = createTestClient("EU Client");
    const project = createTestProject(client.id);
    const entry = createTestTimeEntry(project.id, 2);

    const invoiceId = createInvoice(
      {
        client_id: client.id,
        project_id: project.id,
        time_entry_ids: [entry.id],
        invoice_date: "2026-01-15",
        period_month: 1,
        period_year: 2026,
        po_number: "",
        service_period_from: "",
        service_period_to: "",
        reverse_charge: 1,
      },
      [
        {
          id: entry.id,
          project_id: project.id,
          date: "2026-01-01",
          duration: 2,
          description: "Test Work",
          billable: 1,
          invoice_id: null,
          created_at: "",
        },
      ],
      settings,
    );

    const invoice = db.query("SELECT * FROM invoices WHERE id = ?").get(invoiceId) as any;
    expect(invoice.reverse_charge).toBe(1);
    expect(invoice.vat_amount).toBe(0);
    expect(invoice.net_amount).toBe(1000);
    expect(invoice.gross_amount).toBe(1000);
  });

  it("should calculate remaining balance correctly", () => {
    const settings = getSettings()!;
    const client = createTestClient("Test Client");
    const project = createTestProject(client.id);
    const entry = createTestTimeEntry(project.id, 2);

    const invoiceId = createInvoice(
      {
        client_id: client.id,
        project_id: project.id,
        time_entry_ids: [entry.id],
        invoice_date: "2026-01-15",
        period_month: 1,
        period_year: 2026,
        po_number: "",
        service_period_from: "",
        service_period_to: "",
        reverse_charge: 0,
      },
      [
        {
          id: entry.id,
          project_id: project.id,
          date: "2026-01-01",
          duration: 2,
          description: "Test Work",
          billable: 1,
          invoice_id: null,
          created_at: "",
        },
      ],
      settings,
    );

    const remaining = getRemainingBalance(invoiceId);
    expect(remaining).toBe(1190); // 1000 * 1.19 (19% VAT)
  });

  it("should add payment and reduce remaining balance", () => {
    const settings = getSettings()!;
    const client = createTestClient("Test Client");
    const project = createTestProject(client.id);
    const entry = createTestTimeEntry(project.id, 2);

    const invoiceId = createInvoice(
      {
        client_id: client.id,
        project_id: project.id,
        time_entry_ids: [entry.id],
        invoice_date: "2026-01-15",
        period_month: 1,
        period_year: 2026,
        po_number: "",
        service_period_from: "",
        service_period_to: "",
        reverse_charge: 0,
      },
      [
        {
          id: entry.id,
          project_id: project.id,
          date: "2026-01-01",
          duration: 2,
          description: "Test Work",
          billable: 1,
          invoice_id: null,
          created_at: "",
        },
      ],
      settings,
    );

    addPayment(invoiceId, 500, "2026-02-01", "Partial payment");
    const remaining = getRemainingBalance(invoiceId);
    expect(remaining).toBe(690); // 1190 - 500
  });

  it("should track payment history", () => {
    const settings = getSettings()!;
    const client = createTestClient("Test Client");
    const project = createTestProject(client.id);
    const entry = createTestTimeEntry(project.id, 2);

    const invoiceId = createInvoice(
      {
        client_id: client.id,
        project_id: project.id,
        time_entry_ids: [entry.id],
        invoice_date: "2026-01-15",
        period_month: 1,
        period_year: 2026,
        po_number: "",
        service_period_from: "",
        service_period_to: "",
        reverse_charge: 0,
      },
      [
        {
          id: entry.id,
          project_id: project.id,
          date: "2026-01-01",
          duration: 2,
          description: "Test Work",
          billable: 1,
          invoice_id: null,
          created_at: "",
        },
      ],
      settings,
    );

    addPayment(invoiceId, 500, "2026-02-01", "Payment 1");
    const payments = getPayments(invoiceId);
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(500);
    expect(payments[0].payment_date).toBe("2026-02-01");
    expect(payments[0].note).toBe("Payment 1");
  });

  it("should add multiple payments", () => {
    const settings = getSettings()!;
    const client = createTestClient("Test Client");
    const project = createTestProject(client.id);
    const entry = createTestTimeEntry(project.id, 2);

    const invoiceId = createInvoice(
      {
        client_id: client.id,
        project_id: project.id,
        time_entry_ids: [entry.id],
        invoice_date: "2026-01-15",
        period_month: 1,
        period_year: 2026,
        po_number: "",
        service_period_from: "",
        service_period_to: "",
        reverse_charge: 0,
      },
      [
        {
          id: entry.id,
          project_id: project.id,
          date: "2026-01-01",
          duration: 2,
          description: "Test Work",
          billable: 1,
          invoice_id: null,
          created_at: "",
        },
      ],
      settings,
    );

    addPayment(invoiceId, 500, "2026-02-01");
    addPayment(invoiceId, 300, "2026-02-15");

    const remaining = getRemainingBalance(invoiceId);
    expect(remaining).toBe(390); // 1190 - 500 - 300

    const payments = getPayments(invoiceId);
    expect(payments.length).toBe(2);
  });

  it("should auto-mark invoice as paid when balance reaches 0", () => {
    const settings = getSettings()!;
    const client = createTestClient("Test Client");
    const project = createTestProject(client.id);
    const entry = createTestTimeEntry(project.id, 2);

    const invoiceId = createInvoice(
      {
        client_id: client.id,
        project_id: project.id,
        time_entry_ids: [entry.id],
        invoice_date: "2026-01-15",
        period_month: 1,
        period_year: 2026,
        po_number: "",
        service_period_from: "",
        service_period_to: "",
        reverse_charge: 0,
      },
      [
        {
          id: entry.id,
          project_id: project.id,
          date: "2026-01-01",
          duration: 2,
          description: "Test Work",
          billable: 1,
          invoice_id: null,
          created_at: "",
        },
      ],
      settings,
    );

    addPayment(invoiceId, 1190, "2026-02-01");

    const invoice = db.query("SELECT * FROM invoices WHERE id = ?").get(invoiceId) as any;
    expect(invoice.status).toBe("paid");
    expect(invoice.paid_date).not.toBeNull();
  });

  it("should reject payment exceeding remaining balance", () => {
    const settings = getSettings()!;
    const client = createTestClient("Test Client");
    const project = createTestProject(client.id);
    const entry = createTestTimeEntry(project.id, 2);

    const invoiceId = createInvoice(
      {
        client_id: client.id,
        project_id: project.id,
        time_entry_ids: [entry.id],
        invoice_date: "2026-01-15",
        period_month: 1,
        period_year: 2026,
        po_number: "",
        service_period_from: "",
        service_period_to: "",
        reverse_charge: 0,
      },
      [
        {
          id: entry.id,
          project_id: project.id,
          date: "2026-01-01",
          duration: 2,
          description: "Test Work",
          billable: 1,
          invoice_id: null,
          created_at: "",
        },
      ],
      settings,
    );

    try {
      addPayment(invoiceId, 2000, "2026-02-01");
      throw new Error("Should have thrown");
    } catch (err: unknown) {
      const error = err as { message: string };
      expect(error.message).toContain("übersteigt");
    }
  });
});
