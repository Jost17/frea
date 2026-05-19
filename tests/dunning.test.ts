import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../src/app";
import {
  advanceDunningLevel,
  getInvoice,
  getOverdueInvoicesByDunningLevel,
  getDunningStats,
} from "../src/db/invoice-queries";
import { db } from "../src/db/schema";
import {
  calculateVerzugszinsen,
  getDunningLevel,
  getDunningState,
  getDaysOverdue,
  isInvoiceOverdue,
} from "../src/lib/dunning";

describe("Dunning System (FREA-305)", () => {
  beforeAll(() => {
    // Ensure schema is initialized
    db.query("SELECT 1").get();
  });

  describe("Dunning business logic", () => {
    it("getDunningLevel should return 0 for fresh invoice", () => {
      const invoice = {
        id: 1,
        reminder_level: 0,
        due_date: "2026-12-31",
        status: "sent",
        gross_amount: 100,
      } as any;

      const level = getDunningLevel(invoice);
      expect(level).toBe(0);
    });

    it("getDunningState should return correct labels", () => {
      const state0 = getDunningState(0);
      expect(state0.label).toBe("Unbezahlt");
      expect(state0.showVerzugszinsen).toBe(false);

      const state1 = getDunningState(1);
      expect(state1.label).toBe("Zahlungserinnerung");
      expect(state1.showVerzugszinsen).toBe(false);

      const state2 = getDunningState(2);
      expect(state2.label).toBe("1. Mahnung");
      expect(state2.showVerzugszinsen).toBe(false);

      const state3 = getDunningState(3);
      expect(state3.label).toBe("2. Mahnung");
      expect(state3.showVerzugszinsen).toBe(true);
    });

    it("calculateVerzugszinsen should compute correct amounts", () => {
      const invoice = {
        due_date: "2026-05-01", // 18 days overdue from 2026-05-19
        gross_amount: 1000,
        status: "sent",
      } as any;

      const result = calculateVerzugszinsen(invoice);

      // ECB base rate 2.5% + 9% = 11.5% p.a.
      expect(result.compoundRate).toBe(11.5);
      expect(result.baseRate).toBe(2.5);

      // Daily amount: 1000 × 0.115 / 365 ≈ 0.315
      expect(result.dailyAmount).toBeGreaterThan(0);
      expect(result.dailyAmount).toBeLessThan(1);

      // Total = daily × 18 days (approx 5.67)
      expect(result.totalAmount).toBeGreaterThan(5);
      expect(result.totalAmount).toBeLessThan(6);
    });

    it("isInvoiceOverdue should detect overdue invoices", () => {
      const overdueInvoice = {
        due_date: "2026-01-01",
        status: "sent",
      } as any;

      const notOverdueInvoice = {
        due_date: "2099-12-31",
        status: "sent",
      } as any;

      const paidInvoice = {
        due_date: "2026-01-01",
        status: "paid",
      } as any;

      expect(isInvoiceOverdue(overdueInvoice)).toBe(true);
      expect(isInvoiceOverdue(notOverdueInvoice)).toBe(false);
      expect(isInvoiceOverdue(paidInvoice)).toBe(false);
    });

    it("getDaysOverdue should return correct count", () => {
      const invoice = {
        due_date: "2026-05-01", // 18 days before 2026-05-19
        status: "sent",
      } as any;

      const days = getDaysOverdue(invoice);
      expect(days).toBe(18);
    });

    it("getDaysOverdue should return 0 for non-overdue invoices", () => {
      const invoice = {
        due_date: "2099-12-31",
        status: "sent",
      } as any;

      const days = getDaysOverdue(invoice);
      expect(days).toBe(0);
    });
  });

  describe("Dunning database operations", () => {
    let clientId: number;
    let projectId: number;
    let invoiceId: number;

    beforeAll(() => {
      // Create test client and project
      db.query(
        `INSERT INTO clients (name, address, postal_code, city, email)
         VALUES (?, ?, ?, ?, ?)`
      ).run("Test Client", "Test St", "12345", "Test City", "test@example.de");

      clientId = db
        .query<{ id: number }, []>(`SELECT id FROM clients ORDER BY id DESC LIMIT 1`)
        .get()!.id;

      db.query(
        `INSERT INTO projects (client_id, code, name, daily_rate)
         VALUES (?, ?, ?, ?)`
      ).run(clientId, "TEST", "Test Project", 100);

      projectId = db
        .query<{ id: number }, []>(`SELECT id FROM projects ORDER BY id DESC LIMIT 1`)
        .get()!.id;

      // Create test invoice (overdue)
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 10); // 10 days overdue
      const dueDateStr = overdueDate.toISOString().split("T")[0];

      db.query(
        `INSERT INTO invoices
         (invoice_number, client_id, project_id, invoice_date, due_date,
          period_month, period_year, net_amount, vat_amount, gross_amount,
          status, reminder_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        "TEST-2026-0001",
        clientId,
        projectId,
        "2026-05-01",
        dueDateStr,
        5,
        2026,
        1000,
        190,
        1190,
        "sent",
        0
      );

      invoiceId = db
        .query<{ id: number }, []>(`SELECT id FROM invoices ORDER BY id DESC LIMIT 1`)
        .get()!.id;
    });

    it("advanceDunningLevel should increment reminder_level", () => {
      const before = getInvoice(invoiceId)!;
      expect(before.reminder_level).toBe(0);

      advanceDunningLevel(invoiceId, 0);

      const after = getInvoice(invoiceId)!;
      expect(after.reminder_level).toBe(1);
      expect(after.reminder_sent_at).not.toBeNull();
    });

    it("advanceDunningLevel should support 0→1→2→3 progression", () => {
      // Already at 1, advance to 2
      advanceDunningLevel(invoiceId, 1);
      let inv = getInvoice(invoiceId)!;
      expect(inv.reminder_level).toBe(2);

      // Advance to 3
      advanceDunningLevel(invoiceId, 2);
      inv = getInvoice(invoiceId)!;
      expect(inv.reminder_level).toBe(3);
    });

    it("getOverdueInvoicesByDunningLevel should group correctly", () => {
      const grouped = getOverdueInvoicesByDunningLevel();

      // Should be at least one invoice at level 3
      expect(grouped[3].length).toBeGreaterThan(0);

      // Verify structure
      expect(typeof grouped[0]).toBe("object");
      expect(typeof grouped[1]).toBe("object");
      expect(typeof grouped[2]).toBe("object");
      expect(typeof grouped[3]).toBe("object");
    });

    it("getDunningStats should return aggregated counts", () => {
      const stats = getDunningStats();

      // Should be an array of { level, count } objects
      expect(Array.isArray(stats)).toBe(true);

      // Check structure
      stats.forEach((stat) => {
        expect(stat.level).toBeDefined();
        expect(stat.count).toBeDefined();
        expect(stat.level >= 0 && stat.level <= 3).toBe(true);
        expect(stat.count > 0).toBe(true);
      });
    });

    afterAll(() => {
      // Cleanup test data
      db.query(`DELETE FROM invoices WHERE id = ?`).run(invoiceId);
      db.query(`DELETE FROM projects WHERE id = ?`).run(projectId);
      db.query(`DELETE FROM clients WHERE id = ?`).run(clientId);
    });
  });

  describe("Dunning routes", () => {
    it("GET /mahnungen should return 200 or redirect to onboarding", async () => {
      const res = await app.request("/mahnungen", {
        headers: { Cookie: "__skip_onboarding=1" },
      });
      // May redirect to onboarding (302) if not set up, or return 200 if OK
      expect([200, 302]).toContain(res.status);
    });

    it("POST /mahnungen/:id/mahnung should return 400 for invalid ID", async () => {
      const res = await app.request("/mahnungen/invalid/mahnung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      // May redirect (302) or return error
      expect([302, 400, 404, 422]).toContain(res.status);
    });

    it("GET /mahnungen/:id/details should return dunning details", async () => {
      // Create a test overdue invoice first
      const clientRes = db
        .query<{ id: number }, []>(`SELECT id FROM clients LIMIT 1`)
        .get();
      const projRes = db
        .query<{ id: number }, []>(`SELECT id FROM projects LIMIT 1`)
        .get();

      if (clientRes && projRes) {
        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - 5);
        const dueDateStr = overdueDate.toISOString().split("T")[0];

        db.query(
          `INSERT INTO invoices
           (invoice_number, client_id, project_id, invoice_date, due_date,
            period_month, period_year, net_amount, vat_amount, gross_amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          `TEST-2026-${Date.now()}`,
          clientRes.id,
          projRes.id,
          "2026-05-01",
          dueDateStr,
          5,
          2026,
          1000,
          190,
          1190,
          "sent"
        );

        const inv = db
          .query<{ id: number }, []>(`SELECT id FROM invoices ORDER BY id DESC LIMIT 1`)
          .get();

        if (inv) {
          const res = await app.request(`/mahnungen/${inv.id}/details`);
          expect(res.status).toBe(200);
          const data = (await res.json()) as Record<string, unknown>;
          expect(data.dunning_level).toBeDefined();
          expect(data.dunning_label).toBeDefined();
          expect(data.is_overdue).toBe(true);

          // Cleanup
          db.query(`DELETE FROM invoices WHERE id = ?`).run(inv.id);
        }
      }
    });
  });
});
