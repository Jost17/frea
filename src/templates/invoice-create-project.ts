import { html } from "hono/html";
import type { InvoiceCreateProjectPreview } from "../db/invoice-queries";
import type { Client } from "../validation/schemas";
import { Button } from "./components/button";
import { EmptyState } from "./components/empty-state";
import { FormField } from "./components/form-field";
import { formatCurrency, formatDate } from "./invoice-shared";

export interface RenderInvoiceProjectSelectionArgs {
  client: Client;
  projectPreviews: InvoiceCreateProjectPreview[];
  today: string;
  paymentDays: number;
  vatRate: number;
  isKleinunternehmer: boolean;
}

export function renderInvoiceProjectSelection(args: RenderInvoiceProjectSelectionArgs) {
  const { client, projectPreviews, today, paymentDays, vatRate, isKleinunternehmer } = args;

  return html`
    <div class="max-w-3xl">
      <a href="/rechnungen/create" class="text-sm text-text-secondary hover:text-text-primary mb-4 inline-flex items-center">← Zurück</a>
      <h1 class="mb-2 text-2xl font-semibold">Neue Rechnung erstellen</h1>
      <p class="mb-6 text-sm text-text-secondary">Kunde: <strong>${client.name}</strong></p>

      ${
        projectPreviews.length === 0
          ? EmptyState({
              message: "Für diesen Kunden gibt es keine aktiven Projekte.",
            })
          : html`
            <div class="space-y-4">
              ${projectPreviews.map((preview) => {
                const { project, unbilledEntries, totalDays, netAmount, vatAmount, grossAmount } =
                  preview;
                return html`
                  <div class="rounded-lg border border-border-subtle bg-bg-surface p-6 shadow-card">
                    <div class="flex justify-between items-start mb-4">
                      <div>
                        <h2 class="text-lg font-semibold text-text-primary">${project.code} — ${project.name}</h2>
                        <p class="text-sm text-text-muted">Tagessatz: ${formatCurrency(project.daily_rate)} · ${unbilledEntries.length} offene Einträge</p>
                      </div>
                      <div class="text-right">
                        <p class="text-lg font-bold text-text-primary">${formatCurrency(grossAmount)}</p>
                        <p class="text-xs text-text-muted">${totalDays.toFixed(1)} Tage · Netto: ${formatCurrency(netAmount)}</p>
                      </div>
                    </div>

                    ${
                      unbilledEntries.length === 0
                        ? html`<p class="text-sm text-text-muted italic">Keine unberechneten Zeiteinträge.</p>`
                        : html`
                            <form method="post" action="/rechnungen/create" class="space-y-4">
                              <input type="hidden" name="client_id" value="${client.id}" />
                              <input type="hidden" name="project_id" value="${project.id}" />

                              <div class="grid grid-cols-2 gap-4">
                                ${FormField({
                                  type: "date",
                                  id: `invoice_date_${project.id}`,
                                  name: "invoice_date",
                                  label: "Rechnungsdatum",
                                  value: today,
                                  required: true,
                                })}
                                ${FormField({
                                  type: "number",
                                  id: `period_month_${project.id}`,
                                  name: "period_month",
                                  label: "Abrechnungsmonat",
                                  value: new Date().getMonth() + 1,
                                  attrs: 'min="1" max="12"',
                                  required: true,
                                })}
                              </div>

                              <div class="grid grid-cols-2 gap-4">
                                ${FormField({
                                  type: "number",
                                  id: `period_year_${project.id}`,
                                  name: "period_year",
                                  label: "Abrechnungsjahr",
                                  value: new Date().getFullYear(),
                                  attrs: 'min="2000" max="2099"',
                                  required: true,
                                })}
                                ${FormField({
                                  type: "text",
                                  id: `po_number_${project.id}`,
                                  name: "po_number",
                                  label: "Bestellnummer (optional)",
                                  placeholder: "z.B. PO-2026-001",
                                })}
                              </div>

                              <p class="text-xs text-text-muted">
                                Fälligkeit: Rechnungsdatum + ${paymentDays} Tage (aus den Stammdaten).
                              </p>

                              <div class="grid grid-cols-2 gap-4">
                                ${FormField({
                                  type: "date",
                                  id: `service_period_from_${project.id}`,
                                  name: "service_period_from",
                                  label: "Leistungszeitraum von",
                                })}
                                ${FormField({
                                  type: "date",
                                  id: `service_period_to_${project.id}`,
                                  name: "service_period_to",
                                  label: "Leistungszeitraum bis",
                                })}
                              </div>

                              <div class="border-t border-border-subtle pt-4">
                                <div class="flex items-center justify-between mb-2">
                                  <p class="text-sm font-medium text-text-primary">Abzurechnende Zeiteinträge</p>
                                  <label class="flex items-center gap-2 text-sm text-text-secondary">
                                    <input type="checkbox" id="select-all-${project.id}" onchange="toggleAllEntries(this, ${project.id}, ${vatRate}, ${isKleinunternehmer})" checked class="rounded border-border-medium" />
                                    Alle auswählen
                                  </label>
                                </div>
                                <div class="space-y-1 max-h-40 overflow-y-auto bg-bg-surface-raised rounded p-2">
                                  ${unbilledEntries.map(
                                    (entry) => html`
                                    <div class="flex justify-between items-center text-sm py-1 border-b border-border-subtle last:border-0">
                                      <label class="flex items-center gap-2 flex-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          name="time_entry_ids"
                                          value="${entry.id}"
                                          checked
                                          class="entry-checkbox rounded border-border-medium"
                                          data-project="${project.id}"
                                          data-net="${entry.netAmount}"
                                          data-vat="${entry.vatAmount}"
                                          data-gross="${entry.grossAmount}"
                                          onchange="updateInvoicePreview(${project.id}, ${vatRate}, ${isKleinunternehmer})"
                                        />
                                        <span class="text-text-primary">${formatDate(entry.date)} · ${entry.duration.toFixed(1)}h ${entry.description ? `— ${entry.description}` : ""}</span>
                                      </label>
                                      <span class="text-text-muted font-medium ml-4">${formatCurrency(entry.netAmount)}</span>
                                    </div>
                                  `,
                                  )}
                                </div>
                              </div>

                              <div class="flex justify-between items-center pt-4 border-t border-border-subtle">
                                <div class="text-sm text-text-secondary space-y-0.5">
                                  <p>Ausgewählt: <span id="preview-count-${project.id}">${unbilledEntries.length}</span> Einträge</p>
                                  <p>Netto: <span id="preview-net-${project.id}">${formatCurrency(netAmount)}</span></p>
                                  ${
                                    isKleinunternehmer
                                      ? html`<p class="text-accent-success">§19 UStG: Keine MwSt.</p>`
                                      : html`<p>MwSt (${(vatRate * 100).toFixed(0)}%): <span id="preview-vat-${project.id}">${formatCurrency(vatAmount)}</span></p>`
                                  }
                                  <p class="font-semibold text-text-primary">Brutto: <span id="preview-gross-${project.id}">${formatCurrency(grossAmount)}</span></p>
                                </div>
                                <div class="flex gap-3 items-center">
                                  ${Button({
                                    variant: "ghost",
                                    href: "/rechnungen/create",
                                    children: "Abbrechen",
                                  })}
                                  ${Button({
                                    variant: "primary",
                                    type: "submit",
                                    attrs: `data-create-invoice-submit="${project.id}"`,
                                    children: "Rechnung erstellen",
                                  })}
                                </div>
                              </div>
                            </form>
                          `
                    }
                  </div>
                `;
              })}
            </div>
          `
      }
    </div>
  `;
}
