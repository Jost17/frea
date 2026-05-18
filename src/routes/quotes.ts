import { Hono } from "hono";
import { html } from "hono/html";
import { getAllActiveClients, getClient, getSettings } from "../db/queries";
import {
  convertQuoteToInvoice,
  createQuote,
  getAllQuotes,
  getQuote,
  getQuoteItems,
  updateQuoteStatus,
} from "../db/quote-queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { Layout } from "../templates/layout";
import { renderQuoteDetail } from "../templates/quote-detail";
import { renderQuoteForm } from "../templates/quote-form";
import { renderQuoteList } from "../templates/quote-list";
import {
  quoteCreateSchema,
  quoteItemInputSchema,
  quoteStatusUpdateSchema,
} from "../validation/schemas";

export const quoteRoutes = new Hono<AppEnv>();

// ─── List all quotes ──────────────────────────────────────────────────────────

quoteRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const quotes = getAllQuotes();

    return c.html(
      Layout({
        title: "Angebote",
        activeNav: "angebote",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Angebote</h1>
            <a
              href="/angebote/neu"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Neues Angebot
            </a>
          </div>
          ${renderQuoteList(quotes)}
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Angebote konnten nicht geladen werden", 500);
  }
});

// ─── New quote form ───────────────────────────────────────────────────────────

quoteRoutes.get("/neu", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const clients = getAllActiveClients();
    const settings = getSettings();

    if (!settings) {
      throw new AppError("Firmeneinstellungen nicht initialisiert", 500);
    }

    const isKleinunternehmer = Boolean(settings.kleinunternehmer);

    return c.html(
      Layout({
        title: "Neues Angebot",
        activeNav: "angebote",
        overdueCount,
        children: renderQuoteForm({
          clients,
          vatRate: settings.vat_rate,
          isKleinunternehmer,
        }),
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Formular konnte nicht geladen werden", 500);
  }
});

// ─── Create quote ─────────────────────────────────────────────────────────────

quoteRoutes.post("/", async (c) => {
  try {
    const formData = await c.req.formData();

    const clientIdRaw = formData.get("client_id");
    const client_id = clientIdRaw ? parseInt(String(clientIdRaw), 10) : Number.NaN;
    if (Number.isNaN(client_id)) throw new AppError("Ungültige Kunden-ID", 400);

    const quoteResult = quoteCreateSchema.safeParse({
      client_id,
      subject: formData.get("subject"),
      notes: formData.get("notes") ?? "",
      valid_until: formData.get("valid_until") ?? "",
    });

    if (!quoteResult.success) {
      throw new AppError(quoteResult.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    }

    // Parse line items: description[], quantity[], unit[], unit_price[], vat_rate[]
    const descriptions = formData.getAll("description");
    const quantities = formData.getAll("quantity");
    const units = formData.getAll("unit");
    const unitPrices = formData.getAll("unit_price");
    const vatRates = formData.getAll("vat_rate");

    if (descriptions.length === 0) {
      throw new AppError("Mindestens eine Position erforderlich", 400);
    }

    const items = descriptions.map((desc, i) => {
      const itemResult = quoteItemInputSchema.safeParse({
        description: String(desc),
        quantity: parseFloat(String(quantities[i] ?? "1")),
        unit: String(units[i] ?? "Tag"),
        unit_price: parseFloat(String(unitPrices[i] ?? "0")),
        vat_rate: parseFloat(String(vatRates[i] ?? "0.19")),
      });

      if (!itemResult.success) {
        throw new AppError(
          `Position ${i + 1}: ${itemResult.error.issues[0]?.message ?? "Ungültige Eingabe"}`,
          422,
        );
      }

      return itemResult.data;
    });

    const settings = getSettings();
    if (!settings) throw new AppError("Firmeneinstellungen nicht initialisiert", 500);

    const quoteId = createQuote(quoteResult.data, items, settings);

    return c.redirect(`/angebote/${quoteId}`);
  } catch (err) {
    return handleMutationError(c, err, "Angebot konnte nicht erstellt werden");
  }
});

// ─── Quote detail ─────────────────────────────────────────────────────────────

quoteRoutes.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Angebots-ID", 400);

    const quote = getQuote(id);
    if (!quote) throw new AppError("Angebot nicht gefunden", 404);

    const items = getQuoteItems(id);
    const client = getClient(quote.client_id);
    const settings = getSettings();

    if (!client || !settings) throw new AppError("Daten fehlen", 500);

    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: `Angebot ${quote.quote_number}`,
        activeNav: "angebote",
        overdueCount,
        children: renderQuoteDetail({ quote, items, client, settings }),
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Angebot konnte nicht geladen werden", 500);
  }
});

// ─── Status update ────────────────────────────────────────────────────────────

quoteRoutes.post("/:id/status", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Angebots-ID", 400);

    const formData = await c.req.formData();
    const parseResult = quoteStatusUpdateSchema.safeParse({
      status: formData.get("status"),
    });

    if (!parseResult.success) {
      throw new AppError(parseResult.error.issues[0]?.message ?? "Ungültiger Status", 422);
    }

    updateQuoteStatus(id, parseResult.data.status);

    return c.redirect(`/angebote/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Status konnte nicht aktualisiert werden");
  }
});

// ─── Convert quote → invoice (1-Klick) ───────────────────────────────────────

quoteRoutes.post("/:id/konvertieren", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Angebots-ID", 400);

    const settings = getSettings();
    if (!settings) throw new AppError("Firmeneinstellungen nicht initialisiert", 500);

    const invoiceId = convertQuoteToInvoice(id, settings);

    return c.redirect(`/rechnungen/${invoiceId}`);
  } catch (err) {
    return handleMutationError(c, err, "Konvertierung fehlgeschlagen");
  }
});
