import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { getConnInfo } from "hono/bun";
import { getAuditLogEntries, getInvoiceArchive, verifyAuditChain } from "../db/archive-queries";
import { getDashboardStats } from "../db/dashboard-queries";
import { createInvoice, getAllInvoices, updateInvoiceStatus } from "../db/invoice-queries";
import { getProject, getSettings, getTimeEntriesForProject, updateSettings } from "../db/queries";
import { db } from "../db/schema";
import { AppError, logAndRespond } from "../middleware/error-handler";
import {
  invoiceCreateSchema,
  invoiceStatusUpdateSchema,
  settingsSchema,
  VALID_INVOICE_FILTER_VALUES,
} from "../validation/schemas";

export const apiRoutes = new Hono();

// Guard: all API endpoints are localhost-only (no auth layer in this single-user app).
// Uses socket-level remote address — NOT the spoofable Host header.
// getConnInfo requires a Bun server context (c.env.incoming) that is not available
// when tests call app.fetch() directly. In that case we fail-open in test mode
// (NODE_ENV=test) and fail-closed (403) in every other environment.
const requireLocalhost: MiddlewareHandler = async (c, next) => {
  let addr: string;
  try {
    const info = getConnInfo(c);
    addr = info.remote.address ?? "";
  } catch (err) {
    if (process.env.NODE_ENV === "test") {
      console.warn(
        "[requireLocalhost] getConnInfo nicht verfügbar (Test-Kontext) — Guard übersprungen",
      );
      return next();
    }
    console.error("[requireLocalhost] getConnInfo fehlgeschlagen:", err);
    return c.json({ error: "Forbidden" }, 403);
  }
  if (addr !== "127.0.0.1" && addr !== "::1" && addr !== "localhost") {
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

apiRoutes.get("/dashboard/stats", (c) => {
  try {
    const stats = getDashboardStats();
    return c.json(stats);
  } catch (err) {
    console.error("[dashboard/stats] Query failed:", err);
    throw new AppError("Dashboard-Daten konnten nicht geladen werden", 500);
  }
});

// GET /api/invoices?status=open|overdue|draft|sent|paid|cancelled
apiRoutes.get("/invoices", (c) => {
  const status = c.req.query("status") || undefined;
  if (status && !VALID_INVOICE_FILTER_VALUES.has(status)) {
    throw new AppError(
      `Ungültiger Status-Filter '${status}'. Erlaubt: ${[...VALID_INVOICE_FILTER_VALUES].join(", ")}`,
      400,
    );
  }
  const invoices = getAllInvoices(status);
  return c.json(invoices);
});

// POST /api/invoices — create an invoice programmatically (agent parity with
// the UI wizard). Expects JSON body matching invoiceCreateSchema. Applies
// the same ownership check + missing-id diagnostics as the form route.
apiRoutes.post("/invoices", async (c) => {
  const body = await c.req.json().catch(() => {
    throw new AppError("Ungültiger JSON-Body", 400);
  });

  const parsed = invoiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
  }
  const data = parsed.data;

  if (data.time_entry_ids.length === 0) {
    throw new AppError("Keine Zeiteinträge angegeben", 400);
  }

  const settings = getSettings();
  if (!settings) {
    throw new AppError("Firmeneinstellungen nicht initialisiert", 500);
  }

  const project = getProject(data.project_id);
  if (!project || project.client_id !== data.client_id) {
    throw new AppError("Projekt gehört nicht zum angegebenen Kunden", 400);
  }

  const projectEntries = getTimeEntriesForProject(data.project_id);
  const entryMap = new Map(projectEntries.map((e) => [e.id, e]));
  const missingIds = data.time_entry_ids.filter((id) => !entryMap.has(id));
  if (missingIds.length > 0) {
    console.error(
      `[api POST /invoices] time_entry_ids not in project ${data.project_id} (or already billed):`,
      missingIds,
    );
    throw new AppError(
      `Zeiteinträge nicht auffindbar oder bereits abgerechnet: ${missingIds.join(", ")}`,
      400,
    );
  }

  const timeEntries = data.time_entry_ids.map((id) => ({
    ...entryMap.get(id)!,
    created_at: "",
  }));

  try {
    const invoiceId = createInvoice(data, timeEntries, settings);
    return c.json({ success: true, data: { id: invoiceId } });
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Rechnung konnte nicht erstellt werden", 500);
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
    await updateInvoiceStatus(id, parsed.data.status);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Rechnungsstatus konnte nicht aktualisiert werden", 500);
  }

  return c.json({ success: true });
});

// GET /api/audit-log — GoBD Audit-Trail
apiRoutes.get("/audit-log", (c) => {
  try {
    const entityType = c.req.query("entity_type");
    const entityIdRaw = c.req.query("entity_id");
    const limitRaw = c.req.query("limit");

    const entityId = entityIdRaw ? parseInt(entityIdRaw, 10) : undefined;
    if (entityIdRaw && (entityId === undefined || Number.isNaN(entityId))) {
      throw new AppError("Ungültige entity_id", 400);
    }

    const limit = limitRaw ? Math.min(parseInt(limitRaw, 10), 1000) : 100;
    if (Number.isNaN(limit) || limit < 1) {
      throw new AppError("Ungültiger limit-Parameter", 400);
    }

    const entries = getAuditLogEntries(entityType, entityId, limit);
    return c.json({ success: true, data: entries });
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Audit-Log konnte nicht geladen werden", 500);
  }
});

// GET /api/audit-log/integrity — Hash-Ketten-Verifikation
apiRoutes.get("/audit-log/integrity", (c) => {
  try {
    const result = verifyAuditChain();
    return c.json({ success: true, data: result });
  } catch (err) {
    return logAndRespond(c, err, "Integritätsprüfung fehlgeschlagen", 500);
  }
});

// GET /api/invoices/:id/archive — GoBD Archivdaten
apiRoutes.get("/invoices/:id/archive", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    const archive = getInvoiceArchive(id);
    if (!archive) {
      return c.json({
        success: true,
        data: null,
        message: "Keine Archivkopie vorhanden (Entwurf?)",
      });
    }
    return c.json({ success: true, data: archive });
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Archivdaten konnten nicht geladen werden", 500);
  }
});
