import { html } from 'hono/html';

// ---------------------------------------------------------------------------
// Layout Component — WCAG 2.1 AA compliant page shell
//
// Requirements (per ADR-001):
// - <html lang="de">
// - Skip link: <a href="#main-content" class="sr-only focus:not-sr-only">
// - Landmark elements: <header>, <nav>, <main id="main-content">, <footer>
// - Visible focus rings on ALL interactive elements
// - No outline: none without visual replacement
// ---------------------------------------------------------------------------

interface LayoutProps {
  /** Page title (shown in <title> and optionally in header) */
  title: string;
  /** Primary navigation items: [{ label, href, active? }] */
  navItems?: Array<{ label: string; href: string; active?: boolean }>;
  /** Optional user menu / right side of header */
  headerAside?: string;
  /** Main page content (rendered HTML string) */
  children: string;
  /** Breadcrumb or page-level actions shown above <main> */
  aboveMain?: string;
  /** Additional CSS classes for <main> */
  mainClass?: string;
  /** Optional <script> tags to inject before </body> */
  scripts?: string;
  /** Page-specific <head> additions */
  headExtra?: string;
}

/**
 * AppShell — WCAG 2.1 AA compliant layout shell
 *
 * @example
 * Layout({
 *   title: 'Kunden — FREA',
 *   navItems: [
 *     { label: 'Dashboard', href: '/', active: true },
 *     { label: 'Kunden', href: '/kunden' },
 *     { label: 'Projekte', href: '/projekte' },
 *   ],
 *   children: html`<p>Seiteninhalt</p>`,
 * })
 */
export const Layout = (props: LayoutProps) => {
  const {
    title,
    navItems = [],
    headerAside = '',
    children,
    aboveMain = '',
    mainClass = '',
    scripts = '',
    headExtra = '',
  } = props;

  const skipLink = html`
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
    >
      Zum Hauptinhalt
    </a>
  `;

  const navItemsTpl = navItems.length > 0
    ? navItems.map(item => html`
        <li>
          <a
            href="${item.href}"
            ${item.active ? 'aria-current="page"' : ''}
            class="px-3 py-2 text-sm font-medium rounded-lg transition-colors
              ${item.active
                ? 'text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/30'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}
              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            ${item.label}
          </a>
        </li>
      `)
    : '';

  const headerTpl = html`
    <header class="bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-700" role="banner">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo / Brand -->
          <a href="/" class="flex items-center gap-2 font-bold text-xl tracking-tight text-[#1e293b] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-[#1e293b] rounded-lg" aria-label="FREA Startseite">
            FREA
          </a>

          <!-- Desktop Navigation -->
          ${navItemsTpl ? html`
            <nav aria-label="Hauptnavigation">
              <ul class="flex items-center gap-1">${navItemsTpl}</ul>
            </nav>
          ` : ''}

          <!-- Right side header content -->
          ${headerAside ? html`<div>${headerAside}</div>` : ''}
        </div>
      </div>
    </header>
  `;

  const aboveMainTpl = aboveMain
    ? html`<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">${aboveMain}</div>`
    : '';

  return html`
<!DOCTYPE html>
<html lang="de" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231e293b'/%3E%3Ctext x='16' y='23' font-family='system-ui,-apple-system,sans-serif' font-size='18' font-weight='700' fill='white' text-anchor='middle'%3EF%3C/text%3E%3C/svg%3E" type="image/svg+xml">
  <script src="https://cdn.tailwindcss.com" defer></script>
  <script src="https://unpkg.com/htmx.org@1.9.10" defer></script>
  ${headExtra}
</head>
<body class="h-full bg-slate-50 dark:bg-[#1e293b] text-slate-900 dark:text-slate-100 antialiased">
  ${skipLink}
  ${headerTpl}

  <main id="main-content" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${mainClass}" role="main">
    ${aboveMainTpl}
    ${children}
  </main>

  <footer class="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] mt-auto" role="contentinfo">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <p class="text-sm text-slate-400 dark:text-slate-400">
        &copy; ${new Date().getFullYear()} FREA &mdash; Freelancing. Ohne Papierkram.
      </p>
    </div>
  </footer>

  ${scripts}
</body>
</html>
  `;
};
