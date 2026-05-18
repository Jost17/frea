import { roundToEuro } from "../db/invoice-queries";
import { appendAuditLog, getSettings } from "../db/queries";
import { db } from "../db/schema";
import { AppError } from "../middleware/error-handler";
import { advanceNextDue, getTemplate, getTemplateItems } from "./repository";

// ─── Date Arithmetic ──────────────────────────────────────────────────────────

export function advanceDate(isoDate: string, interval: "monthly" | "quarterly" | "yearly"): string {
  const d = new Date(isoDate);
  switch (interval) {
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}

// ─── Draft Generation ─────────────────────────────────────────────────────────

/**
 * Generates a draft invoice from the given template, advances next_due,
 * and deactivates the template if end_date has been exceeded.
 * Returns the new invoice id.
 */
export function generateDraftFromTemplate(templateId: number): number {
  const template = getTemplate(templateId);
  if (!template) throw new AppError("Vorlage nicht gefunden", 404);
  if (!template.active) throw new AppError("Vorlage ist nicht aktiv", 400);

  const items = getTemplateItems(templateId);
  if (items.length === 0) throw new AppError("Vorlage enthält keine Positionen", 400);

  const settings = getSettings();
  if (!settings) throw new AppError("Firmeneinstellungen nicht initialisiert", 500);

  return db.transaction(() => {
    const isKleinunternehmer = Boolean(settings.kleinunternehmer);
    const today = new Date().toISOString().split("T")[0];

    // Compute totals (MwSt per line item — project rule)
    let totalNet = 0;
    let totalVat = 0;

    const lineItems = items.map((item) => {
      const effectiveVatRate = isKleinunternehmer ? 0 : item.vat_rate / 100;
      const netAmount = roundToEuro(item.quantity * item.unit_price);
      const vatAmount = roundToEuro(netAmount * effectiveVatRate);
      const grossAmount = roundToEuro(netAmount + vatAmount);
      totalNet += netAmount;
      totalVat += vatAmount;
      return { item, netAmount, vatAmount, grossAmount, effectiveVatRate };
    });

    totalNet = roundToEuro(totalNet);
    totalVat = roundToEuro(totalVat);
    const totalGross = roundToEuro(totalNet + totalVat);

    // Generate invoice number using existing sequence
    const nextNum = (settings.next_invoice_number || 1).toString().padStart(4, "0");
    const now = new Date();
    const year = now.getFullYear();
    const invoiceNumber = `${settings.invoice_prefix}-${year}-${nextNum}`;

    // Due date
    const invoiceDateObj = new Date(today);
    const dueDateObj = new Date(invoiceDateObj);
    dueDateObj.setDate(dueDateObj.getDate() + (settings.payment_days || 28));
    const dueDate = dueDateObj.toISOString().split("T")[0];

    const periodMonth = now.getMonth() + 1;
    const periodYear = year;

    // Create invoice with a note linking to the template
    const invoiceRow = db
      .query<
        { id: number },
        [string, number, null, string, string, number, number, number, number, number, string]
      >(
        `INSERT INTO invoices
         (invoice_number, client_id, project_id, invoice_date, due_date, period_month, period_year,
          net_amount, vat_amount, gross_amount, status, po_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
         RETURNING id`,
      )
      .get(
        invoiceNumber,
        template.client_id,
        // project_id is nullable after the schema migration for template-generated
        // invoices that have no project association.
        null,
        today,
        dueDate,
        periodMonth,
        periodYear,
        totalNet,
        totalVat,
        totalGross,
        `Vorlage #${templateId}: ${template.title}`,
      );

    if (!invoiceRow) throw new Error("Rechnung konnte nicht erstellt werden");
    const invoiceId = invoiceRow.id;

    // Insert line items
    const insertItem = db.query(
      `INSERT INTO invoice_items
       (invoice_id, description, period_start, period_end, days, daily_rate, net_amount, vat_rate, vat_amount, gross_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const { item, netAmount, vatAmount, grossAmount, effectiveVatRate } of lineItems) {
      insertItem.run(
        invoiceId,
        item.description,
        today,
        today,
        item.quantity,
        item.unit_price,
        netAmount,
        effectiveVatRate,
        vatAmount,
        grossAmount,
      );
    }

    // Advance sequence
    db.query(
      "UPDATE settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 1",
    ).run();

    // Advance next_due and check end_date
    const newNextDue = advanceDate(template.next_due, template.interval);
    const shouldDeactivate = Boolean(template.end_date && newNextDue > template.end_date);
    advanceNextDue(templateId, newNextDue, shouldDeactivate);

    // Audit log
    appendAuditLog("invoice", invoiceId, "create", {
      invoice_number: invoiceNumber,
      net_amount: totalNet,
      gross_amount: totalGross,
      source: "recurring_template",
      template_id: templateId,
    });

    return invoiceId;
  })();
}
