import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/schema";
import { AppError } from "../middleware/error-handler";

const router = new Hono();

// Zod schema for SEO page input
const SeoPageInputSchema = z.object({
  keyword: z.string().min(5),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(20).max(60),
  meta_description: z.string().min(50).max(160),
  content_html: z.string().min(500),
  type: z.string(),
  city: z.string(),
  priority: z.enum(["P1", "P2", "P3"]).default("P2"),
});

type SeoPageInput = z.infer<typeof SeoPageInputSchema>;

interface SeoPage extends SeoPageInput {
  id: number;
  status: string;
  indexed_at: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  created_at: string;
  updated_at: string;
}

// GET /seo-pages/:slug - Public page view
router.get("/:slug", (c) => {
  try {
    const slug = c.req.param("slug");

    const stmt = db.query<SeoPage, [string]>(
      `SELECT id, keyword, slug, title, meta_description, content_html, type, city,
              priority, status, indexed_at, impressions, clicks, ctr, created_at, updated_at
       FROM seo_pages
       WHERE slug = ? AND status = 'published'`
    );

    const page = stmt.get(slug);
    if (!page) {
      return c.json({ success: false, error: "Page not found" }, 404);
    }

    // Record impression (async, non-blocking)
    db.run("UPDATE seo_pages SET impressions = impressions + 1 WHERE id = ?", [page.id]);

    return c.json({
      success: true,
      data: {
        ...page,
        html: page.content_html,
      },
    });
  } catch (error: unknown) {
    console.error("GET /seo-pages/:slug failed:", error);
    throw new AppError("Page retrieval failed", 500);
  }
});

// POST /api/seo-pages - Create new page (admin only)
router.post("/api", async (c) => {
  try {
    const body = await c.req.json();
    const input = SeoPageInputSchema.parse(body);

    const stmt = db.query<Pick<SeoPage, "id">, [string, string, string, string, string, string, string, string]>(
      `INSERT INTO seo_pages
       (keyword, slug, title, meta_description, content_html, type, city, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
       RETURNING id`
    );

    const result = stmt.get(
      input.keyword,
      input.slug,
      input.title,
      input.meta_description,
      input.content_html,
      input.type,
      input.city,
      input.priority
    );

    if (!result) {
      throw new AppError("Failed to create page", 500);
    }

    return c.json(
      {
        success: true,
        data: { id: result.id },
      },
      201
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: "Validation error",
          details: error.issues,
        },
        400
      );
    }

    if (error instanceof AppError) {
      const appError = error as AppError & { statusCode: number };
      return c.json({ success: false, error: error.message }, appError.statusCode);
    }

    console.error("POST /api/seo-pages failed:", error);
    throw new AppError("Page creation failed", 500);
  }
});

// PATCH /api/seo-pages/:id - Update page status + content
router.patch("/api/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    const body = await c.req.json();
    const { status, content_html } = body as Partial<SeoPage>;

    if (!id) {
      return c.json({ success: false, error: "Invalid page ID" }, 400);
    }

    if (status && !["draft", "review", "published", "archived"].includes(status)) {
      return c.json({ success: false, error: "Invalid status" }, 400);
    }

    let updateQuery = "UPDATE seo_pages SET ";
    const params: (string | number)[] = [];

    if (status) {
      updateQuery += "status = ?, ";
      params.push(status);
    }

    if (content_html) {
      updateQuery += "content_html = ?, ";
      params.push(content_html);
    }

    updateQuery += "updated_at = datetime('now') WHERE id = ?";
    params.push(id);

    db.run(updateQuery, params);

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error("PATCH /api/seo-pages/:id failed:", error);
    throw new AppError("Page update failed", 500);
  }
});

// GET /api/seo-pages - List pages (admin, with filters)
router.get("/api", (c) => {
  try {
    const status = c.req.query("status") || "all";
    const city = c.req.query("city");
    const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);
    const offset = parseInt(c.req.query("offset") || "0", 10);

    let query = "SELECT id, keyword, slug, title, type, city, priority, status, impressions, clicks, created_at FROM seo_pages WHERE 1=1";
    const params: (string | number)[] = [];

    if (status !== "all") {
      query += " AND status = ?";
      params.push(status);
    }

    if (city) {
      query += " AND city = ?";
      params.push(city);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stmt = db.query<Omit<SeoPage, "content_html" | "meta_description">, (string | number)[]>(query);
    const pages = stmt.all(...params);

    // Total count
    let countQuery = "SELECT COUNT(*) as total FROM seo_pages WHERE 1=1";
    const countParams: (string | number)[] = [];

    if (status !== "all") {
      countQuery += " AND status = ?";
      countParams.push(status);
    }

    if (city) {
      countQuery += " AND city = ?";
      countParams.push(city);
    }

    const totalResult = db.query<{ total: number }, (string | number)[]>(countQuery).get(...countParams);
    const total = totalResult?.total || 0;

    return c.json({
      success: true,
      data: pages,
      meta: { total, limit, offset },
    });
  } catch (error: unknown) {
    console.error("GET /api/seo-pages failed:", error);
    throw new AppError("Page listing failed", 500);
  }
});

export default router;
