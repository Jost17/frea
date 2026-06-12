import { OPEN_INVOICE_STATUSES_SQL, overdueInvoiceWhere } from "./invoice-status";
import { db } from "./schema";

// ─── Weekly Time Stats ────────────────────────────────────────────────────────

export interface WeeklyTimeStats {
  total_hours: number;
  entry_count: number;
  project_count: number;
}

export function getWeeklyTimeStats(): WeeklyTimeStats {
  // ISO week start: Monday. ((strftime('%w') + 6) % 7) = days since Monday (0=Mon…6=Sun)
  const row = db
    .query<WeeklyTimeStats, []>(
      `SELECT
        COALESCE(SUM(duration), 0)          AS total_hours,
        COUNT(*)                             AS entry_count,
        COUNT(DISTINCT project_id)           AS project_count
       FROM time_entries
       WHERE invoice_id IS NULL
         AND date >= date('now', '-' || ((cast(strftime('%w', 'now') as integer) + 6) % 7) || ' days')`,
    )
    .get();
  return row ?? { total_hours: 0, entry_count: 0, project_count: 0 };
}

// ─── Open Invoices By Client ──────────────────────────────────────────────────

export interface OpenInvoiceByClient {
  client_id: number;
  client_name: string;
  invoice_count: number;
  total_amount: number;
  oldest_due_date: string | null;
  has_overdue: number; // 0 or 1
}

export function getOpenInvoicesByClient(): OpenInvoiceByClient[] {
  return db
    .query<OpenInvoiceByClient, []>(
      `SELECT
        c.id                                                   AS client_id,
        c.name                                                 AS client_name,
        COUNT(i.id)                                            AS invoice_count,
        COALESCE(SUM(i.gross_amount), 0)                       AS total_amount,
        MIN(i.due_date)                                        AS oldest_due_date,
        CASE WHEN MIN(i.due_date) < date('now') THEN 1 ELSE 0 END AS has_overdue
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       WHERE ${OPEN_INVOICE_STATUSES_SQL}
       GROUP BY c.id, c.name
       ORDER BY has_overdue DESC, total_amount DESC`,
    )
    .all();
}

// ─── Quarterly Revenue ────────────────────────────────────────────────────────

export interface QuarterData {
  quarter: number; // 1–4
  label: string;   // "Q1 2026"
  net_revenue: number;
  gross_revenue: number;
}

export interface QuarterlyRevenueSummary {
  ytd_net: number;
  ytd_gross: number;
  prev_year_gross: number;
  quarters: QuarterData[];
}

export function getQuarterlyRevenue(): QuarterlyRevenueSummary {
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const ytdRow = db
    .query<{ ytd_net: number; ytd_gross: number }, []>(
      `SELECT
        COALESCE(SUM(net_amount), 0)   AS ytd_net,
        COALESCE(SUM(gross_amount), 0) AS ytd_gross
       FROM invoices
       WHERE status IN ('sent', 'paid')
         AND strftime('%Y', invoice_date) = strftime('%Y', 'now')`,
    )
    .get();

  const quarterRows = db
    .query<{ quarter: number; net_revenue: number; gross_revenue: number }, []>(
      `SELECT
        CAST(CEIL(CAST(strftime('%m', invoice_date) AS REAL) / 3) AS INTEGER) AS quarter,
        COALESCE(SUM(net_amount), 0)                                           AS net_revenue,
        COALESCE(SUM(gross_amount), 0)                                         AS gross_revenue
       FROM invoices
       WHERE status IN ('sent', 'paid')
         AND strftime('%Y', invoice_date) = strftime('%Y', 'now')
       GROUP BY quarter
       ORDER BY quarter ASC`,
    )
    .all();

  const prevYearRow = db
    .query<{ prev_year_gross: number }, []>(
      `SELECT COALESCE(SUM(gross_amount), 0) AS prev_year_gross
       FROM invoices
       WHERE status IN ('sent', 'paid')
         AND strftime('%Y', invoice_date) = strftime('%Y', date('now', '-1 year'))`,
    )
    .get();

  const quarters: QuarterData[] = [];
  for (let q = 1; q <= currentQuarter; q++) {
    const row = quarterRows.find((r) => r.quarter === q);
    quarters.push({
      quarter: q,
      label: `Q${q} ${currentYear}`,
      net_revenue: row?.net_revenue ?? 0,
      gross_revenue: row?.gross_revenue ?? 0,
    });
  }

  return {
    ytd_net: ytdRow?.ytd_net ?? 0,
    ytd_gross: ytdRow?.ytd_gross ?? 0,
    prev_year_gross: prevYearRow?.prev_year_gross ?? 0,
    quarters,
  };
}

