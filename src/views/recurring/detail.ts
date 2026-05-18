import { html } from "hono/html";
import type {
  RecurringTemplateItem,
  RecurringTemplateWithClient,
} from "../../recurring/repository";

const INTERVAL_LABELS: Record<string, string> = {
  monthly: "Monatlich",
  quarterly: "Vierteljährlich",
  yearly: "Jährlich",
};

interface DetailProps {
  template: RecurringTemplateWithClient;
  items: RecurringTemplateItem[];
  flash?: string;
}

export function renderRecurringDetail({
  template,
  items,
  flash,
}: DetailProps): ReturnType<typeof html> {
  const isActive = Boolean(template.active);

  return html`
    ${flash ? html`<div class="mb-6 rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-700">${flash}</div>` : ""}

    <div class="space-y-6 max-w-2xl">
      <!-- Meta -->
      <div class="rounded-lg border border-border-subtle bg-bg-surface p-5">
        <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt class="text-text-muted">Kunde</dt>
            <dd class="font-medium text-text-primary mt-0.5">${template.client_name}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Status</dt>
            <dd class="mt-0.5">
              ${
                isActive
                  ? html`<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Aktiv</span>`
                  : html`<span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Inaktiv</span>`
              }
            </dd>
          </div>
          <div>
            <dt class="text-text-muted">Intervall</dt>
            <dd class="font-medium text-text-primary mt-0.5">${INTERVAL_LABELS[template.interval] ?? template.interval}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Nächste Fälligkeit</dt>
            <dd class="font-medium text-text-primary mt-0.5">${template.next_due}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Startdatum</dt>
            <dd class="text-text-primary mt-0.5">${template.start_date}</dd>
          </div>
          <div>
            <dt class="text-text-muted">Enddatum</dt>
            <dd class="text-text-primary mt-0.5">${template.end_date ?? "–"}</dd>
          </div>
        </dl>
      </div>

      <!-- Positionen -->
      <div class="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
        <table class="min-w-full divide-y divide-border-subtle text-sm">
          <thead class="bg-bg-surface-raised">
            <tr>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase">Beschreibung</th>
              <th class="px-4 py-2.5 text-right text-xs font-semibold text-text-muted uppercase">Menge</th>
              <th class="px-4 py-2.5 text-right text-xs font-semibold text-text-muted uppercase">Preis €</th>
              <th class="px-4 py-2.5 text-right text-xs font-semibold text-text-muted uppercase">MwSt %</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            ${items.map(
              (item) => html`
                <tr>
                  <td class="px-4 py-2.5 text-text-primary">${item.description}</td>
                  <td class="px-4 py-2.5 text-right text-text-secondary">${item.quantity}</td>
                  <td class="px-4 py-2.5 text-right text-text-secondary">${item.unit_price.toFixed(2)}</td>
                  <td class="px-4 py-2.5 text-right text-text-secondary">${item.vat_rate}%</td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3">
        ${
          isActive
            ? html`
              <form method="POST" action="/vorlagen/${template.id}/generieren">
                <button
                  type="submit"
                  class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  onclick="return confirm('Jetzt Entwurf aus dieser Vorlage generieren?')"
                >
                  Jetzt generieren
                </button>
              </form>

              <a
                href="/vorlagen/${template.id}/bearbeiten"
                class="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface-raised"
              >
                Bearbeiten
              </a>

              <form method="POST" action="/vorlagen/${template.id}/deaktivieren">
                <button
                  type="submit"
                  class="rounded-md border border-accent-danger px-4 py-2 text-sm font-medium text-accent-danger hover:bg-red-50"
                  onclick="return confirm('Vorlage deaktivieren?')"
                >
                  Deaktivieren
                </button>
              </form>
            `
            : html`
              <a
                href="/vorlagen/${template.id}/bearbeiten"
                class="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface-raised"
              >
                Bearbeiten
              </a>
            `
        }

        <a
          href="/vorlagen"
          class="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface-raised"
        >
          ← Zurück
        </a>
      </div>
    </div>
  `;
}
