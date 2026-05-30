import { initializeSchema } from "../src/db/schema";
import { insertSeoPage, getSeoPageBySlug } from "../src/db/seo-queries";

// Initialize schema first (creates seo_pages table if not present)
initializeSchema();

interface RawPage {
  slug: string;
  title: string;
  meta_description: string;
  content_html: string;
  keyword?: string;
  type?: string;
  city?: string;
  priority?: string;
  status?: string;
}

interface PageBatch {
  pages: RawPage[];
}

const batch1: PageBatch = await Bun.file(
  "/Users/jostthedens/.claude/work/frea-93-generated-pages.json",
).json();
const batch2: PageBatch = await Bun.file(
  "/Users/jostthedens/.claude/work/frea-93-generated-pages-batch-28.json",
).json();

const allPages: RawPage[] = [...batch1.pages, ...batch2.pages];
console.log(`Seeding ${allPages.length} SEO pages...`);

let inserted = 0;
let skipped = 0;

for (const page of allPages) {
  const existing = getSeoPageBySlug(page.slug);
  if (existing) {
    console.log(`  SKIP (exists): ${page.slug}`);
    skipped++;
    continue;
  }
  insertSeoPage({
    slug: page.slug,
    title: page.title,
    meta_description: page.meta_description,
    content_html: page.content_html,
    keyword: page.keyword ?? "",
    page_type: page.type ?? "",
    city: page.city ?? "",
    priority: page.priority ?? "P1",
    status: page.status ?? "draft",
  });
  console.log(`  INSERT: ${page.slug}`);
  inserted++;
}

console.log(`\nDone: ${inserted} inserted, ${skipped} skipped. Total: ${allPages.length}`);
