import { Hono } from "hono";
import { db } from "../db/schema";
import { getDashboardStats } from "../db/queries";
import { AppError } from "../middleware/error-handler";

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
    console.error("[dashboard/stats] Query failed:", err);
    throw new AppError("Dashboard-Daten konnten nicht geladen werden", 500);
  }
});
