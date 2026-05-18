import { html } from "hono/html";
import type { QuoteListItem } from "../validation/schemas";
import { EmptyState } from "./components/empty-state";
import { Table, TableRow, Td } from "./components/table";
import { formatCurrency, formatDate } from "./invoice-shared";

const QUOTE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Entwurf", className: "bg-gray-100 text-gray-700" },
  sent: { label: "Versendet", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Angenommen", className: "bg-green-100 text-green-700" },
  rejected: { label: "Abgelehnt", className: "bg-red-100 text-red-700" },
};

function quoteStatusBadge(status: string) {
  const fallback = { label: status, className: "bg-gray-100 text-gray-700" };
  const { label, className } = QUOTE_STATUS_BADGE[status] ?? fallback;
  return html`<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}">${label}</span>`;
}

const COLUMNS = [
  { label: "Angebotsnummer" },
  { label: "Kunde" },
  { label: "Betreff" },
  { label: "Betrag", align: "right" as const },
  { label: "Status", align: "center" as const },
  { label: "Gültig bis", align: "right" as const },
  { label: "Erstellt", align: "right" as const },
];

export function renderQuoteList(quotes: QuoteListItem[]) {
  if (quotes.length === 0) {
    return EmptyState({
      message: "Noch keine Angebote erstellt. Erstelle dein erstes Angebot.",
      actionHref: "/angebote/neu",
      actionLabel: "Neues Angebot erstellen",
    });
  }

  const rows = quotes.map((q) => {
    return TableRow({
      children: [
        Td({
          children: html`<a href="/angebote/${q.id}" class="font-medium text-primary hover:underline">${q.quote_number}</a>`,
        }),
        Td({ children: html`<span class="text-text-secondary">${q.client_name}</span>` }),
        Td({ children: html`<span class="text-text-primary">${q.subject}</span>` }),
        Td({
          align: "right",
          children: html`<span class="font-medium text-text-primary">${formatCurrency(q.gross_amount)}</span>`,
        }),
        Td({ align: "center", children: quoteStatusBadge(q.status) }),
        Td({
          align: "right",
          children: html`<span class="text-text-secondary">${q.valid_until ? formatDate(q.valid_until) : "—"}</span>`,
        }),
        Td({
          align: "right",
          children: html`<span class="text-text-secondary">${formatDate(q.created_at.split("T")[0])}</span>`,
        }),
      ],
    });
  });

  return Table({ columns: COLUMNS, rows });
}
