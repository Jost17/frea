import type { EurSummary } from "../db/eur-queries";
import { formatCurrency, formatDate } from "../templates/invoice-shared";
import type { Settings } from "../validation/schemas";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildEurHtml(data: EurSummary, settings: Settings): string {
  const { year, is_kleinunternehmer, invoices } = data;
  const company = escapeHtml(settings.company_name);
  const taxNumber = escapeHtml(settings.tax_number ?? settings.ust_id ?? "");
  const now = formatDate(new Date().toISOString().slice(0, 10));

  const invoiceRows = invoices
    .map(
      (inv) => `
    <tr>
      <td>${escapeHtml(inv.invoice_number)}</td>
      <td>${escapeHtml(inv.client_name)}</td>
      <td>${formatDate(inv.paid_date)}</td>
      <td class="amount">${formatCurrency(inv.net_amount)}</td>
      <td class="amount">${formatCurrency(inv.vat_amount)}</td>
      <td class="amount">${formatCurrency(inv.gross_amount)}</td>
    </tr>`,
    )
    .join("");

  const vatSection = is_kleinunternehmer
    ? `<tr><td>Steuerfreie Umsätze (Kleinunternehmer §19 UStG)</td><td class="amount">${formatCurrency(data.revenue_net_0)}</td></tr>`
    : `
      <tr><td>Umsätze 19 % MwSt (netto)</td><td class="amount">${formatCurrency(data.revenue_net_19)}</td></tr>
      <tr><td>Umsätze 7 % MwSt (netto)</td><td class="amount">${formatCurrency(data.revenue_net_7)}</td></tr>`;

  const vatCollected = is_kleinunternehmer
    ? ""
    : `
      <tr><td>Eingenommene Umsatzsteuer 19 %</td><td class="amount">${formatCurrency(data.vat_collected_19)}</td></tr>
      <tr><td>Eingenommene Umsatzsteuer 7 %</td><td class="amount">${formatCurrency(data.vat_collected_7)}</td></tr>
      <tr class="subtotal"><td>Umsatzsteuer gesamt</td><td class="amount">${formatCurrency(data.vat_collected_total)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>EÜR ${year} — ${company}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 24px 32px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  h2 { font-size: 13px; color: #555; margin-bottom: 20px; font-weight: normal; }
  h3 { font-size: 12px; margin-top: 24px; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; }
  .amount { text-align: right; font-variant-numeric: tabular-nums; }
  .subtotal td { font-weight: bold; border-top: 1px solid #aaa; }
  .total td { font-weight: bold; font-size: 13px; background: #f3f4f6; }
  .meta { color: #777; font-size: 10px; margin-bottom: 24px; }
  .note { background: #fef9c3; border: 1px solid #fde047; padding: 8px 12px; font-size: 10px; margin-bottom: 16px; border-radius: 4px; }
  @media print { .note { display: none; } }
</style>
</head>
<body>
<h1>Einnahmen-Überschuss-Rechnung ${year}</h1>
<h2>${company}</h2>
<p class="meta">
  Steuernummer / Ust-IdNr.: ${taxNumber}<br>
  Erstellt: ${now}<br>
  Rechnungen: ${data.invoice_count}
</p>
<div class="note">
  ⚠️ Diese EÜR dient als Arbeitshilfe für die Steuererklärung.
  Bitte mit Ihrem Steuerberater abstimmen. Betriebsausgaben sind separat einzutragen.
</div>

<h3>Betriebseinnahmen (Zufluss-Prinzip nach paid_date)</h3>
<table>
  <thead>
    <tr><th>Position</th><th class="amount">Betrag</th></tr>
  </thead>
  <tbody>
    ${vatSection}
    <tr class="total"><td>Betriebseinnahmen netto gesamt</td><td class="amount">${formatCurrency(data.revenue_net_total)}</td></tr>
  </tbody>
</table>

${
  !is_kleinunternehmer
    ? `<h3>Eingenommene Umsatzsteuer</h3>
<table>
  <thead><tr><th>Position</th><th class="amount">Betrag</th></tr></thead>
  <tbody>${vatCollected}</tbody>
</table>`
    : ""
}

<h3>Betriebsausgaben</h3>
<table>
  <thead><tr><th>Position</th><th class="amount">Betrag</th></tr></thead>
  <tbody>
    <tr><td>Betriebsausgaben (bitte manuell ergänzen)</td><td class="amount">0,00 €</td></tr>
    <tr class="total"><td>Betriebsausgaben gesamt</td><td class="amount">0,00 €</td></tr>
  </tbody>
</table>

<h3>Gewinn / Verlust</h3>
<table>
  <thead><tr><th>Position</th><th class="amount">Betrag</th></tr></thead>
  <tbody>
    <tr><td>Betriebseinnahmen netto</td><td class="amount">${formatCurrency(data.revenue_net_total)}</td></tr>
    <tr><td>Betriebsausgaben</td><td class="amount">0,00 €</td></tr>
    <tr class="total"><td>Gewinn (vor Steuern)</td><td class="amount">${formatCurrency(data.revenue_net_total)}</td></tr>
  </tbody>
</table>

<h3>Einzelnachweise (${data.invoice_count} bezahlte Rechnungen)</h3>
<table>
  <thead>
    <tr>
      <th>Rechnungsnummer</th>
      <th>Kunde</th>
      <th>Zahlungsdatum</th>
      <th class="amount">Nettobetrag</th>
      <th class="amount">MwSt</th>
      <th class="amount">Bruttobetrag</th>
    </tr>
  </thead>
  <tbody>
    ${invoiceRows}
    <tr class="subtotal">
      <td colspan="3">Summe</td>
      <td class="amount">${formatCurrency(data.revenue_net_total)}</td>
      <td class="amount">${formatCurrency(data.vat_collected_total)}</td>
      <td class="amount">${formatCurrency(data.gross_total)}</td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
}
