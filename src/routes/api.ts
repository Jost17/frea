import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { getAllInvoices, getSettings, updateInvoiceStatus, updateSettings } from "../db/queries";
import { db } from "../db/schema";
import { AppError, logAndRespond } from "../middleware/error-handler";
import { invoiceStatusUpdateSchema, settingsSchema } from "../validation/schemas";

export const apiRoutes = new Hono();

// Guard: all API endpoints are localhost-only (no auth layer in this single-user app).
// Requests from external hosts are rejected. Adjust when multi-user support is added.
const requireLocalhost: MiddlewareHandler = async (c, next) => {
  const host = c.req.header("host") ?? "";
  if (!host.startsWith("localhost") && !host.startsWith("127.") && !host.startsWith("[::1]")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  return next();
};

apiRoutes.use("*", requireLocalhost);

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
  try {
    const status = c.req.query("status") || undefined;
    const invoices = getAllInvoices(status);
    return c.json(invoices);
  } catch (err) {
    console.error("[api] GET /invoices failed:", err);
    throw err;
  }
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

  try {
    updateSettings(parsed.data);
  } catch (err) {
    return logAndRespond(c, err, "Einstellungen konnten nicht gespeichert werden", 500);
  }

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

  try {
    updateInvoiceStatus(id, parsed.data.status);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Rechnungsstatus konnte nicht aktualisiert werden", 500);
  }

  return c.json({ success: true });
});
