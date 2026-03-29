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
  icon: string;
  key: LayoutProps["activeNav"];
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "layout-dashboard", key: "dashboard" },
  { href: "/kunden", label: "Kunden", icon: "users", key: "kunden" },
  { href: "/projekte", label: "Projekte", icon: "folder-kanban", key: "projekte" },
  { href: "/zeiten", label: "Zeiten", icon: "clock", key: "zeiten" },
  { href: "/rechnungen", label: "Rechnungen", icon: "file-text", key: "rechnungen", showBadge: true },
  { href: "/einstellungen", label: "Einstellungen", icon: "settings", key: "einstellungen" },
];

const overdueBadge = (count: number) =>
  count > 0
    ? html`<span class="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-accent-danger rounded-full">${count}</span>`
    : "";

const desktopNavLink = (item: NavItem, activeNav: LayoutProps["activeNav"], overdueCount: number) => html`
  <a
    href="${item.href}"
    class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      activeNav === item.key
        ? "bg-primary-subtle text-primary"
        : "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary"
    }"
  >
    <i data-lucide="${item.icon}" class="h-4 w-4"></i>
    ${item.label}
    ${item.showBadge ? overdueBadge(overdueCount) : ""}
  </a>
`;

const mobileNavLink = (item: NavItem, activeNav: LayoutProps["activeNav"], overdueCount: number) => html`
  <a
    href="${item.href}"
    class="flex items-center gap-2 rounded-md mx-2 px-3 py-2 text-base font-medium transition-colors ${
      activeNav === item.key
        ? "bg-primary-subtle text-primary"
        : "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary"
    }"
  >
    <i data-lucide="${item.icon}" class="h-5 w-5"></i>
    ${item.label}
    ${item.showBadge ? overdueBadge(overdueCount) : ""}
  </a>
`;

