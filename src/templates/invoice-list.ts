import { html } from "hono/html";
import type { InvoiceListItem } from "../validation/schemas";
import { EmptyState } from "./components/empty-state";
import { Table, TableRow, Td } from "./components/table";
import { formatCurrency, formatDate, statusBadge } from "./invoice-shared";

const INVOICE_COLUMNS = [
  { label: "Rechnungsnummer" },
  { label: "Kunde" },
  { label: "Betrag", align: "right" as const },
  { label: "Status", align: "center" as const },
  { label: "Rechnungsdatum", align: "right" as const },
  { label: "Fällig", align: "right" as const },
];

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
        Td({ align: "center", children: statusBadge(inv.status) }),
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

  return Table({ columns: INVOICE_COLUMNS, rows });
}
