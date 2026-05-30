import { Hono } from "hono";
import { z } from "zod";
import { getAllSeoPageSlugs, getSeoPageBySlug, insertSeoPage } from "../db/seo-queries";
import type { AppEnv } from "../env";
import { renderSeoPage } from "../templates/seo-page";

// Public SEO pages — server-rendered, no nav, no auth
export const seoRoutes = new Hono<AppEnv>();

seoRoutes.get("/:slug", (c) => {
  const slug = c.req.param("slug");
  const page = getSeoPageBySlug(slug);

  if (!page) {
    return c.html(
      `<!DOCTYPE html><html lang="de"><head><title>Nicht gefunden — FREA</title><meta name="robots" content="noindex"></head><body><h1>Seite nicht gefunden</h1><p><a href="/">Zur Startseite</a></p></body></html>`,
      404,
    );
  }

  return c.html(renderSeoPage(page));
});

// Internal API: create SEO pages (localhost-only, no auth layer)
const seoPageCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(500),
  meta_description: z.string().min(1).max(1000),
  content_html: z.string().min(1),
  keyword: z.string().optional(),
  page_type: z.string().optional(),
  city: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
});

export const seoApiRoutes = new Hono<AppEnv>();

seoApiRoutes.post("/seo-pages", async (c) => {
  // Localhost-only guard: checks x-forwarded-for and x-real-ip headers.
  // NOTE: header-based IP checks can be spoofed by a proxy chain. This is
  // intentional — this endpoint is only accessible from the local machine in
  // production (fly.dev private network), so this guard is defence-in-depth.
  const ip = c.req.header("x-forwarded-for") ?? c.req.raw.headers.get("x-real-ip") ?? "127.0.0.1";
  const isLocal =
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("172.") ||
    ip.startsWith("192.168.");
  if (!isLocal) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "Ungültiger JSON-Body" }, 400);
  }

  const parsed = seoPageCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" }, 422);
  }

  const data = parsed.data;

  try {
    const existing = getSeoPageBySlug(data.slug);
    if (existing) {
      return c.json({ error: "Slug already exists", slug: data.slug }, 409);
    }
    insertSeoPage(data);
    return c.json({ ok: true, slug: data.slug }, 201);
  } catch (err) {
    console.error("[seo-api] Failed to insert SEO page:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// GET /api/seo-pages/count — diagnostic endpoint (localhost-only)
seoApiRoutes.get("/seo-pages/count", (c) => {
  const ip = c.req.header("x-forwarded-for") ?? c.req.raw.headers.get("x-real-ip") ?? "127.0.0.1";
  const isLocal =
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("172.") ||
    ip.startsWith("192.168.");
  if (!isLocal) {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const slugs = getAllSeoPageSlugs();
    return c.json({ count: slugs.length });
  } catch (err) {
    console.error("[seo-api] Failed to count SEO pages:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});
