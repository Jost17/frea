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

// Lazy-initialized prepared statements — avoids "no such table" errors when
// this module is imported before initializeSchema() runs (e.g. in seed scripts).
let _getBySlug: ReturnType<typeof db.prepare<SeoPage, [string]>> | null = null;
let _getAllSlugs: ReturnType<typeof db.prepare<{ slug: string; updated_at: string }, []>> | null =
  null;
let _insert: ReturnType<typeof db.prepare> | null = null;

function getBySlugStmt() {
  if (!_getBySlug)
    _getBySlug = db.prepare<SeoPage, [string]>("SELECT * FROM seo_pages WHERE slug = ? LIMIT 1");
  return _getBySlug;
}

function getAllSlugsStmt() {
  if (!_getAllSlugs)
    _getAllSlugs = db.prepare<{ slug: string; updated_at: string }, []>(
      "SELECT slug, updated_at FROM seo_pages ORDER BY priority ASC, created_at ASC",
    );
  return _getAllSlugs;
}

function insertStmt() {
  if (!_insert)
    _insert = db.prepare(
      `INSERT INTO seo_pages (slug, title, meta_description, content_html, keyword, page_type, city, priority, status)
     VALUES ($slug, $title, $meta_description, $content_html, $keyword, $page_type, $city, $priority, $status)`,
    );
  return _insert;
}

export function getSeoPageBySlug(slug: string): SeoPage | null {
  return getBySlugStmt().get(slug) ?? null;
}

export function getAllSeoPageSlugs(): Array<{ slug: string; updated_at: string }> {
  return getAllSlugsStmt().all();
}

export function insertSeoPage(page: SeoPageInsert): void {
  insertStmt().run({
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
