import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { Layout } from "../templates/layout";

export const settingsRoutes = new Hono<AppEnv>();

settingsRoutes.get("/", (c) => {
  const overdueCount = c.get("overdueCount");
  return c.html(
    Layout({
      title: "Einstellungen",
      activeNav: "einstellungen",
      overdueCount,
      children: html`<h1 class="text-xl font-semibold">Einstellungen</h1>`,
    }),
  );
});
