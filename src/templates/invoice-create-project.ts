import { html } from "hono/html";
import type { InvoiceCreateProjectPreview } from "../db/invoice-queries";
import type { Client } from "../validation/schemas";
import { EmptyState } from "./components/empty-state";
import { formatCurrency, formatDate } from "./invoice-shared";

export interface RenderInvoiceProjectSelectionArgs {
  client: Client;
  projectPreviews: InvoiceCreateProjectPreview[];
  today: string;
  paymentDays: number;
  vatRate: number;
  isKleinunternehmer: boolean;
}

export function renderInvoiceProjectSelection(args: RenderInvoiceProjectSelectionArgs) {
  const { client, projectPreviews, today, paymentDays, vatRate, isKleinunternehmer } = args;

  return html`
    <div class="max-w-3xl">
      <a href="/rechnungen/create" class="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center">← Zurück</a>
      <h1 class="mb-2 text-2xl font-semibold">Neue Rechnung erstellen</h1>
      <p class="mb-6 text-sm text-gray-600">Kunde: <strong>${client.name}</strong></p>

      ${
        projectPreviews.length === 0
          ? EmptyState({
              message: "Für diesen Kunden gibt es keine aktiven Projekte.",
            })
          : html`
            <div class="space-y-4">
              ${projectPreviews.map((preview) => {
                const { project, unbilledEntries, totalDays, netAmount, vatAmount, grossAmount } =
                  preview;
                return html`
                  <div class="rounded-lg border border-gray-200 bg-white p-6">
                    <div class="flex justify-between items-start mb-4">
                      <div>
                        <h2 class="text-lg font-semibold text-gray-900">${project.code} — ${project.name}</h2>
                        <p class="text-sm text-gray-500">Tagessatz: ${formatCurrency(project.daily_rate)} · ${unbilledEntries.length} offene Einträge</p>
                      </div>
                      <div class="text-right">
                        <p class="text-lg font-bold text-gray-900">${formatCurrency(grossAmount)}</p>
                        <p class="text-xs text-gray-500">${totalDays.toFixed(1)} Tage · Netto: ${formatCurrency(netAmount)}</p>
                      </div>
                    </div>

                    ${
                      unbilledEntries.length === 0
                        ? html`<p class="text-sm text-gray-400 italic">Keine unberechneten Zeiteinträge.</p>`
                        : html`
                            <form method="post" action="/rechnungen/create" class="space-y-4">
                              <input type="hidden" name="client_id" value="${client.id}" />
                              <input type="hidden" name="project_id" value="${project.id}" />

                              <div class="grid grid-cols-2 gap-4">
                                <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Rechnungsdatum *</label>
                                  <input type="date" name="invoice_date" value="${today}" required class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                </div>
                                <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Abrechnungsmonat *</label>
                                  <input type="number" name="period_month" value="${new Date().getMonth() + 1}" min="1" max="12" required class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                </div>
                              </div>

                              <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Abrechnungsjahr *</label>
                                <input type="number" name="period_year" value="${new Date().getFullYear()}" min="2000" max="2099" required class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                              </div>

                              <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Bestellnummer (optional)</label>
                                <input type="text" name="po_number" placeholder="z.B. PO-2026-001" class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                              </div>

                              <p class="text-xs text-gray-500">
                                Fälligkeit: Rechnungsdatum + ${paymentDays} Tage (aus den Stammdaten).
                              </p>

                              <div class="grid grid-cols-2 gap-4">
                                <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Leistungszeitraum von</label>
                                  <input type="date" name="service_period_from" class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                </div>
                                <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Leistungszeitraum bis</label>
                                  <input type="date" name="service_period_to" class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                </div>
                              </div>

                              <div class="border-t border-gray-200 pt-4">
                                <div class="flex items-center justify-between mb-2">
                                  <p class="text-sm font-medium text-gray-700">Abzurechnende Zeiteinträge</p>
                                  <label class="flex items-center gap-2 text-sm text-gray-600">
                                    <input type="checkbox" id="select-all-${project.id}" onchange="toggleAllEntries(this, ${project.id}, ${vatRate}, ${isKleinunternehmer})" checked class="rounded border-gray-300" />
                                    Alle auswählen
                                  </label>
                                </div>
                                <div class="space-y-1 max-h-40 overflow-y-auto bg-gray-50 rounded p-2">
                                  ${unbilledEntries.map(
                                    (entry) => html`
                                    <div class="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0">
                                      <label class="flex items-center gap-2 flex-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          name="time_entry_ids"
                                          value="${entry.id}"
                                          checked
                                          class="entry-checkbox rounded border-gray-300"
                                          data-project="${project.id}"
                                          data-net="${entry.netAmount}"
                                          data-vat="${entry.vatAmount}"
                                          data-gross="${entry.grossAmount}"
                                          onchange="updateInvoicePreview(${project.id}, ${vatRate}, ${isKleinunternehmer})"
                                        />
                                        <span class="text-gray-700">${formatDate(entry.date)} · ${entry.duration.toFixed(1)}h ${entry.description ? `— ${entry.description}` : ""}</span>
                                      </label>
                                      <span class="text-gray-500 font-medium ml-4">${formatCurrency(entry.netAmount)}</span>
                                    </div>
                                  `,
                                  )}
                                </div>
                              </div>

                              <div class="flex justify-between items-center pt-4 border-t border-gray-200">
                                <div class="text-sm text-gray-500 space-y-0.5">
                                  <p>Ausgewählt: <span id="preview-count-${project.id}">${unbilledEntries.length}</span> Einträge</p>
                                  <p>Netto: <span id="preview-net-${project.id}">${formatCurrency(netAmount)}</span></p>
                                  ${
                                    isKleinunternehmer
                                      ? html`<p class="text-green-600">§19 UStG: Keine MwSt.</p>`
                                      : html`<p>MwSt (${(vatRate * 100).toFixed(0)}%): <span id="preview-vat-${project.id}">${formatCurrency(vatAmount)}</span></p>`
                                  }
                                  <p class="font-semibold text-gray-800">Brutto: <span id="preview-gross-${project.id}">${formatCurrency(grossAmount)}</span></p>
                                </div>
                                <div class="flex gap-3">
                                  <a href="/rechnungen/create" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Abbrechen</a>
                                  <button type="submit" data-create-invoice-submit="${project.id}" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Rechnung erstellen</button>
                                </div>
                              </div>
                            </form>
                          `
                    }
                  </div>
                `;
              })}
            </div>
          `
      }
    </div>
  `;
}
