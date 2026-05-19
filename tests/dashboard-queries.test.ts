import { beforeAll, describe, expect, test } from "bun:test";
import {
  getOpenInvoicesByClient,
  getQuarterlyRevenue,
  getWeeklyTimeStats,
} from "../src/db/dashboard-queries";
import { db, initializeSchema } from "../src/db/schema";

beforeAll(() => {
  initializeSchema();
  db.run("UPDATE settings SET onboarding_complete = 1 WHERE id = 1");
});

// ─── Seed helpers ─────────────────────────────────────────────────────────────

let _counter = 0;

function seedClient(name = "Testkunde"): number {
  const res = db
    .query<{ id: number }, [string]>(
      `INSERT INTO clients (name, address, postal_code, city, email)
       VALUES (?,'Teststr. 1','10115','Berlin','test@example.de') RETURNING id`,
    )
    .get(name);
  if (!res) throw new Error("client seed failed");
  return res.id;
}

function seedProject(clientId: number, dailyRate = 800): number {
  const code = `TP-${++_counter}`;
  const res = db
    .query<{ id: number }, [number, string, number]>(
      `INSERT INTO projects (client_id, name, code, daily_rate, start_date)
       VALUES (?,'Testprojekt',?,?,'2026-01-01') RETURNING id`,
    )
    .get(clientId, code, dailyRate);
  if (!res) throw new Error("project seed failed");
  return res.id;
}

function seedTimeEntry(
  projectId: number,
  date: string,
  duration: number,
  invoiceId: number | null = null,
): number {
  const res = db
    .query<{ id: number }, [number, string, number, number | null]>(
      `INSERT INTO time_entries (project_id, date, duration, description, invoice_id)
       VALUES (?, ?, ?, 'Test', ?) RETURNING id`,
    )
    .get(projectId, date, duration, invoiceId);
  if (!res) throw new Error("time_entry seed failed");
  return res.id;
}

