import {
  formatCurrency,
  formatDate,
  parseInvoiceLayoutConfig,
} from "../../templates/invoice-shared";
import type { Client, Invoice, InvoiceItem, Settings } from "../../validation/schemas";

export interface InvoicePdfData {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client;
  settings: Settings;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildInvoiceHtml(data: InvoicePdfData): string {
  const { invoice, items, client, settings } = data;
  const config = parseInvoiceLayoutConfig(settings);
  const isKleinunternehmer = Boolean(settings.kleinunternehmer);
  const effectiveVatRate = isKleinunternehmer ? 0 : settings.vat_rate;

  const senderLine = escapeHtml(
    `${settings.company_name} · ${settings.address || ""} · ${settings.postal_code || ""} ${settings.city || ""}`,
  );
  const invoiceDateFormatted = formatDate(invoice.invoice_date);
  const dueDateFormatted = formatDate(invoice.due_date);
  const periodFromFormatted = invoice.service_period_from
    ? formatDate(invoice.service_period_from)
    : "";
  const periodToFormatted = invoice.service_period_to ? formatDate(invoice.service_period_to) : "";

  const itemsHtml = items
    .map((item, i) => {
      const periodStr = `${formatDate(item.period_start)} – ${formatDate(item.period_end)}`;
      const desc = escapeHtml(item.description);
      return `
        <tr>
          <td style="padding: 8px 6px; text-align: center; color: #6b7280; font-size: 12px;">${i + 1}</td>
          <td style="padding: 8px 6px; color: #111827; font-size: 12px;">${desc}</td>
          <td style="padding: 8px 6px; text-align: right; color: #6b7280; font-size: 11px; white-space: nowrap;">${periodStr}</td>
          <td style="padding: 8px 6px; text-align: right; color: #6b7280; font-size: 12px;">${item.days.toFixed(2)}</td>
          <td style="padding: 8px 6px; text-align: right; color: #6b7280; font-size: 12px;">${formatCurrency(item.daily_rate)}</td>
          <td style="padding: 8px 6px; text-align: right; color: #111827; font-size: 12px; font-weight: 500;">${formatCurrency(item.net_amount)}</td>
          ${
            effectiveVatRate > 0
              ? `<td style="padding: 8px 6px; text-align: right; color: #6b7280; font-size: 12px;">${formatCurrency(item.vat_amount)}</td>`
              : `<td style="padding: 8px 6px; text-align: right; color: #9ca3af; font-size: 12px; font-style: italic;">0,00</td>`
          }
          <td style="padding: 8px 6px; text-align: right; color: #111827; font-size: 12px; font-weight: 600;">${formatCurrency(item.gross_amount)}</td>
        </tr>`;
    })
    .join("");

  const vatRateLabel = effectiveVatRate > 0 ? `${(effectiveVatRate * 100).toFixed(0)}%` : "";

  const kleinunternehmerNote = isKleinunternehmer
    ? `<p style="font-size: 11px; color: #059669; font-style: italic; margin: 0;">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 20mm 20mm 25mm 20mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #111827;
      line-height: 1.4;
    }
    .sender-line {
      font-size: 10px;
      color: #6b7280;
      padding: 8px 0 12px 0;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 16px;
    }
    .document-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 32px;
    }
    .address-block {
      width: 45%;
    }
    .address-label {
      font-size: 10px;
      color: #9ca3af;
      margin-bottom: 4px;
    }
    .recipient-name {
      font-weight: 600;
      font-size: 14px;
      color: #111827;
    }
    .recipient-address {
      color: #374151;
      font-size: 12px;
      line-height: 1.6;
    }
    .meta-block {
      text-align: right;
    }
    .invoice-title {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .meta-row {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 3px;
    }
    .meta-row strong {
      color: #111827;
    }
    .info-grid {
      display: flex;
      gap: 48px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 4px;
    }
    .info-grid > div { flex: 1; }
    .info-label {
      font-size: 10px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .info-value {
      font-size: 12px;
      color: #111827;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    thead th {
      background: #f3f4f6;
      padding: 10px 6px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 2px solid #d1d5db;
    }
    thead th:nth-child(n+3) { text-align: right; }
    tbody tr { border-bottom: 1px solid #f3f4f6; }
    tbody tr:hover { background: #fafafa; }
    .summary-block {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }
    .summary-table {
      width: 280px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 12px;
      color: #374151;
    }
    .summary-row.netto { border-bottom: 1px solid #e5e7eb; }
    .summary-row.vat { color: #6b7280; }
    .summary-row.grand-total {
      border-top: 2px solid #111827;
      padding-top: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #111827;
    }
    .summary-value { font-weight: 500; }
    .notes-section {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .notes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .notes-label {
      font-size: 10px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .notes-text {
      font-size: 11px;
      color: #6b7280;
      line-height: 1.5;
    }
    .payment-info {
      margin-top: 20px;
      padding: 14px;
      background: #f0fdf4;
      border-left: 3px solid #16a34a;
      border-radius: 0 4px 4px 0;
    }
    .payment-info p { font-size: 11px; color: #166534; margin-bottom: 2px; }
    .payment-info strong { font-weight: 600; }
  </style>
</head>
<body>

  <div class="sender-line">${senderLine}</div>

  <div class="document-header">
    <div class="address-block">
      <p class="address-label">Rechnungsempfänger:</p>
      <p class="recipient-name">${escapeHtml(client.name)}</p>
      <p class="recipient-address">
        ${escapeHtml(client.address || "")}<br>
        ${escapeHtml(client.postal_code ? `${client.postal_code} ` : "")}${escapeHtml(client.city || "")}
        ${client.vat_id ? `<br>USt-IdNr.: ${escapeHtml(client.vat_id)}` : ""}
      </p>
    </div>
    <div class="meta-block">
      <p class="invoice-title">RECHNUNG</p>
      <p class="meta-row">Rechnungsnummer: <strong>${escapeHtml(invoice.invoice_number)}</strong></p>
      <p class="meta-row">Rechnungsdatum: <strong>${invoiceDateFormatted}</strong></p>
      ${
        periodFromFormatted && periodToFormatted
          ? `<p class="meta-row">Leistungszeitraum: <strong>${periodFromFormatted} – ${periodToFormatted}</strong></p>`
          : ""
      }
      <p class="meta-row">Fällig am: <strong>${dueDateFormatted}</strong></p>
      ${invoice.po_number ? `<p class="meta-row">Bestellnummer: <strong>${escapeHtml(invoice.po_number)}</strong></p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%;">Nr.</th>
        <th style="width: 32%;">Beschreibung</th>
        <th style="width: 18%; text-align: right;">Zeitraum</th>
        <th style="width: 8%; text-align: right;">Tage</th>
        <th style="width: 12%; text-align: right;">Tagessatz</th>
        <th style="width: 10%; text-align: right;">Netto</th>
        ${effectiveVatRate > 0 ? `<th style="width: 7%; text-align: right;">MwSt ${vatRateLabel}</th>` : `<th style="width: 7%; text-align: right;">MwSt</th>`}
        <th style="width: 8%; text-align: right;">Brutto</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="summary-block">
    <div class="summary-table">
      <div class="summary-row netto">
        <span>Zwischensumme (Netto)</span>
        <span class="summary-value">${formatCurrency(invoice.net_amount)}</span>
      </div>
      ${
        effectiveVatRate > 0
          ? `<div class="summary-row vat"><span>MwSt (${vatRateLabel})</span><span class="summary-value">${formatCurrency(invoice.vat_amount)}</span></div>`
          : ""
      }
      ${kleinunternehmerNote}
      <div class="summary-row grand-total">
        <span>Gesamtbetrag</span>
        <span>${formatCurrency(invoice.gross_amount)}</span>
      </div>
    </div>
  </div>

  <div class="notes-section">
    <div class="notes-grid">
      <div>
        <p class="notes-label">Rechnungssteller</p>
        <p class="notes-text">
          ${escapeHtml(settings.company_name)} · ${escapeHtml(settings.address || "")} · ${escapeHtml(settings.postal_code || "")} ${escapeHtml(settings.city || "")}
        </p>
        ${config.show_tax_number && settings.tax_number ? `<p class="notes-text">Steuernummer: ${escapeHtml(settings.tax_number)}</p>` : ""}
        ${config.show_tax_number && settings.ust_id ? `<p class="notes-text">USt-IdNr.: ${escapeHtml(settings.ust_id)}</p>` : ""}
      </div>
      <div>
        <p class="notes-label">Zahlungsbedingungen</p>
        ${config.show_payment_terms ? `<p class="notes-text">Zahlbar innerhalb ${settings.payment_days} Tage</p>` : ""}
        ${config.show_bank_details && settings.bank_name ? `<p class="notes-text">Kontoinhaber: ${escapeHtml(settings.bank_name)}</p>` : ""}
        ${config.show_bank_details && settings.iban ? `<p class="notes-text">IBAN: ${escapeHtml(settings.iban)}</p>` : ""}
        ${config.show_bank_details && settings.bic ? `<p class="notes-text">BIC: ${escapeHtml(settings.bic)}</p>` : ""}
      </div>
    </div>
  </div>

</body>
</html>`;
}
