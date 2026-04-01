import { Hono } from "hono";
import { html } from "hono/html";
import {
  createTimeEntry,
  deleteTimeEntry,
  getAllActiveProjectsWithClient,
  getAllUnbilledTimeEntries,
  getTimeEntry,
  type ProjectWithClient,
  updateTimeEntry,
} from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { Layout } from "../templates/layout";
import { parseFormFields } from "../utils/form-parser";
import { type TimeEntry, timeEntrySchema } from "../validation/schemas";

export const timeRoutes = new Hono<AppEnv>();

const TIME_ENTRY_FIELDS = {
  project_id: "int",
  date: "string",
  duration: "float",
  description: "string",
  billable: "bool",
} as const;

// List all unbilled time entries — single JOIN query (P2-7)
timeRoutes.get("/", (c) => {
  try {
    const entries = getAllUnbilledTimeEntries();
    const overdueCount = c.get("overdueCount");

    // Group by client in application code
    const byClient = Map.groupBy(entries, (e) => e.client_name);

    return c.html(
      Layout({
        title: "Zeiten",
        activeNav: "zeiten",
        overdueCount,
        children: html`
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
              ? html`
                <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
                  <p class="text-sm text-gray-600">
                    Keine Zeiteinträge vorhanden. Erstelle einen Zeiteintrag, um geleistete Stunden zu dokumentieren.
                  </p>
                  <a
                    href="/zeiten/new"
                    class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Zeit erfassen
                  </a>
                </div>
              `
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
                                    <td class="px-4 py-3 text-gray-600 text-xs">${entry.description || "\u2014"}</td>
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
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Zeiteintraege konnten nicht geladen werden", 500);
  }
});

// New entry form
timeRoutes.get("/new", (c) => {
  try {
    const allProjects = getAllActiveProjectsWithClient();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: "Neuer Zeiteintrag",
        activeNav: "zeiten",
        overdueCount,
        children: renderTimeForm(null, allProjects),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Formular konnte nicht geladen werden", 500);
  }
});

// View/edit entry
timeRoutes.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Eintrag-ID", 400);

    const entry = getTimeEntry(id);
    if (!entry) throw new AppError("Eintrag nicht gefunden", 404);

    const allProjects = getAllActiveProjectsWithClient();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: "Zeiteintrag bearbeiten",
        activeNav: "zeiten",
        overdueCount,
        children: renderTimeForm(entry, allProjects),
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Eintrag konnte nicht geladen werden", 500);
  }
});

// Create entry
timeRoutes.post("/", async (c) => {
  try {
    const body = await c.req.formData();
    const data = parseFormFields(body, TIME_ENTRY_FIELDS);
    const validated = timeEntrySchema.parse(data);
    const id = createTimeEntry(validated);
    if (!id) throw new AppError("Zeiteintrag konnte nicht erstellt werden", 500);

    return c.redirect(`/zeiten/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Zeiteintrag konnte nicht erstellt werden");
  }
});

// Update entry
timeRoutes.post("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Eintrag-ID", 400);

    const body = await c.req.formData();
    const data = parseFormFields(body, TIME_ENTRY_FIELDS);
    const validated = timeEntrySchema.parse(data);
    updateTimeEntry(id, validated);

    return c.redirect(`/zeiten/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Zeiteintrag konnte nicht aktualisiert werden");
  }
});

// Delete entry
timeRoutes.post("/:id/delete", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Eintrag-ID", 400);

    deleteTimeEntry(id);
    return c.redirect("/zeiten");
  } catch (err) {
    return logAndRespond(c, err, "Eintrag konnte nicht geloescht werden", 500);
  }
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderTimeForm(entry: TimeEntry | null, allProjects: ProjectWithClient[]) {
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
