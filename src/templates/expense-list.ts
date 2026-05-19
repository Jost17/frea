import { html } from "hono/html";
import type { Expense } from "../db/expense-queries";
import { EmptyState } from "./components/empty-state";
import { Table, TableRow, Td } from "./components/table";

const EXPENSE_COLUMNS = [
  { label: "Datum" },
  { label: "Kategorie" },
  { label: "Beschreibung" },
  { label: "Lieferant" },
  { label: "Netto", align: "right" as const },
  { label: "MwSt", align: "right" as const },
  { label: "Brutto", align: "right" as const },
  { label: "Beleg" },
  { label: "", align: "right" as const },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function categoryBadge(category: string) {
  return html`<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-bg-surface-raised text-text-secondary border border-border-subtle">${category}</span>`;
}

export function renderExpenseList(expenses: Expense[]) {
  if (expenses.length === 0) {
    return EmptyState({
      message: "Noch keine Ausgaben erfasst. Füge deine erste Ausgabe hinzu.",
      actionHref: "/ausgaben/create",
      actionLabel: "Ausgabe erfassen",
    });
  }

  const rows = expenses.map((exp) =>
    TableRow({
      children: [
        Td({ children: html`<span class="text-text-secondary">${formatDate(exp.date)}</span>` }),
        Td({ children: categoryBadge(exp.category) }),
        Td({
          children: html`<span class="font-medium text-text-primary">${exp.description}</span>`,
        }),
        Td({
          children: html`<span class="text-text-secondary">${exp.vendor || "—"}</span>`,
        }),
        Td({
          align: "right",
          children: html`<span class="text-text-secondary">${formatCurrency(exp.amount)}</span>`,
        }),
        Td({
          align: "right",
          children: html`<span class="text-text-muted text-xs">${(exp.vat_rate * 100).toFixed(0)} %</span>`,
        }),
        Td({
          align: "right",
          children: html`<span class="font-medium text-text-primary">${formatCurrency(exp.gross_amount)}</span>`,
        }),
        Td({
          children: exp.receipt_path
            ? html`<a href="/ausgaben/${exp.id}/beleg" class="text-xs text-primary hover:underline" target="_blank" rel="noopener noreferrer">Beleg</a>`
            : html`<span class="text-text-muted text-xs">—</span>`,
        }),
        Td({
          align: "right",
          children: html`
            <div class="flex items-center justify-end gap-2">
              <a href="/ausgaben/${exp.id}/edit" class="text-xs text-primary hover:underline">Bearbeiten</a>
              <form
                method="post"
                action="/ausgaben/${exp.id}/delete"
                onsubmit="return confirm('Ausgabe wirklich löschen?')"
              >
                <button
                  type="submit"
                  class="text-xs text-accent-danger hover:underline"
                >
                  Löschen
                </button>
              </form>
            </div>
          `,
        }),
      ],
    }),
  );

  return Table({ columns: EXPENSE_COLUMNS, rows });
}
