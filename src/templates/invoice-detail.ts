import { html } from "hono/html";
import type { Client, Invoice, InvoiceItem, Settings } from "../validation/schemas";
import {
  fontSizeClass,
  formatCurrency,
  formatDate,
  paperClass,
  parseInvoiceLayoutConfig,
  statusBadge,
} from "./invoice-shared";

export function renderInvoiceDetailPage(args: {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client;
  settings: Settings;
  isOverdue: boolean;
}) {
  const { invoice, items, client, settings, isOverdue } = args;
  const config = parseInvoiceLayoutConfig(settings);

  const isKleinunternehmer = Boolean(settings.kleinunternehmer);
  const effectiveVatRate = isKleinunternehmer ? 0 : settings.vat_rate;
  const accent = config.accent_color;

  return html`
    <div class="${paperClass(config.paper_size)} mx-auto ${fontSizeClass(config.font_size)}">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-semibold">Rechnung ${invoice.invoice_number}</h1>
          ${statusBadge(invoice.status)}
          ${isOverdue ? html`<span class="text-sm text-red-600 font-medium">Überfällig ⚠</span>` : ""}
        </div>
        <div class="flex gap-2">
          <a
            href="/rechnungen/${invoice.id}/pdf"
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            PDF herunterladen
          </a>
          ${
            invoice.status === "draft"
              ? html`
                  <form method="post" action="/rechnungen/${invoice.id}/status" class="inline">
                    <input type="hidden" name="status" value="sent" />
                    <button type="submit" class="rounded-md px-4 py-2 text-sm font-medium text-white" style="background-color: ${accent}">
                      Als versendet markieren
                    </button>
                  </form>
                `
              : invoice.status === "sent"
                ? html`
                    <form method="post" action="/rechnungen/${invoice.id}/status" class="inline">
                      <input type="hidden" name="status" value="paid" />
                      <button type="submit" class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                        Als bezahlt markieren
                      </button>
                    </form>
                  `
                : ""
          }
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 bg-white p-8" style="border-top: 4px solid ${accent}">
        <div class="mb-8 flex justify-between">
          <div>
            ${
              config.show_logo
                ? html`<div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-500">Logo</div>`
                : ""
            }
            <p class="text-xs text-gray-500 mb-1">Rechnungssteller:</p>
            <p class="font-semibold text-gray-900">${settings.company_name}</p>
            <p class="text-sm text-gray-600">${settings.address || ""}</p>
            <p class="text-sm text-gray-600">${settings.postal_code ? `${settings.postal_code} ` : ""}${settings.city || ""}</p>
          </div>
          <div class="text-right text-sm text-gray-600">
            <p>Rechnungsnummer: <strong class="text-gray-900">${invoice.invoice_number}</strong></p>
            <p>Rechnungsdatum: ${formatDate(invoice.invoice_date)}</p>
            <p>Leistungszeitraum: ${invoice.service_period_from ? formatDate(invoice.service_period_from) : "—"} – ${invoice.service_period_to ? formatDate(invoice.service_period_to) : "—"}</p>
            <p>Fällig am: ${formatDate(invoice.due_date)}</p>
            ${invoice.po_number ? html`<p>Bestellnummer: ${invoice.po_number}</p>` : ""}
          </div>
        </div>

        <div class="mb-8 border-t border-gray-200 pt-6">
          <p class="text-xs text-gray-500 mb-1">Rechnungsempfänger:</p>
          <p class="font-semibold text-gray-900">${client.name}</p>
          <p class="text-sm text-gray-600">${client.address || ""}</p>
          <p class="text-sm text-gray-600">${client.postal_code ? `${client.postal_code} ` : ""}${client.city || ""}</p>
          ${client.vat_id ? html`<p class="text-sm text-gray-500 mt-1">USt-IdNr.: ${client.vat_id}</p>` : ""}
        </div>

        <div class="mb-8 overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 border-gray-300">
                <th class="py-2 text-left font-semibold text-gray-700">Nr.</th>
                <th class="py-2 text-left font-semibold text-gray-700">Beschreibung</th>
                <th class="py-2 text-right font-semibold text-gray-700">Zeitraum</th>
                <th class="py-2 text-right font-semibold text-gray-700">Tage</th>
                <th class="py-2 text-right font-semibold text-gray-700">Tagessatz</th>
                <th class="py-2 text-right font-semibold text-gray-700">Netto</th>
                ${
                  effectiveVatRate > 0
                    ? html`<th class="py-2 text-right font-semibold text-gray-700">MwSt ${(effectiveVatRate * 100).toFixed(0)}%</th>`
                    : html`<th class="py-2 text-right font-semibold text-gray-700">MwSt</th>`
                }
                <th class="py-2 text-right font-semibold text-gray-700">Brutto</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => {
                const periodStr = `${formatDate(item.period_start)} – ${formatDate(item.period_end)}`;
                return html`
                  <tr class="border-b border-gray-100">
                    <td class="py-2 text-gray-600">${i + 1}</td>
                    <td class="py-2 text-gray-900">${item.description}</td>
                    <td class="py-2 text-right text-gray-600 text-xs">${periodStr}</td>
                    <td class="py-2 text-right text-gray-600">${item.days.toFixed(2)}</td>
                    <td class="py-2 text-right text-gray-600">${formatCurrency(item.daily_rate)}</td>
                    <td class="py-2 text-right font-medium text-gray-900">${formatCurrency(item.net_amount)}</td>
                    ${
                      item.vat_rate > 0
                        ? html`<td class="py-2 text-right text-gray-600">${formatCurrency(item.vat_amount)}</td><td class="py-2 text-right font-medium text-gray-900">${formatCurrency(item.gross_amount)}</td>`
                        : html`<td class="py-2 text-right text-gray-400 italic">0,00 €</td><td class="py-2 text-right font-medium text-gray-900">${formatCurrency(item.gross_amount)}</td>`
                    }
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>

        <div class="mb-8 flex justify-end">
          <div class="w-72 space-y-2 border-t border-gray-200 pt-4">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Zwischensumme (Netto):</span>
              <span class="font-medium text-gray-900">${formatCurrency(invoice.net_amount)}</span>
            </div>
            ${
              effectiveVatRate > 0
                ? html`
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-600">MwSt (${(effectiveVatRate * 100).toFixed(0)}%):</span>
                      <span class="font-medium text-gray-900">${formatCurrency(invoice.vat_amount)}</span>
                    </div>
                  `
                : ""
            }
            ${
              isKleinunternehmer
                ? html`<p class="text-sm text-green-700 italic">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>`
                : ""
            }
            <div class="flex justify-between border-t border-gray-200 pt-2 text-lg">
              <span class="font-semibold text-gray-900">Gesamtbetrag:</span>
              <span class="font-bold text-gray-900">${formatCurrency(invoice.gross_amount)}</span>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-200 pt-6 text-xs text-gray-500 space-y-1">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="font-medium text-gray-700">Rechnungssteller:</p>
              <p>${settings.company_name} · ${settings.address || ""} · ${settings.postal_code || ""} ${settings.city || ""}</p>
              ${config.show_tax_number && settings.ust_id ? html`<p>USt-IdNr.: ${settings.ust_id}</p>` : ""}
              ${config.show_tax_number && settings.tax_number ? html`<p>Steuernummer: ${settings.tax_number}</p>` : ""}
            </div>
            <div>
              <p class="font-medium text-gray-700">Zahlungsbedingungen:</p>
              ${config.show_payment_terms ? html`<p>Netto ${settings.payment_days} Tage</p>` : ""}
              ${config.show_bank_details && settings.bank_name ? html`<p>Kontoinhaber: ${settings.bank_name}</p>` : ""}
              ${config.show_bank_details && settings.iban ? html`<p>IBAN: ${settings.iban}</p>` : ""}
              ${config.show_bank_details && settings.bic ? html`<p>BIC: ${settings.bic}</p>` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
