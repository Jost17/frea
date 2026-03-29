import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { AppError, logAndRespond } from "../middleware/error-handler";
import {
  getSettings,
  getClient,
  getInvoice,
  getInvoiceItems,
} from "../db/queries";

import { Layout } from "../templates/layout";

export const invoiceRoutes = new Hono<AppEnv>();

// List all invoices
invoiceRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");

    // For now, just show creation interface
    return c.html(
      Layout({
        title: "Rechnungen",
        activeNav: "rechnungen",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Rechnungen</h1>
            <a
              href="/rechnungen/create"
              class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Neue Rechnung
            </a>
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-6">
            <p class="text-gray-500">Rechnungsverwaltung folgt in Kürze.</p>
          </div>
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Rechnungen konnten nicht geladen werden", 500);
  }
});

// Create invoice (select time entries)
invoiceRoutes.get("/create", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const settings = getSettings();

    if (!settings) {
      throw new AppError("Firmeneinstellungen nicht initialisiert", 500);
    }

    return c.html(
      Layout({
        title: "Neue Rechnung",
        activeNav: "rechnungen",
        overdueCount,
        children: html`
          <div class="max-w-3xl">
            <h1 class="mb-6 text-2xl font-semibold">Neue Rechnung erstellen</h1>

            <form method="post" action="/rechnungen/create" class="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="invoice_date" class="block text-sm font-medium text-gray-700">Rechnungsdatum *</label>
                  <input
                    type="date"
                    id="invoice_date"
                    name="invoice_date"
                    required
                    value="${new Date().toISOString().split("T")[0]}"
                    class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label for="period_month" class="block text-sm font-medium text-gray-700">Abrechnungsmonat *</label>
                  <input
                    type="number"
                    id="period_month"
                    name="period_month"
                    required
                    min="1"
                    max="12"
                    value="${new Date().getMonth() + 1}"
                    class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label for="period_year" class="block text-sm font-medium text-gray-700">Abrechnungsjahr *</label>
                <input
                  type="number"
                  id="period_year"
                  name="period_year"
                  required
                  min="2000"
                  max="2099"
                  value="${new Date().getFullYear()}"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="po_number" class="block text-sm font-medium text-gray-700">Bestellnummer</label>
                  <input
                    type="text"
                    id="po_number"
                    name="po_number"
                    class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label for="service_period_from" class="block text-sm font-medium text-gray-700">Leistungszeitraum von</label>
                  <input
                    type="date"
                    id="service_period_from"
                    name="service_period_from"
                    class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label for="service_period_to" class="block text-sm font-medium text-gray-700">Leistungszeitraum bis</label>
                <input
                  type="date"
                  id="service_period_to"
                  name="service_period_to"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div class="border-t border-gray-200 pt-6">
                <h2 class="mb-4 font-semibold text-gray-900">Abrechenbare Zeiteinträge</h2>
                <p class="mb-4 text-sm text-gray-600">Diese werden nach Projekt gruppiert. Wähle die Einträge aus, die abgerechnet werden sollen.</p>

                ${/* Placeholder for time entry selection */html``}
              </div>

              <div class="flex justify-end gap-4 border-t border-gray-200 pt-6">
                <a href="/rechnungen" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"> Abbrechen </a>
                <button type="submit" class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Vorschau
                </button>
              </div>
            </form>
          </div>
        `,
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Formular konnte nicht geladen werden", 500);
  }
});

// View invoice
invoiceRoutes.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    const invoice = getInvoice(id);
    if (!invoice) throw new AppError("Rechnung nicht gefunden", 404);

    const items = getInvoiceItems(id);
    const client = getClient(invoice.client_id);
    const settings = getSettings();

    if (!client || !settings) throw new AppError("Daten fehlen", 500);

    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: `Rechnung ${invoice.invoice_number}`,
        activeNav: "rechnungen",
        overdueCount,
        children: html`
          <div class="max-w-4xl">
            <div class="mb-6 flex items-center justify-between">
              <h1 class="text-2xl font-semibold">Rechnung ${invoice.invoice_number}</h1>
              <span class="text-sm font-medium text-gray-600">Status: ${invoice.status}</span>
            </div>

            <div class="rounded-lg border border-gray-200 bg-white p-8">
              <!-- Header -->
              <div class="mb-8 grid grid-cols-2 gap-8">
                <div>
                  <p class="font-semibold text-gray-900">${settings.company_name}</p>
                  <p class="text-sm text-gray-600">${settings.address || ""}${settings.postal_code ? `, ${settings.postal_code}` : ""}</p>
                  <p class="text-sm text-gray-600">${settings.city || ""}</p>
                  <p class="mt-2 text-sm text-gray-600">
                    ${settings.email || ""}<br />
                    ${settings.phone || ""}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-600">Rechnungsnummer: ${invoice.invoice_number}</p>
                  <p class="text-sm text-gray-600">Rechnungsdatum: ${invoice.invoice_date}</p>
                  <p class="text-sm text-gray-600">Fälligkeitsdatum: ${invoice.due_date}</p>
                </div>
              </div>

              <!-- Customer -->
              <div class="mb-8 border-t border-gray-200 pt-6">
                <p class="text-sm font-semibold text-gray-700 uppercase">Rechnungsempfänger</p>
                <p class="font-semibold text-gray-900">${client.name}</p>
                <p class="text-sm text-gray-600">${client.address || ""}${client.postal_code ? `, ${client.postal_code}` : ""}</p>
                <p class="text-sm text-gray-600">${client.city || ""}</p>
              </div>

              <!-- Items table -->
              <div class="mb-8">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-300">
                      <th class="px-4 py-2 text-left font-semibold text-gray-700">Beschreibung</th>
                      <th class="px-4 py-2 text-right font-semibold text-gray-700">Tage/Std.</th>
                      <th class="px-4 py-2 text-right font-semibold text-gray-700">Satz</th>
                      <th class="px-4 py-2 text-right font-semibold text-gray-700">Netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map((item) => {
                      return html`
                        <tr class="border-b border-gray-100">
                          <td class="px-4 py-2 text-gray-900">${item.description}</td>
                          <td class="px-4 py-2 text-right text-gray-600">${item.days.toFixed(1)}</td>
                          <td class="px-4 py-2 text-right text-gray-600">${item.daily_rate.toFixed(2)} €</td>
                          <td class="px-4 py-2 text-right font-medium text-gray-900">${item.net_amount.toFixed(2)} €</td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>

              <!-- Totals -->
              <div class="mb-8 flex justify-end">
                <div class="w-64 space-y-2 border-t border-gray-200 pt-4">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Nettosumme:</span>
                    <span class="font-medium text-gray-900">${invoice.net_amount.toFixed(2)} €</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">MwSt (${(settings.vat_rate * 100).toFixed(0)}%):</span>
                    <span class="font-medium text-gray-900">${invoice.vat_amount.toFixed(2)} €</span>
                  </div>
                  <div class="flex justify-between border-t border-gray-200 pt-2 text-lg">
                    <span class="font-semibold text-gray-900">Gesamtbetrag:</span>
                    <span class="font-bold text-gray-900">${invoice.gross_amount.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="border-t border-gray-200 pt-6 text-xs text-gray-500">
                <p>Zahlungsbedingungen: Netto ${settings.payment_days} Tage</p>
                ${settings.bank_name ? html`<p>Kontoinhaber: ${settings.bank_name}</p>` : ""}
                ${settings.iban ? html`<p>IBAN: ${settings.iban}</p>` : ""}
                ${settings.bic ? html`<p>BIC: ${settings.bic}</p>` : ""}
                ${settings.tax_number ? html`<p>Steuernummer: ${settings.tax_number}</p>` : ""}
                ${settings.ust_id ? html`<p>Ust-IdNr.: ${settings.ust_id}</p>` : ""}
              </div>
            </div>
          </div>
        `,
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Rechnung konnte nicht geladen werden", 500);
  }
});
