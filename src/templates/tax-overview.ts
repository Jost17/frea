import { html } from "hono/html";
import type { UstKennzahlen } from "../db/tax-queries";
import { Layout } from "./layout";

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

function formatEur(amount: number): string {
  return amount.toFixed(2).replace(".", ",") + " €";
}

function periodLabel(year: number, month: number | null, quarter: number | null): string {
  if (month !== null) return `${MONTH_NAMES[month - 1]} ${year}`;
  if (quarter !== null) return `Q${quarter} ${year}`;
  return `${year}`;
}

function csvExportUrl(year: number, month: number | null, quarter: number | null): string {
  const params = new URLSearchParams({ year: String(year) });
  if (month !== null) params.set("month", String(month));
  if (quarter !== null) params.set("quarter", String(quarter));
  return `/steuern/export?${params}`;
}

interface TaxOverviewProps {
  years: number[];
  year: number;
  month: number | null;
  quarter: number | null;
  kennzahlen: UstKennzahlen;
  overdueCount: number;
}

const kennzahlRow = (kz: string, label: string, betrag: number) => html`
  <tr class="border-b border-border-subtle">
    <td class="py-3 pr-4 font-mono text-sm text-text-muted w-16">${kz}</td>
    <td class="py-3 pr-8 text-sm text-text-primary">${label}</td>
    <td class="py-3 text-sm text-right font-medium tabular-nums ${betrag === 0 ? "text-text-muted" : "text-text-primary"}">${formatEur(betrag)}</td>
  </tr>
`;

export function renderTaxOverview({
  years,
  year,
  month,
  quarter,
  kennzahlen,
  overdueCount,
}: TaxOverviewProps) {
  const currentPeriodLabel = periodLabel(year, month, quarter);
  const exportUrl = csvExportUrl(year, month, quarter);
  const hasData = kennzahlen.kz81 > 0 || kennzahlen.kz86 > 0;

  return Layout({
    title: "USt-Voranmeldung",
    activeNav: "steuern",
    overdueCount,
    children: html`
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-bold text-text-primary">USt-Voranmeldung</h1>
            <p class="mt-1 text-sm text-text-muted">ELSTER-Kennzahlen aus Rechnungen ableiten</p>
          </div>
          ${
            hasData
              ? html`
            <a
              href="${exportUrl}"
              class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              <i data-lucide="download" class="h-4 w-4"></i>
              CSV exportieren
            </a>
          `
              : ""
          }
        </div>

        <!-- Periodenauswahl -->
        <div class="bg-bg-surface rounded-lg border border-border-subtle p-4">
          <form method="GET" action="/steuern" class="flex flex-wrap items-end gap-4">
            <div>
              <label for="year" class="block text-sm font-medium text-text-secondary mb-1">Jahr</label>
              <select
                id="year"
                name="year"
                class="rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                ${years.map(
                  (y) => html`<option value="${y}" ${y === year ? "selected" : ""}>${y}</option>`,
                )}
              </select>
            </div>

            <div>
              <label for="quartal" class="block text-sm font-medium text-text-secondary mb-1">Quartal</label>
              <select
                id="quartal"
                name="quarter"
                class="rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Alle Quartale</option>
                ${[1, 2, 3, 4].map(
                  (q) =>
                    html`<option value="${q}" ${quarter === q && month === null ? "selected" : ""}>Q${q}</option>`,
                )}
              </select>
            </div>

            <div>
              <label for="month" class="block text-sm font-medium text-text-secondary mb-1">Monat</label>
              <select
                id="month"
                name="month"
                class="rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Alle Monate</option>
                ${MONTH_NAMES.map(
                  (name, i) =>
                    html`<option value="${i + 1}" ${month === i + 1 ? "selected" : ""}>${name}</option>`,
                )}
              </select>
            </div>

            <button
              type="submit"
              class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              Anzeigen
            </button>
          </form>
        </div>

        <!-- Kennzahlen Tabelle -->
        <div class="bg-bg-surface rounded-lg border border-border-subtle">
          <div class="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 class="text-base font-semibold text-text-primary">Kennzahlen — ${currentPeriodLabel}</h2>
            <span class="text-xs text-text-muted">Nur nicht-stornierte Rechnungen</span>
          </div>

          ${
            hasData
              ? html`
            <div class="px-6 py-2">
              <table class="w-full" aria-label="ELSTER Kennzahlen">
                <thead>
                  <tr class="border-b border-border-subtle">
                    <th class="pb-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-16">Kz</th>
                    <th class="pb-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Bezeichnung</th>
                    <th class="pb-2 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  ${kennzahlRow("81", "Steuerpfl. Umsätze 19 % (Netto)", kennzahlen.kz81)}
                  ${kennzahlRow("83", "Umsatzsteuer 19 %", kennzahlen.kz83)}
                  ${kennzahlRow("86", "Steuerpfl. Umsätze 7 % (Netto)", kennzahlen.kz86)}
                  ${kennzahlRow("85", "Umsatzsteuer 7 %", kennzahlen.kz85)}
                  <tr class="border-b border-border-subtle">
                    <td class="py-3 pr-4 font-mono text-sm text-text-muted">66</td>
                    <td class="py-3 pr-8 text-sm text-text-muted">Abziehbare Vorsteuerbeträge</td>
                    <td class="py-3 text-sm text-right text-text-muted tabular-nums">0,00 € <span class="text-xs">(nicht erfasst)</span></td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-border-subtle">
                    <td class="pt-3" colspan="2">
                      <span class="text-sm font-semibold text-text-primary">Verbleibende Umsatzsteuer</span>
                    </td>
                    <td class="pt-3 text-right font-semibold tabular-nums text-text-primary">${formatEur(kennzahlen.verbleibende_ust)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Hinweis -->
            <div class="mx-6 mb-4 mt-2 rounded-md bg-bg-surface-raised border border-border-subtle p-3">
              <p class="text-xs text-text-muted">
                <strong class="text-text-secondary">Hinweis:</strong>
                Diese Werte sind Hilfsberechnungen aus deinen Ausgangsrechnungen. Vorsteuer (Kz 66)
                aus Eingangsrechnungen wird nicht erfasst. Bitte prüfe alle Angaben vor der
                Übermittlung an ELSTER.
              </p>
            </div>
          `
              : html`
            <div class="px-6 py-12 text-center">
              <i data-lucide="receipt" class="h-10 w-10 text-text-muted mx-auto mb-3"></i>
              <p class="text-sm text-text-muted">Keine Rechnungsdaten für ${currentPeriodLabel} gefunden.</p>
            </div>
          `
          }
        </div>
      </div>
    `,
  });
}
