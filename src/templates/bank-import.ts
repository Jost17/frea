import { html } from "hono/html";
import type { MatchReport, MatchResult, UnmatchedTransaction } from "../lib/bank-import/matcher";

function confidenceBadge(c: MatchResult["confidence"]) {
  if (c === "high") {
    return html`<span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">Sicher</span>`;
  }
  if (c === "medium") {
    return html`<span class="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-300">Wahrscheinlich</span>`;
  }
  return html`<span class="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-orange-800 dark:text-orange-300">Möglich</span>`;
}

export function renderBankImportPage() {
  return html`
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Kontoauszug importieren</h1>
    </div>

    <div class="bg-bg-surface rounded-lg border border-border-subtle p-6 max-w-2xl">
      <p class="text-sm text-text-secondary mb-4">
        Importiere einen Kontoauszug im CAMT.053-Format (XML) oder als CSV-Export deiner Bank.
        Offene Rechnungen werden automatisch als <strong>bezahlt</strong> markiert, wenn Betrag
        oder Rechnungsnummer übereinstimmen.
      </p>

      <form
        hx-post="/bank-import/parse"
        hx-target="#import-result"
        hx-swap="innerHTML"
        hx-encoding="multipart/form-data"
        hx-indicator="#parse-spinner"
        class="space-y-4"
      >
        <div>
          <label for="bank-file" class="block text-sm font-medium text-text-primary mb-1">
            Kontoauszug (CAMT.053 XML oder CSV)
          </label>
          <input
            id="bank-file"
            name="file"
            type="file"
            accept=".xml,.csv,.txt"
            required
            class="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-blue-700 cursor-pointer"
          />
        </div>

        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <span id="parse-spinner" class="htmx-indicator">
            <i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i>
          </span>
          Analysieren
        </button>
      </form>
    </div>

    <div id="import-result" class="mt-6"></div>
  `;
}

export function renderMatchPreview(report: MatchReport, format: string) {
  const { matched, unmatched } = report;

  if (matched.length === 0 && unmatched.length === 0) {
    return html`
      <div class="bg-bg-surface rounded-lg border border-border-subtle p-6 max-w-2xl">
        <p class="text-sm text-text-secondary">Keine verwertbaren Transaktionen gefunden. Bitte prüfe das Dateiformat.</p>
      </div>
    `;
  }

  return html`
    <div class="space-y-6">
      <div class="text-sm text-text-secondary">
        Format erkannt: <strong>${format}</strong> ·
        ${matched.length} Treffer · ${unmatched.length} ohne Zuordnung
      </div>

      ${
        matched.length > 0
          ? html`
        <form hx-post="/bank-import/confirm" hx-target="#import-result" hx-swap="innerHTML">
          <div class="bg-bg-surface rounded-lg border border-border-subtle overflow-hidden mb-4">
            <div class="px-4 py-3 border-b border-border-subtle bg-bg-surface-raised">
              <h2 class="text-sm font-semibold">Gefundene Übereinstimmungen</h2>
            </div>
            <div class="divide-y divide-border-subtle">
              ${matched.map(
                (m) => html`
                <label class="flex items-start gap-3 px-4 py-3 hover:bg-bg-surface-raised cursor-pointer">
                  <input
                    type="checkbox"
                    name="invoice_ids"
                    value="${m.invoice.id}"
                    checked
                    class="mt-0.5 h-4 w-4 rounded border-border-subtle text-primary"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-medium text-sm">${m.invoice.invoice_number}</span>
                      <span class="text-text-secondary text-sm">${m.invoice.client_name}</span>
                      ${confidenceBadge(m.confidence)}
                    </div>
                    <div class="text-xs text-text-muted mt-0.5">${m.reason}</div>
                    <div class="text-xs text-text-muted">
                      Transaktion: ${m.transaction.date} · ${m.transaction.amount.toFixed(2)} € ·
                      ${m.transaction.counterparty || "–"}
                    </div>
                  </div>
                  <div class="text-sm font-semibold text-text-primary shrink-0">
                    ${m.invoice.gross_amount.toFixed(2)} €
                  </div>
                </label>
              `,
              )}
            </div>
          </div>

          <button
            type="submit"
            class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Ausgewählte als bezahlt markieren
          </button>
        </form>
        `
          : ""
      }

      ${
        unmatched.length > 0
          ? html`
        <div class="bg-bg-surface rounded-lg border border-border-subtle overflow-hidden">
          <div class="px-4 py-3 border-b border-border-subtle bg-bg-surface-raised">
            <h2 class="text-sm font-semibold text-text-muted">Keine Zuordnung möglich (${unmatched.length})</h2>
          </div>
          <div class="divide-y divide-border-subtle">
            ${unmatched.map(
              (u: UnmatchedTransaction) => html`
              <div class="px-4 py-3 text-sm text-text-muted">
                ${u.transaction.date} · ${u.transaction.amount.toFixed(2)} € ·
                ${u.transaction.counterparty || "–"} ·
                <span class="truncate">${u.transaction.purpose.slice(0, 80)}</span>
              </div>
            `,
            )}
          </div>
        </div>
        `
          : ""
      }
    </div>
  `;
}

export function renderImportSuccess(count: number) {
  return html`
    <div class="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4 max-w-2xl">
      <div class="flex items-center gap-2">
        <i data-lucide="check-circle" class="h-5 w-5 text-green-600 dark:text-green-400"></i>
        <p class="text-sm font-medium text-green-800 dark:text-green-300">
          ${count} Rechnung${count !== 1 ? "en" : ""} als bezahlt markiert.
        </p>
      </div>
      <a href="/rechnungen" class="mt-2 block text-sm text-green-700 dark:text-green-400 underline">
        Zur Rechnungsübersicht
      </a>
    </div>
  `;
}
