import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { initializeSchema } from "./db/schema";
import type { AppEnv } from "./env";
import { globalErrorHandler, globalNotFoundHandler } from "./middleware/error-handler";
import { navContextMiddleware } from "./middleware/nav-context";
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

// navContextMiddleware scoped to UI routes (executes a DB query)
app.use("/", navContextMiddleware);
app.use("/kunden/*", navContextMiddleware);
app.use("/projekte/*", navContextMiddleware);
app.use("/zeiten/*", navContextMiddleware);
app.use("/rechnungen/*", navContextMiddleware);
app.use("/einstellungen/*", navContextMiddleware);

app.onError(globalErrorHandler);
app.notFound(globalNotFoundHandler);

app.use("/static/*", serveStatic({ root: "./public" }));

app.route("/", dashboardRoutes);
app.route("/kunden", clientRoutes);
app.route("/projekte", projectRoutes);
app.route("/zeiten", timeRoutes);
app.route("/rechnungen", invoiceRoutes);
app.route("/einstellungen", settingsRoutes);
app.route("/api", apiRoutes);

const port = Number(process.env.PORT) || 3114;

console.log(`
╔═══════════════════════════════════════╗
║              F R E A                  ║
║   Kunden · Projekte · Rechnungen      ║
║   http://localhost:${port}              ║
╚═══════════════════════════════════════╝
`);

export default { port, fetch: app.fetch };
