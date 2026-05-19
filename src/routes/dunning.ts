import { Hono } from "hono";
import {
  advanceDunningLevel,
  getInvoice,
  getOverdueInvoicesByDunningLevel,
} from "../db/invoice-queries";
import { getClient, getSettings } from "../db/queries";
import type { AppEnv } from "../env";
import {
  calculateVerzugszinsen,
  getDaysOverdue,
  getDunningLevel,
  getDunningState,
  isInvoiceOverdue,
} from "../lib/dunning";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { EmailService } from "../services/email";
import { renderDunningListPage } from "../templates/dunning-list";
import { Layout } from "../templates/layout";

export const dunningRoutes = new Hono<AppEnv>();

/**
 * GET /mahnungen — list all overdue invoices grouped by dunning level
 */
dunningRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const grouped = getOverdueInvoicesByDunningLevel();

    // Enrich invoices with client names and dunning state
    const enriched = Object.entries(grouped).reduce(
      (acc, [level, invoices]) => {
        acc[Number(level)] = invoices.map((inv) => {
          const client = getClient(inv.client_id);
          const daysOverdue = getDaysOverdue(inv);
          const dunningState = getDunningState(getDunningLevel(inv));
          return {
            ...inv,
            client_name: client?.name || "Unbekannter Kunde",
            days_overdue: daysOverdue,
            dunning_label: dunningState.label,
          };
        });
        return acc;
      },
      {} as Record<number, any[]>,
    );

    return c.html(
      Layout({
        title: "Mahnwesen",
        activeNav: "rechnungen",
        overdueCount,
        children: renderDunningListPage(enriched),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Mahnungen konnten nicht geladen werden", 500);
  }
});

/**
 * POST /:id/mahnung — advance dunning level for an invoice
 */
dunningRoutes.post("/:id/mahnung", async (c) => {
  try {
    const invoiceId = Number(c.req.param("id"));
    if (!invoiceId) {
      throw new AppError("Ungültige Rechnungs-ID", 400);
    }

    const invoice = getInvoice(invoiceId);
    if (!invoice) {
      throw new AppError("Rechnung nicht gefunden", 404);
    }

    if (invoice.status === "paid" || invoice.status === "cancelled") {
      throw new AppError(
        "Mahnung kann nicht versendet werden für bezahlte oder stornierte Rechnung",
        422,
      );
    }

    if (!isInvoiceOverdue(invoice)) {
      throw new AppError("Rechnung ist nicht fällig", 422);
    }

    const currentLevel = getDunningLevel(invoice);
    if (currentLevel >= 3) {
      throw new AppError("Rechnung ist bereits auf höchster Mahnstufe", 422);
    }

    const settings = getSettings();
    if (!settings) {
      throw new AppError("Firmeneinstellungen nicht gefunden", 500);
    }

    const client = getClient(invoice.client_id);
    if (!client) {
      throw new AppError("Kunde nicht gefunden", 404);
    }

    // Advance dunning level
    advanceDunningLevel(invoiceId, currentLevel);

    // Prepare email
    const updatedInvoice = getInvoice(invoiceId)!;
    const nextLevel = getDunningLevel(updatedInvoice);
    const dunningState = getDunningState(nextLevel);

    let emailSubject = "";

    if (nextLevel === 1) {
      emailSubject = `Zahlungserinnerung Rechnung ${invoice.invoice_number}`;
    } else if (nextLevel === 2) {
      emailSubject = `1. Mahnung Rechnung ${invoice.invoice_number}`;
    } else if (nextLevel === 3) {
      emailSubject = `2. Mahnung mit Verzugszinsen Rechnung ${invoice.invoice_number}`;
    }

    try {
      if (client.email && invoice.pdf_path) {
        const emailService = new EmailService(settings);
        await emailService.sendInvoice({
          to: client.email,
          subject: emailSubject,
          attachmentPath: invoice.pdf_path,
        });
      }
    } catch (err) {
      console.warn("[dunning] Email send failed (continuing):", err);
    }

    return c.json({
      success: true,
      invoice_id: invoiceId,
      dunning_level: nextLevel,
      dunning_label: dunningState.label,
    });
  } catch (err) {
    return handleMutationError(c, err, "Mahnung konnte nicht versendet werden");
  }
});

/**
 * GET /:id/details — get dunning state for invoice detail page
 */
dunningRoutes.get("/:id/details", (c) => {
  try {
    const invoiceId = Number(c.req.param("id"));
    if (!invoiceId) {
      throw new AppError("Ungültige Rechnungs-ID", 400);
    }

    const invoice = getInvoice(invoiceId);
    if (!invoice) {
      throw new AppError("Rechnung nicht gefunden", 404);
    }

    const level = getDunningLevel(invoice);
    const state = getDunningState(level);
    const daysOverdue = getDaysOverdue(invoice);

    let verzugszinsen = null;
    if (state.showVerzugszinsen) {
      verzugszinsen = calculateVerzugszinsen(invoice);
    }

    return c.json({
      dunning_level: level,
      dunning_label: state.label,
      dunning_description: state.description,
      is_overdue: isInvoiceOverdue(invoice),
      days_overdue: daysOverdue,
      verzugszinsen,
    });
  } catch (err) {
    return logAndRespond(c, err, "Mahndetails konnten nicht geladen werden", 500);
  }
});
