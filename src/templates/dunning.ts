import { html } from "hono/html";
import type { DunnableInvoice, DunningLevel } from "../validation/schemas";

const LEVEL_LABELS: Record<number, string> = {
  0: "Keine",
  1: "Erinnerung",
  2: "1. Mahnung",
  3: "2. Mahnung",
};

const NEXT_LEVEL_LABELS: Record<number, string> = {
  0: "Erinnerung",
  1: "1. Mahnung",
  2: "Letzte Mahnung",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

function levelBadge(level: number) {
  if (level === 0)
    return html`<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-bg-surface-raised text-text-muted">Keine</span>`;
  if (level === 1)
    return html`<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Erinnerung</span>`;
  if (level === 2)
    return html`<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">1. Mahnung</span>`;
  return html`<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Letzte Mahnung</span>`;
}

export function renderDunningOverview(invoices: DunnableInvoice[]) {
  const eligible = invoices.filter(
    (inv) => inv.next_days_threshold !== null && inv.days_overdue >= inv.next_days_threshold,
  );
  const pending = invoices.filter(
    (inv) => inv.next_days_threshold === null || inv.days_overdue < inv.next_days_threshold,
  );

  const rows = (list: DunnableInvoice[], showAction: boolean) =>
    list.map(
      (inv) => html`
        <tr class="border-b border-border-subtle hover:bg-bg-surface-raised transition-colors">
          <td class="px-4 py-3 text-sm font-medium">
            <a href="/rechnungen/${inv.id}" class="text-primary hover:underline">
              ${inv.invoice_number}
            </a>
          </td>
          <td class="px-4 py-3 text-sm text-text-secondary">${inv.client_name}</td>
          <td class="px-4 py-3 text-sm text-text-secondary">${formatDate(inv.due_date)}</td>
          <td class="px-4 py-3 text-sm text-accent-danger font-medium">${inv.days_overdue} Tage</td>
          <td class="px-4 py-3 text-sm font-medium text-right">${formatCurrency(inv.gross_amount)}</td>
          <td class="px-4 py-3 text-sm">${levelBadge(inv.reminder_level)}</td>
          <td class="px-4 py-3 text-sm text-text-secondary">
            ${inv.next_fee !== null && inv.next_fee > 0 ? formatCurrency(inv.next_fee) : "–"}
          </td>
          <td class="px-4 py-3 text-sm text-right">
            ${
              showAction
                ? html`
                    <form method="post" action="/mahnwesen/${inv.id}/mahnen" class="inline">
                      <button
                        type="submit"
                        class="rounded-md bg-accent-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                        onclick="return confirm('${NEXT_LEVEL_LABELS[inv.reminder_level] ?? "Mahnung"} für Rechnung ${inv.invoice_number} auslösen?')"
                      >
                        ${NEXT_LEVEL_LABELS[inv.reminder_level] ?? "Mahnen"} auslösen
                      </button>
                    </form>
                  `
                : html`<span class="text-text-muted text-xs">
                    Fällig in ${(inv.next_days_threshold ?? 0) - inv.days_overdue} Tagen
                  </span>`
            }
          </td>
        </tr>
      `,
    );

  const tableHead = html`
    <thead>
      <tr class="border-b border-border-subtle bg-bg-surface-raised text-left text-xs font-medium text-text-muted uppercase">
        <th class="px-4 py-3">Rechnung</th>
        <th class="px-4 py-3">Kunde</th>
        <th class="px-4 py-3">Fällig am</th>
        <th class="px-4 py-3">Überfällig</th>
        <th class="px-4 py-3 text-right">Betrag</th>
        <th class="px-4 py-3">Aktuell</th>
        <th class="px-4 py-3">Mahngebühr</th>
        <th class="px-4 py-3 text-right">Aktion</th>
      </tr>
    </thead>
  `;

  return html`
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Mahnwesen</h1>
      <a
        href="/einstellungen/mahnwesen"
        class="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface-raised transition-colors"
      >
        Mahneinstellungen
      </a>
    </div>

    ${
      invoices.length === 0
        ? html`
            <div class="rounded-lg border border-border-subtle bg-bg-surface p-12 text-center">
              <p class="text-text-muted text-sm">Keine überfälligen Rechnungen — alles im grünen Bereich.</p>
            </div>
          `
        : html`
            ${
              eligible.length > 0
                ? html`
                    <div class="mb-6">
                      <h2 class="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <span class="inline-block h-2 w-2 rounded-full bg-accent-danger"></span>
                        Mahnfähig (${eligible.length})
                      </h2>
                      <div class="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
                        <table class="w-full">
                          ${tableHead}
                          <tbody>
                            ${rows(eligible, true)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  `
                : ""
            }
            ${
              pending.length > 0
                ? html`
                    <div>
                      <h2 class="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <span class="inline-block h-2 w-2 rounded-full bg-yellow-400"></span>
                        Ausstehend – noch nicht mahnfähig (${pending.length})
                      </h2>
                      <div class="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
                        <table class="w-full">
                          ${tableHead}
                          <tbody>
                            ${rows(pending, false)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  `
                : ""
            }
          `
    }
  `;
}

export function renderDunningSettings(
  levels: DunningLevel[],
  successMsg: string | null = null,
  errorMsg: string | null = null,
) {
  const levelTitles = ["Erinnerung (Stufe 1)", "1. Mahnung (Stufe 2)", "Letzte Mahnung (Stufe 3)"];

  return html`
    <div class="flex items-center justify-between mb-6">
      <div>
        <a href="/mahnwesen" class="text-sm text-text-muted hover:text-primary mb-1 inline-block">← Mahnwesen</a>
        <h1 class="text-2xl font-semibold">Mahneinstellungen</h1>
      </div>
    </div>

    ${successMsg ? html`<div class="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">${successMsg}</div>` : ""}
    ${errorMsg ? html`<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">${errorMsg}</div>` : ""}

    <p class="text-sm text-text-secondary mb-6">
      Konfigurieren Sie die drei Mahnstufen. Verfügbare Platzhalter im Betreff und Text:
      <code class="text-xs bg-bg-surface-raised px-1 rounded">{'{invoice_number}'}</code>,
      <code class="text-xs bg-bg-surface-raised px-1 rounded">{'{invoice_date}'}</code>,
      <code class="text-xs bg-bg-surface-raised px-1 rounded">{'{gross_amount}'}</code>,
      <code class="text-xs bg-bg-surface-raised px-1 rounded">{'{new_due_date}'}</code>,
      <code class="text-xs bg-bg-surface-raised px-1 rounded">{'{total_with_fee}'}</code>.
    </p>

    <form method="post" action="/einstellungen/mahnwesen" class="space-y-6">
      ${levels.map(
        (level, idx) => html`
          <div class="rounded-lg border border-border-subtle bg-bg-surface p-6">
            <h2 class="text-base font-semibold mb-4">${levelTitles[idx]}</h2>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label for="level${level.level}_days" class="block text-sm font-medium text-text-secondary mb-1">
                  Tage nach Fälligkeit
                </label>
                <input
                  type="number"
                  id="level${level.level}_days"
                  name="level${level.level}_days"
                  value="${level.days_after_due}"
                  min="1"
                  required
                  class="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label for="level${level.level}_fee" class="block text-sm font-medium text-text-secondary mb-1">
                  Mahngebühr (€)
                </label>
                <input
                  type="number"
                  id="level${level.level}_fee"
                  name="level${level.level}_fee"
                  value="${level.fee_amount.toFixed(2)}"
                  min="0"
                  step="0.01"
                  required
                  class="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div class="mb-4">
              <label for="level${level.level}_subject" class="block text-sm font-medium text-text-secondary mb-1">
                Betreff
              </label>
              <input
                type="text"
                id="level${level.level}_subject"
                name="level${level.level}_subject"
                value="${level.subject}"
                class="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label for="level${level.level}_body" class="block text-sm font-medium text-text-secondary mb-1">
                Mahntext
              </label>
              <textarea
                id="level${level.level}_body"
                name="level${level.level}_body"
                rows="6"
                class="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              >${level.body}</textarea>
            </div>
          </div>
        `,
      )}
      <div class="flex justify-end">
        <button
          type="submit"
          class="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Einstellungen speichern
        </button>
      </div>
    </form>
  `;
}

export function renderDunningHistorySection(
  runs: Array<{ level: number; sent_at: string; fee_amount: number }>,
) {
  if (runs.length === 0) return html``;

  return html`
    <div class="mt-6 rounded-lg border border-border-subtle bg-bg-surface p-4">
      <h3 class="text-sm font-semibold text-text-primary mb-3">Mahnhistorie</h3>
      <ul class="space-y-2">
        ${runs.map(
          (run) => html`
            <li class="flex items-center justify-between text-sm">
              <span class="text-text-secondary">
                ${LEVEL_LABELS[run.level] ?? `Stufe ${run.level}`} –
                ${formatDate(run.sent_at.split("T")[0] ?? run.sent_at)}
              </span>
              ${
                run.fee_amount > 0
                  ? html`<span class="text-text-muted">${formatCurrency(run.fee_amount)} Gebühr</span>`
                  : html`<span class="text-text-muted">Keine Gebühr</span>`
              }
            </li>
          `,
        )}
      </ul>
    </div>
  `;
}
