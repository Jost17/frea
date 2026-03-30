import { Hono } from "hono";
import { db } from "../db/schema";
import { getAllInvoices, getSettings, updateInvoiceStatus, updateSettings } from "../db/queries";
import { AppError } from "../middleware/error-handler";
import { invoiceStatusUpdateSchema, settingsSchema } from "../validation/schemas";

export const apiRoutes = new Hono();

apiRoutes.get("/health", (c) => {
  try {
    db.query("SELECT 1").get();
    return c.json({ status: "ok", db: "ok" });
  } catch (err) {
    console.error("[health] DB check failed:", err);
    return c.json({ status: "error", db: "unavailable" }, 503);
  }
});

// GET /api/invoices?status=open|overdue|draft|sent|paid|cancelled
apiRoutes.get("/invoices", (c) => {
  const status = c.req.query("status") || undefined;
  const invoices = getAllInvoices(status);
  return c.json(invoices);
});

// GET /api/settings/company
apiRoutes.get("/settings/company", (c) => {
  const settings = getSettings();
  if (!settings) {
    throw new AppError("Einstellungen nicht initialisiert", 500);
  }
  return c.json(settings);
});

// PUT /api/settings/company
apiRoutes.put("/settings/company", async (c) => {
  const body = await c.req.json().catch(() => {
    throw new AppError("Ungültiger JSON-Body", 400);
  });

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
  }

  updateSettings(parsed.data);
  return c.json({ success: true });
});

// PATCH /api/invoices/:id/status
apiRoutes.patch("/invoices/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("Ungültige Rechnungs-ID", 400);
  }

  const body = await c.req.json().catch(() => {
    throw new AppError("Ungültiger JSON-Body", 400);
  });

  const parsed = invoiceStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
  }

  updateInvoiceStatus(id, parsed.data.status);
  return c.json({ success: true });
});
