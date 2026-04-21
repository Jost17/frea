import { html } from "hono/html";
import type { ProjectWithClient } from "../db/queries";
import { EmptyState } from "./components/empty-state";

export interface TimeEntryWithProject {
  id: number;
  project_id: number;
  project_name: string;
  client_name: string;
  date: string;
  duration: number;
  description: string | null;
  billable: number;
}

export function renderTimeList(entries: TimeEntryWithProject[]): ReturnType<typeof html> {
  const byClient = Map.groupBy(entries, (e) => e.client_name);

  return html`
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Zeiteintraege</h1>
      <a
        href="/zeiten/new"
        class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Neuer Zeiteintrag
      </a>
    </div>

    ${
      byClient.size === 0
        ? EmptyState({
            message:
              "Keine Zeiteinträge vorhanden. Erstelle einen Zeiteintrag, um geleistete Stunden zu dokumentieren.",
            actionHref: "/zeiten/new",
            actionLabel: "Zeit erfassen",
          })
        : html`
            <p class="mb-4 text-sm text-gray-500">Hier siehst du alle noch nicht abgerechneten Zeiten.</p>
            <div class="space-y-8">
              ${[...byClient.entries()].map(([clientName, clientEntries]) => {
                return html`
                  <div>
                    <h2 class="text-lg font-semibold mb-3">${clientName}</h2>
                    <div class="rounded-lg border border-gray-200 overflow-hidden bg-white">
                      <table class="w-full text-sm">
                        <thead class="border-b bg-gray-50">
                          <tr>
                            <th class="px-4 py-3 text-left font-semibold text-gray-700">Projekt</th>
                            <th class="px-4 py-3 text-left font-semibold text-gray-700">Datum</th>
                            <th class="px-4 py-3 text-right font-semibold text-gray-700">Stunden</th>
                            <th class="px-4 py-3 text-left font-semibold text-gray-700">Beschreibung</th>
                            <th class="px-4 py-3 text-center font-semibold text-gray-700">Aktion</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${clientEntries.map((entry) => {
                            return html`
                              <tr class="border-t hover:bg-gray-50">
                                <td class="px-4 py-3 font-medium text-gray-900">${entry.project_name}</td>
                                <td class="px-4 py-3 text-gray-600">${entry.date}</td>
                                <td class="px-4 py-3 text-right text-gray-600">${entry.duration.toFixed(1)}h</td>
                                <td class="px-4 py-3 text-gray-600 text-xs">${entry.description || "—"}</td>
                                <td class="px-4 py-3 text-center">
                                  <a href="/zeiten/${entry.id}" class="text-blue-600 hover:underline text-xs">
                                    Bearbeiten
                                  </a>
                                </td>
                              </tr>
                            `;
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `;
              })}
            </div>
          `
    }
  `;
}
