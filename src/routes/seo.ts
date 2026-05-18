import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { AppError } from "../middleware/error-handler";
import { db } from "../db/schema";

export const seoRoutes = new Hono<AppEnv>();

interface SeoPage {
  id: number;
  keyword: string;
  slug: string;
  title: string;
  meta_description: string;
  content_html: string;
  type: string;
  city: string;
  priority: string;
  status: string;
}

seoRoutes.get("/:slug", (c) => {
  const slug = c.req.param("slug");

  const page = db
    .query<SeoPage, [string]>("SELECT * FROM seo_pages WHERE slug = ? LIMIT 1")
    .get(slug);

  if (!page) {
    throw new AppError("Seite nicht gefunden", 404);
  }

  return c.html(
    html`<!doctype html>
      <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${page.title}</title>
          <meta name="description" content="${page.meta_description}" />
          <link rel="canonical" href="/seo/${page.slug}" />
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem 1rem;
              color: #1a1a1a;
              line-height: 1.6;
            }
            h1 { font-size: 1.75rem; margin-bottom: 1rem; }
            h2 { font-size: 1.25rem; margin-top: 2rem; }
            p { margin: 0.75rem 0; }
            a { color: #2563eb; }
            .back { margin-bottom: 2rem; }
          </style>
        </head>
        <body>
          <p class="back"><a href="/">← Zurück zu FREA</a></p>
          ${{ toString: () => page.content_html }}
          <hr style="margin:3rem 0" />
          <p>
            <a href="/">FREA — Rechnungen für Freelancer</a> |
            Kostenlos testen — keine Kreditkarte nötig.
          </p>
        </body>
      </html>`,
  );
});
