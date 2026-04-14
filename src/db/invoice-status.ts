// Single source of truth for invoice status SQL fragments.
// Keep these constants in sync when invoice status semantics change.

export const OPEN_INVOICE_STATUSES_SQL = "status IN ('draft', 'sent')";

export function overdueInvoiceWhere(alias?: string): string {
  const prefix = alias ? `${alias}.` : "";
  return `${prefix}${OPEN_INVOICE_STATUSES_SQL} AND ${prefix}due_date < date('now')`;
}
