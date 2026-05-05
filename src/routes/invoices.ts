import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import { html } from "hono/html";
import {
  computeProjectPreviews,
  createInvoice,
  getAllInvoices,
  getInvoice,
  getInvoiceItems,
  saveInvoicePdfPath,
  updateInvoiceStatus,
} from "../db/invoice-queries";
import {
  getAllActiveClients,
  getClient,
  getProject,
  getSettings,
  getTimeEntriesForProject,
} from "../db/queries";
import type { AppEnv } from "../env";
import { generateInvoicePdf } from "../lib/pdf/invoice-pdf";
import { generateZUGFeRDXML, type ZUGFeRDInvoiceData } from "../lib/zugferd-generator";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { EmailService } from "../services/email";
import { renderInvoiceClientSelection } from "../templates/invoice-create-client";
import { renderInvoiceProjectSelection } from "../templates/invoice-create-project";
import { renderInvoiceDetailPage } from "../templates/invoice-detail";
import { renderInvoiceList } from "../templates/invoice-list";
import { Layout } from "../templates/layout";
import { parseFormFields } from "../utils/form-parser";
import { invoiceCreateSchema, invoiceStatusUpdateSchema } from "../validation/schemas";

export const invoiceRoutes = new Hono<AppEnv>();

// Form fields parsed as strings/ints — client_id/project_id are ints, rest
// are passed through to Zod where the schema refines them.
const INVOICE_CREATE_FIELDS = {
  client_id: "int",
  project_id: "int",
  invoice_date: "string",
  period_month: "int",
  period_year: "int",
  po_number: "string",
  service_period_from: "string",
  service_period_to: "string",
} as const;

// List all invoices
invoiceRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const invoices = getAllInvoices();
    const now = new Date().toISOString().split("T")[0];

    return c.html(
      Layout({
        title: "Rechnungen",
        activeNav: "rechnungen",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Rechnungen</h1>
            <a
              href="/rechnungen/create"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Neue Rechnung
            </a>
          </div>
          ${renderInvoiceList(invoices, now)}
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Rechnungen konnten nicht geladen werden", 500);
  }
});

// Step 1: Select client
invoiceRoutes.get("/create", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const clientIdParam = c.req.query("client_id");

    // Step 2: If client_id provided, show project + time entry selection
    if (clientIdParam) {
      const clientId = parseInt(clientIdParam, 10);
      if (Number.isNaN(clientId)) {
        throw new AppError("Ungültige Kunden-ID", 400);
      }

      const client = getClient(clientId);
      if (!client) {
        throw new AppError("Kunde nicht gefunden", 404);
      }

      const settings = getSettings();
      if (!settings) {
        throw new AppError("Firmeneinstellungen nicht initialisiert", 500);
      }

      const isKleinunternehmer = Boolean(settings.kleinunternehmer);
      const today = new Date().toISOString().split("T")[0];

      const projectPreviews = computeProjectPreviews(
        clientId,
        settings.vat_rate,
        isKleinunternehmer,
      );

      return c.html(
        Layout({
          title: "Neue Rechnung",
          activeNav: "rechnungen",
          overdueCount,
          children: renderInvoiceProjectSelection({
            client,
            projectPreviews,
            today,
            paymentDays: settings.payment_days || 28,
            vatRate: settings.vat_rate,
            isKleinunternehmer,
          }),
        }),
      );
    }

    // Step 1: Show client selection
    const clients = getAllActiveClients();

    return c.html(
      Layout({
        title: "Neue Rechnung",
        activeNav: "rechnungen",
        overdueCount,
        children: renderInvoiceClientSelection(clients),
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Formular konnte nicht geladen werden", 500);
  }
});

// POST: Create invoice
invoiceRoutes.post("/create", async (c) => {
  try {
    const formData = await c.req.formData();

    // time_entry_ids is multi-value and must be parsed separately from
    // the scalar fields handled by parseFormFields.
    const timeEntryIds: number[] = [];
    for (const raw of formData.getAll("time_entry_ids")) {
      if (typeof raw === "string") {
        const parsed = parseInt(raw, 10);
        if (Number.isInteger(parsed) && parsed > 0) {
          timeEntryIds.push(parsed);
        }
      }
    }

    if (timeEntryIds.length === 0) {
      throw new AppError("Keine Zeiteinträge ausgewählt", 400);
    }

    const fields = parseFormFields(formData, INVOICE_CREATE_FIELDS);
    const parseResult = invoiceCreateSchema.safeParse({ ...fields, time_entry_ids: timeEntryIds });
    if (!parseResult.success)
      throw new AppError(parseResult.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    const data = parseResult.data;

    const settings = getSettings();
    if (!settings) {
      throw new AppError("Firmeneinstellungen nicht initialisiert", 500);
    }

    // Verify project belongs to the selected client — prevents cross-client
    // spoofing where a crafted POST could mismatch client_id and project_id.
    const project = getProject(data.project_id);
    if (!project || project.client_id !== data.client_id) {
      throw new AppError("Projekt gehört nicht zum ausgewählten Kunden", 400);
    }

    // Single DB query (was N+1 before) — hoisted out of the id-to-entry loop.
    const projectEntries = getTimeEntriesForProject(data.project_id);
    const entryMap = new Map(projectEntries.map((e) => [e.id, e]));

    // Explicit missing-list gives useful diagnostics instead of a silent drop.
    const missingIds = data.time_entry_ids.filter((id) => !entryMap.has(id));
    if (missingIds.length > 0) {
      console.error(
        `[invoices POST /create] time_entry_ids not in project ${data.project_id} (or already billed):`,
        missingIds,
      );
      throw new AppError(
        `Zeiteinträge nicht auffindbar oder bereits abgerechnet: ${missingIds.join(", ")}. Bitte Seite neu laden.`,
        400,
      );
    }

    // getTimeEntriesForProject returns Omit<TimeEntry, "created_at">, so
    // pad with an empty created_at to satisfy createInvoice's TimeEntry[] input.
    const timeEntries = data.time_entry_ids.map((id) => ({
      ...entryMap.get(id)!,
      created_at: "",
    }));

    const invoiceId = createInvoice(data, timeEntries, settings);

    return c.redirect(`/rechnungen/${invoiceId}`);
  } catch (err) {
    return handleMutationError(c, err, "Rechnung konnte nicht erstellt werden");
  }
});

// View invoice detail
invoiceRoutes.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    const invoice = getInvoice(id);
    if (!invoice) throw new AppError("Rechnung nicht gefunden", 404);

    const items = getInvoiceItems(id);
    const client = getClient(invoice.client_id);
    const settings = getSettings();

    if (!client || !settings) throw new AppError("Daten fehlen", 500);

    const overdueCount = c.get("overdueCount");
    const now = new Date().toISOString().split("T")[0];
    const isOverdue = invoice.status === "sent" && invoice.due_date < now;

    return c.html(
      Layout({
        title: `Rechnung ${invoice.invoice_number}`,
        activeNav: "rechnungen",
        overdueCount,
        children: renderInvoiceDetailPage({
          invoice,
          items,
          client,
          settings,
          isOverdue,
        }),
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Rechnung konnte nicht geladen werden", 500);
  }
});

// POST: Update invoice status (sent/paid/cancelled)
invoiceRoutes.post("/:id/status", async (c) => {
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
invoiceRoutes.get("/:id/pdf", async (c) => {
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
invoiceRoutes.post("/:id/send", async (c) => {
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
