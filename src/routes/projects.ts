import { Hono } from "hono";
import { html } from "hono/html";
import {
  createProject,
  deleteProject,
  getAllActiveClients,
  getAllActiveProjectsWithClient,
  getProject,
  updateProject,
} from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { EmptyState } from "../templates/components/empty-state";
import { Layout } from "../templates/layout";
import { parseFormFields } from "../utils/form-parser";
import { type Client, type Project, projectSchema } from "../validation/schemas";

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

const INPUT_CLASS =
  "mt-1 block w-full rounded-md border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

projectRoutes.get("/", (c) => {
  try {
    const projects = getAllActiveProjectsWithClient();
    const overdueCount = c.get("overdueCount");

    const byClient = Map.groupBy(projects, (p) => p.client_name);

    return c.html(
      Layout({
        title: "Projekte",
        activeNav: "projekte",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold text-text-primary">Projekte</h1>
            <a
              href="/projekte/new"
              class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              + Neues Projekt
            </a>
          </div>

          ${
            byClient.size === 0
              ? EmptyState({
                  message:
                    "Keine Projekte vorhanden. Lege zuerst einen Kunden an, dann kannst du ein Projekt erstellen.",
                  actionHref: "/projekte/new",
                  actionLabel: "Neues Projekt anlegen",
                })
              : html`
                <div class="space-y-8">
                  ${[...byClient.entries()].map(([clientName, clientProjects]) => {
                    return html`
                      <div>
                        <h2 class="text-lg font-semibold text-text-primary mb-3">${clientName}</h2>
                        <div class="rounded-lg border border-border-subtle overflow-hidden bg-bg-surface shadow-card">
                          <table class="w-full text-sm">
                            <tbody>
                              ${clientProjects.map((project) => {
                                return html`
                                  <tr class="border-t border-border-subtle hover:bg-bg-surface-raised transition-colors">
                                    <td class="px-4 py-3">
                                      <a href="/projekte/${project.id}" class="font-medium text-primary hover:underline">
                                        ${project.name}
                                      </a>
                                      <div class="text-xs text-text-muted">${project.code}</div>
                                    </td>
                                    <td class="px-4 py-3 text-right text-text-secondary">${project.daily_rate.toFixed(2)} €/Tag</td>
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
    return logAndRespond(c, err, "Projekte konnten nicht geladen werden", 500);
  }
});

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

projectRoutes.post("/", async (c) => {
  try {
    const body = await c.req.formData();
    const data = parseFormFields(body, PROJECT_FIELDS);
    const result = projectSchema.safeParse(data);
    if (!result.success)
      throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    const id = createProject(result.data);
    if (!id) throw new AppError("Projekt konnte nicht erstellt werden", 500);

    return c.redirect(`/projekte/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Projekt konnte nicht erstellt werden");
  }
});

projectRoutes.post("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Projekt-ID", 400);

    const body = await c.req.formData();
    const data = parseFormFields(body, PROJECT_FIELDS);
    const result = projectSchema.safeParse(data);
    if (!result.success)
      throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    updateProject(id, result.data);

    return c.redirect(`/projekte/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Projekt konnte nicht aktualisiert werden");
  }
});

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

function renderProjectForm(project: Project | null, clients: Pick<Client, "id" | "name">[]) {
  const isNew = !project;
  const action = isNew ? "/projekte" : `/projekte/${project.id}`;

  return html`
    <div class="max-w-2xl">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-text-primary">${isNew ? "Neues Projekt" : `Projekt: ${project.name}`}</h1>
        ${
          !isNew
            ? html`<form method="post" action="/projekte/${project.id}/delete" class="inline">
              <button
                type="submit"
                onclick="return confirm('Wirklich löschen?')"
                class="text-accent-danger hover:underline text-xs"
              >
                Löschen
              </button>
            </form>`
            : ""
        }
      </div>

      <form method="post" action="${action}" class="space-y-6 rounded-lg border border-border-subtle bg-bg-surface shadow-card p-6">
        <div>
          <label for="client_id" class="block text-sm font-medium text-text-primary">Kunde *</label>
          <select
            id="client_id"
            name="client_id"
            required
            class="${INPUT_CLASS}"
          >
            <option value="">-- Wählen --</option>
            ${clients.map((c) => {
              return html`<option value="${c.id}" ${project?.client_id === c.id ? "selected" : ""}>${c.name}</option>`;
            })}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="code" class="block text-sm font-medium text-text-primary">Kürzel *</label>
            <input
              type="text"
              id="code"
              name="code"
              required
              value="${project?.code || ""}"
              class="${INPUT_CLASS}"
              aria-describedby="code-hint"
            />
            <p id="code-hint" class="mt-1 text-xs text-text-muted">Internes Projektkürzel (z.B. PROJ-001). Erscheint in der Zeiterfassung.</p>
          </div>
          <div>
            <label for="name" class="block text-sm font-medium text-text-primary">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value="${project?.name || ""}"
              class="${INPUT_CLASS}"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="daily_rate" class="block text-sm font-medium text-text-primary">Tagessatz *</label>
            <input
              type="number"
              id="daily_rate"
              name="daily_rate"
              required
              min="0"
              step="0.01"
              value="${project?.daily_rate || ""}"
              class="${INPUT_CLASS}"
              aria-describedby="daily-rate-hint"
            />
            <p id="daily-rate-hint" class="mt-1 text-xs text-text-muted">Dein Tagessatz in Euro (netto). Wird für die Rechnungsberechnung verwendet.</p>
          </div>
          <div>
            <label for="budget_days" class="block text-sm font-medium text-text-primary">Budget (Tage)</label>
            <input
              type="number"
              id="budget_days"
              name="budget_days"
              min="0"
              step="0.5"
              value="${project?.budget_days || ""}"
              class="${INPUT_CLASS}"
              aria-describedby="budget-hint"
            />
            <p id="budget-hint" class="mt-1 text-xs text-text-muted">Geplante Anzahl Arbeitstage. Optional — hilft bei der Auslastungsübersicht.</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="start_date" class="block text-sm font-medium text-text-primary">Startdatum</label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value="${project?.start_date || ""}"
              class="${INPUT_CLASS}"
            />
          </div>
          <div>
            <label for="end_date" class="block text-sm font-medium text-text-primary">Enddatum</label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value="${project?.end_date || ""}"
              class="${INPUT_CLASS}"
            />
          </div>
        </div>

        <div>
          <label for="service_description" class="block text-sm font-medium text-text-primary">Leistungsbeschreibung</label>
          <textarea
            id="service_description"
            name="service_description"
            rows="3"
            class="${INPUT_CLASS}"
            aria-describedby="service-desc-hint"
          >
${project?.service_description || ""}</textarea
          >
          <p id="service-desc-hint" class="mt-1 text-xs text-text-muted">Was du lieferst. Wird auf die Rechnung übernommen.</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="contract_number" class="block text-sm font-medium text-text-primary">Vertragsnummer</label>
            <input
              type="text"
              id="contract_number"
              name="contract_number"
              value="${project?.contract_number || ""}"
              class="${INPUT_CLASS}"
              aria-describedby="contract-number-hint"
            />
            <p id="contract-number-hint" class="mt-1 text-xs text-text-muted">Optional. Referenz zum Rahmenvertrag.</p>
          </div>
          <div>
            <label for="contract_date" class="block text-sm font-medium text-text-primary">Vertragsdatum</label>
            <input
              type="date"
              id="contract_date"
              name="contract_date"
              value="${project?.contract_date || ""}"
              class="${INPUT_CLASS}"
            />
          </div>
        </div>

        <div>
          <label for="notes" class="block text-sm font-medium text-text-primary">Notizen</label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            class="${INPUT_CLASS}"
          >
${project?.notes || ""}</textarea
          >
        </div>

        <div class="flex justify-end gap-4 border-t border-border-subtle pt-6">
          <a href="/projekte" class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Abbrechen</a>
          <button type="submit" class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
            Speichern
          </button>
        </div>
      </form>
    </div>
  `;
}
