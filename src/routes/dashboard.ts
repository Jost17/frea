import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { Layout } from "../templates/layout";

export const dashboardRoutes = new Hono<AppEnv>();

dashboardRoutes.get("/", (c) => {
  const overdueCount = c.get("overdueCount");
  return c.html(
    Layout({
      title: "Dashboard",
      activeNav: "dashboard",
      overdueCount,
      children: html`
        <div class="space-y-6">
          <h1 class="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p class="text-sm text-gray-500">Willkommen bei FREA.</p>
        </div>
      `,
    }),
  );
});
