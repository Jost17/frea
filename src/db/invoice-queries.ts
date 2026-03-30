import { db } from "./schema";
import type { Settings, Project, TimeEntry, InvoiceCreate, Invoice, InvoiceItem } from "../validation/schemas";
import { appendAuditLog } from "./queries";

// ─── Invoices ────────────────────────────────────────────────────────────────

function roundToEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

export function createInvoice(data: InvoiceCreate, timeEntries: TimeEntry[], settings: Settings): number {
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

    // Calculate totals PER LINE ITEM with proper MwSt
    let totalNet = 0;
    let totalVat = 0;

    const vatRate = settings.vat_rate;
    const invoiceItems = timeEntries.map((entry) => {
      const project = projectMap.get(entry.project_id);
      if (!project) throw new Error(`Projekt ${entry.project_id} nicht gefunden`);

      const netAmount = roundToEuro(entry.duration * project.daily_rate);
      const vatAmount = roundToEuro(netAmount * vatRate);
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
         (invoice_number, client_id, project_id, invoice_date, due_date, period_month, period_year, net_amount, vat_amount, gross_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
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
        vatRate,
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
    db.query("UPDATE settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 1").run();

    // Audit log
    appendAuditLog("invoice", invoiceId, "create", {
      invoice_number: invoiceNumber,
      net_amount: totalNet,
      gross_amount: totalGross,
      time_entry_count: timeEntries.length,
    });

    return invoiceId;
  })();
}

export function getInvoice(id: number) {
  return db
    .query<Invoice, [number]>(
      `SELECT * FROM invoices WHERE id = ?`,
    )
    .get(id);
}

export function getInvoiceItems(invoiceId: number) {
  return db
    .query<InvoiceItem, [number]>(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY period_start`,
    )
    .all(invoiceId);
}
