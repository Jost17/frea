import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { exportAllData, deleteAllBusinessData } from "../src/db/dsgvo-queries";
import { db, initializeSchema } from "../src/db/schema";

describe("FREA-309 DSGVO Datenlöschung & Datenexport", () => {
  beforeAll(() => {
    initializeSchema();
    // Create test data
    db.run("INSERT OR IGNORE INTO clients (id, name) VALUES (1, 'Test-Kunde')");
    db.run("INSERT OR IGNORE INTO projects (id, client_id, code, name, daily_rate) VALUES (1, 1, 'TEST', 'Test-Projekt', 100)");
    db.run("INSERT OR IGNORE INTO invoices (id, invoice_number, client_id, project_id, invoice_date, due_date, period_month, period_year, net_amount, vat_amount, gross_amount) VALUES (1, 'RE-001', 1, 1, '2026-05-19', '2026-06-18', 5, 2026, 1000, 190, 1190)");
  });

  it("should export all business data as JSON", () => {
    const data = exportAllData();

    expect(data.settings).toBeDefined();
    expect(data.clients).toBeDefined();
    expect(Array.isArray(data.clients)).toBe(true);
    expect(data.projects).toBeDefined();
    expect(Array.isArray(data.projects)).toBe(true);
    expect(data.invoices).toBeDefined();
    expect(Array.isArray(data.invoices)).toBe(true);
  });

  it("should have clients in export", () => {
    const data = exportAllData();
    expect(data.clients.length).toBeGreaterThan(0);
  });

  it("should have projects in export", () => {
    const data = exportAllData();
    expect(data.projects.length).toBeGreaterThan(0);
  });

  it("should have invoices in export", () => {
    const data = exportAllData();
    expect(data.invoices.length).toBeGreaterThan(0);
  });

  it("should delete all business data", () => {
    deleteAllBusinessData();

    const clients = db.query("SELECT COUNT(*) as count FROM clients").get() as { count: number };
    const projects = db.query("SELECT COUNT(*) as count FROM projects").get() as { count: number };
    const invoices = db.query("SELECT COUNT(*) as count FROM invoices").get() as { count: number };
    const time_entries = db.query("SELECT COUNT(*) as count FROM time_entries").get() as { count: number };

    expect(clients.count).toBe(0);
    expect(projects.count).toBe(0);
    expect(invoices.count).toBe(0);
    expect(time_entries.count).toBe(0);
  });

  afterAll(() => {
    // Cleanup
    db.run("DELETE FROM invoices");
    db.run("DELETE FROM projects");
    db.run("DELETE FROM clients");
  });
});
