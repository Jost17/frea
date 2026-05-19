import { Hono } from "hono";
import type { AppEnv } from "../env";

export const robotsRoutes = new Hono<AppEnv>();

robotsRoutes.get("/", (c) => {
  c.header("Content-Type", "text/plain");
  return c.text(`User-agent: *
Allow: /seo/
Disallow: /api/
Disallow: /onboarding
Disallow: /einstellungen
Disallow: /mcp

Sitemap: https://frea.fly.dev/sitemap.xml`);
});
