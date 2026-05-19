import { html } from "hono/html";
import type { Client, Invoice, InvoiceItem, Payment, Settings } from "../validation/schemas";
import { Button } from "./components/button";
import { Table, TableRow, Td } from "./components/table";
import {
  fontSizeClass,
  formatCurrency,
  formatDate,
  paperClass,
  parseInvoiceLayoutConfig,
  statusBadge,
} from "./invoice-shared";

const ICON_DOWNLOAD =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>';

const ICON_EMAIL =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';

export function renderInvoiceDetailPage(args: {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client;
  settings: Settings;
  isOverdue: boolean;
  payments?: Payment[];
  remainingBalance?: number;
}) {
  const {
    invoice,
    items,
    client,
    settings,
    isOverdue,
    payments = [],
    remainingBalance = invoice.gross_amount,
  } = args;
  const config = parseInvoiceLayoutConfig(settings);

  const isKleinunternehmer = Boolean(settings.kleinunternehmer);
  const isReverseCharge = Boolean(invoice.reverse_charge);
  const effectiveVatRate = isKleinunternehmer || isReverseCharge ? 0 : settings.vat_rate;
  const accent = config.accent_color;

  const vatHeader =
    effectiveVatRate > 0
      ? [{ label: `MwSt ${(effectiveVatRate * 100).toFixed(0)}%`, align: "right" as const }]
      : [{ label: "MwSt", align: "right" as const }];

  const itemColumns = [
    { label: "Nr." },
    { label: "Beschreibung" },
    { label: "Zeitraum", align: "right" as const },
    { label: "Tage", align: "right" as const },
    { label: "Tagessatz", align: "right" as const },
    { label: "Netto", align: "right" as const },
    ...vatHeader,
    { label: "Brutto", align: "right" as const },
  ];

  const itemRows = items.map((item, i) => {
    const periodStr = `${formatDate(item.period_start)} – ${formatDate(item.period_end)}`;
    const vatCell =
      item.vat_rate > 0
        ? Td({ align: "right", children: html`${formatCurrency(item.vat_amount)}` })
        : Td({ align: "right", extraClass: " italic text-text-muted", children: "0,00 €" });

    return TableRow({
      children: [
        Td({ children: html`<span class="text-text-secondary">${i + 1}</span>` }),
        Td({ children: html`<span class="text-text-primary">${item.description}</span>` }),
        Td({ align: "right", extraClass: " text-xs text-text-secondary", children: periodStr }),
        Td({
          align: "right",
          children: html`<span class="text-text-secondary">${item.days.toFixed(2)}</span>`,
        }),
        Td({
          align: "right",
          children: html`<span class="text-text-secondary">${formatCurrency(item.daily_rate)}</span>`,
        }),
        Td({
          align: "right",
          children: html`<span class="font-medium text-text-primary">${formatCurrency(item.net_amount)}</span>`,
        }),
        vatCell,
        Td({
          align: "right",
          children: html`<span class="font-medium text-text-primary">${formatCurrency(item.gross_amount)}</span>`,
        }),
      ],
    });
  });

  return html`
    <div class="${paperClass(config.paper_size)} mx-auto ${fontSizeClass(config.font_size)}">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-semibold">Rechnung ${invoice.invoice_number}</h1>
          ${statusBadge(invoice.status)}
          ${isReverseCharge ? html`<span class="text-sm bg-blue-100 text-blue-800 font-medium px-2 py-1 rounded">§13b UStG</span>` : ""}
          ${isOverdue ? html`<span class="text-sm text-accent-danger font-medium">Überfällig ⚠</span>` : ""}
        </div>
        <div class="flex gap-2">
          ${Button({
            variant: "primary",
            href: `/rechnungen/${invoice.id}/pdf`,
            icon: ICON_DOWNLOAD,
            children: "PDF herunterladen",
          })}
          ${
            invoice.status === "draft"
              ? html`
                ${Button({
                  variant: "primary",
                  type: "button",
                  icon: ICON_EMAIL,
                  attrs: `hx-post="/rechnungen/${invoice.id}/send" hx-confirm="Rechnung per E-Mail an ${client.email} versenden?" hx-on::after-request="if(event.detail.xhr.status === 200) location.reload()"`,
                  children: "Per E-Mail versenden",
                })}
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
                    ${Button({ variant: "primary", type: "submit", children: "Als bezahlt markieren" })}
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
          ${Table({ columns: itemColumns, rows: itemRows })}
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
            ${
              isReverseCharge
                ? html`<p class="text-sm text-blue-600 italic">Steuerschuldnerschaft des Leistungsempfängers gemäß §13b UStG</p>`
                : ""
            }
            ${
              invoice.status !== "draft"
                ? html`
                  <div class="flex justify-between text-sm pt-4">
                    <span class="text-text-secondary">Offener Betrag:</span>
                    <span class="font-medium text-text-primary">${formatCurrency(remainingBalance)}</span>
                  </div>
                `
                : ""
            }
            <div class="flex justify-between border-t border-border-subtle pt-2 text-lg">
              <span class="font-semibold text-text-primary">Gesamtbetrag:</span>
              <span class="font-bold text-text-primary">${formatCurrency(invoice.gross_amount)}</span>
            </div>
          </div>
        </div>

        ${
          invoice.status !== "draft"
            ? html`
              <div class="mt-8 border-t border-border-subtle pt-6">
                <h2 class="text-lg font-semibold mb-4">Zahlungen erfassen</h2>
                <form method="post" action="/rechnungen/${invoice.id}/payment" class="space-y-4 rounded-lg border border-border-subtle bg-bg-surface-raised p-4 max-w-md">
                  <div>
                    <label for="amount" class="block text-sm font-medium text-text-primary mb-1">Betrag *</label>
                    <input type="number" id="amount" name="amount" step="0.01" min="0" max="${remainingBalance}" required class="w-full rounded border border-border-subtle px-3 py-2 text-sm" placeholder="0,00 €" />
                  </div>
                  <div>
                    <label for="payment_date" class="block text-sm font-medium text-text-primary mb-1">Zahlungsdatum *</label>
                    <input type="date" id="payment_date" name="payment_date" required class="w-full rounded border border-border-subtle px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label for="note" class="block text-sm font-medium text-text-primary mb-1">Notiz (optional)</label>
                    <input type="text" id="note" name="note" class="w-full rounded border border-border-subtle px-3 py-2 text-sm" placeholder="z.B. Referenznummer" />
                  </div>
                  <button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Zahlung erfassen</button>
                </form>
              </div>

              ${
                payments.length > 0
                  ? html`
                    <div class="mt-8 border-t border-border-subtle pt-6">
                      <h2 class="text-lg font-semibold mb-4">Zahlungshistorie</h2>
                      <div class="rounded-lg border border-border-subtle overflow-hidden">
                        <table class="w-full text-sm">
                          <thead class="bg-bg-surface-raised border-b">
                            <tr>
                              <th class="px-4 py-2 text-left font-medium text-text-secondary">Datum</th>
                              <th class="px-4 py-2 text-right font-medium text-text-secondary">Betrag</th>
                              <th class="px-4 py-2 text-left font-medium text-text-secondary">Notiz</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${payments.map(
                              (p) => html`
                              <tr class="border-t border-border-subtle hover:bg-bg-surface-raised">
                                <td class="px-4 py-2 text-text-secondary">${formatDate(p.payment_date)}</td>
                                <td class="px-4 py-2 text-right font-medium text-text-primary">${formatCurrency(p.amount)}</td>
                                <td class="px-4 py-2 text-text-secondary">${p.note || "—"}</td>
                              </tr>
                            `,
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  `
                  : ""
              }
            `
            : ""
        }

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
