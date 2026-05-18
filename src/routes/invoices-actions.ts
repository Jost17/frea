import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import {
  getInvoice,
  getInvoiceItems,
  saveInvoicePdfPath,
  updateInvoiceStatus,
} from "../db/invoice-queries";
import { getClient, getSettings } from "../db/queries";
import type { AppEnv } from "../env";
import { generateInvoicePdf } from "../lib/pdf/invoice-pdf";
import { generateZUGFeRDXML, type ZUGFeRDInvoiceData } from "../lib/zugferd-generator";
import { AppError, logAndRespond } from "../middleware/error-handler";
import { EmailService } from "../services/email";
import { invoiceStatusUpdateSchema } from "../validation/schemas";

export const invoiceActionsRoutes = new Hono<AppEnv>();

// POST: Update invoice status (sent/paid/cancelled)
invoiceActionsRoutes.post("/:id/status", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    const body = await c.req.parseBody();
    const parsed = invoiceStatusUpdateSchema.safeParse({
      status:
        typeof body === "object" && body !== null
          ? (body as Record<string, unknown>).status
          : undefined,
    });
    if (!parsed.success) {
      return logAndRespond(c, parsed.error, "Ungültiger Status", 422);
    }

    updateInvoiceStatus(id, parsed.data.status);

    return c.redirect(`/rechnungen/${id}`);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Status konnte nicht aktualisiert werden", 500);
  }
});

// GET: Download invoice PDF
invoiceActionsRoutes.get("/:id/pdf", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    const invoice = getInvoice(id);
    if (!invoice) throw new AppError("Rechnung nicht gefunden", 404);

    const items = getInvoiceItems(id);
    const client = getClient(invoice.client_id);
    const settings = getSettings();

    if (!client || !settings) throw new AppError("Daten fehlen", 500);

    // Generate ZUGFeRD XML if not Kleinunternehmer
    let zugferdXml: string | undefined;
    if (!settings.kleinunternehmer && items.length > 0) {
      const data: ZUGFeRDInvoiceData = {
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        periodMonth: invoice.period_month,
        periodYear: invoice.period_year,
        periodStart: invoice.service_period_from || invoice.invoice_date,
        periodEnd: invoice.service_period_to || invoice.invoice_date,
        seller: {
          name: settings.company_name,
          address: settings.address || "",
          postalCode: settings.postal_code || "",
          city: settings.city || "",
          country: "Deutschland",
          email: settings.email,
          taxNumber: settings.tax_number,
          vatId: settings.ust_id || undefined,
        },
        buyer: {
          name: client.name,
          address: client.address || null,
          postalCode: client.postal_code || null,
          city: client.city || null,
          country: "Deutschland",
          email: client.email || undefined,
          reference: invoice.po_number || invoice.invoice_number,
        },
        payment: {
          iban: settings.iban,
          bic: settings.bic,
        },
        vat: { categoryCode: "S" },
        lineItems: items.map((item) => ({
          description: item.description,
          quantity: item.days,
          unitPrice: item.daily_rate,
          netAmount: item.net_amount,
        })),
        totals: {
          netAmount: invoice.net_amount,
          vatRate: settings.vat_rate,
          vatAmount: invoice.vat_amount,
          grossAmount: invoice.gross_amount,
        },
      };
      zugferdXml = generateZUGFeRDXML(data);
    }

    const result = await generateInvoicePdf(
      { invoice, items, client, settings },
      zugferdXml ? { embedZugferd: true, zugferdXml } : undefined,
    );

    if (!result.success) {
      throw new AppError(`PDF konnte nicht erstellt werden: ${result.error}`, 500);
    }

    saveInvoicePdfPath(id, result.filePath);

    const fileName = result.fileName;
    const fileBuffer = await readFile(result.filePath);

    c.header("Content-Type", "application/pdf");
    c.header("Content-Disposition", `attachment; filename="${fileName}"`);

    return c.body(fileBuffer);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "PDF konnte nicht geladen werden", 500);
  }
});

// POST: Send invoice by email
invoiceActionsRoutes.post("/:id/send", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    const invoice = getInvoice(id);
    if (!invoice) throw new AppError("Rechnung nicht gefunden", 404);

    const client = getClient(invoice.client_id);
    const settings = getSettings();

    if (!client || !settings) throw new AppError("Daten fehlen", 500);
    if (!client.email) throw new AppError("Kunde hat keine E-Mail-Adresse", 400);

    // Auto-regenerate PDF if missing
    let pdfPath = invoice.pdf_path;
    if (!pdfPath) {
      const items = getInvoiceItems(id);

      // Generate ZUGFeRD XML if not Kleinunternehmer
      let zugferdXml: string | undefined;
      if (!settings.kleinunternehmer && items.length > 0) {
        const data: ZUGFeRDInvoiceData = {
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          dueDate: invoice.due_date,
          periodMonth: invoice.period_month,
          periodYear: invoice.period_year,
          periodStart: invoice.service_period_from || invoice.invoice_date,
          periodEnd: invoice.service_period_to || invoice.invoice_date,
          seller: {
            name: settings.company_name,
            address: settings.address || "",
            postalCode: settings.postal_code || "",
            city: settings.city || "",
            country: "Deutschland",
            email: settings.email,
            taxNumber: settings.tax_number,
            vatId: settings.ust_id || undefined,
          },
          buyer: {
            name: client.name,
            address: client.address || null,
            postalCode: client.postal_code || null,
            city: client.city || null,
            country: "Deutschland",
            email: client.email || undefined,
            reference: invoice.po_number || invoice.invoice_number,
          },
          payment: {
            iban: settings.iban,
            bic: settings.bic,
          },
          vat: { categoryCode: "S" },
          lineItems: items.map((item) => ({
            description: item.description,
            quantity: item.days,
            unitPrice: item.daily_rate,
            netAmount: item.net_amount,
          })),
          totals: {
            netAmount: invoice.net_amount,
            vatRate: settings.vat_rate,
            vatAmount: invoice.vat_amount,
            grossAmount: invoice.gross_amount,
          },
        };
        zugferdXml = generateZUGFeRDXML(data);
      }

      const result = await generateInvoicePdf(
        { invoice, items, client, settings },
        zugferdXml ? { embedZugferd: true, zugferdXml } : undefined,
      );
      if (!result.success) {
        throw new AppError(`PDF konnte nicht erstellt werden: ${result.error}`, 500);
      }
      pdfPath = result.filePath;
      saveInvoicePdfPath(id, result.filePath);
    }

    // Send email with PDF attachment
    const emailService = new EmailService(settings);
    await emailService.sendInvoice({
      to: client.email,
      subject: `Rechnung ${invoice.invoice_number}`,
      attachmentPath: pdfPath,
    });

    // Update invoice status to 'sent'
    updateInvoiceStatus(id, "sent");

    return c.json({ success: true, message: "Rechnung versendet" });
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Rechnung konnte nicht versendet werden", 500);
  }
});
