import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { Layout } from "../templates/layout";

export const projectRoutes = new Hono<AppEnv>();

projectRoutes.get("/", (c) => {
  const overdueCount = c.get("overdueCount");
  return c.html(
    Layout({
      title: "Projekte",
      activeNav: "projekte",
      overdueCount,
      children: html`<h1 class="text-xl font-semibold">Projekte</h1>`,
    }),
  );
});
