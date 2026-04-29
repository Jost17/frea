// Single source of truth for invoice status SQL fragments.
// Keep these constants in sync when invoice status semantics change.

export const OPEN_INVOICE_STATUSES_SQL = "status IN ('draft', 'sent')";

const ALIAS_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function overdueInvoiceWhere(alias?: string): string {
  if (alias !== undefined && !ALIAS_RE.test(alias)) {
    throw new Error(`Invalid SQL alias: "${alias}"`);
  }
  const prefix = alias ? `${alias}.` : "";
  return `${prefix}${OPEN_INVOICE_STATUSES_SQL} AND ${prefix}due_date < date('now')`;
}
