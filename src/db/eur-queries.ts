import { roundToEuro } from "./invoice-queries";
import { db } from "./schema";

export interface EurInvoiceRow {
  id: number;
  invoice_number: string;
  client_name: string;
  paid_date: string;
  net_amount: number;
  vat_rate: number;
  vat_amount: number;
  gross_amount: number;
}

export interface EurSummary {
  year: number;
  is_kleinunternehmer: boolean;
  // Betriebseinnahmen
  revenue_net_19: number;
  revenue_net_7: number;
  revenue_net_0: number;
  revenue_net_total: number;
  // Umsatzsteuer (eingenommen)
  vat_collected_19: number;
  vat_collected_7: number;
  vat_collected_total: number;
  // Brutto-Einnahmen gesamt
  gross_total: number;
  // Anzahl Rechnungen
  invoice_count: number;
  // Detail-Liste
  invoices: EurInvoiceRow[];
}

export function getEurData(year: number): EurSummary {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const rows = db
    .query<EurInvoiceRow, [string, string]>(
      `SELECT
         i.id,
         i.invoice_number,
         c.name AS client_name,
         i.paid_date,
         i.net_amount,
         COALESCE(
           (SELECT ROUND(SUM(ii.vat_rate) / COUNT(*), 4)
            FROM invoice_items ii WHERE ii.invoice_id = i.id),
           0
         ) AS vat_rate,
         i.vat_amount,
         i.gross_amount
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       WHERE i.status = 'paid'
         AND i.paid_date >= ?
         AND i.paid_date <= ?
       ORDER BY i.paid_date ASC`,
    )
    .all(from, to);

  // Aggregate by VAT rate bucket
  let revenue_net_19 = 0;
  let revenue_net_7 = 0;
  let revenue_net_0 = 0;
  let vat_collected_19 = 0;
  let vat_collected_7 = 0;

  for (const row of rows) {
    const rate = row.vat_rate;
    if (rate >= 0.19) {
      revenue_net_19 += row.net_amount;
      vat_collected_19 += row.vat_amount;
    } else if (rate >= 0.07) {
      revenue_net_7 += row.net_amount;
      vat_collected_7 += row.vat_amount;
    } else {
      revenue_net_0 += row.net_amount;
    }
  }

  const is_kleinunternehmer =
    rows.length > 0 && rows.every((r) => r.vat_amount === 0 && r.vat_rate === 0);

  return {
    year,
    is_kleinunternehmer,
    revenue_net_19: roundToEuro(revenue_net_19),
    revenue_net_7: roundToEuro(revenue_net_7),
    revenue_net_0: roundToEuro(revenue_net_0),
    revenue_net_total: roundToEuro(revenue_net_19 + revenue_net_7 + revenue_net_0),
    vat_collected_19: roundToEuro(vat_collected_19),
    vat_collected_7: roundToEuro(vat_collected_7),
    vat_collected_total: roundToEuro(vat_collected_19 + vat_collected_7),
    gross_total: roundToEuro(rows.reduce((s, r) => s + r.gross_amount, 0)),
    invoice_count: rows.length,
    invoices: rows,
  };
}
