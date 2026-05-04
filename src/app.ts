import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { initializeSchema } from "./db/schema";
import type { AppEnv } from "./env";
import { globalErrorHandler, globalNotFoundHandler } from "./middleware/error-handler";
import { navContextMiddleware } from "./middleware/nav-context";
import { onboardingGuard } from "./middleware/onboarding-guard";
import { securityHeaders } from "./middleware/security-headers";
import { apiRoutes } from "./routes/api";
import { clientRoutes } from "./routes/clients";
import { dashboardRoutes } from "./routes/dashboard";
import { invoiceRoutes } from "./routes/invoices";
import { projectRoutes } from "./routes/projects";
import { settingsRoutes } from "./routes/settings";
import { timeRoutes } from "./routes/times";

try {
  initializeSchema();
} catch (err) {
  console.error("[startup] Schema initialization failed:", err);
  process.exit(1);
}

export const app = new Hono<AppEnv>();

// In tests (NODE_ENV=test) we skip browser-only middleware that requires
// a real HTTP context (logger, csrf, serveStatic). Everything else — routes,
// error handlers, guards — runs identically in both environments.
const isTest = process.env.NODE_ENV === "test";

if (!isTest) {
  app.use("*", logger());
  app.use("*", csrf());
}

app.use("*", securityHeaders);
app.use("*", onboardingGuard);

// navContextMiddleware scoped to UI routes (executes a DB query)
app.use("/", navContextMiddleware);
app.use("/kunden/*", navContextMiddleware);
app.use("/projekte/*", navContextMiddleware);
app.use("/zeiten/*", navContextMiddleware);
app.use("/rechnungen/*", navContextMiddleware);
app.use("/einstellungen", navContextMiddleware);
app.use("/einstellungen/*", navContextMiddleware);

app.onError(globalErrorHandler);
app.notFound(globalNotFoundHandler);

if (!isTest) {
  // Static assets with cache headers (P3-16)
  app.use("/static/*", async (c, next) => {
    await next();
    c.header("Cache-Control", "public, max-age=86400");
  });
  app.use("/static/*", serveStatic({ root: "./public" }));
}

app.route("/", dashboardRoutes);
app.route("/kunden", clientRoutes);
app.route("/projekte", projectRoutes);
app.route("/zeiten", timeRoutes);
app.route("/rechnungen", invoiceRoutes);
app.route("/einstellungen", settingsRoutes);
app.route("/api", apiRoutes);
