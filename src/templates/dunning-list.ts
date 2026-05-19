import { html } from "hono/html";
import { Card } from "./components/card";
import { EmptyState } from "./components/empty-state";
import { Table, TableRow, Td } from "./components/table";
import { formatCurrency } from "./invoice-shared";

const DUNNING_COLUMNS = [
  { label: "Rechnungsnummer" },
  { label: "Kunde" },
  { label: "Betrag", align: "right" as const },
  { label: "Status" },
  { label: "Tage überfällig", align: "center" as const },
  { label: "Aktion", align: "center" as const },
];

export function renderDunningListPage(grouped: Record<number, any[]>) {
  const totalOverdue = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  if (totalOverdue === 0) {
    return EmptyState({
      message:
        "Keine überfälligen Rechnungen. Alle Rechnungen sind bezahlt oder noch nicht fällig.",
      actionHref: "/rechnungen",
      actionLabel: "Zu Rechnungen",
    });
  }

  const levelLabels: Record<number, string> = {
    0: "Unbezahlt - Keine Erinnerung",
    1: "Zahlungserinnerung gesendet",
    2: "1. Mahnung gesendet",
    3: "2. Mahnung mit Verzugszinsen",
  };

  const levels = [0, 1, 2, 3];

  return html`
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold">Mahnwesen</h1>
        <div class="text-sm text-text-secondary">
          Insgesamt <span class="font-medium">${totalOverdue}</span> überfällige Rechnungen
        </div>
      </div>

      ${levels
        .map((level) => {
          const invoices = grouped[level] || [];
          if (invoices.length === 0) return "";

          const rows = invoices.map((inv: any) =>
            TableRow({
              children: [
                Td({
                  children: html`<a href="/rechnungen/${inv.id}" class="font-medium text-primary hover:underline">${inv.invoice_number}</a>`,
                }),
                Td({ children: html`<span class="text-text-secondary">${inv.client_name}</span>` }),
                Td({
                  align: "right",
                  children: html`<span class="font-medium text-text-primary">${formatCurrency(inv.gross_amount)}</span>`,
                }),
                Td({
                  children: html`<span class="text-sm ${
                    level === 3 ? "font-medium text-accent-danger" : "text-text-secondary"
                  }">${inv.dunning_label}</span>`,
                }),
                Td({
                  align: "center",
                  children: html`<span class="inline-block rounded-full bg-accent-danger/10 px-2.5 py-1 text-xs font-medium text-accent-danger">${inv.days_overdue}</span>`,
                }),
                Td({
                  align: "center",
                  children:
                    level < 3
                      ? html`<button
                          hx-post="/mahnungen/${inv.id}/mahnung"
                          hx-confirm="Nächste Mahnstufe versenden?"
                          class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Mahnung
                        </button>`
                      : html`<span class="text-xs text-text-secondary">Maximalebene</span>`,
                }),
              ],
            }),
          );

          return Card({
            children: html`
              <div class="mb-4">
                <h2 class="font-semibold text-text-primary">${levelLabels[level]}</h2>
                <p class="text-sm text-text-secondary">
                  ${invoices.length} ${invoices.length === 1 ? "Rechnung" : "Rechnungen"}
                </p>
              </div>
              ${Table({ columns: DUNNING_COLUMNS, rows })}
            `,
          });
        })
        .join("")}
    </div>
  `;
}