// ─── Cashflow Forecast ────────────────────────────────────────────────────────

export interface CashflowMonth {
  month: string; // YYYY-MM
  label: string; // "Mai 2026"
  expected_amount: number;
  invoice_count: number;
  is_overdue: boolean; // due_date month is before current month
}

export function getCashflowForecast(): CashflowMonth[] {
  const rows = db
    .query<{ month: string; expected_amount: number; invoice_count: number }, []>(
      `SELECT
        strftime('%Y-%m', due_date) AS month,
        COALESCE(SUM(gross_amount), 0) AS expected_amount,
        COUNT(*) AS invoice_count
       FROM invoices
       WHERE ${OPEN_INVOICE_STATUSES_SQL}
       GROUP BY month
       ORDER BY month ASC
       LIMIT 12`,
    )
    .all();

  const currentMonth = new Date().toISOString().slice(0, 7);

  return rows.map((row) => {
    const [year, mon] = row.month.split("-").map(Number);
    const label = new Date(year, mon - 1, 1).toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
    });
    return { ...row, label, is_overdue: row.month < currentMonth };
  });
}

// ─── Overdue Count (used by nav-context middleware) ──────────────────────────

export function getOverdueInvoiceCount(): number {
  const result = db
    .query<{ count: number }, []>(
      `SELECT COUNT(*) as count FROM invoices
       WHERE ${overdueInvoiceWhere()}`,
    )
    .get();
  return result?.count ?? 0;
}

// ─── Dashboard Aggregation ────────────────────────────────────────────────────

export interface DashboardStats {
  open_invoices_count: number;
  open_invoices_sum: number;
  revenue_current_month: number;
  active_clients_count: number;
  active_projects_count: number;
  overdue_invoices_count: number;
}

export function getDashboardStats(): DashboardStats {
  const row = db
    .query<DashboardStats, []>(
      `WITH
        cte_open_inv AS (
          SELECT COUNT(*) AS cnt, COALESCE(SUM(gross_amount), 0) AS total
          FROM invoices
          WHERE ${OPEN_INVOICE_STATUSES_SQL}
        ),
        cte_revenue AS (
          SELECT COALESCE(SUM(gross_amount), 0) AS total
          FROM invoices
          WHERE status IN ('sent', 'paid')
            AND strftime('%Y-%m', invoice_date) = strftime('%Y-%m', 'now')
        ),
        cte_clients AS (
          SELECT COUNT(*) AS cnt FROM clients WHERE archived = 0
        ),
        cte_projects AS (
          SELECT COUNT(*) AS cnt FROM projects WHERE archived = 0
        ),
        cte_overdue AS (
          SELECT COUNT(*) AS cnt
          FROM invoices
          WHERE ${overdueInvoiceWhere()}
        )
      SELECT
        cte_open_inv.cnt        AS open_invoices_count,
        cte_open_inv.total      AS open_invoices_sum,
        cte_revenue.total       AS revenue_current_month,
        cte_clients.cnt         AS active_clients_count,
        cte_projects.cnt        AS active_projects_count,
        cte_overdue.cnt         AS overdue_invoices_count
      FROM cte_open_inv, cte_revenue, cte_clients, cte_projects, cte_overdue`,
    )
    .get();

  // CTEs with COUNT(*)/COALESCE always return a row — null means a DB/schema problem
  if (!row) {
    throw new Error("Dashboard-Statistiken konnten nicht berechnet werden (keine Daten von DB)");
  }

  return row;
}
