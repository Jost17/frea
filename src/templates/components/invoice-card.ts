import { html } from "hono/html";
import type { InvoiceListItem } from "../../validation/schemas";
import { formatCurrency, formatDate, statusBadge } from "../invoice-shared";

export interface InvoiceCardProps {
  invoice: InvoiceListItem;
  now: string;
}

export function InvoiceCard({ invoice, now }: InvoiceCardProps) {
  const isOverdue = invoice.status === "sent" && invoice.due_date < now;

  return html`
    <article
      class="group rounded-lg border border-border-subtle bg-bg-surface p-6 transition-all duration-300 hover:shadow-card-hover hover:scale-105 cursor-pointer"
      onclick="window.location.href='/rechnungen/${invoice.id}'"
      role="link"
      tabindex="0"
      @keydown.enter="window.location.href='/rechnungen/${invoice.id}'"
    >
      <!-- Rechnungsnummer (Headline) -->
      <div class="mb-2">
        <a href="/rechnungen/${invoice.id}" class="text-lg font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:rounded">${invoice.invoice_number}</a>
      </div>

      <!-- Kundenname + Info (Secondary) -->
      <div class="mb-4">
        <p class="text-sm text-text-secondary">${invoice.client_name}</p>
      </div>

      <!-- Betrag (Visual Emphasis) -->
      <div class="mb-4">
        <p class="text-2xl font-bold text-primary">${formatCurrency(invoice.gross_amount)}</p>
      </div>

      <!-- Status + Fällig-Datum (Footer) -->
      <div class="flex items-center justify-between gap-2">
        <div>${statusBadge(invoice.status)}</div>
        <p class="text-xs ${isOverdue ? "text-accent-danger font-medium" : "text-text-muted"}">
          ${formatDate(invoice.due_date)}${isOverdue ? html` <span>⚠</span>` : ""}
        </p>
      </div>
    </article>
  `;
}
