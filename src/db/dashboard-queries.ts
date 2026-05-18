import { OPEN_INVOICE_STATUSES_SQL, overdueInvoiceWhere } from "./invoice-status";
import { db } from "./schema";

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
  tax_reserve_recommended: number;
  tax_reserve_rate: number;
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
        ),
        cte_paid_net AS (
          SELECT COALESCE(SUM(net_amount), 0) AS total
          FROM invoices
          WHERE status = 'paid'
        ),
        cte_reserve AS (
          SELECT COALESCE(tax_reserve_rate, 0.25) AS rate FROM settings WHERE id = 1
        )
      SELECT
        cte_open_inv.cnt                                    AS open_invoices_count,
        cte_open_inv.total                                  AS open_invoices_sum,
        cte_revenue.total                                   AS revenue_current_month,
        cte_clients.cnt                                     AS active_clients_count,
        cte_projects.cnt                                    AS active_projects_count,
        cte_overdue.cnt                                     AS overdue_invoices_count,
        ROUND(cte_paid_net.total * cte_reserve.rate, 2)    AS tax_reserve_recommended,
        cte_reserve.rate                                    AS tax_reserve_rate
      FROM cte_open_inv, cte_revenue, cte_clients, cte_projects, cte_overdue,
           cte_paid_net, cte_reserve`,
    )
    .get();

  // CTEs with COUNT(*)/COALESCE always return a row — null means a DB/schema problem
  if (!row) {
    throw new Error("Dashboard-Statistiken konnten nicht berechnet werden (keine Daten von DB)");
  }

  return row;
}
