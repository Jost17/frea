import { html } from "hono/html";
import type { Client } from "../validation/schemas";
import { EmptyState } from "./components/empty-state";

export function renderInvoiceClientSelection(clients: Omit<Client, "created_at" | "archived">[]) {
  if (clients.length === 0) {
    return EmptyState({
      message: "Bitte erstelle zuerst einen Kunden und ein Projekt mit Zeiteinträgen.",
      actionHref: "/kunden/new",
      actionLabel: "Neuen Kunden erstellen",
    });
  }

  return html`
    <div class="max-w-2xl">
      <h1 class="mb-6 text-2xl font-semibold">Neue Rechnung erstellen</h1>
      <p class="mb-6 text-sm text-text-secondary">Wähle den Kunden, für den du eine Rechnung erstellen möchtest.</p>

      <div class="space-y-3">
        ${clients.map(
          (client) => html`
            <a href="/rechnungen/create?client_id=${client.id}" class="block rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-card hover:border-primary hover:bg-primary-subtle transition">
              <div class="flex justify-between items-center">
                <div>
                  <p class="font-semibold text-text-primary">${client.name}</p>
                  <p class="text-sm text-text-muted">${client.city || "—"}</p>
                </div>
                <span class="text-text-muted">→</span>
              </div>
            </a>
          `,
        )}
      </div>
    </div>
  `;
}
