import { Hono } from "hono";
import { getAllSeoPageSlugs } from "../db/seo-queries";
import type { AppEnv } from "../env";

export const sitemapRoutes = new Hono<AppEnv>();

sitemapRoutes.get("/", (c) => {
  let pages: Array<{ slug: string; updated_at: string }>;
  try {
    pages = getAllSeoPageSlugs();
  } catch (err) {
    console.error("[sitemap] Failed to load SEO pages:", err);
    pages = [];
  }

  const baseUrl = "https://frea.fly.dev";

  const urls = pages
    .map((p) => {
      // updated_at is stored as ISO datetime or SQLite datetime('now') format
      // Normalize to YYYY-MM-DD for sitemap lastmod
      const lastmod =
        (p.updated_at ?? "").split("T")[0] || (p.updated_at ?? "").split(" ")[0] || "";
      return `  <url>
    <loc>${baseUrl}/seo/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  return c.body(xml, 200, { "Content-Type": "application/xml; charset=UTF-8" });
});
