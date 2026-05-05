import { AppError } from "../middleware/error-handler";
import type {
  Invoice,
  InvoiceCreate,
  InvoiceItem,
  InvoiceListItem,
  Project,
  Settings,
  TimeEntry,
} from "../validation/schemas";
import { OPEN_INVOICE_STATUSES_SQL, overdueInvoiceWhere } from "./invoice-status";
import { appendAuditLog, getActiveProjectsForClient, getTimeEntriesForProject } from "./queries";
import { db } from "./schema";

// ─── Money / Rounding ────────────────────────────────────────────────────────

/**
 * Kaufmännische Rundung to 2 decimals. Single source of truth — never
 * duplicate this rule elsewhere, financial correctness depends on it.
 */
export function roundToEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

// ─── Invoice Preview (used by the create wizard) ─────────────────────────────

export interface InvoiceCreateEntryPreview {
  id: number;
  date: string;
  duration: number;
  description: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

export interface InvoiceCreateProjectPreview {
  project: Omit<Project, "created_at" | "archived">;
  unbilledEntries: InvoiceCreateEntryPreview[];
  totalDays: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

/**
 * Compute invoice previews for all active projects of a client.
 * Returns one preview per project with its unbilled time entries and
 * per-line VAT math (MwSt pro Position, dann Summe — project rule).
 */
export function computeProjectPreviews(
  clientId: number,
  vatRate: number,
  isKleinunternehmer: boolean,
): InvoiceCreateProjectPreview[] {
  const projects = getActiveProjectsForClient(clientId);
  const effectiveVatRate = isKleinunternehmer ? 0 : vatRate;

  return projects.map((project) => {
    const entries = getTimeEntriesForProject(project.id);

    const unbilledEntries: InvoiceCreateEntryPreview[] = entries.map((entry) => {
      const netAmount = roundToEuro(entry.duration * project.daily_rate);
      const vatAmount = roundToEuro(netAmount * effectiveVatRate);
      const grossAmount = roundToEuro(netAmount + vatAmount);
      return {
        id: entry.id,
        date: entry.date,
        duration: entry.duration,
        description: entry.description || "",
        netAmount,
        vatAmount,
        grossAmount,
      };
    });

    const totalDays = roundToEuro(unbilledEntries.reduce((sum, e) => sum + e.duration, 0));
    const netAmount = roundToEuro(unbilledEntries.reduce((sum, e) => sum + e.netAmount, 0));
    const vatAmount = roundToEuro(unbilledEntries.reduce((sum, e) => sum + e.vatAmount, 0));
    const grossAmount = roundToEuro(unbilledEntries.reduce((sum, e) => sum + e.grossAmount, 0));

    return { project, unbilledEntries, totalDays, netAmount, vatAmount, grossAmount };
  });
}

export function createInvoice(
  data: InvoiceCreate,
  timeEntries: TimeEntry[],
  settings: Settings,
): number {
  // Wrapped in transaction for atomicity (P1-1)
  return db.transaction(() => {
    // Batch-fetch projects to avoid N+1 (P2-7)
    const uniqueProjectIds = [...new Set(timeEntries.map((e) => e.project_id))];
    const placeholders = uniqueProjectIds.map(() => "?").join(",");
    const projects = db
      .query<Project, number[]>(
        `SELECT id, client_id, code, name, daily_rate, start_date, end_date, budget_days,
                service_description, contract_number, contract_date, notes, created_at, archived
         FROM projects WHERE id IN (${placeholders})`,
      )
      .all(...uniqueProjectIds);
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    // Determine effective VAT rate: 0 for Kleinunternehmer
    const isKleinunternehmer = Boolean(settings.kleinunternehmer);
    const effectiveVatRate = isKleinunternehmer ? 0 : settings.vat_rate;

    // Calculate totals PER LINE ITEM with proper MwSt
    let totalNet = 0;
    let totalVat = 0;

    const invoiceItems = timeEntries.map((entry) => {
      const project = projectMap.get(entry.project_id);
      if (!project) throw new Error(`Projekt ${entry.project_id} nicht gefunden`);

      const netAmount = roundToEuro(entry.duration * project.daily_rate);
      const vatAmount = roundToEuro(netAmount * effectiveVatRate);
      const grossAmount = roundToEuro(netAmount + vatAmount);

      totalNet += netAmount;
      totalVat += vatAmount;

      return { entry, project, netAmount, vatAmount, grossAmount };
    });

    // Round totals (safety)
    totalNet = roundToEuro(totalNet);
    totalVat = roundToEuro(totalVat);
    const totalGross = roundToEuro(totalNet + totalVat);

    // Generate invoice number
    const nextNum = (settings.next_invoice_number || 1).toString().padStart(4, "0");
    const invoiceNumber = `${settings.invoice_prefix}-${data.period_year}-${nextNum}`;

    // Calculate due date
    const invoiceDateObj = new Date(data.invoice_date);
    const dueDateObj = new Date(invoiceDateObj);
    dueDateObj.setDate(dueDateObj.getDate() + (settings.payment_days || 28));
    const dueDate = dueDateObj.toISOString().split("T")[0];

    // Create invoice record
    const invoiceRecord = db
      .query(
        `INSERT INTO invoices
         (invoice_number, client_id, project_id, invoice_date, due_date, period_month, period_year,
          net_amount, vat_amount, gross_amount, status, po_number,
          service_period_from, service_period_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
         RETURNING id`,
      )
      .get(
        invoiceNumber,
        data.client_id,
        data.project_id,
        data.invoice_date,
        dueDate,
        data.period_month,
        data.period_year,
        totalNet,
        totalVat,
        totalGross,
        data.po_number || null,
        data.service_period_from || null,
        data.service_period_to || null,
      ) as { id: number } | undefined;

    if (!invoiceRecord) throw new Error("Rechnung konnte nicht erstellt werden");

    const invoiceId = invoiceRecord.id;

    // Create line items
    const insertItem = db.query(
      `INSERT INTO invoice_items
       (invoice_id, description, period_start, period_end, days, daily_rate, net_amount, vat_rate, vat_amount, gross_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const item of invoiceItems) {
      insertItem.run(
        invoiceId,
        `${item.project.name}: ${item.entry.description || "Taetigkeit"}`,
        data.service_period_from || item.entry.date,
        data.service_period_to || item.entry.date,
        item.entry.duration,
        item.project.daily_rate,
        item.netAmount,
        effectiveVatRate,
        item.vatAmount,
        item.grossAmount,
      );
    }

    // Link time entries to invoice
    const linkStmt = db.query("UPDATE time_entries SET invoice_id = ? WHERE id = ?");
    for (const entry of timeEntries) {
      linkStmt.run(invoiceId, entry.id);
    }

    // Update next invoice number
    db.query(
      "UPDATE settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 1",
    ).run();

    // Audit log
    appendAuditLog("invoice", invoiceId, "create", {
      invoice_number: invoiceNumber,
      net_amount: totalNet,
      gross_amount: totalGross,
      vat_rate: effectiveVatRate,
      is_kleinunternehmer: isKleinunternehmer,
      time_entry_count: timeEntries.length,
    });

    return invoiceId;
  })();
}

export function getInvoice(id: number) {
  return db.query<Invoice, [number]>(`SELECT * FROM invoices WHERE id = ?`).get(id);
}

export function getInvoiceItems(invoiceId: number) {
  return db
    .query<InvoiceItem, [number]>(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY period_start`,
    )
    .all(invoiceId);
}

// ─── Invoice List + Status ────────────────────────────────────────────────────

export function getAllInvoices(status?: string): InvoiceListItem[] {
  const base = `
    SELECT i.id, i.invoice_number, c.name as client_name,
           i.invoice_date, i.due_date, i.gross_amount, i.status, i.paid_date
    FROM invoices i
    JOIN clients c ON i.client_id = c.id`;

  if (status === "open") {
    return db
      .query<InvoiceListItem, []>(
        `${base} WHERE i.${OPEN_INVOICE_STATUSES_SQL} ORDER BY i.invoice_date DESC`,
      )
      .all();
  }
  if (status === "overdue") {
    return db
      .query<InvoiceListItem, []>(
        `${base} WHERE ${overdueInvoiceWhere("i")} ORDER BY i.invoice_date DESC`,
      )
      .all();
  }
  if (status) {
    return db
      .query<InvoiceListItem, [string]>(`${base} WHERE i.status = ? ORDER BY i.invoice_date DESC`)
      .all(status);
  }
  return db.query<InvoiceListItem, []>(`${base} ORDER BY i.invoice_date DESC`).all();
}

const VALID_TRANSITIONS: Record<Invoice["status"], readonly Invoice["status"][]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export function updateInvoiceStatus(id: number, newStatus: "sent" | "paid" | "cancelled"): void {
  const row = db
    .query<Pick<Invoice, "status">, [number]>("SELECT status FROM invoices WHERE id = ?")
    .get(id);

  if (!row) {
    throw new AppError("Rechnung nicht gefunden", 404);
  }

  const allowed = VALID_TRANSITIONS[row.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(`Statuswechsel von '${row.status}' zu '${newStatus}' nicht erlaubt`, 422);
  }

  const updateWithAudit = db.transaction(() => {
    if (newStatus === "paid") {
      db.query("UPDATE invoices SET status = ?, paid_date = date('now') WHERE id = ?").run(
        newStatus,
        id,
      );
    } else {
      db.query("UPDATE invoices SET status = ? WHERE id = ?").run(newStatus, id);
    }
    appendAuditLog("invoice", id, "status_change", { from: row.status, to: newStatus });
  });

  updateWithAudit();
}
