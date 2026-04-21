import { html } from "hono/html";
import type { ProjectWithClient } from "../db/queries";
import type { TimeEntry } from "../validation/schemas";

export function renderTimeForm(entry: TimeEntry | null, allProjects: ProjectWithClient[]): ReturnType<typeof html> {
  const isNew = !entry;
  const action = isNew ? "/zeiten" : `/zeiten/${entry.id}`;

  return html`
    <div class="max-w-2xl">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold">${isNew ? "Neuer Zeiteintrag" : "Zeiteintrag bearbeiten"}</h1>
      </div>

      <form method="post" action="${action}" class="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label for="project_id" class="block text-sm font-medium text-gray-700">Projekt *</label>
          <select
            id="project_id"
            name="project_id"
            required
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">-- Waehlen --</option>
            ${allProjects.map((p) => {
              return html`<option value="${p.id}" ${entry?.project_id === p.id ? "selected" : ""}>${p.client_name} / ${p.name} (${p.code})</option>`;
            })}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="date" class="block text-sm font-medium text-gray-700">Datum *</label>
            <input
              type="date"
              id="date"
              name="date"
              required
              value="${entry?.date || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="duration" class="block text-sm font-medium text-gray-700">Dauer *</label>
            <input
              type="number"
              id="duration"
              name="duration"
              required
              min="0.25"
              max="24"
              step="0.25"
              value="${entry?.duration || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              aria-describedby="duration-hint"
            />
            <p id="duration-hint" class="mt-1 text-xs text-gray-500">Dauer in Stunden (z.B. 8 für einen ganzen Tag, 4.5 für einen halben).</p>
          </div>
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">Beschreibung</label>
          <textarea
            id="description"
            name="description"
            rows="3"
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            aria-describedby="description-hint"
          >
${entry?.description || ""}</textarea
          >
          <p id="description-hint" class="mt-1 text-xs text-gray-500">Kurze Beschreibung der Tätigkeit. Erscheint auf der Rechnung.</p>
        </div>

        <div>
          <div class="flex items-center">
            <input
              type="checkbox"
              id="billable"
              name="billable"
              ${entry?.billable === 1 ? "checked" : ""}
              class="h-4 w-4 rounded border-gray-300"
              aria-describedby="billable-hint"
            />
            <label for="billable" class="ml-2 text-sm font-medium text-gray-700">Abrechenbar</label>
          </div>
          <p id="billable-hint" class="mt-1 text-xs text-gray-500">Deaktivieren für interne Aufgaben, die nicht in Rechnung gestellt werden.</p>
        </div>

        <div class="flex justify-end gap-4 border-t border-gray-200 pt-6">
          <a href="/zeiten" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"> Abbrechen </a>
          ${
            !isNew
              ? html`
                <form method="post" action="/zeiten/${entry.id}/delete" class="inline">
                  <button
                    type="submit"
                    onclick="return confirm('Wirklich loeschen?')"
                    class="px-4 py-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Loeschen
                  </button>
                </form>
              `
              : ""
          }
          <button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Speichern
          </button>
        </div>
      </form>
    </div>
  `;
}
