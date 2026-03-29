import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { Layout } from "../templates/layout";

export const clientRoutes = new Hono<AppEnv>();

clientRoutes.get("/", (c) => {
  const overdueCount = c.get("overdueCount");
  return c.html(
    Layout({
      title: "Kunden",
      activeNav: "kunden",
      overdueCount,
      children: html`<h1 class="text-xl font-semibold">Kunden</h1>`,
    }),
  );
});
