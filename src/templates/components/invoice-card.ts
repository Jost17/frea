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
      class="group rounded-lg border border-border-subtle bg-bg-surface p-6 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer"
      onclick="window.location.href='/rechnungen/${invoice.id}'"
    >
      <div class="mb-1">
        <a
          href="/rechnungen/${invoice.id}"
          class="text-lg font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:rounded"
          onclick="event.stopPropagation()"
        >${invoice.invoice_number}</a>
      </div>

      <p class="mb-4 text-sm text-text-secondary">${invoice.client_name}</p>

      <p class="mb-4 text-2xl font-bold text-primary tabular-nums">${formatCurrency(invoice.gross_amount)}</p>

      <div class="flex items-center justify-between gap-2">
        <div>${statusBadge(invoice.status)}</div>
        <p class="text-xs ${isOverdue ? "text-accent-danger font-medium" : "text-text-muted"} tabular-nums">
          ${formatDate(invoice.due_date)}${isOverdue ? html` ⚠` : ""}
        </p>
      </div>
    </article>
  `;
}
