import { html } from "hono/html";
import type { Client, Quote, QuoteItem, Settings } from "../validation/schemas";
import { Button } from "./components/button";
import { Table, TableRow, Td } from "./components/table";
import { formatCurrency, formatDate, parseInvoiceLayoutConfig } from "./invoice-shared";

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

interface QuoteDetailProps {
  quote: Quote;
  items: QuoteItem[];
  client: Client;
  settings: Settings;
}

export function renderQuoteDetail({ quote, items, client, settings }: QuoteDetailProps) {
  const config = parseInvoiceLayoutConfig(settings);
  const isKleinunternehmer = Boolean(settings.kleinunternehmer);
  const effectiveVatRate = isKleinunternehmer ? 0 : settings.vat_rate;
  const accent = config.accent_color;

  const itemColumns = [
    { label: "Nr." },
    { label: "Beschreibung" },
    { label: "Menge", align: "right" as const },
    { label: "Einheit" },
    { label: "Einzelpreis", align: "right" as const },
    { label: "Netto", align: "right" as const },
    { label: `MwSt ${(effectiveVatRate * 100).toFixed(0)}%`, align: "right" as const },
    { label: "Brutto", align: "right" as const },
  ];

  const itemRows = items.map((item, i) => {
    const vatCell =
      item.vat_rate > 0
        ? Td({ align: "right", children: html`${formatCurrency(item.vat_amount)}` })
        : Td({ align: "right", extraClass: " italic text-text-muted", children: "0,00 €" });

    return TableRow({
      children: [
        Td({ children: html`<span class="text-text-secondary">${i + 1}</span>` }),
        Td({ children: html`<span class="text-text-primary">${item.description}</span>` }),
        Td({
          align: "right",
          children: html`<span class="text-text-secondary">${item.quantity.toFixed(2)}</span>`,
        }),
        Td({ children: html`<span class="text-text-secondary">${item.unit}</span>` }),
        Td({
          align: "right",
          children: html`<span class="text-text-secondary">${formatCurrency(item.unit_price)}</span>`,
        }),
        Td({
          align: "right",
          children: html`<span class="font-medium text-text-primary">${formatCurrency(item.net_amount)}</span>`,
        }),
        vatCell,
        Td({
          align: "right",
          children: html`<span class="font-medium text-text-primary">${formatCurrency(item.gross_amount)}</span>`,
        }),
      ],
    });
  });

  const canSend = quote.status === "draft";
  const canAccept = quote.status === "draft" || quote.status === "sent";
  const canReject = quote.status === "draft" || quote.status === "sent";
  const canConvert = quote.status === "accepted" && !quote.converted_invoice_id;
  const alreadyConverted = !!quote.converted_invoice_id;

  return html`
    <div class="max-w-4xl mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-semibold">Angebot ${quote.quote_number}</h1>
          ${quoteStatusBadge(quote.status)}
        </div>
        <div class="flex flex-wrap gap-2">
          ${
            canSend
              ? html`
                <form method="post" action="/angebote/${quote.id}/status" class="inline">
                  <input type="hidden" name="status" value="sent" />
                  <button type="submit" class="rounded-md px-4 py-2 text-sm font-medium text-white" style="background-color: ${accent}">
                    Als versendet markieren
                  </button>
                </form>
              `
              : ""
          }
          ${
            canAccept
              ? html`
                <form method="post" action="/angebote/${quote.id}/status" class="inline">
                  <input type="hidden" name="status" value="accepted" />
                  ${Button({ variant: "primary", type: "submit", children: "Angenommen" })}
                </form>
              `
              : ""
          }
          ${
            canReject
              ? html`
                <form method="post" action="/angebote/${quote.id}/status" class="inline">
                  <input type="hidden" name="status" value="rejected" />
                  <button type="submit" class="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-accent-danger hover:bg-red-50">
                    Abgelehnt
                  </button>
                </form>
              `
              : ""
          }
          ${
            canConvert
              ? html`
                <form method="post" action="/angebote/${quote.id}/konvertieren" class="inline">
                  <button
                    type="submit"
                    class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    onclick="return confirm('Angebot in Rechnung umwandeln? Dies kann nicht rückgängig gemacht werden.')"
                  >
                    → Rechnung erstellen
                  </button>
                </form>
              `
              : ""
          }
          ${
            alreadyConverted
              ? html`
                <a
                  href="/rechnungen/${quote.converted_invoice_id}"
                  class="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-primary hover:bg-bg-surface-raised"
                >
                  Zur Rechnung →
                </a>
              `
              : ""
          }
        </div>
      </div>

      <div class="rounded-lg border border-border-subtle bg-bg-surface p-8" style="border-top: 4px solid ${accent}">
        <div class="mb-8 flex justify-between">
          <div>
            <p class="text-xs text-text-muted mb-1">Angebotssteller:</p>
            <p class="font-semibold text-text-primary">${settings.company_name}</p>
            <p class="text-sm text-text-secondary">${settings.address || ""}</p>
            <p class="text-sm text-text-secondary">${settings.postal_code ? `${settings.postal_code} ` : ""}${settings.city || ""}</p>
          </div>
          <div class="text-right text-sm text-text-secondary">
            <p>Angebotsnummer: <strong class="text-text-primary">${quote.quote_number}</strong></p>
            <p>Erstellt am: ${formatDate(quote.created_at.split("T")[0])}</p>
            ${quote.valid_until ? html`<p>Gültig bis: <strong>${formatDate(quote.valid_until)}</strong></p>` : ""}
          </div>
        </div>

        <div class="mb-8 border-t border-border-subtle pt-6">
          <p class="text-xs text-text-muted mb-1">Empfänger:</p>
          <p class="font-semibold text-text-primary">${client.name}</p>
          <p class="text-sm text-text-secondary">${client.address || ""}</p>
          <p class="text-sm text-text-secondary">${client.postal_code ? `${client.postal_code} ` : ""}${client.city || ""}</p>
          ${client.vat_id ? html`<p class="text-sm text-text-muted mt-1">USt-IdNr.: ${client.vat_id}</p>` : ""}
        </div>

        ${
          quote.subject
            ? html`
              <div class="mb-6">
                <p class="text-xs text-text-muted mb-1">Betreff:</p>
                <p class="font-semibold text-text-primary">${quote.subject}</p>
              </div>
            `
            : ""
        }

        <div class="mb-8 overflow-x-auto">
          ${Table({ columns: itemColumns, rows: itemRows })}
        </div>

        <div class="mb-8 flex justify-end">
          <div class="w-72 space-y-2 border-t border-border-subtle pt-4">
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Zwischensumme (Netto):</span>
              <span class="font-medium text-text-primary">${formatCurrency(quote.net_amount)}</span>
            </div>
            ${
              effectiveVatRate > 0
                ? html`
                  <div class="flex justify-between text-sm">
                    <span class="text-text-secondary">MwSt (${(effectiveVatRate * 100).toFixed(0)}%):</span>
                    <span class="font-medium text-text-primary">${formatCurrency(quote.vat_amount)}</span>
                  </div>
                `
                : ""
            }
            ${
              isKleinunternehmer
                ? html`<p class="text-sm text-accent-success italic">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>`
                : ""
            }
            <div class="flex justify-between border-t border-border-subtle pt-2 text-lg">
              <span class="font-semibold text-text-primary">Gesamtbetrag:</span>
              <span class="font-bold text-text-primary">${formatCurrency(quote.gross_amount)}</span>
            </div>
          </div>
        </div>

        ${
          quote.notes
            ? html`
              <div class="border-t border-border-subtle pt-6">
                <p class="text-xs text-text-muted mb-1">Notizen / Bedingungen:</p>
                <p class="text-sm text-text-secondary whitespace-pre-wrap">${quote.notes}</p>
              </div>
            `
            : ""
        }

        <div class="border-t border-border-subtle pt-6 text-xs text-text-muted space-y-1">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="font-medium text-text-secondary">Angebotssteller:</p>
              <p>${settings.company_name} · ${settings.address || ""} · ${settings.postal_code || ""} ${settings.city || ""}</p>
              ${config.show_tax_number && settings.ust_id ? html`<p>USt-IdNr.: ${settings.ust_id}</p>` : ""}
              ${config.show_tax_number && settings.tax_number ? html`<p>Steuernummer: ${settings.tax_number}</p>` : ""}
            </div>
            <div>
              <p class="font-medium text-text-secondary">Bankverbindung:</p>
              ${config.show_bank_details && settings.bank_name ? html`<p>Kontoinhaber: ${settings.bank_name}</p>` : ""}
              ${config.show_bank_details && settings.iban ? html`<p>IBAN: ${settings.iban}</p>` : ""}
              ${config.show_bank_details && settings.bic ? html`<p>BIC: ${settings.bic}</p>` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
