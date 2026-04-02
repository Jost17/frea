import { html } from "hono/html";

export interface InvoiceLayoutConfig {
  showLogo: boolean;
  logoUrl: string;
  accentColor: string;
  showPaymentTerms: boolean;
  showBankDetails: boolean;
  showTaxNumber: boolean;
  fontSize: "sm" | "md" | "lg";
  paperSize: "a4" | "letter";
}

export const DEFAULT_INVOICE_LAYOUT: InvoiceLayoutConfig = {
  showLogo: true,
  logoUrl: "/static/logo/frea-logo-light.svg",
  accentColor: "#2563eb",
  showPaymentTerms: true,
  showBankDetails: true,
  showTaxNumber: true,
  fontSize: "md",
  paperSize: "a4",
};

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  servicePeriodFrom: string;
  servicePeriodTo: string;
  poNumber: string | null;
  clientName: string;
  clientAddress: string;
  clientPostalCode: string;
  clientCity: string;
  clientCountry: string;
  clientVatId: string | null;
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companyCountry: string;
  companyEmail: string;
  companyPhone: string;
  companyTaxNumber: string;
  companyUstId: string | null;
  companyBankName: string;
  companyIban: string;
  companyBic: string;
  paymentDays: number;
  items: InvoiceLineItem[];
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  effectiveVatRate: number;
  isKleinunternehmer: boolean;
  isReverseCharge: boolean;
  status: string;
}

export interface InvoiceLineItem {
  description: string;
  periodStart: string;
  periodEnd: string;
  days: number;
  dailyRate: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("de-DE").format(new Date(`${dateStr}T00:00:00`));
}

