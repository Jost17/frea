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
    <div class="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
      <table class="min-w-full divide-y divide-border-subtle text-sm">
        <thead class="bg-bg-surface-raised">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-text-secondary">Rechnungsnummer</th>
            <th class="px-4 py-3 text-left font-semibold text-text-secondary">Kunde</th>
            <th class="px-4 py-3 text-right font-semibold text-text-secondary">Betrag</th>
            <th class="px-4 py-3 text-center font-semibold text-text-secondary">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-text-secondary">Rechnungsdatum</th>
            <th class="px-4 py-3 text-right font-semibold text-text-secondary">Fällig</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle">
          ${invoices.map((inv) => {
            const isOverdue = inv.status === "sent" && inv.due_date < now;
            return html`
              <tr class="hover:bg-bg-surface-raised">
                <td class="px-4 py-3">
                  <a href="/rechnungen/${inv.id}" class="font-medium text-primary hover:underline focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">${inv.invoice_number}</a>
                </td>
                <td class="px-4 py-3 text-text-secondary">${inv.client_name}</td>
                <td class="px-4 py-3 text-right font-medium text-text-primary">${formatCurrency(inv.gross_amount)}</td>
                <td class="px-4 py-3 text-center">${statusBadge(inv.status)}</td>
                <td class="px-4 py-3 text-right text-text-secondary">${formatDate(inv.invoice_date)}</td>
                <td class="px-4 py-3 text-right text-text-secondary ${isOverdue ? "text-accent-danger font-medium" : ""}">${formatDate(inv.due_date)}${isOverdue ? " ⚠" : ""}</td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    </div>
  `;
}
