import { db } from "./schema";

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
          WHERE status IN ('draft', 'sent')
        ),
        cte_revenue AS (
          SELECT COALESCE(SUM(gross_amount), 0) AS total
          FROM invoices
          WHERE status IN ('sent', 'paid')
            AND invoice_date >= date('now', 'start of month')
            AND invoice_date < date('now', 'start of month', '+1 month')
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
          WHERE status IN ('draft', 'sent')
            AND due_date < date('now')
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

  // Fallback: wenn DB leer, alle Werte 0
  return row ?? {
    open_invoices_count: 0,
    open_invoices_sum: 0,
    revenue_current_month: 0,
    active_clients_count: 0,
    active_projects_count: 0,
    overdue_invoices_count: 0,
  };
}
