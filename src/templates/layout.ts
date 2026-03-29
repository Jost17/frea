import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

export interface LayoutProps {
  title: string;
  children: HtmlEscapedString | Promise<HtmlEscapedString>;
  activeNav?: "dashboard" | "kunden" | "projekte" | "zeiten" | "rechnungen" | "einstellungen";
  overdueCount: number;
}

interface NavItem {
  href: string;
  label: string;
  key: LayoutProps["activeNav"];
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", key: "dashboard" },
  { href: "/kunden", label: "Kunden", key: "kunden" },
  { href: "/projekte", label: "Projekte", key: "projekte" },
  { href: "/zeiten", label: "Zeiten", key: "zeiten" },
  { href: "/rechnungen", label: "Rechnungen", key: "rechnungen", showBadge: true },
  { href: "/einstellungen", label: "Einstellungen", key: "einstellungen" },
];

const overdueBadge = (count: number) =>
  count > 0
    ? html`<span class="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">${count}</span>`
    : "";

const navLink = (item: NavItem, activeNav: LayoutProps["activeNav"], overdueCount: number) => {
  const isActive = activeNav === item.key;
  return html`
    <a
      href="${item.href}"
      class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }"
    >
      ${item.label}
      ${item.showBadge ? overdueBadge(overdueCount) : ""}
    </a>
  `;
};

export const Layout = ({ title, children, activeNav, overdueCount }: LayoutProps) => html`
  <\!DOCTYPE html>
  <html lang="de" class="h-full bg-gray-50">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>FREA · ${title}</title>
      <link rel="icon" type="image/svg+xml" href="/static/logo/frea-favicon.svg" />
      <link rel="stylesheet" href="/static/styles.css" />
      <script src="/static/htmx.min.js"></script>
    </head>
    <body class="h-full">
      <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700 focus:rounded focus:shadow">Zum Hauptinhalt</a>
      <nav class="border-b bg-white px-4 py-2">
        <div class="mx-auto max-w-7xl flex items-center gap-1">
          <a href="/" class="mr-4 flex-shrink-0" aria-label="FREA Startseite">
            <img src="/static/logo/frea-logo-light.svg" alt="FREA" height="32" class="h-8 w-auto" />
          </a>
          ${navItems.map((item) => navLink(item, activeNav, overdueCount))}
        </div>
      </nav>
      <main id="main-content" class="mx-auto max-w-7xl px-4 py-6">
        ${children}
      </main>
    </body>
  </html>
`;
