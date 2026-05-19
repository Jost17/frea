import { html } from "hono/html";
import type { Client } from "../validation/schemas";
import { SectionCard } from "./invoice-create-layout";

interface CustomerSectionArgs {
  clients: Omit<Client, "created_at" | "archived">[];
  selectedClientId?: number;
}

export function CustomerSection({ clients, selectedClientId }: CustomerSectionArgs) {
  const options = clients.map(
    (c) => html`
      <option value="${c.id}" ${selectedClientId === c.id ? "selected" : ""}>
        ${c.name}${c.city ? ` — ${c.city}` : ""}
      </option>
    `,
  );

  return SectionCard({
    number: 1,
    title: "Kunde",
    subtitle: "Für wen wird die Rechnung erstellt?",
    children: html`
      <div>
        <label for="client-select" class="block text-sm font-medium text-text-primary mb-2">
          Kunde auswählen *
        </label>
        <select
          id="client-select"
          name="client_id"
          required
          class="block w-full rounded-lg border border-border-subtle bg-bg-canvas px-3 py-2.5 text-sm text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          hx-get="/rechnungen/create/entries"
          hx-target="#entries-section"
          hx-swap="innerHTML"
          hx-include="[name='layout']"
          hx-trigger="change"
        >
          <option value="">— Kunden wählen —</option>
          ${options}
        </select>
        ${
          clients.length === 0
            ? html`<p class="mt-2 text-sm text-amber-600">
                Noch keine aktiven Kunden.
                <a href="/kunden/new" class="underline hover:text-amber-700">Kunden anlegen →</a>
              </p>`
            : html``
        }
      </div>
    `,
  });
}
