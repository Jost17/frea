import { html } from "hono/html";
import type { InvoiceListItem } from "../validation/schemas";
import { EmptyState } from "./components/empty-state";
import { formatCurrency, formatDate, statusBadge } from "./invoice-shared";

export function renderInvoiceList(invoices: InvoiceListItem[], now: string) {
  if (invoices.length === 0) {
    return EmptyState({
      message:
        "Noch keine Rechnungen erstellt. Erfasse zuerst Zeiten für ein Projekt, dann kannst du eine Rechnung generieren.",
      actionHref: "/rechnungen/create",
      actionLabel: "Neue Rechnung erstellen",
    });
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
