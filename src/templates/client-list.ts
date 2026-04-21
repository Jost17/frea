import { html } from "hono/html";
import type { Client } from "../validation/schemas";
import { EmptyState } from "./components/empty-state";

export function renderClientList(clients: Omit<Client, "created_at" | "archived">[]): ReturnType<typeof html> {
  return html`
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Kunden</h1>
      <a
        href="/kunden/new"
        class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Neuer Kunde
      </a>
    </div>

    ${
      clients.length === 0
        ? EmptyState({
            message:
              "Noch keine Kunden angelegt. Erstelle deinen ersten Kunden, um Projekte und Rechnungen zuordnen zu können.",
            actionHref: "/kunden/new",
            actionLabel: "Neuen Kunden anlegen",
          })
        : html`
            <div class="rounded-lg border border-gray-200 overflow-hidden bg-white">
              <table class="w-full text-sm">
                <thead class="border-b bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">Stadt</th>
                    <th class="px-4 py-3 text-left font-semibold text-gray-700">E-Mail</th>
                    <th class="px-4 py-3 text-center font-semibold text-gray-700">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  ${clients.map((client) => {
                    return html`
                      <tr class="border-t hover:bg-gray-50">
                        <td class="px-4 py-3 font-medium text-gray-900">${client.name}</td>
                        <td class="px-4 py-3 text-gray-600">${client.city || "—"}</td>
                        <td class="px-4 py-3 text-gray-600">${client.email || "—"}</td>
                        <td class="px-4 py-3 text-center">
                          <a href="/kunden/${client.id}" class="text-blue-600 hover:underline text-xs">
                            Bearbeiten
                          </a>
                        </td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            </div>
          `
    }
  `;
}
