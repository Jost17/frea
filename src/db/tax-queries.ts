import { db } from "./schema";

export interface UstKennzahlen {
  kz81: number; // Nettoumsatz 19% (Regelsteuersatz)
  kz83: number; // USt 19%
  kz86: number; // Nettoumsatz 7% (ermäßigter Steuersatz)
  kz85: number; // USt 7%
  kz66: number; // Vorsteuer (nicht erfasst → 0)
  verbleibende_ust: number; // kz83 + kz85 - kz66
}

export interface PeriodOption {
  label: string;
  year: number;
  month: number | null; // null = Quartal
  quarter: number | null; // 1-4 oder null = Monat
}

// Aggregiert invoice_items nach vat_rate für den gewählten Zeitraum.
// Nur Rechnungen mit status != 'cancelled' werden berücksichtigt.
function aggregateByVatRate(
  year: number,
  month: number | null,
  quarter: number | null,
): { vat_rate: number; net_amount: number; vat_amount: number }[] {
  let whereClause: string;
  let params: (number | string)[];

  if (month !== null) {
    whereClause = "i.period_year = ? AND i.period_month = ?";
    params = [year, month];
  } else if (quarter !== null) {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    whereClause = "i.period_year = ? AND i.period_month BETWEEN ? AND ?";
    params = [year, startMonth, endMonth];
  } else {
    whereClause = "i.period_year = ?";
    params = [year];
  }

  return db
    .query<{ vat_rate: number; net_amount: number; vat_amount: number }, (number | string)[]>(
      `SELECT
        ii.vat_rate,
        ROUND(SUM(ii.net_amount), 2) AS net_amount,
        ROUND(SUM(ii.vat_amount), 2) AS vat_amount
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      WHERE ${whereClause}
        AND i.status != 'cancelled'
      GROUP BY ii.vat_rate`,
    )
    .all(...params);
}

export function getUstKennzahlen(
  year: number,
  month: number | null,
  quarter: number | null,
): UstKennzahlen {
  const rows = aggregateByVatRate(year, month, quarter);

  let kz81 = 0;
  let kz83 = 0;
  let kz86 = 0;
  let kz85 = 0;

  for (const row of rows) {
    const rate = Math.round(row.vat_rate * 100);
    if (rate === 19) {
      kz81 = row.net_amount;
      kz83 = row.vat_amount;
    } else if (rate === 7) {
      kz86 = row.net_amount;
      kz85 = row.vat_amount;
    }
  }

  return {
    kz81,
    kz83,
    kz86,
    kz85,
    kz66: 0,
    verbleibende_ust: Math.round((kz83 + kz85) * 100) / 100,
  };
}

// Liefert alle Jahre mit Rechnungsdaten für den Periodenauswahl-Dropdown.
export function getAvailableYears(): number[] {
  const rows = db
    .query<{ year: number }, []>(
      `SELECT DISTINCT period_year AS year FROM invoices
       WHERE status != 'cancelled'
       ORDER BY period_year DESC`,
    )
    .all();
  return rows.map((r) => r.year);
}
