import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { csrf } from "hono/csrf";
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

initializeSchema();

const app = new Hono<AppEnv>();

app.use("*", logger());
app.use("*", securityHeaders);
app.use("*", csrf());
app.use("*", onboardingGuard);

// navContextMiddleware scoped to UI routes (executes a DB query)
app.use("/", navContextMiddleware);
app.use("/kunden/*", navContextMiddleware);
app.use("/projekte/*", navContextMiddleware);
app.use("/zeiten/*", navContextMiddleware);
app.use("/rechnungen/*", navContextMiddleware);
app.use("/einstellungen/*", navContextMiddleware);

app.onError(globalErrorHandler);
app.notFound(globalNotFoundHandler);

// Static assets with cache headers (P3-16)
app.use("/static/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "public, max-age=86400");
});
app.use("/static/*", serveStatic({ root: "./public" }));

app.route("/", dashboardRoutes);
app.route("/kunden", clientRoutes);
app.route("/projekte", projectRoutes);
app.route("/zeiten", timeRoutes);
app.route("/rechnungen", invoiceRoutes);
app.route("/einstellungen", settingsRoutes);
app.route("/api", apiRoutes);

const port = Number(Bun.env.PORT) || 3114;

console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551              F R E A                  \u2551
\u2551   Kunden \u00B7 Projekte \u00B7 Rechnungen      \u2551
\u2551   http://localhost:${port}              \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);

export default { port, hostname: "127.0.0.1", fetch: app.fetch };
