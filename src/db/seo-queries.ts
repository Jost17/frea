import { db } from "./schema";

export interface SeoPage {
  id: number;
  slug: string;
  title: string;
  meta_description: string;
  content_html: string;
  keyword: string;
  page_type: string;
  city: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SeoPageInsert {
  slug: string;
  title: string;
  meta_description: string;
  content_html: string;
  keyword?: string;
  page_type?: string;
  city?: string;
  priority?: string;
  status?: string;
}

const getSeoPageBySlugStmt = db.prepare<SeoPage, [string]>(
  "SELECT * FROM seo_pages WHERE slug = ? LIMIT 1",
);

const getAllSeoPageSlugsStmt = db.prepare<{ slug: string; updated_at: string }, []>(
  "SELECT slug, updated_at FROM seo_pages ORDER BY priority ASC, created_at ASC",
);

const insertSeoPageStmt = db.prepare(
  `INSERT INTO seo_pages (slug, title, meta_description, content_html, keyword, page_type, city, priority, status)
   VALUES ($slug, $title, $meta_description, $content_html, $keyword, $page_type, $city, $priority, $status)`,
);

export function getSeoPageBySlug(slug: string): SeoPage | null {
  return getSeoPageBySlugStmt.get(slug) ?? null;
}

export function getAllSeoPageSlugs(): Array<{ slug: string; updated_at: string }> {
  return getAllSeoPageSlugsStmt.all();
}

export function insertSeoPage(page: SeoPageInsert): void {
  insertSeoPageStmt.run({
    $slug: page.slug,
    $title: page.title,
    $meta_description: page.meta_description,
    $content_html: page.content_html,
    $keyword: page.keyword ?? "",
    $page_type: page.page_type ?? "",
    $city: page.city ?? "",
    $priority: page.priority ?? "P2",
    $status: page.status ?? "draft",
  });
}

export function getSeoPageCount(): number {
  const result = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM seo_pages").get();
  return result?.count ?? 0;
}
