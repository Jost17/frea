import { Hono } from "hono";
import { db } from "../db/schema";
import { getDashboardStats, getAllInvoices, updateInvoiceStatus } from "../db/queries";
import { AppError } from "../middleware/error-handler";
import { invoiceStatusUpdateSchema, invoiceFilterSchema } from "../validation/schemas";

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

apiRoutes.get("/dashboard/stats", (c) => {
  try {
    const stats = getDashboardStats();
    return c.json(stats);
  } catch (err) {
    console.error("[dashboard/stats] failed:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /api/invoices?status=open|overdue|draft|sent|paid|cancelled
apiRoutes.get("/invoices", (c) => {
  const raw = c.req.query("status") || undefined;
  const parsed = invoiceFilterSchema.safeParse({ status: raw });
  if (!parsed.success) {
    throw new AppError("Ungueltiger Status-Filter", 400);
  }
  const invoices = getAllInvoices(parsed.data.status);
  return c.json(invoices);
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

  updateInvoiceStatus(id, parsed.data.status, "api");
  return c.json({ success: true });
});