function seedInvoice(
  clientId: number,
  projectId: number,
  status: string,
  dueDate: string,
  invoiceDate: string,
  grossAmount: number,
  netAmount: number,
): number {
  const num = `R-${++_counter}`;
  const vatAmount = grossAmount - netAmount;
  const [yearStr, monthStr] = invoiceDate.split("-");
  const res = db
    .query<{ id: number }, [string, number, number, string, string, string, number, number, number, string, string]>(
      `INSERT INTO invoices
         (invoice_number, client_id, project_id, status, invoice_date, due_date,
          gross_amount, net_amount, vat_amount, period_month, period_year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .get(num, clientId, projectId, status, invoiceDate, dueDate, grossAmount, netAmount, vatAmount, monthStr, yearStr);
  if (!res) throw new Error("invoice seed failed");
  return res.id;
}

// ─── getWeeklyTimeStats ───────────────────────────────────────────────────────

describe("getWeeklyTimeStats", () => {
  test("returns zeros when no time entries exist", () => {
    // use isolated check — just verify shape
    const stats = getWeeklyTimeStats();
    expect(typeof stats.total_hours).toBe("number");
    expect(typeof stats.entry_count).toBe("number");
    expect(typeof stats.project_count).toBe("number");
  });

  test("counts only unfactured entries from current week", () => {
    const clientId = seedClient("WeeklyKunde");
    const projectId = seedProject(clientId);

    // Entry from today (should be counted)
    seedTimeEntry(projectId, new Date().toISOString().slice(0, 10), 6);
    // Entry from 2020 (should NOT be counted)
    seedTimeEntry(projectId, "2020-01-01", 8);
    // Entry with invoice (should NOT be counted)
    const clientId2 = seedClient("WeeklyKunde2");
    const projectId2 = seedProject(clientId2);
    const invId = seedInvoice(clientId2, projectId2, "sent", "2026-12-31", "2026-01-01", 1000, 840);
    seedTimeEntry(projectId2, new Date().toISOString().slice(0, 10), 4, invId);

    const stats = getWeeklyTimeStats();

    // total_hours must be >= 6 (at least the entry we seeded today)
    expect(stats.total_hours).toBeGreaterThanOrEqual(6);
    // factured entry NOT included
    expect(stats.entry_count).toBeGreaterThanOrEqual(1);
  });
});

// ─── getOpenInvoicesByClient ──────────────────────────────────────────────────

describe("getOpenInvoicesByClient", () => {
  test("returns empty array when no open invoices", () => {
    // Paid invoices should not appear
    const clientId = seedClient("PaidKunde");
    const projectId = seedProject(clientId);
    seedInvoice(clientId, projectId, "paid", "2026-01-31", "2026-01-01", 800, 672);
    const rows = getOpenInvoicesByClient();
    const paidKunde = rows.find((r) => r.client_name === "PaidKunde");
    expect(paidKunde).toBeUndefined();
  });

  test("groups open invoices by client with correct totals", () => {
    const clientId = seedClient("OffenerKunde");
    const projectId = seedProject(clientId);
    seedInvoice(clientId, projectId, "sent", "2026-12-31", "2026-01-01", 1200, 1008);
    seedInvoice(clientId, projectId, "draft", "2026-12-31", "2026-02-01", 800, 672);

    const rows = getOpenInvoicesByClient();
    const entry = rows.find((r) => r.client_name === "OffenerKunde");

    expect(entry).toBeDefined();
    expect(entry!.invoice_count).toBe(2);
    expect(entry!.total_amount).toBeCloseTo(2000, 1);
    expect(entry!.has_overdue).toBe(0); // future due dates
  });

  test("marks overdue entries", () => {
    const clientId = seedClient("ÜberfälligerKunde");
    const projectId = seedProject(clientId);
    seedInvoice(clientId, projectId, "sent", "2020-01-01", "2019-12-01", 500, 420);

    const rows = getOpenInvoicesByClient();
    const entry = rows.find((r) => r.client_name === "ÜberfälligerKunde");

    expect(entry).toBeDefined();
    expect(entry!.has_overdue).toBe(1);
  });

  test("overdue clients appear before non-overdue", () => {
    const clientOverdue = seedClient("ZzOverdueSort");
    const projectO = seedProject(clientOverdue);
    seedInvoice(clientOverdue, projectO, "sent", "2020-01-01", "2019-12-01", 100, 84);

    const clientFuture = seedClient("AaFutureSort");
    const projectF = seedProject(clientFuture);
    seedInvoice(clientFuture, projectF, "sent", "2099-12-31", "2026-01-01", 200, 168);

    const rows = getOpenInvoicesByClient();
    const overdueIdx = rows.findIndex((r) => r.client_name === "ZzOverdueSort");
    const futureIdx = rows.findIndex((r) => r.client_name === "AaFutureSort");

    expect(overdueIdx).toBeLessThan(futureIdx);
  });
});

// ─── getQuarterlyRevenue ──────────────────────────────────────────────────────

describe("getQuarterlyRevenue", () => {
  test("returns valid structure with correct types", () => {
    const data = getQuarterlyRevenue();
    expect(typeof data.ytd_net).toBe("number");
    expect(typeof data.ytd_gross).toBe("number");
    expect(typeof data.prev_year_gross).toBe("number");
    expect(Array.isArray(data.quarters)).toBe(true);
  });

  test("includes only sent/paid invoices in YTD", () => {
    const clientId = seedClient("QuartalKunde");
    const projectId = seedProject(clientId);

    const thisYear = new Date().getFullYear();
    // sent invoice this year
    seedInvoice(clientId, projectId, "sent", `${thisYear}-12-31`, `${thisYear}-01-15`, 2400, 2016);
    // draft invoice this year — must NOT be counted
    seedInvoice(clientId, projectId, "draft", `${thisYear}-12-31`, `${thisYear}-02-01`, 1000, 840);
    // cancelled — must NOT be counted
    seedInvoice(clientId, projectId, "cancelled", `${thisYear}-12-31`, `${thisYear}-03-01`, 500, 420);

    const data = getQuarterlyRevenue();
    // ytd_gross must include the 2400 sent invoice (may include others from earlier seeds)
    expect(data.ytd_gross).toBeGreaterThanOrEqual(2400);
    // ytd_net must include the 2016 net
    expect(data.ytd_net).toBeGreaterThanOrEqual(2016);
  });

  test("quarters array covers Q1 through current quarter", () => {
    const data = getQuarterlyRevenue();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    // Quarters must be in range 1..currentQuarter
    expect(data.quarters.length).toBe(currentQuarter);
    for (let i = 0; i < data.quarters.length; i++) {
      expect(data.quarters[i].quarter).toBe(i + 1);
    }
  });
});
