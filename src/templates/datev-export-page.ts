import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { Layout } from "./layout";

interface DATEVExportPageProps {
  years: number[];
  overdueCount: number;
  message?: string;
}

function yearOptions(years: number[]) {
  const currentYear = new Date().getFullYear();
  const displayYears = years.length > 0 ? years : [currentYear];
  return displayYears.map(
    (y) => html`<option value="${y}" ${y === currentYear ? "selected" : ""}>${y}</option>`,
  );
}

export function renderDATEVExportPage({
  years,
  overdueCount,
  message,
}: DATEVExportPageProps): HtmlEscapedString | Promise<HtmlEscapedString> {
  return Layout({
    title: "DATEV-Export",
    activeNav: "rechnungen",
    overdueCount,
    children: html`
      <div class="space-y-6">
        <div>
          <h1 class="text-2xl font-semibold text-text-primary">DATEV-Export</h1>
          <p class="mt-1 text-sm text-text-secondary">
            Buchungsstapel Format 510 für Ihren Steuerberater (DATEV Kanzlei-Rechnungswesen)
          </p>
        </div>

        ${
          message
            ? html`<div class="rounded-md bg-accent-warning/10 border border-accent-warning/30 p-4 text-sm text-text-primary">${message}</div>`
            : ""
        }

        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Export-Formular -->
          <div class="rounded-lg border border-border-subtle bg-bg-surface p-6">
            <h2 class="text-base font-medium text-text-primary mb-4">Export erstellen</h2>
            <form
              action="/export/datev"
              method="get"
              class="space-y-4"
            >
              <div>
                <label for="year" class="block text-sm font-medium text-text-primary mb-1">
                  Geschäftsjahr
                </label>
                <select
                  id="year"
                  name="year"
                  class="block w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  ${yearOptions(years)}
                </select>
                <p class="mt-1 text-xs text-text-muted">
                  Nur versendete und bezahlte Rechnungen werden exportiert.
                </p>
              </div>

              <input type="hidden" name="download" value="1" />

              <button
                type="submit"
                class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              >
                <i data-lucide="download" class="h-4 w-4"></i>
                CSV herunterladen
              </button>
            </form>
          </div>

          <!-- Hinweise -->
          <div class="rounded-lg border border-border-subtle bg-bg-surface p-6">
            <h2 class="text-base font-medium text-text-primary mb-4">Hinweise</h2>
            <ul class="space-y-3 text-sm text-text-secondary">
              <li class="flex gap-2">
                <i data-lucide="info" class="h-4 w-4 shrink-0 mt-0.5 text-primary"></i>
                <span>
                  Das Format entspricht dem DATEV EXTF Buchungsstapel (Format 510, Version 7).
                  Ihr Steuerberater kann die Datei direkt in DATEV importieren.
                </span>
              </li>
              <li class="flex gap-2">
                <i data-lucide="building-2" class="h-4 w-4 shrink-0 mt-0.5 text-primary"></i>
                <span>
                  Verwendete Konten (SKR03): Erlöse 19&nbsp;% → 8400,
                  Erlöse 7&nbsp;% → 8300, steuerfreie Erlöse → 8200,
                  Forderungen → 1400. Bitte mit Ihrem Steuerberater abstimmen.
                </span>
              </li>
              <li class="flex gap-2">
                <i data-lucide="file-code" class="h-4 w-4 shrink-0 mt-0.5 text-primary"></i>
                <span>
                  Die Datei ist CP1252-kodiert und eignet sich für alle gängigen
                  DATEV-Versionen. Beraternummer und Mandantennummer sind Platzhalter
                  (1011 / 1) — Ihr Steuerberater kann diese beim Import anpassen.
                </span>
              </li>
              <li class="flex gap-2">
                <i data-lucide="shield-check" class="h-4 w-4 shrink-0 mt-0.5 text-primary"></i>
                <span>
                  Es werden ausschließlich versendete und bezahlte Rechnungen
                  exportiert (keine Entwürfe, keine stornierten Rechnungen).
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div class="flex items-center gap-2 text-sm text-text-muted">
          <a
            href="/rechnungen"
            class="inline-flex items-center gap-1.5 hover:text-text-primary transition-colors"
          >
            <i data-lucide="arrow-left" class="h-4 w-4"></i>
            Zurück zu Rechnungen
          </a>
        </div>
      </div>
    `,
  });
}
