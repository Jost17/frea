import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { InvoiceListItem } from "../validation/schemas";
import { EmptyState } from "./components/empty-state";
import { Table, TableRow, Td } from "./components/table";
import { formatCurrency, formatDate, interactiveStatusBadge } from "./invoice-shared";

const INVOICE_COLUMNS = [
  { label: "Rechnungsnummer" },
  { label: "Kunde" },
  { label: "Betrag", align: "right" as const },
  { label: "Status", align: "center" as const },
  { label: "Rechnungsdatum", align: "right" as const },
  { label: "Fällig", align: "right" as const },
];

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

  const rows = invoices.map((inv) => {
    const isOverdue = inv.status === "sent" && inv.due_date < now;
    return TableRow({
      children: [
        Td({
          children: html`<a href="/rechnungen/${inv.id}" class="font-medium text-primary hover:underline">${inv.invoice_number}</a>`,
        }),
        Td({ children: html`<span class="text-text-secondary">${inv.client_name}</span>` }),
        Td({
          align: "right",
          children: html`<span class="font-medium text-text-primary">${formatCurrency(inv.gross_amount)}</span>`,
        }),
        Td({ align: "center", children: interactiveStatusBadge(inv.id, inv.status, isOverdue) }),
        Td({
          align: "right",
          children: html`<span class="text-text-secondary">${formatDate(inv.invoice_date)}</span>`,
        }),
        Td({
          align: "right",
          extraClass: isOverdue ? " text-accent-danger font-medium" : " text-text-secondary",
          children: html`${formatDate(inv.due_date)}${isOverdue ? html` ⚠` : ""}`,
        }),
      ],
    });
  });

  return html`
    ${renderInvoiceSummary(invoices, now)}
    ${Table({ columns: INVOICE_COLUMNS, rows })}
  `;
}
