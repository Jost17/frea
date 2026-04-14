import { Hono } from "hono";
import { html } from "hono/html";
import {
  createInvoice,
  getAllInvoices,
  getInvoice,
  getInvoiceItems,
  updateInvoiceStatus,
} from "../db/invoice-queries";
import {
  getActiveProjectsForClient,
  getAllActiveClients,
  getClient,
  getSettings,
  getTimeEntriesForProject,
} from "../db/queries";
import type { TimeEntry } from "../validation/schemas";
import type { AppEnv } from "../env";
import { AppError, logAndRespond } from "../middleware/error-handler";
import {
  renderInvoiceClientSelection,
  renderInvoiceList,
  renderInvoiceProjectSelection,
  type InvoiceCreateEntryPreview,
  type InvoiceCreateProjectPreview,
} from "../templates/invoice-pages";
import { renderInvoiceDetailPage } from "../templates/invoice-detail";
import { Layout } from "../templates/layout";
import { invoiceCreateSchema } from "../validation/schemas";

export const invoiceRoutes = new Hono<AppEnv>();

function roundToEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeProjectPreviews(
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

    const totalDays = roundToEuro(
      unbilledEntries.reduce((sum, e) => sum + e.duration, 0),
    );
    const netAmount = roundToEuro(
      unbilledEntries.reduce((sum, e) => sum + e.netAmount, 0),
    );
    const vatAmount = roundToEuro(
      unbilledEntries.reduce((sum, e) => sum + e.vatAmount, 0),
    );
    const grossAmount = roundToEuro(
      unbilledEntries.reduce((sum, e) => sum + e.grossAmount, 0),
    );

    return {
      project,
      unbilledEntries,
      totalDays,
      netAmount,
      vatAmount,
      grossAmount,
    };
  });
}

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
      const dueDate = new Date(
        Date.now() + (settings.payment_days || 28) * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0];

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
            dueDate,
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
    const body = await c.req.parseBody();
    const formData = body instanceof FormData ? body : new FormData();

    const timeEntryIds: number[] = [];
    const rawIds = formData.getAll("time_entry_ids");
    for (const raw of rawIds) {
      if (typeof raw === "string") {
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed)) {
          timeEntryIds.push(parsed);
        }
      }
    }

    const rawData = {
      client_id: formData.get("client_id"),
      project_id: formData.get("project_id"),
      time_entry_ids: timeEntryIds,
      invoice_date: formData.get("invoice_date"),
      period_month: formData.get("period_month"),
      period_year: formData.get("period_year"),
      po_number: formData.get("po_number") || "",
      service_period_from: formData.get("service_period_from") || "",
      service_period_to: formData.get("service_period_to") || "",
      reverse_charge: 0,
    };

    const parsed = invoiceCreateSchema.safeParse(rawData);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(", ");
      return c.text(`Validierungsfehler: ${errors}`, 400);
    }

    const settings = getSettings();
    if (!settings) {
      throw new AppError("Firmeneinstellungen nicht initialisiert", 500);
    }

    if (timeEntryIds.length === 0) {
      return c.text("Keine Zeiteinträge ausgewählt", 400);
    }

    const timeEntries = timeEntryIds
      .map((id) => {
        const entries = getTimeEntriesForProject(parsed.data.project_id);
        return entries.find((e) => e.id === id);
      })
      .filter((e): e is NonNullable<typeof e> => e !== undefined);

    if (timeEntries.length !== timeEntryIds.length) {
      return c.text("Einige Zeiteinträge wurden zwischenzeitig abgerechnet", 400);
    }

    const invoiceId = createInvoice(
      parsed.data,
      timeEntries as TimeEntry[],
      settings,
    );

    return c.redirect(`/rechnungen/${invoiceId}`);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Fehler beim Erstellen der Rechnung", 500);
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

// POST: Update invoice status (sent/paid)
invoiceRoutes.post("/:id/status", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    const body = await c.req.parseBody();
    const status = typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).status
      : undefined;

    if (status !== "sent" && status !== "paid" && status !== "cancelled") {
      return c.text("Ungültiger Status", 400);
    }

    updateInvoiceStatus(id, status as "sent" | "paid" | "cancelled");

    return c.redirect(`/rechnungen/${id}`);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Status konnte nicht aktualisiert werden", 500);
  }
});