import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { Layout } from "../templates/layout";

export const timeRoutes = new Hono<AppEnv>();

timeRoutes.get("/", (c) => {
  const overdueCount = c.get("overdueCount");
  return c.html(
    Layout({
      title: "Zeiten",
      activeNav: "zeiten",
      overdueCount,
      children: html`<h1 class="text-xl font-semibold">Zeiten</h1>`,
    }),
  );
});
