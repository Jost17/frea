import { Hono } from "hono";
import { html } from "hono/html";
import { getAllActiveClients } from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { Layout } from "../templates/layout";
import { recurringTemplateSchema } from "../validation/schemas";
import { renderRecurringDetail } from "../views/recurring/detail";
import { renderRecurringForm } from "../views/recurring/form";
import { renderRecurringList } from "../views/recurring/list";
import {
  createTemplate,
  deactivateTemplate,
  getAllTemplates,
  getDueTemplates,
  getTemplate,
  getTemplateItems,
  getTemplateWithClient,
  updateTemplate,
} from "./repository";
import { generateDraftFromTemplate } from "./service";

export const recurringRoutes = new Hono<AppEnv>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseItemsFromFormData(formData: FormData): {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}[] {
  const descriptions = formData.getAll("item_description[]");
  const quantities = formData.getAll("item_quantity[]");
  const unitPrices = formData.getAll("item_unit_price[]");
  const vatRates = formData.getAll("item_vat_rate[]");

  const items = [];
  for (let i = 0; i < descriptions.length; i++) {
    const description =
      typeof descriptions[i] === "string" ? (descriptions[i] as string).trim() : "";
    const quantity = parseFloat(
      typeof quantities[i] === "string" ? (quantities[i] as string) : "0",
    );
    const unit_price = parseFloat(
      typeof unitPrices[i] === "string" ? (unitPrices[i] as string) : "0",
    );
    const vat_rate = parseFloat(typeof vatRates[i] === "string" ? (vatRates[i] as string) : "19");

    if (description) {
      items.push({
        description,
        quantity: Number.isNaN(quantity) ? 1 : quantity,
        unit_price: Number.isNaN(unit_price) ? 0 : unit_price,
        vat_rate: Number.isNaN(vat_rate) ? 19 : vat_rate,
      });
    }
  }
  return items;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /vorlagen — List
recurringRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const templates = getAllTemplates();
    const today = new Date().toISOString().split("T")[0];

    return c.html(
      Layout({
        title: "Wiederkehrende Vorlagen",
        activeNav: "vorlagen",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Wiederkehrende Vorlagen</h1>
            <a
              href="/vorlagen/neu"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Neue Vorlage
            </a>
          </div>
          ${renderRecurringList(templates, today)}
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Vorlagen konnten nicht geladen werden", 500);
  }
});

// GET /vorlagen/faellig — Due today (dashboard widget)
recurringRoutes.get("/faellig", (c) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const due = getDueTemplates(today);
    return c.json({ due, count: due.length });
  } catch (err) {
    return logAndRespond(c, err, "Fällige Vorlagen konnten nicht geladen werden", 500);
  }
});

// GET /vorlagen/neu — Create form
recurringRoutes.get("/neu", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const clients = getAllActiveClients();

    return c.html(
      Layout({
        title: "Neue Vorlage",
        activeNav: "vorlagen",
        overdueCount,
        children: html`
          <div class="mb-6">
            <h1 class="text-2xl font-semibold">Neue wiederkehrende Vorlage</h1>
            <p class="text-sm text-text-muted mt-1">Erzeugt automatisch Rechnungsentwürfe zum Fälligkeitsdatum.</p>
          </div>
          ${renderRecurringForm({ clients })}
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Formular konnte nicht geladen werden", 500);
  }
});

// POST /vorlagen — Create
recurringRoutes.post("/", async (c) => {
  try {
    const formData = await c.req.formData();

    const rawItems = parseItemsFromFormData(formData);

    const rawData = {
      client_id: parseInt(formData.get("client_id") as string, 10),
      title: (formData.get("title") as string | null)?.trim() ?? "",
      interval: formData.get("interval") as string,
      start_date: (formData.get("start_date") as string | null) ?? "",
      end_date: (formData.get("end_date") as string | null) ?? "",
      next_due: (formData.get("next_due") as string | null) ?? "",
      items: rawItems,
    };

    const parsed = recurringTemplateSchema.safeParse(rawData);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    }

    const { items, end_date, ...templateData } = parsed.data;
    const id = createTemplate({ ...templateData, end_date: end_date || null }, items);

    return c.redirect(`/vorlagen/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Vorlage konnte nicht erstellt werden");
  }
});

// GET /vorlagen/:id — Detail
recurringRoutes.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Vorlagen-ID", 400);

    const template = getTemplateWithClient(id);
    if (!template) throw new AppError("Vorlage nicht gefunden", 404);

    const items = getTemplateItems(id);
    const overdueCount = c.get("overdueCount");
    const flash = c.req.query("flash");

    return c.html(
      Layout({
        title: template.title,
        activeNav: "vorlagen",
        overdueCount,
        children: html`
          <div class="mb-6">
            <h1 class="text-2xl font-semibold">${template.title}</h1>
          </div>
          ${renderRecurringDetail({ template, items, flash })}
        `,
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Vorlage konnte nicht geladen werden", 500);
  }
});

// GET /vorlagen/:id/bearbeiten — Edit form
recurringRoutes.get("/:id/bearbeiten", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Vorlagen-ID", 400);

    const template = getTemplate(id);
    if (!template) throw new AppError("Vorlage nicht gefunden", 404);

    const items = getTemplateItems(id);
    const clients = getAllActiveClients();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: `${template.title} bearbeiten`,
        activeNav: "vorlagen",
        overdueCount,
        children: html`
          <div class="mb-6">
            <h1 class="text-2xl font-semibold">Vorlage bearbeiten</h1>
          </div>
          ${renderRecurringForm({ clients, template, items })}
        `,
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Vorlage konnte nicht geladen werden", 500);
  }
});

// POST /vorlagen/:id — Update (HTML forms can't send PUT — use POST + _method)
recurringRoutes.post("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Vorlagen-ID", 400);

    const existing = getTemplate(id);
    if (!existing) throw new AppError("Vorlage nicht gefunden", 404);

    const formData = await c.req.formData();
    const rawItems = parseItemsFromFormData(formData);

    const rawData = {
      client_id: parseInt(formData.get("client_id") as string, 10),
      title: (formData.get("title") as string | null)?.trim() ?? "",
      interval: formData.get("interval") as string,
      start_date: (formData.get("start_date") as string | null) ?? "",
      end_date: (formData.get("end_date") as string | null) ?? "",
      next_due: (formData.get("next_due") as string | null) ?? "",
      items: rawItems,
    };

    const parsed = recurringTemplateSchema.safeParse(rawData);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    }

    const { items, end_date, ...templateData } = parsed.data;
    updateTemplate(id, { ...templateData, end_date: end_date || null }, items);

    return c.redirect(`/vorlagen/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Vorlage konnte nicht gespeichert werden");
  }
});

// POST /vorlagen/:id/generieren — Manually trigger draft generation
recurringRoutes.post("/:id/generieren", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Vorlagen-ID", 400);

    const invoiceId = generateDraftFromTemplate(id);

    return c.redirect(`/rechnungen/${invoiceId}`);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Entwurf konnte nicht generiert werden", 500);
  }
});

// POST /vorlagen/:id/deaktivieren — Soft-delete (set active=0)
recurringRoutes.post("/:id/deaktivieren", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Vorlagen-ID", 400);

    const existing = getTemplate(id);
    if (!existing) throw new AppError("Vorlage nicht gefunden", 404);

    deactivateTemplate(id);

    return c.redirect("/vorlagen");
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Vorlage konnte nicht deaktiviert werden", 500);
  }
});
