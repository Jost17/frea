import { Hono } from "hono";
import {
  getDunnableInvoices,
  getDunningRunsForInvoice,
  getDunningSettings,
  saveDunningLevels,
  triggerDunning,
} from "../db/dunning-queries";
import { getInvoice } from "../db/invoice-queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import {
  renderDunningHistorySection,
  renderDunningOverview,
  renderDunningSettings,
} from "../templates/dunning";
import { Layout } from "../templates/layout";
import { parseFormFields } from "../utils/form-parser";
import { dunningSettingsSchema } from "../validation/schemas";

export const dunningRoutes = new Hono<AppEnv>();

// ─── Overview: all overdue invoices eligible for dunning ─────────────────────

dunningRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const invoices = getDunnableInvoices();

    return c.html(
      Layout({
        title: "Mahnwesen",
        activeNav: "mahnwesen",
        overdueCount,
        children: renderDunningOverview(invoices),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Mahnübersicht konnte nicht geladen werden", 500);
  }
});

// ─── Trigger dunning for a single invoice ────────────────────────────────────

dunningRoutes.post("/:id/mahnen", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    triggerDunning(id);

    return c.redirect("/mahnwesen");
  } catch (err) {
    if (err instanceof AppError) throw err;
    return handleMutationError(c, err, "Mahnstufe konnte nicht gesetzt werden");
  }
});

// ─── Dunning history partial (used in invoice detail via HTMX) ───────────────

dunningRoutes.get("/:id/historie", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    const invoice = getInvoice(id);
    if (!invoice) throw new AppError("Rechnung nicht gefunden", 404);

    const runs = getDunningRunsForInvoice(id);
    return c.html(renderDunningHistorySection(runs));
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Mahnhistorie konnte nicht geladen werden", 500);
  }
});

// ─── Dunning settings (GET) ──────────────────────────────────────────────────

export const dunningSettingsRoutes = new Hono<AppEnv>();

dunningSettingsRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const levels = getDunningSettings();

    return c.html(
      Layout({
        title: "Mahneinstellungen",
        activeNav: "einstellungen",
        overdueCount,
        children: renderDunningSettings(levels),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Mahneinstellungen konnten nicht geladen werden", 500);
  }
});

// ─── Dunning settings (POST) ─────────────────────────────────────────────────

const DUNNING_FIELDS = {
  level1_days: "int",
  level1_fee: "float",
  level1_subject: "string",
  level1_body: "string",
  level2_days: "int",
  level2_fee: "float",
  level2_subject: "string",
  level2_body: "string",
  level3_days: "int",
  level3_fee: "float",
  level3_subject: "string",
  level3_body: "string",
} as const;

dunningSettingsRoutes.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const fields = parseFormFields(formData, DUNNING_FIELDS);
    const parsed = dunningSettingsSchema.safeParse(fields);

    if (!parsed.success) {
      const overdueCount = c.get("overdueCount");
      const levels = getDunningSettings();
      return c.html(
        Layout({
          title: "Mahneinstellungen",
          activeNav: "einstellungen",
          overdueCount,
          children: renderDunningSettings(
            levels,
            null,
            parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
          ),
        }),
        422,
      );
    }

    const d = parsed.data;
    saveDunningLevels([
      {
        level: 1,
        days_after_due: d.level1_days,
        fee_amount: d.level1_fee,
        subject: d.level1_subject,
        body: d.level1_body,
      },
      {
        level: 2,
        days_after_due: d.level2_days,
        fee_amount: d.level2_fee,
        subject: d.level2_subject,
        body: d.level2_body,
      },
      {
        level: 3,
        days_after_due: d.level3_days,
        fee_amount: d.level3_fee,
        subject: d.level3_subject,
        body: d.level3_body,
      },
    ]);

    const overdueCount = c.get("overdueCount");
    const levels = getDunningSettings();
    return c.html(
      Layout({
        title: "Mahneinstellungen",
        activeNav: "einstellungen",
        overdueCount,
        children: renderDunningSettings(levels, "Mahneinstellungen gespeichert.", null),
      }),
    );
  } catch (err) {
    return handleMutationError(c, err, "Mahneinstellungen konnten nicht gespeichert werden");
  }
});
