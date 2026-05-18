import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { InvoiceListItem } from "../validation/schemas";
import { EmptyState } from "./components/empty-state";
import { InvoiceCard } from "./components/invoice-card";

export function renderInvoiceSummary(
  invoices: InvoiceListItem[],
  now: string,
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const waiting = invoices.filter((inv) => inv.status === "sent").length;
  const overdue = invoices.filter((inv) => inv.status === "sent" && inv.due_date < now).length;

  const parts: string[] = [];
  if (waiting > 0)
    parts.push(`${waiting} ${waiting === 1 ? "Rechnung wartet" : "Rechnungen warten"} auf Zahlung`);
  if (overdue > 0) parts.push(`${overdue} überfällig`);

  if (parts.length === 0) return html`<div id="invoice-summary"></div>`;

  return html`<div
    id="invoice-summary"
    class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
  >
    ${parts.join(" · ")}
  </div>`;
}

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
    ${renderInvoiceSummary(invoices, now)}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${cards}
    </div>
  `;
}
