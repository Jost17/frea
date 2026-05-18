import { describe, expect, test, beforeEach } from "bun:test";
import { AppError } from "../src/middleware/error-handler";
import {
  getDunnableInvoices,
  getDunnableCount,
  triggerDunning,
  getDunningRunsForInvoice,
  getDunningSettings,
} from "../src/db/dunning-queries";
import { db } from "../src/db/schema";

// Helper: Create test project
function createTestProject(clientId: number): number {
  const projectCode = `TEST-${Math.floor(Math.random() * 100000)}`;
  const result = db
    .query(
      `INSERT INTO projects (client_id, code, name, daily_rate)
       VALUES (?, ?, ?, ?)`,
    )
    .run(clientId, projectCode, "Test Project", 600.0);

  return result.lastInsertRowid as number;
}

// Helper: Create test client
function createTestClient(): number {
  const result = db
    .query(
      `INSERT INTO clients (name, email, address, postal_code, city, country)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run("Test Client", "client@test.de", "Teststr. 1", "10115", "Berlin", "Deutschland");

  return result.lastInsertRowid as number;
}

// Helper: Create test invoice and return ID
function createTestInvoice(overrides: {
  client_id?: number;
  status?: string;
  due_date?: string;
  reminder_level?: number;
} = {}) {
  const clientId = overrides.client_id ?? createTestClient();
  const projectId = createTestProject(clientId);
  const status = overrides.status ?? "sent";
  const dueDate = overrides.due_date ?? "2026-05-10"; // Past date
  const reminderLevel = overrides.reminder_level ?? 0;

  const invoiceNumber = `RE-${Math.floor(Math.random() * 100000)}`;

  const result = db
    .query(
      `INSERT INTO invoices
       (invoice_number, client_id, project_id, invoice_date, due_date, period_month, period_year, net_amount, vat_amount, gross_amount, status, reminder_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      invoiceNumber,
      clientId,
      projectId,
      "2026-05-01",
      dueDate,
      5,
      2026,
      100.0,
      19.0,
      119.0,
      status,
      reminderLevel,
    );

  return result.lastInsertRowid as number;
}

describe("Dunning Module", () => {
  beforeEach(() => {
    // Clear tables in correct order (foreign keys)
    // Note: audit_log is GoBD-protected and cannot be deleted
    db.query("DELETE FROM dunning_runs").run();
    db.query("DELETE FROM time_entries").run();
    db.query("DELETE FROM invoice_items").run();
    db.query("DELETE FROM invoices").run();
    db.query("DELETE FROM projects").run();
    db.query("DELETE FROM clients").run();
    db.query("DELETE FROM dunning_settings").run();

    // Insert default dunning settings (3 levels)
    db.query(
      `INSERT INTO dunning_settings (level, days_after_due, fee_amount, subject, body)
       VALUES (1, 7, 0, "1. Mahnung", "Bitte begleichen Sie..."),
              (2, 14, 5, "2. Mahnung", "Zweite Mahnung..."),
              (3, 28, 10, "3. Mahnung (Letzte Zahlungsaufforderung)", "Final notice...")`,
    ).run();
  });

  describe("getDunnableInvoices()", () => {
    test("should return empty list when no invoices exist", () => {
      const invoices = getDunnableInvoices();
      expect(invoices).toEqual([]);
    });

    test("should return invoices with status 'sent' that are overdue", () => {
      createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 0,
      });

      const invoices = getDunnableInvoices();
      expect(invoices.length).toBe(1);
      expect(invoices[0].reminder_level).toBe(0);
      expect(invoices[0].days_overdue).toBeGreaterThan(0);
      expect(invoices[0].invoice_number).toMatch(/^RE-/);
    });

    test("should exclude invoices with future due dates", () => {
      createTestInvoice({
        due_date: "2026-12-31", // Future
        status: "sent",
      });

      const invoices = getDunnableInvoices();
      expect(invoices).toEqual([]);
    });

    test("should exclude invoices that are not in 'sent' status", () => {
      createTestInvoice({
        due_date: "2026-05-10",
        status: "draft",
      });

      const invoices = getDunnableInvoices();
      expect(invoices).toEqual([]);
    });

    test("should exclude invoices already at reminder level 3", () => {
      createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 3,
      });

      const invoices = getDunnableInvoices();
      expect(invoices).toEqual([]);
    });

    test("should include invoices at reminder levels 0, 1, and 2", () => {
      const id1 = createTestInvoice({ reminder_level: 0, due_date: "2026-05-10" });
      const id2 = createTestInvoice({ reminder_level: 1, due_date: "2026-05-10" });
      const id3 = createTestInvoice({ reminder_level: 2, due_date: "2026-05-10" });

      const invoices = getDunnableInvoices();
      expect(invoices.length).toBe(3);
      const ids = invoices.map((i: any) => i.id);
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
      expect(ids).toContain(id3);
    });

    test("should include next fee and threshold info", () => {
      createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 0,
      });

      const invoices = getDunnableInvoices();
      expect(invoices[0]).toHaveProperty("next_fee");
      expect(invoices[0]).toHaveProperty("next_days_threshold");
      expect(invoices[0].next_fee).toBe(0);
      expect(invoices[0].next_days_threshold).toBe(7);
    });
  });

  describe("getDunnableCount()", () => {
    test("should return 0 when no dunnable invoices", () => {
      const count = getDunnableCount();
      expect(count).toBe(0);
    });

    test("should count overdue sent invoices under level 3", () => {
      createTestInvoice({ due_date: "2026-05-10", status: "sent", reminder_level: 0 });
      createTestInvoice({ due_date: "2026-05-10", status: "sent", reminder_level: 1 });
      createTestInvoice({ due_date: "2026-05-10", status: "sent", reminder_level: 3 });

      const count = getDunnableCount();
      expect(count).toBe(2);
    });
  });

  describe("triggerDunning()", () => {
    test("should increase reminder level from 0 to 1", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 0,
      });

      triggerDunning(invoiceId);

      const updated = db
        .query<{ reminder_level: number }, [number]>(
          "SELECT reminder_level FROM invoices WHERE id = ?",
        )
        .get(invoiceId);

      expect(updated?.reminder_level).toBe(1);
    });

    test("should increase reminder level from 1 to 2", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 1,
      });

      triggerDunning(invoiceId);

      const updated = db
        .query<{ reminder_level: number }, [number]>(
          "SELECT reminder_level FROM invoices WHERE id = ?",
        )
        .get(invoiceId);

      expect(updated?.reminder_level).toBe(2);
    });

    test("should increase reminder level from 2 to 3", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 2,
      });

      triggerDunning(invoiceId);

      const updated = db
        .query<{ reminder_level: number }, [number]>(
          "SELECT reminder_level FROM invoices WHERE id = ?",
        )
        .get(invoiceId);

      expect(updated?.reminder_level).toBe(3);
    });

    test("should create dunning_runs entry with correct fee", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 0,
      });

      triggerDunning(invoiceId);

      const runs = getDunningRunsForInvoice(invoiceId);
      expect(runs.length).toBe(1);
      expect(runs[0]).toMatchObject({
        invoice_id: invoiceId,
        level: 1,
        fee_amount: 0,
      });
    });

    test("should create audit log entry for dunning trigger", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 0,
      });

      triggerDunning(invoiceId);

      const auditLogs = db
        .query<{ action: string }, [number, string]>(
          "SELECT action FROM audit_log WHERE entity_id = ? AND entity_type = ?",
        )
        .all(invoiceId, "invoice");

      const dunningLog = auditLogs.find((log) => log.action === "status_change");
      expect(dunningLog).toBeDefined();
    });

    test("should throw AppError when invoice not found", () => {
      expect(() => {
        triggerDunning(999);
      }).toThrow();

      const error = (() => {
        try {
          triggerDunning(999);
        } catch (e) {
          return e;
        }
      })();

      if (error instanceof AppError) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toContain("Rechnung nicht gefunden");
      }
    });

    test("should throw AppError when invoice is not in 'sent' status", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-05-10",
        status: "draft",
        reminder_level: 0,
      });

      expect(() => {
        triggerDunning(invoiceId);
      }).toThrow();

      const error = (() => {
        try {
          triggerDunning(invoiceId);
        } catch (e) {
          return e;
        }
      })();

      if (error instanceof AppError) {
        expect(error.statusCode).toBe(422);
        expect(error.message).toContain("versendete");
      }
    });

    test("should throw AppError when due date is in the future", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-12-31",
        status: "sent",
        reminder_level: 0,
      });

      expect(() => {
        triggerDunning(invoiceId);
      }).toThrow();

      const error = (() => {
        try {
          triggerDunning(invoiceId);
        } catch (e) {
          return e;
        }
      })();

      if (error instanceof AppError) {
        expect(error.statusCode).toBe(422);
        expect(error.message).toContain("überfällig");
      }
    });

    test("should throw AppError when already at level 3", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 3,
      });

      expect(() => {
        triggerDunning(invoiceId);
      }).toThrow();

      const error = (() => {
        try {
          triggerDunning(invoiceId);
        } catch (e) {
          return e;
        }
      })();

      if (error instanceof AppError) {
        expect(error.statusCode).toBe(422);
        expect(error.message).toContain("Maximale");
      }
    });

    test("should be a transaction - rollback on any error", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 0,
      });

      db.query("DELETE FROM dunning_settings WHERE level = 1").run();

      expect(() => {
        triggerDunning(invoiceId);
      }).toThrow();

      const invoice = db
        .query<{ reminder_level: number }, [number]>(
          "SELECT reminder_level FROM invoices WHERE id = ?",
        )
        .get(invoiceId);

      expect(invoice?.reminder_level).toBe(0);

      const runs = getDunningRunsForInvoice(invoiceId);
      expect(runs.length).toBe(0);
    });
  });

  describe("getDunningRunsForInvoice()", () => {
    test("should return empty list for invoice with no dunning runs", () => {
      const invoiceId = createTestInvoice();
      const runs = getDunningRunsForInvoice(invoiceId);
      expect(runs).toEqual([]);
    });

    test("should return dunning runs", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 0,
      });

      triggerDunning(invoiceId); // 0 -> 1
      triggerDunning(invoiceId); // 1 -> 2
      triggerDunning(invoiceId); // 2 -> 3

      const runs = getDunningRunsForInvoice(invoiceId);
      expect(runs.length).toBe(3);

      // Verify all three levels are present (order may vary due to same timestamp)
      const levels = runs.map((r: any) => r.level).sort();
      expect(levels).toEqual([1, 2, 3]);
    });

    test("should include fee_amount in dunning runs", () => {
      const invoiceId = createTestInvoice({
        due_date: "2026-05-10",
        status: "sent",
        reminder_level: 1,
      });

      triggerDunning(invoiceId);

      const runs = getDunningRunsForInvoice(invoiceId);
      expect(runs[0].fee_amount).toBe(5);
    });
  });

  describe("getDunningSettings()", () => {
    test("should return all dunning levels in order", () => {
      const settings = getDunningSettings();
      expect(settings.length).toBe(3);
      expect(settings[0].level).toBe(1);
      expect(settings[1].level).toBe(2);
      expect(settings[2].level).toBe(3);
    });

    test("should include fee amounts and thresholds", () => {
      const settings = getDunningSettings();
      expect(settings[0]).toMatchObject({
        level: 1,
        days_after_due: 7,
        fee_amount: 0,
      });
      expect(settings[1]).toMatchObject({
        level: 2,
        days_after_due: 14,
        fee_amount: 5,
      });
      expect(settings[2]).toMatchObject({
        level: 3,
        days_after_due: 28,
        fee_amount: 10,
      });
    });
  });
});
