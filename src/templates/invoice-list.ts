import { html } from "hono/html";
import type { InvoiceListItem } from "../validation/schemas";
import { EmptyState } from "./components/empty-state";
import { InvoiceCard } from "./components/invoice-card";

export function renderInvoiceList(invoices: InvoiceListItem[], now: string) {
  if (invoices.length === 0) {
    return EmptyState({
      message:
        "Noch keine Rechnungen erstellt. Erfasse zuerst Zeiten für ein Projekt, dann kannst du eine Rechnung generieren.",
      actionHref: "/rechnungen/create",
      actionLabel: "Neue Rechnung erstellen",
    });
  }

  const cards = invoices.map((inv) => InvoiceCard({ invoice: inv, now }));

  return html`
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${cards}
    </div>
  `;
}
