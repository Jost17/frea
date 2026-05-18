import type { DATEVInvoiceRow } from "../lib/datev-generator";
import { db } from "./schema";

interface ExportInvoiceRow {
  invoice_number: string;
  invoice_date: string;
  net_amount: number;
  vat_amount: number;
  client_name: string;
  effective_vat_rate: number;
}

/**
 * Fetches all sent/paid invoices for a given year, enriched with the
 * effective VAT rate from the first line item (falls back to settings rate).
 * Draft and cancelled invoices are excluded — they carry no tax liability.
 */
export function getInvoicesForDATEVExport(year: number): DATEVInvoiceRow[] {
  const rows = db
    .query<ExportInvoiceRow, [string]>(
      `SELECT
         i.invoice_number,
         i.invoice_date,
         i.net_amount,
         i.vat_amount,
         c.name AS client_name,
         COALESCE(
           (SELECT vat_rate FROM invoice_items WHERE invoice_id = i.id LIMIT 1),
           CASE WHEN s.kleinunternehmer = 1 THEN 0.0 ELSE s.vat_rate END
         ) AS effective_vat_rate
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       CROSS JOIN settings s
       WHERE strftime('%Y', i.invoice_date) = ?
         AND i.status IN ('sent', 'paid')
       ORDER BY i.invoice_date ASC`,
    )
    .all(String(year));

  return rows;
}

/** Returns the distinct years that have exportable invoices (sent or paid). */
export function getExportableYears(): number[] {
  const rows = db
    .query<{ yr: number }, []>(
      `SELECT DISTINCT CAST(strftime('%Y', invoice_date) AS INTEGER) AS yr
       FROM invoices
       WHERE status IN ('sent', 'paid')
       ORDER BY yr DESC`,
    )
    .all();
  return rows.map((r) => r.yr);
}
