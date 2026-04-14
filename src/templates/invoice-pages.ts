import { html } from "hono/html";
import type { Client, InvoiceListItem, Project } from "../validation/schemas";
import { formatCurrency, formatDate, statusBadge } from "./invoice-shared";

export interface InvoiceCreateEntryPreview {
  id: number;
  date: string;
  duration: number;
  description: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

export interface InvoiceCreateProjectPreview {
  project: Omit<Project, "created_at" | "archived">;
  unbilledEntries: InvoiceCreateEntryPreview[];
  totalDays: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

export function renderInvoiceList(invoices: InvoiceListItem[], now: string) {
  if (invoices.length === 0) {
    return html`
      <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p class="text-sm text-gray-600">
          Noch keine Rechnungen erstellt. Erfasse zuerst Zeiten für ein Projekt, dann kannst du eine Rechnung generieren.
        </p>
        <a href="/rechnungen/create" class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Neue Rechnung erstellen
        </a>
      </div>
    `;
  }

  return html`
    <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-gray-700">Rechnungsnummer</th>
            <th class="px-4 py-3 text-left font-semibold text-gray-700">Kunde</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700">Betrag</th>
            <th class="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700">Rechnungsdatum</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700">Fällig</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${invoices.map((inv) => {
            const isOverdue = inv.status === "sent" && inv.due_date < now;
            return html`
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <a href="/rechnungen/${inv.id}" class="font-medium text-blue-600 hover:underline">${inv.invoice_number}</a>
                </td>
                <td class="px-4 py-3 text-gray-600">${inv.client_name}</td>
                <td class="px-4 py-3 text-right font-medium text-gray-900">${formatCurrency(inv.gross_amount)}</td>
                <td class="px-4 py-3 text-center">${statusBadge(inv.status)}</td>
                <td class="px-4 py-3 text-right text-gray-600">${formatDate(inv.invoice_date)}</td>
                <td class="px-4 py-3 text-right text-gray-600 ${isOverdue ? "text-red-600 font-medium" : ""}">${formatDate(inv.due_date)}${isOverdue ? " ⚠" : ""}</td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    </div>
  `;
}

export function renderInvoiceClientSelection(clients: Omit<Client, "created_at" | "archived">[]) {
  if (clients.length === 0) {
    return html`
      <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p class="text-sm text-gray-600">Bitte erstelle zuerst einen Kunden und ein Projekt mit Zeiteinträgen.</p>
        <a href="/kunden/new" class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Neuen Kunden erstellen</a>
      </div>
    `;
  }

  return html`
    <div class="max-w-2xl">
      <h1 class="mb-6 text-2xl font-semibold">Neue Rechnung erstellen</h1>
      <p class="mb-6 text-sm text-gray-600">Wähle den Kunden, für den du eine Rechnung erstellen möchtest.</p>

      <div class="space-y-3">
        ${clients.map(
          (client) => html`
            <a href="/rechnungen/create?client_id=${client.id}" class="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-500 hover:bg-blue-50 transition">
              <div class="flex justify-between items-center">
                <div>
                  <p class="font-semibold text-gray-900">${client.name}</p>
                  <p class="text-sm text-gray-500">${client.city || "—"}</p>
                </div>
                <span class="text-gray-400">→</span>
              </div>
            </a>
          `,
        )}
      </div>
    </div>
  `;
}

export function renderInvoiceProjectSelection(args: {
  client: Client;
  projectPreviews: InvoiceCreateProjectPreview[];
  today: string;
  dueDate: string;
  vatRate: number;
  isKleinunternehmer: boolean;
}) {
  const { client, projectPreviews, today, dueDate, vatRate, isKleinunternehmer } = args;

  return html`
    <div class="max-w-3xl">
      <a href="/rechnungen/create" class="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center">← Zurück</a>
      <h1 class="mb-2 text-2xl font-semibold">Neue Rechnung erstellen</h1>
      <p class="mb-6 text-sm text-gray-600">Kunde: <strong>${client.name}</strong></p>

      ${
        projectPreviews.length === 0
          ? html`
            <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <p class="text-sm text-gray-600">Für diesen Kunden gibt es keine aktiven Projekte.</p>
            </div>
          `
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

                              <div class="grid grid-cols-2 gap-4">
                                <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Bestellnummer (optional)</label>
                                  <input type="text" name="po_number" placeholder="z.B. PO-2026-001" class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                </div>
                                <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Fällig am</label>
                                  <input type="date" name="due_date" value="${dueDate}" class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                </div>
                              </div>

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
