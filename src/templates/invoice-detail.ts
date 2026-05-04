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
          ${isOverdue ? html`<span class="text-sm text-accent-danger font-medium">Überfällig ⚠</span>` : ""}
        </div>
        <div class="flex gap-2">
          <a
            href="/rechnungen/${invoice.id}/pdf"
            class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center gap-1"
          >
            <i data-lucide="download" class="h-3.5 w-3.5"></i>
            PDF herunterladen
          </a>
          ${
            invoice.status === "draft"
              ? html`
                  <button
                    type="button"
                    hx-post="/rechnungen/${invoice.id}/send"
                    hx-confirm="Rechnung per E-Mail an ${client.email} versenden?"
                    hx-on::after-request="if(event.detail.xhr.status === 200) location.reload()"
                    class="rounded-md bg-accent-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:ring-2 focus:ring-accent-success focus:ring-offset-2 flex items-center gap-1"
                  >
                    <i data-lucide="mail" class="h-3.5 w-3.5"></i>
                    Per E-Mail versenden
                  </button>
                  <form method="post" action="/rechnungen/${invoice.id}/status" class="inline">
                    <input type="hidden" name="status" value="sent" />
                    <button type="submit" class="rounded-md px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2" style="background-color: ${accent}">
                      Als versendet markieren
                    </button>
                  </form>
                `
              : invoice.status === "sent"
                ? html`
                    <form method="post" action="/rechnungen/${invoice.id}/status" class="inline">
                      <input type="hidden" name="status" value="paid" />
                      <button type="submit" class="rounded-md bg-accent-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:ring-2 focus:ring-accent-success focus:ring-offset-2">
                        Als bezahlt markieren
                      </button>
                    </form>
                  `
                : ""
          }
        </div>
      </div>

      <div class="rounded-lg border border-border-subtle bg-bg-surface p-8" style="border-top: 4px solid ${accent}">
        <div class="mb-8 flex justify-between">
          <div>
            ${
              config.show_logo
                ? html`<div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-surface-raised text-xs font-semibold text-text-muted">Logo</div>`
                : ""
            }
            <p class="text-xs text-text-muted mb-1">Rechnungssteller:</p>
            <p class="font-semibold text-text-primary">${settings.company_name}</p>
            <p class="text-sm text-text-secondary">${settings.address || ""}</p>
            <p class="text-sm text-text-secondary">${settings.postal_code ? `${settings.postal_code} ` : ""}${settings.city || ""}</p>
          </div>
          <div class="text-right text-sm text-text-secondary">
            <p>Rechnungsnummer: <strong class="text-text-primary">${invoice.invoice_number}</strong></p>
            <p>Rechnungsdatum: ${formatDate(invoice.invoice_date)}</p>
            <p>Leistungszeitraum: ${invoice.service_period_from ? formatDate(invoice.service_period_from) : "—"} – ${invoice.service_period_to ? formatDate(invoice.service_period_to) : "—"}</p>
            <p>Fällig am: ${formatDate(invoice.due_date)}</p>
            ${invoice.po_number ? html`<p>Bestellnummer: ${invoice.po_number}</p>` : ""}
          </div>
        </div>

        <div class="mb-8 border-t border-border-subtle pt-6">
          <p class="text-xs text-text-muted mb-1">Rechnungsempfänger:</p>
          <p class="font-semibold text-text-primary">${client.name}</p>
          <p class="text-sm text-text-secondary">${client.address || ""}</p>
          <p class="text-sm text-text-secondary">${client.postal_code ? `${client.postal_code} ` : ""}${client.city || ""}</p>
          ${client.vat_id ? html`<p class="text-sm text-text-muted mt-1">USt-IdNr.: ${client.vat_id}</p>` : ""}
        </div>

        <div class="mb-8 overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 border-border-medium">
                <th class="py-2 text-left font-semibold text-text-secondary">Nr.</th>
                <th class="py-2 text-left font-semibold text-text-secondary">Beschreibung</th>
                <th class="py-2 text-right font-semibold text-text-secondary">Zeitraum</th>
                <th class="py-2 text-right font-semibold text-text-secondary">Tage</th>
                <th class="py-2 text-right font-semibold text-text-secondary">Tagessatz</th>
                <th class="py-2 text-right font-semibold text-text-secondary">Netto</th>
                ${
                  effectiveVatRate > 0
                    ? html`<th class="py-2 text-right font-semibold text-text-secondary">MwSt ${(effectiveVatRate * 100).toFixed(0)}%</th>`
                    : html`<th class="py-2 text-right font-semibold text-text-secondary">MwSt</th>`
                }
                <th class="py-2 text-right font-semibold text-text-secondary">Brutto</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => {
                const periodStr = `${formatDate(item.period_start)} – ${formatDate(item.period_end)}`;
                return html`
                  <tr class="border-b border-border-subtle">
                    <td class="py-2 text-text-secondary">${i + 1}</td>
                    <td class="py-2 text-text-primary">${item.description}</td>
                    <td class="py-2 text-right text-text-secondary text-xs">${periodStr}</td>
                    <td class="py-2 text-right text-text-secondary">${item.days.toFixed(2)}</td>
                    <td class="py-2 text-right text-text-secondary">${formatCurrency(item.daily_rate)}</td>
                    <td class="py-2 text-right font-medium text-text-primary">${formatCurrency(item.net_amount)}</td>
                    ${
                      item.vat_rate > 0
                        ? html`<td class="py-2 text-right text-text-secondary">${formatCurrency(item.vat_amount)}</td><td class="py-2 text-right font-medium text-text-primary">${formatCurrency(item.gross_amount)}</td>`
                        : html`<td class="py-2 text-right text-text-muted italic">0,00 €</td><td class="py-2 text-right font-medium text-text-primary">${formatCurrency(item.gross_amount)}</td>`
                    }
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>

        <div class="mb-8 flex justify-end">
          <div class="w-72 space-y-2 border-t border-border-subtle pt-4">
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Zwischensumme (Netto):</span>
              <span class="font-medium text-text-primary">${formatCurrency(invoice.net_amount)}</span>
            </div>
            ${
              effectiveVatRate > 0
                ? html`
                    <div class="flex justify-between text-sm">
                      <span class="text-text-secondary">MwSt (${(effectiveVatRate * 100).toFixed(0)}%):</span>
                      <span class="font-medium text-text-primary">${formatCurrency(invoice.vat_amount)}</span>
                    </div>
                  `
                : ""
            }
            ${
              isKleinunternehmer
                ? html`<p class="text-sm text-accent-success italic">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>`
                : ""
            }
            <div class="flex justify-between border-t border-border-subtle pt-2 text-lg">
              <span class="font-semibold text-text-primary">Gesamtbetrag:</span>
              <span class="font-bold text-text-primary">${formatCurrency(invoice.gross_amount)}</span>
            </div>
          </div>
        </div>

        <div class="border-t border-border-subtle pt-6 text-xs text-text-muted space-y-1">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="font-medium text-text-secondary">Rechnungssteller:</p>
              <p>${settings.company_name} · ${settings.address || ""} · ${settings.postal_code || ""} ${settings.city || ""}</p>
              ${config.show_tax_number && settings.ust_id ? html`<p>USt-IdNr.: ${settings.ust_id}</p>` : ""}
              ${config.show_tax_number && settings.tax_number ? html`<p>Steuernummer: ${settings.tax_number}</p>` : ""}
            </div>
            <div>
              <p class="font-medium text-text-secondary">Zahlungsbedingungen:</p>
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