export function renderInvoiceHtml(
  data: InvoiceData,
  config: Partial<InvoiceLayoutConfig> = {},
): ReturnType<typeof html> {
  const cfg: InvoiceLayoutConfig = { ...DEFAULT_INVOICE_LAYOUT, ...config };

  const effectiveVatRatePercent = (data.effectiveVatRate * 100).toFixed(0);

  return html`
    <!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Rechnung ${data.invoiceNumber}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: ${cfg.fontSize === "sm" ? "12px" : cfg.fontSize === "lg" ? "16px" : "14px"};
            line-height: 1.5;
            color: #1f2937;
            background: #ffffff;
          }
          @page {
            size: ${cfg.paperSize};
            margin: 20mm;
          }
          .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            border-bottom: 2px solid ${cfg.accentColor};
            padding-bottom: 20px;
          }
          .company-info {
            max-width: 50%;
          }
          .company-name {
            font-size: 1.25em;
            font-weight: 700;
            color: #111827;
          }
          .company-details {
            color: #4b5563;
            margin-top: 4px;
          }
          .invoice-meta {
            text-align: right;
            color: #374151;
          }
          .invoice-number {
            font-size: 1.1em;
            font-weight: 600;
            color: #111827;
          }
          .invoice-date, .due-date, .period {
            margin-top: 4px;
          }
          .addresses {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .address-block {
            max-width: 45%;
          }
          .address-label {
            font-size: 0.75em;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
          }
          .address-name {
            font-weight: 600;
            color: #111827;
          }
          .address-details {
            color: #4b5563;
            margin-top: 2px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .items-table th {
            text-align: left;
            padding: 10px 8px;
            border-bottom: 2px solid #e5e7eb;
            color: #374151;
            font-weight: 600;
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
          .items-table th.right {
            text-align: right;
          }
          .items-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #e5e7eb;
            color: #1f2937;
          }
          .items-table td.right {
            text-align: right;
          }
          .items-table td.money {
            font-variant-numeric: tabular-nums;
          }
          .totals {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
          }
          .totals-box {
            width: 280px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            color: #374151;
          }
          .totals-row.total {
            border-top: 2px solid ${cfg.accentColor};
            padding-top: 10px;
            margin-top: 4px;
            font-weight: 700;
            font-size: 1.1em;
            color: #111827;
          }
          .vat-note {
            font-size: 0.85em;
            color: #059669;
            font-style: italic;
            margin-top: 8px;
          }
          .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            font-size: 0.75em;
            color: #6b7280;
          }
          .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .footer-section {
            margin-bottom: 8px;
          }
          .footer-label {
            font-weight: 600;
            color: #4b5563;
          }
          .logo {
            max-height: 40px;
            width: auto;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.7em;
            font-weight: 600;
            text-transform: uppercase;
            margin-left: 8px;
          }
          .status-draft { background: #f3f4f6; color: #4b5563; }
          .status-sent { background: #dbeafe; color: #1d4ed8; }
          .status-paid { background: #d1fae5; color: #047857; }
          .status-cancelled { background: #fee2e2; color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              ${
                cfg.showLogo
                  ? html`<img src="${cfg.logoUrl}" alt="Logo" class="logo" />`
                  : ""
              }
              <p class="company-name">${data.companyName}</p>
              <p class="company-details">${data.companyAddress}</p>
              <p class="company-details">${data.companyPostalCode} ${data.companyCity}</p>
              ${
                data.companyCountry && data.companyCountry !== "Deutschland"
                  ? html`<p class="company-details">${data.companyCountry}</p>`
                  : ""
              }
            </div>
            <div class="invoice-meta">
              <p class="invoice-number">Rechnung ${data.invoiceNumber}</p>
              <span class="status-badge status-${data.status}">${data.status}</span>
              <p class="invoice-date">Rechnungsdatum: ${formatDate(data.invoiceDate)}</p>
              <p class="due-date">Fällig am: ${formatDate(data.dueDate)}</p>
              ${
                data.servicePeriodFrom || data.servicePeriodTo
                  ? html`<p class="period">Leistungszeitraum: ${data.servicePeriodFrom ? formatDate(data.servicePeriodFrom) : "—"} – ${data.servicePeriodTo ? formatDate(data.servicePeriodTo) : "—"}</p>`
                  : ""
              }
              ${data.poNumber ? html`<p>Bestellnummer: ${data.poNumber}</p>` : ""}
            </div>
          </div>

          <div class="addresses">
            <div class="address-block">
              <p class="address-label">Rechnungsempfänger:</p>
              <p class="address-name">${data.clientName}</p>
              <p class="address-details">${data.clientAddress}</p>
              <p class="address-details">${data.clientPostalCode} ${data.clientCity}</p>
              ${
                data.clientCountry && data.clientCountry !== "Deutschland"
                  ? html`<p class="address-details">${data.clientCountry}</p>`
                  : ""
              }
              ${
                data.clientVatId
                  ? html`<p class="address-details">USt-IdNr.: ${data.clientVatId}</p>`
                  : ""
              }
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Beschreibung</th>
                <th class="right">Zeitraum</th>
                <th class="right">Tage</th>
                <th class="right">Tagessatz</th>
                <th class="right">Netto</th>
                ${
                  data.effectiveVatRate > 0
                    ? html`<th class="right">MwSt ${effectiveVatRatePercent}%</th>`
                    : html`<th class="right">MwSt</th>`
                }
                <th class="right">Brutto</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(
                (item, i) => html`
                  <tr>
                    <td>${i + 1}</td>
                    <td>${item.description}</td>
                    <td class="right">${formatDate(item.periodStart)} – ${formatDate(item.periodEnd)}</td>
                    <td class="right money">${item.days.toFixed(2)}</td>
                    <td class="right money">${formatCurrency(item.dailyRate)}</td>
                    <td class="right money">${formatCurrency(item.netAmount)}</td>
                    ${
                      item.vatRate > 0
                        ? html`<td class="right money">${formatCurrency(item.vatAmount)}</td>`
                        : html`<td class="right money">0,00 €</td>`
                    }
                    <td class="right money">${formatCurrency(item.grossAmount)}</td>
                  </tr>
                `,
              )}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-box">
              <div class="totals-row">
                <span>Zwischensumme (Netto):</span>
                <span>${formatCurrency(data.netAmount)}</span>
              </div>
              ${
                data.effectiveVatRate > 0
                  ? html`
                    <div class="totals-row">
                      <span>MwSt (${effectiveVatRatePercent}%):</span>
                      <span>${formatCurrency(data.vatAmount)}</span>
                    </div>
                  `
                  : ""
              }
              ${
                data.isKleinunternehmer
                  ? html`<p class="vat-note">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>`
                  : data.isReverseCharge
                    ? html`<p class="vat-note">Steuerschuldnerschaft des Leistungsempfängers (§13b UStG).</p>`
                    : ""
              }
              <div class="totals-row total">
                <span>Gesamtbetrag:</span>
                <span>${formatCurrency(data.grossAmount)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="footer-grid">
              <div class="footer-section">
                <p class="footer-label">Rechnungssteller:</p>
                <p>${data.companyName} · ${data.companyAddress} · ${data.companyPostalCode} ${data.companyCity}</p>
                ${
                  cfg.showTaxNumber && data.companyTaxNumber
                    ? html`<p>Steuernummer: ${data.companyTaxNumber}</p>`
                    : ""
                }
                ${
                  data.companyUstId
                    ? html`<p>USt-IdNr.: ${data.companyUstId}</p>`
                    : ""
                }
                ${data.companyEmail ? html`<p>E-Mail: ${data.companyEmail}</p>` : ""}
                ${data.companyPhone ? html`<p>Tel.: ${data.companyPhone}</p>` : ""}
              </div>
              ${
                cfg.showBankDetails
                  ? html`
                    <div class="footer-section">
                      <p class="footer-label">Zahlungsbedingungen:</p>
                      <p>Netto ${data.paymentDays} Tage</p>
                      ${
                        data.companyBankName
                          ? html`<p>Kontoinhaber: ${data.companyBankName}</p>`
                          : ""
                      }
                      ${
                        data.companyIban
                          ? html`<p>IBAN: ${data.companyIban}</p>`
                          : ""
                      }
                      ${
                        data.companyBic
                          ? html`<p>BIC: ${data.companyBic}</p>`
                          : ""
                      }
                    </div>
                  `
                  : ""
              }
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
