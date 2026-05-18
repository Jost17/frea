import { html } from "hono/html";
import type { RecurringTemplateWithClient } from "../../recurring/repository";

const INTERVAL_LABELS: Record<string, string> = {
  monthly: "Monatlich",
  quarterly: "Vierteljährlich",
  yearly: "Jährlich",
};

function templateRow(t: RecurringTemplateWithClient, today: string) {
  const isDue = t.active && t.next_due <= today;
  const isInactive = !t.active;

  return html`
    <tr class="${isInactive ? "opacity-50" : ""}">
      <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">
        <a href="/vorlagen/${t.id}" class="hover:underline text-primary">${t.title}</a>
      </td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">${t.client_name}</td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">
        ${INTERVAL_LABELS[t.interval] ?? t.interval}
      </td>
      <td class="whitespace-nowrap px-4 py-3 text-sm ${isDue ? "text-accent-danger font-semibold" : "text-text-secondary"}">
        ${t.next_due}${isDue ? " ⚠" : ""}
      </td>
      <td class="whitespace-nowrap px-4 py-3 text-sm">
        ${
          isInactive
            ? html`<span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Inaktiv</span>`
            : html`<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Aktiv</span>`
        }
      </td>
      <td class="whitespace-nowrap px-4 py-3 text-sm text-right space-x-2">
        ${
          t.active
            ? html`
                <form method="POST" action="/vorlagen/${t.id}/generieren" class="inline">
                  <button
                    type="submit"
                    class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    onclick="return confirm('Jetzt Entwurf aus Vorlage generieren?')"
                  >
                    Jetzt generieren
                  </button>
                </form>
              `
            : ""
        }
        <a href="/vorlagen/${t.id}" class="rounded border border-border-subtle px-3 py-1 text-xs font-medium text-text-secondary hover:bg-bg-surface-raised">
          Details
        </a>
      </td>
    </tr>
  `;
}

export function renderRecurringList(
  templates: RecurringTemplateWithClient[],
  today: string,
): ReturnType<typeof html> {
  if (templates.length === 0) {
    return html`
      <div class="rounded-lg border border-border-subtle bg-bg-surface p-8 text-center">
        <p class="text-sm text-text-muted mb-4">Keine Vorlagen vorhanden.</p>
        <a
          href="/vorlagen/neu"
          class="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Erste Vorlage erstellen
        </a>
      </div>
    `;
  }

  return html`
    <div class="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
      <table class="min-w-full divide-y divide-border-subtle">
        <thead class="bg-bg-surface-raised">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Titel</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Kunde</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Intervall</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Nächste Fälligkeit</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Aktionen</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle">
          ${templates.map((t) => templateRow(t, today))}
        </tbody>
      </table>
    </div>
  `;
}
