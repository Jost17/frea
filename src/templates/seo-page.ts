import type { SeoPage } from "../db/seo-queries";

export function renderSeoPage(page: SeoPage): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.meta_description)}">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.meta_description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://frea.fly.dev/seo/${escapeHtml(page.slug)}">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a2e; background: #f8f9fa; margin: 0; padding: 0; }
    .container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
    header { background: #fff; border-bottom: 1px solid #e9ecef; padding: 1rem; }
    header .inner { max-width: 800px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    header a.brand { font-size: 1.25rem; font-weight: 700; color: #4f46e5; text-decoration: none; }
    header a.cta { background: #4f46e5; color: #fff; padding: 0.5rem 1rem; border-radius: 0.375rem; text-decoration: none; font-size: 0.875rem; font-weight: 600; }
    h1 { font-size: 1.75rem; font-weight: 700; color: #1a1a2e; margin-bottom: 1rem; }
    h2 { font-size: 1.25rem; font-weight: 600; color: #374151; margin-top: 2rem; margin-bottom: 0.75rem; }
    p { margin-bottom: 1rem; color: #4b5563; }
    strong { color: #1a1a2e; }
    .content { background: #fff; border-radius: 0.5rem; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
    .cta-block { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.5rem; padding: 1.5rem; text-align: center; }
    .cta-block h3 { color: #1e40af; margin: 0 0 0.5rem; }
    .cta-block p { color: #3b82f6; margin: 0 0 1rem; }
    .cta-block a { background: #4f46e5; color: #fff; padding: 0.75rem 1.5rem; border-radius: 0.375rem; text-decoration: none; font-weight: 600; display: inline-block; }
    footer { text-align: center; padding: 2rem; color: #9ca3af; font-size: 0.875rem; }
    footer a { color: #6b7280; text-decoration: none; }
  </style>
</head>
<body>
  <header>
    <div class="inner">
      <a href="/" class="brand">FREA</a>
      <a href="/" class="cta">Kostenlos starten</a>
    </div>
  </header>
  <main>
    <div class="container">
      <div class="content">
        ${page.content_html}
      </div>
      <div class="cta-block">
        <h3>FREA kostenlos testen</h3>
        <p>30 Tage gratis. Keine Kreditkarte. Sofort starten.</p>
        <a href="/">Jetzt kostenlos starten</a>
      </div>
    </div>
  </main>
  <footer>
    <p><a href="/seo/sitemap">Alle Seiten</a> · <a href="/">FREA — Freelancer-Rechnungen</a></p>
    <p>© ${new Date().getFullYear()} FREA. Alle Rechte vorbehalten.</p>
  </footer>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
