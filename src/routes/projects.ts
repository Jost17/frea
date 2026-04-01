import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { AppError, logAndRespond } from "../middleware/error-handler";
import {
  getAllActiveClients,
  getAllActiveProjectsWithClient,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "../db/queries";
import { projectSchema, type Project, type Client } from "../validation/schemas";
import { Layout } from "../templates/layout";
import { parseFormFields } from "../utils/form-parser";

export const projectRoutes = new Hono<AppEnv>();

const PROJECT_FIELDS = {
  client_id: "int",
  code: "string",
  name: "string",
  daily_rate: "float",
  start_date: "string",
  end_date: "string",
  budget_days: "float",
  service_description: "string",
  contract_number: "string",
  contract_date: "string",
  notes: "string",
} as const;

// List all projects — single JOIN query (P2-7)
projectRoutes.get("/", (c) => {
  try {
    const projects = getAllActiveProjectsWithClient();
    const overdueCount = c.get("overdueCount");

    // Group by client in application code
    const byClient = Map.groupBy(projects, (p) => p.client_name);

    return c.html(
      Layout({
        title: "Projekte",
        activeNav: "projekte",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Projekte</h1>
            <a
              href="/projekte/new"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Neues Projekt
            </a>
          </div>

          ${byClient.size === 0
            ? html`
                <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
                  <p class="text-sm text-gray-600">
                    Keine Projekte vorhanden. Lege zuerst einen Kunden an, dann kannst du ein Projekt erstellen.
                  </p>
                  <a
                    href="/projekte/new"
                    class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Neues Projekt anlegen
                  </a>
                </div>
              `
            : html`
                <div class="space-y-8">
                  ${[...byClient.entries()].map(([clientName, clientProjects]) => {
                    return html`
                      <div>
                        <h2 class="text-lg font-semibold mb-3">${clientName}</h2>
                        <div class="rounded-lg border border-gray-200 overflow-hidden bg-white">
                          <table class="w-full text-sm">
                            <tbody>
                              ${clientProjects.map((project) => {
                                return html`
                                  <tr class="border-t hover:bg-gray-50">
                                    <td class="px-4 py-3">
                                      <a href="/projekte/${project.id}" class="font-medium text-blue-600 hover:underline">
                                        ${project.name}
                                      </a>
                                      <div class="text-xs text-gray-500">${project.code}</div>
                                    </td>
                                    <td class="px-4 py-3 text-right">${project.daily_rate.toFixed(2)} \u20AC/Tag</td>
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
              `}
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Projekte konnten nicht geladen werden", 500);
  }
});

// New project form
projectRoutes.get("/new", (c) => {
  try {
    const clients = getAllActiveClients();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: "Neues Projekt",
        activeNav: "projekte",
        overdueCount,
        children: renderProjectForm(null, clients),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Formular konnte nicht geladen werden", 500);
  }
});

// View/edit project
projectRoutes.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Projekt-ID", 400);

    const project = getProject(id);
    if (!project) throw new AppError("Projekt nicht gefunden", 404);

    const clients = getAllActiveClients();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: `Projekt: ${project.name}`,
        activeNav: "projekte",
        overdueCount,
        children: renderProjectForm(project, clients),
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Projekt konnte nicht geladen werden", 500);
  }
});

// Create project
projectRoutes.post("/", async (c) => {
  try {
    const body = await c.req.formData();
    const data = parseFormFields(body, PROJECT_FIELDS);
    const validated = projectSchema.parse(data);
    const id = createProject(validated);

    return c.redirect(`/projekte/${id}`);
  } catch (err) {
    if (err instanceof Error) {
      console.error("[projects POST] Validation error:", err);
      throw new AppError(err.message, 400);
    }
    return logAndRespond(c, err, "Projekt konnte nicht erstellt werden", 500);
  }
});

// Update project
projectRoutes.post("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Projekt-ID", 400);

    const body = await c.req.formData();
    const data = parseFormFields(body, PROJECT_FIELDS);
    const validated = projectSchema.parse(data);
    updateProject(id, validated);

    return c.redirect(`/projekte/${id}`);
  } catch (err) {
    if (err instanceof Error) {
      console.error("[projects POST :id] Validation error:", err);
      throw new AppError(err.message, 400);
    }
    return logAndRespond(c, err, "Projekt konnte nicht aktualisiert werden", 500);
  }
});

// Delete project
projectRoutes.post("/:id/delete", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Projekt-ID", 400);

    deleteProject(id);
    return c.redirect("/projekte");
  } catch (err) {
    return logAndRespond(c, err, "Projekt konnte nicht geloescht werden", 500);
  }
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderProjectForm(
  project: Project | null,
  clients: Pick<Client, "id" | "name">[],
) {
  const isNew = !project;
  const action = isNew ? "/projekte" : `/projekte/${project.id}`;

  return html`
    <div class="max-w-2xl">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-semibold">${isNew ? "Neues Projekt" : `Projekt: ${project.name}`}</h1>
        ${!isNew
          ? html`<form method="post" action="/projekte/${project.id}/delete" class="inline">
              <button
                type="submit"
                onclick="return confirm('Wirklich loeschen?')"
                class="text-red-600 hover:underline text-xs"
              >
                Loeschen
              </button>
            </form>`
          : ""}
      </div>

      <form method="post" action="${action}" class="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label for="client_id" class="block text-sm font-medium text-gray-700">Kunde *</label>
          <select
            id="client_id"
            name="client_id"
            required
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">-- Waehlen --</option>
            ${clients.map((c) => {
              return html`<option value="${c.id}" ${project?.client_id === c.id ? "selected" : ""}>${c.name}</option>`;
            })}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="code" class="block text-sm font-medium text-gray-700">Kürzel *</label>
            <input
              type="text"
              id="code"
              name="code"
              required
              value="${project?.code || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              aria-describedby="code-hint"
            />
            <p id="code-hint" class="mt-1 text-xs text-gray-500">Internes Projektkürzel (z.B. PROJ-001). Erscheint in der Zeiterfassung.</p>
          </div>
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value="${project?.name || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="daily_rate" class="block text-sm font-medium text-gray-700">Tagessatz *</label>
            <input
              type="number"
              id="daily_rate"
              name="daily_rate"
              required
              min="0"
              step="0.01"
              value="${project?.daily_rate || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              aria-describedby="daily-rate-hint"
            />
            <p id="daily-rate-hint" class="mt-1 text-xs text-gray-500">Dein Tagessatz in Euro (netto). Wird für die Rechnungsberechnung verwendet.</p>
          </div>
          <div>
            <label for="budget_days" class="block text-sm font-medium text-gray-700">Budget (Tage)</label>
            <input
              type="number"
              id="budget_days"
              name="budget_days"
              min="0"
              step="0.5"
              value="${project?.budget_days || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              aria-describedby="budget-hint"
            />
            <p id="budget-hint" class="mt-1 text-xs text-gray-500">Geplante Anzahl Arbeitstage. Optional — hilft bei der Auslastungsübersicht.</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="start_date" class="block text-sm font-medium text-gray-700">Startdatum</label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value="${project?.start_date || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="end_date" class="block text-sm font-medium text-gray-700">Enddatum</label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value="${project?.end_date || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label for="service_description" class="block text-sm font-medium text-gray-700">Leistungsbeschreibung</label>
          <textarea
            id="service_description"
            name="service_description"
            rows="3"
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            aria-describedby="service-desc-hint"
          >
${project?.service_description || ""}</textarea
          >
          <p id="service-desc-hint" class="mt-1 text-xs text-gray-500">Was du lieferst. Wird auf die Rechnung übernommen.</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="contract_number" class="block text-sm font-medium text-gray-700">Vertragsnummer</label>
            <input
              type="text"
              id="contract_number"
              name="contract_number"
              value="${project?.contract_number || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              aria-describedby="contract-number-hint"
            />
            <p id="contract-number-hint" class="mt-1 text-xs text-gray-500">Optional. Referenz zum Rahmenvertrag.</p>
          </div>
          <div>
            <label for="contract_date" class="block text-sm font-medium text-gray-700">Vertragsdatum</label>
            <input
              type="date"
              id="contract_date"
              name="contract_date"
              value="${project?.contract_date || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label for="notes" class="block text-sm font-medium text-gray-700">Notizen</label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
${project?.notes || ""}</textarea
          >
        </div>

        <div class="flex justify-end gap-4 border-t border-gray-200 pt-6">
          <a href="/projekte" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"> Abbrechen </a>
          <button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Speichern
          </button>
        </div>
      </form>
    </div>
  `;
}