export const Layout = ({ title, children, activeNav, overdueCount }: LayoutProps) => html`
  <!DOCTYPE html>
  <html lang="de" class="h-full bg-bg-primary">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>FREA · ${title}</title>
      <link rel="icon" type="image/svg+xml" href="/static/logo/frea-favicon.svg" />
      <link rel="stylesheet" href="/static/styles.css" />

      <!-- Theme: detect system preference / restore saved preference (inline to prevent FOUC) -->
      <script>
        (function() {
          try {
            var t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.setAttribute('data-theme', 'dark');
            }
          } catch(e) { /* localStorage unavailable */ }
        })();
      </script>

      <script src="/static/htmx.min.js"></script>
      <script src="/static/lucide.min.js"></script>
    </head>
    <body class="h-full">
      <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-bg-surface focus:text-primary focus:rounded focus:shadow">Zum Hauptinhalt</a>

      <div class="min-h-full">
        <!-- Navigation -->
        <nav class="bg-bg-surface border-b border-border-subtle">
          <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="flex h-16 justify-between">
              <div class="flex">
                <!-- Logo -->
                <div class="flex flex-shrink-0 items-center">
                  <a href="/" aria-label="FREA Startseite">
                    <img src="/static/logo/frea-logo-light.svg" alt="FREA" class="h-8 w-auto dark:hidden" />
                    <img src="/static/logo/frea-logo-dark.svg" alt="FREA" class="h-8 w-auto hidden dark:block" />
                  </a>
                </div>

                <!-- Desktop Navigation -->
                <div class="hidden sm:ml-6 sm:flex sm:items-center sm:gap-1">
                  ${navItems.map((item) => desktopNavLink(item, activeNav, overdueCount))}
                </div>
              </div>

              <!-- Theme toggle + Mobile menu button -->
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  onclick="toggleTheme()"
                  class="p-2 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-surface-raised transition-colors"
                  aria-label="Theme umschalten"
                >
                  <i data-lucide="sun" class="h-5 w-5 hidden dark:block"></i>
                  <i data-lucide="moon" class="h-5 w-5 block dark:hidden"></i>
                </button>

                <button
                  id="mobile-menu-btn"
                  type="button"
                  onclick="toggleMobileMenu()"
                  class="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                  aria-expanded="false"
                  aria-controls="mobile-menu"
                >
                  <span class="sr-only">Hauptmenü öffnen</span>
                  <i data-lucide="menu" class="h-6 w-6 mobile-menu-icon-open"></i>
                  <i data-lucide="x" class="h-6 w-6 mobile-menu-icon-close hidden"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Mobile menu -->
          <div class="hidden sm:hidden" id="mobile-menu">
            <div class="space-y-1 pb-3 pt-2">
              ${navItems.map((item) => mobileNavLink(item, activeNav, overdueCount))}
            </div>
          </div>
        </nav>

        <!-- Main Content -->
        <main id="main-content">
          <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            ${children}
          </div>
        </main>
      </div>

      <!-- Toast Notification Container -->
      <div id="toast-container" class="fixed bottom-4 right-4 z-50 space-y-2"></div>

      <!-- Global Scripts -->
      <script>
        // Toast notification helper
        function showToast(message, type) {
          type = type || 'success';
          var container = document.getElementById('toast-container');
          if (!container) return;

          var toast = document.createElement('div');
          var bgColors = { success: 'bg-accent-success', error: 'bg-accent-danger', warning: 'bg-accent-warning', info: 'bg-accent-info' };
          var bgColor = bgColors[type] || bgColors.info;

          toast.className = bgColor + ' text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full';
          toast.textContent = message;
          container.appendChild(toast);

          requestAnimationFrame(function() {
            requestAnimationFrame(function() { toast.classList.remove('translate-x-full'); });
          });

          setTimeout(function() {
            toast.classList.add('translate-x-full');
            setTimeout(function() { toast.remove(); }, 300);
          }, 3000);
        }

        // Read toast from data-attribute (set by server on redirect)
        (function() {
          var el = document.querySelector('[data-toast-message]');
          if (el) {
            showToast(el.getAttribute('data-toast-message'));
            el.remove();
          }
        })();

        // Init Lucide icons (guard against missing lib)
        try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch(e) { console.warn('[lucide]', e); }

        // Theme toggle
        var _themeTimeout = 0;
        function toggleTheme() {
          var doc = document.documentElement;
          clearTimeout(_themeTimeout);
          doc.classList.add('theme-transitioning');
          var next = doc.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
          doc.setAttribute('data-theme', next);
          try { localStorage.setItem('theme', next); } catch(e) {}
          _themeTimeout = setTimeout(function() { doc.classList.remove('theme-transitioning'); }, 300);
        }

        // Mobile menu toggle
        function toggleMobileMenu() {
          var menu = document.getElementById('mobile-menu');
          var btn = document.getElementById('mobile-menu-btn');
          if (!menu || !btn) return;
          var isOpen = !menu.classList.contains('hidden');
          menu.classList.toggle('hidden');
          btn.setAttribute('aria-expanded', String(!isOpen));
          var iconOpen = btn.querySelector('.mobile-menu-icon-open');
          var iconClose = btn.querySelector('.mobile-menu-icon-close');
          if (iconOpen) iconOpen.classList.toggle('hidden');
          if (iconClose) iconClose.classList.toggle('hidden');
        }

        // Attach global listeners once (guard against HTMX full-page nav)
        if (!window.__freaListenersAttached) {
          window.__freaListenersAttached = true;

          // HTMX: toast on success + error feedback
          document.body.addEventListener('htmx:afterRequest', function(event) {
            if (event.detail.successful) {
              var message = event.detail.xhr.getResponseHeader('X-Toast-Message');
              if (message) showToast(message);
            } else if (event.detail.xhr && event.detail.xhr.status >= 400) {
              showToast('Anfrage fehlgeschlagen (' + event.detail.xhr.status + ')', 'error');
            }
          });

          document.body.addEventListener('htmx:sendError', function() {
            showToast('Netzwerkfehler — Server nicht erreichbar', 'error');
          });

          // Lucide re-init after HTMX swap
          document.body.addEventListener('htmx:afterSwap', function(event) {
            try { if (typeof lucide !== 'undefined') lucide.createIcons({ root: event.detail.target }); } catch(e) {}
          });

          // Confirm dialogs for delete actions
          document.body.addEventListener('htmx:confirm', function(event) {
            if (event.detail.question) {
              event.preventDefault();
              if (confirm(event.detail.question)) event.detail.issueRequest(true);
            }
          });

          // Close mobile menu on outside click
          document.addEventListener('click', function(e) {
            var mobileMenu = document.getElementById('mobile-menu');
            var mobileBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenu && mobileBtn && !mobileMenu.contains(e.target) && !mobileBtn.contains(e.target) && !mobileMenu.classList.contains('hidden')) {
              toggleMobileMenu();
            }
          });

          // Respect OS preference changes (only if no manual theme set)
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            var hasManualTheme = false;
            try { hasManualTheme = !!localStorage.getItem('theme'); } catch(ex) {}
            if (hasManualTheme) return;
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
          });
        }
      </script>
    </body>
  </html>
`;
