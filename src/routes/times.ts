import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { AppError, logAndRespond } from "../middleware/error-handler";
import {
  getAllActiveClients,
  getActiveProjectsForClient,
  getTimeEntry,
  getTimeEntriesForProject,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from "../db/queries";
import { timeEntrySchema } from "../validation/schemas";
import { Layout } from "../templates/layout";

export const timeRoutes = new Hono<AppEnv>();

// List all unbilled time entries by project
timeRoutes.get("/", (c) => {
  try {
    const clients = getAllActiveClients();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: "Zeiten",
        activeNav: "zeiten",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Zeiteinträge</h1>
            <a
              href="/zeiten/new"
              class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Neuer Zeiteintrag
            </a>
          </div>

          ${clients.length === 0
            ? html`<p class="text-gray-500">Keine Kunden/Projekte gefunden.</p>`
            : html`
                <div class="space-y-8">
                  ${clients
                    .map((client) => {
                      const projects = getActiveProjectsForClient(client.id);
                      const entries = projects.flatMap((p) => {
                        const times = getTimeEntriesForProject(p.id);
                        return times.map((t) => ({ ...t, projectName: p.name, clientName: client.name }));
                      });

                      return html`
                        <div>
                          <h2 class="text-lg font-semibold mb-3">${client.name}</h2>
                          ${entries.length === 0
                            ? html`<p class="text-gray-400 text-sm">Keine Einträge</p>`
                            : html`
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
                                      ${entries.map((entry) => {
                                        return html`
                                          <tr class="border-t hover:bg-gray-50">
                                            <td class="px-4 py-3 font-medium text-gray-900">${entry.projectName}</td>
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
                              `}
                        </div>
                      `;
                    })
                    .filter((div) => true)}
                </div>
              `}
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Zeiteinträge konnten nicht geladen werden", 500);
  }
});

// New entry form
timeRoutes.get("/new", (c) => {
  try {
    const clients = getAllActiveClients();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: "Neuer Zeiteintrag",
        activeNav: "zeiten",
        overdueCount,
        children: renderTimeForm(null, clients),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Formular konnte nicht geladen werden", 500);
  }
});

// View/edit entry
timeRoutes.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) throw new AppError("Ungültige Eintrag-ID", 400);

    const entry = getTimeEntry(id);
    if (!entry) throw new AppError("Eintrag nicht gefunden", 404);

    const clients = getAllActiveClients();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: "Zeiteintrag bearbeiten",
        activeNav: "zeiten",
        overdueCount,
        children: renderTimeForm(entry, clients),
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
    const data = {
      project_id: parseInt(String(body.get("project_id") ?? "0")),
      date: String(body.get("date") ?? ""),
      duration: parseFloat(String(body.get("duration") ?? "0")),
      description: String(body.get("description") ?? ""),
      billable: body.has("billable") ? 1 : 0,
    };

    const validated = timeEntrySchema.parse(data);
    const id = createTimeEntry(validated);

    return c.redirect(`/zeiten/${id}`);
  } catch (err) {
    if (err instanceof Error) {
      console.error("[times POST] Validation error:", err);
      throw new AppError(err.message, 400);
    }
    return logAndRespond(c, err, "Eintrag konnte nicht erstellt werden", 500);
  }
});

// Update entry
timeRoutes.post("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) throw new AppError("Ungültige Eintrag-ID", 400);

    const body = await c.req.formData();
    const data = {
      project_id: parseInt(String(body.get("project_id") ?? "0")),
      date: String(body.get("date") ?? ""),
      duration: parseFloat(String(body.get("duration") ?? "0")),
      description: String(body.get("description") ?? ""),
      billable: body.has("billable") ? 1 : 0,
    };

    const validated = timeEntrySchema.parse(data);
    updateTimeEntry(id, validated);

    return c.redirect(`/zeiten/${id}`);
  } catch (err) {
    if (err instanceof Error) {
      console.error("[times POST :id] Validation error:", err);
      throw new AppError(err.message, 400);
    }
    return logAndRespond(c, err, "Eintrag konnte nicht aktualisiert werden", 500);
  }
});

// Delete entry
timeRoutes.post("/:id/delete", (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) throw new AppError("Ungültige Eintrag-ID", 400);

    deleteTimeEntry(id);
    return c.redirect("/zeiten");
  } catch (err) {
    return logAndRespond(c, err, "Eintrag konnte nicht gelöscht werden", 500);
  }
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderTimeForm(entry: any, clients: any[]) {
  const isNew = !entry;
  const action = isNew ? "/zeiten" : `/zeiten/${entry.id}`;
  const selectedClientId = entry?.project_id
    ? clients.find((c) => getActiveProjectsForClient(c.id).some((p) => p.id === entry.project_id))?.id
    : null;

  return html`
    <div class="max-w-2xl">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold">${isNew ? "Neuer Zeiteintrag" : "Zeiteintrag bearbeiten"}</h1>
      </div>

      <form method="post" action="${action}" class="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="client_select" class="block text-sm font-medium text-gray-700">Kunde (für Projekt-Wahl)</label>
            <select
              id="client_select"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              onchange="updateProjectSelect(this.value)"
            >
              <option value="">-- Wählen --</option>
              ${clients.map((c) => {
                return html`<option value="${c.id}" ${selectedClientId === c.id ? "selected" : ""}>${c.name}</option>`;
              })}
            </select>
          </div>

          <div>
            <label for="project_id" class="block text-sm font-medium text-gray-700">Projekt *</label>
            <select
              id="project_id"
              name="project_id"
              required
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">-- Wählen --</option>
              ${clients
                .flatMap((c) => {
                  return getActiveProjectsForClient(c.id).map((p) => ({
                    ...p,
                    clientId: c.id,
                  }));
                })
                .map((p) => {
                  return html`<option value="${p.id}" ${entry?.project_id === p.id ? "selected" : ""}>${p.name} (${p.code})</option>`;
                })}
            </select>
          </div>
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
            <label for="duration" class="block text-sm font-medium text-gray-700">Stunden *</label>
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
            />
          </div>
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">Beschreibung</label>
          <textarea
            id="description"
            name="description"
            rows="3"
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
${entry?.description || ""}</textarea
          >
        </div>

        <div class="flex items-center">
          <input
            type="checkbox"
            id="billable"
            name="billable"
            ${entry?.billable === 1 ? "checked" : ""}
            class="h-4 w-4 rounded border-gray-300"
          />
          <label for="billable" class="ml-2 text-sm font-medium text-gray-700">Abrechenbar</label>
        </div>

        <div class="flex justify-end gap-4 border-t border-gray-200 pt-6">
          <a href="/zeiten" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"> Abbrechen </a>
          ${!isNew
            ? html`
                <a
                  href="/zeiten/${entry.id}/delete"
                  onclick="return confirm('Wirklich löschen?')"
                  class="px-4 py-2 text-sm text-red-600 hover:text-red-700"
                >
                  Löschen
                </a>
              `
            : ""}
          <button type="submit" class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Speichern
          </button>
        </div>
      </form>
    </div>

    <script>
      function updateProjectSelect(clientId) {
        // This is handled server-side rendering, but we could add client-side filtering here later
      }
    </script>
  `;
}
