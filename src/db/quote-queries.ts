import { AppError } from "../middleware/error-handler";
import type {
  Quote,
  QuoteCreate,
  QuoteItem,
  QuoteItemInput,
  QuoteListItem,
  QuoteStatus,
  Settings,
} from "../validation/schemas";
import { appendAuditLog } from "./queries";
import { db } from "./schema";

// ─── Money / Rounding (re-uses same rule as invoice-queries) ─────────────────

function roundToEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

// ─── Quote Number Generation ──────────────────────────────────────────────────

function generateQuoteNumber(settings: Settings): string {
  const year = new Date().getFullYear();
  const seq = (settings.next_quote_number ?? 1).toString().padStart(3, "0");
  return `AN-${year}-${seq}`;
}

// ─── Create Quote (with items in one transaction) ────────────────────────────

export function createQuote(
  data: QuoteCreate,
  items: QuoteItemInput[],
  settings: Settings,
): number {
  if (items.length === 0) {
    throw new AppError("Mindestens eine Position erforderlich", 400);
  }

  return db.transaction(() => {
    const isKleinunternehmer = Boolean(settings.kleinunternehmer);

    let totalNet = 0;
    let totalVat = 0;

    const computedItems = items.map((item, index) => {
      const vatRate = isKleinunternehmer ? 0 : item.vat_rate;
      const netAmount = roundToEuro(item.quantity * item.unit_price);
      const vatAmount = roundToEuro(netAmount * vatRate);
      const grossAmount = roundToEuro(netAmount + vatAmount);
      totalNet += netAmount;
      totalVat += vatAmount;
      return { ...item, vatRate, netAmount, vatAmount, grossAmount, sortOrder: index };
    });

    totalNet = roundToEuro(totalNet);
    totalVat = roundToEuro(totalVat);
    const totalGross = roundToEuro(totalNet + totalVat);

    const quoteNumber = generateQuoteNumber(settings);

    const row = db
      .query(
        `INSERT INTO quotes
         (quote_number, client_id, subject, notes, valid_until, status,
          net_amount, vat_amount, gross_amount)
         VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)
         RETURNING id`,
      )
      .get(
        quoteNumber,
        data.client_id,
        data.subject,
        data.notes || null,
        data.valid_until || null,
        totalNet,
        totalVat,
        totalGross,
      ) as { id: number } | undefined;

    if (!row) throw new Error("Angebot konnte nicht erstellt werden");

    const quoteId = row.id;

    const insertItem = db.query(
      `INSERT INTO quote_items
       (quote_id, description, quantity, unit, unit_price, vat_rate,
        net_amount, vat_amount, gross_amount, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const item of computedItems) {
      insertItem.run(
        quoteId,
        item.description,
        item.quantity,
        item.unit,
        item.unit_price,
        item.vatRate,
        item.netAmount,
        item.vatAmount,
        item.grossAmount,
        item.sortOrder,
      );
    }

    db.query("UPDATE settings SET next_quote_number = next_quote_number + 1 WHERE id = 1").run();

    appendAuditLog("quote", quoteId, "create", {
      quote_number: quoteNumber,
      client_id: data.client_id,
      net_amount: totalNet,
      gross_amount: totalGross,
      item_count: items.length,
    });

    return quoteId;
  })();
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getQuote(id: number): Quote | undefined {
  return db.query<Quote, [number]>("SELECT * FROM quotes WHERE id = ?").get(id) ?? undefined;
}

export function getQuoteItems(quoteId: number): QuoteItem[] {
  return db
    .query<QuoteItem, [number]>(
      "SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order, id",
    )
    .all(quoteId);
}

export function getAllQuotes(): QuoteListItem[] {
  return db
    .query<QuoteListItem, []>(
      `SELECT q.id, q.quote_number, c.name AS client_name, q.subject,
              q.gross_amount, q.status, q.valid_until, q.created_at
       FROM quotes q
       JOIN clients c ON q.client_id = c.id
       ORDER BY q.created_at DESC`,
    )
    .all();
}

// ─── Status Update ────────────────────────────────────────────────────────────

const VALID_QUOTE_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ["sent", "accepted", "rejected"],
  sent: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

export function updateQuoteStatus(id: number, newStatus: "sent" | "accepted" | "rejected"): void {
  const row = db
    .query<Pick<Quote, "status">, [number]>("SELECT status FROM quotes WHERE id = ?")
    .get(id);

  if (!row) throw new AppError("Angebot nicht gefunden", 404);

  const allowed = VALID_QUOTE_TRANSITIONS[row.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(`Statuswechsel von '${row.status}' zu '${newStatus}' nicht erlaubt`, 422);
  }

  db.transaction(() => {
    db.query("UPDATE quotes SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
      newStatus,
      id,
    );
    appendAuditLog("quote", id, "status_change", { from: row.status, to: newStatus });
  })();
}

// ─── 1-Klick-Konvertierung Angebot → Rechnung ────────────────────────────────

export function convertQuoteToInvoice(quoteId: number, settings: Settings): number {
  const quote = getQuote(quoteId);
  if (!quote) throw new AppError("Angebot nicht gefunden", 404);

  if (quote.status !== "accepted") {
    throw new AppError("Nur angenommene Angebote können in Rechnungen umgewandelt werden", 422);
  }

  if (quote.converted_invoice_id) {
    throw new AppError("Dieses Angebot wurde bereits in eine Rechnung umgewandelt", 409);
  }

  const items = getQuoteItems(quoteId);
  if (items.length === 0) throw new AppError("Angebot hat keine Positionen", 400);

  return db.transaction(() => {
    const isKleinunternehmer = Boolean(settings.kleinunternehmer);
    const effectiveVatRate = isKleinunternehmer ? 0 : settings.vat_rate;
    const today = new Date().toISOString().split("T")[0];
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (settings.payment_days || 28));
    const dueDateStr = dueDate.toISOString().split("T")[0];

    const nextNum = (settings.next_invoice_number ?? 1).toString().padStart(4, "0");
    const invoiceNumber = `${settings.invoice_prefix ?? "RE"}-${year}-${nextNum}`;

    // Recalculate totals from quote items (consistent rounding)
    let totalNet = 0;
    let totalVat = 0;

    const invoiceItemsData = items.map((item) => {
      const vatRate = isKleinunternehmer ? 0 : item.vat_rate;
      const netAmount = roundToEuro(item.quantity * item.unit_price);
      const vatAmount = roundToEuro(netAmount * vatRate);
      const grossAmount = roundToEuro(netAmount + vatAmount);
      totalNet += netAmount;
      totalVat += vatAmount;
      return { item, vatRate, netAmount, vatAmount, grossAmount };
    });

    totalNet = roundToEuro(totalNet);
    totalVat = roundToEuro(totalVat);
    const totalGross = roundToEuro(totalNet + totalVat);

    // We need a project_id for the invoice FK — use a sentinel approach:
    // quotes are not project-bound. For now we create the invoice with
    // project_id = 0 handled by a nullable FK (requires schema relaxation).
    // Instead, we use a dedicated "converted_from_quote" flow that creates
    // invoice with nullable project_id.
    //
    // Re-check: invoices.project_id is NOT NULL REFERENCES projects(id).
    // We must create a "virtual" project reference OR relax the constraint.
    // ADR decision: relax project_id to nullable for quote-converted invoices,
    // applying via a migration guard here.
    ensureInvoiceProjectIdNullable();

    const invoiceRow = db
      .query(
        `INSERT INTO invoices
         (invoice_number, client_id, project_id, invoice_date, due_date,
          period_month, period_year, net_amount, vat_amount, gross_amount,
          status, po_number, service_period_from, service_period_to)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'draft', NULL, NULL, NULL)
         RETURNING id`,
      )
      .get(
        invoiceNumber,
        quote.client_id,
        today,
        dueDateStr,
        month,
        year,
        totalNet,
        totalVat,
        totalGross,
      ) as { id: number } | undefined;

    if (!invoiceRow) throw new Error("Rechnung konnte nicht erstellt werden");

    const invoiceId = invoiceRow.id;

    const insertItem = db.query(
      `INSERT INTO invoice_items
       (invoice_id, description, period_start, period_end, days, daily_rate,
        net_amount, vat_rate, vat_amount, gross_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const { item, vatRate, netAmount, vatAmount, grossAmount } of invoiceItemsData) {
      insertItem.run(
        invoiceId,
        item.description,
        today,
        today,
        item.quantity,
        item.unit_price,
        netAmount,
        vatRate,
        vatAmount,
        grossAmount,
      );
    }

    // Update settings invoice counter
    db.query(
      "UPDATE settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 1",
    ).run();

    // Mark quote as linked to the new invoice
    db.query(
      "UPDATE quotes SET converted_invoice_id = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(invoiceId, quoteId);

    appendAuditLog("quote", quoteId, "update", {
      action: "converted_to_invoice",
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
    });

    appendAuditLog("invoice", invoiceId, "create", {
      invoice_number: invoiceNumber,
      source: "quote_conversion",
      quote_id: quoteId,
      quote_number: quote.quote_number,
      net_amount: totalNet,
      gross_amount: totalGross,
      vat_rate: effectiveVatRate,
      is_kleinunternehmer: isKleinunternehmer,
    });

    return invoiceId;
  })();
}

// ─── Schema Migration Helper ──────────────────────────────────────────────────

/**
 * Ensure invoices.project_id is nullable so quote-converted invoices
 * (which have no time-tracking project) can be inserted.
 * SQLite does not support ALTER COLUMN, so we use a rebuild approach
 * guarded by a pragma check.
 */
function ensureInvoiceProjectIdNullable(): void {
  const cols = db.query<{ notnull: number; name: string }, []>("PRAGMA table_info(invoices)").all();
  const projectIdCol = cols.find((c) => c.name === "project_id");

  // Already nullable — nothing to do.
  if (!projectIdCol || projectIdCol.notnull === 0) return;

  // project_id is still NOT NULL — rebuild the table to remove the constraint.
  console.log("[migration] Making invoices.project_id nullable for quote conversions...");

  db.run("ALTER TABLE invoices RENAME TO invoices_old");

  db.run(`
    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      project_id INTEGER REFERENCES projects(id),
      invoice_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      period_month INTEGER NOT NULL,
      period_year INTEGER NOT NULL,
      net_amount REAL NOT NULL,
      vat_amount REAL NOT NULL,
      gross_amount REAL NOT NULL,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
      pdf_path TEXT,
      po_number TEXT,
      service_period_from TEXT,
      service_period_to TEXT,
      paid_date TEXT,
      reminder_level INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run("INSERT INTO invoices SELECT * FROM invoices_old");
  db.run("DROP TABLE invoices_old");

  // Recreate indexes dropped by the table rename
  db.run("CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices(status, due_date)");

  console.log("[migration] invoices.project_id is now nullable");
}
