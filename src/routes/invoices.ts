import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { Layout } from "../templates/layout";

export const invoiceRoutes = new Hono<AppEnv>();

invoiceRoutes.get("/", (c) => {
  const overdueCount = c.get("overdueCount");
  return c.html(
    Layout({
      title: "Rechnungen",
      activeNav: "rechnungen",
      overdueCount,
      children: html`<h1 class="text-xl font-semibold">Rechnungen</h1>`,
    }),
  );
});
