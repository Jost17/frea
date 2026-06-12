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
import { Button } from "../templates/components/button";
import { EmptyState } from "../templates/components/empty-state";
import { FormField } from "../templates/components/form-field";
import { Table, TableRow, Td } from "../templates/components/table";
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
            <h1 class="text-2xl font-semibold text-text-primary">Projekte</h1>
            ${Button({ href: "/projekte/new", children: "+ Neues Projekt" })}
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
                        ${Table({
                          columns: [{ label: "Projekt" }, { label: "Tagessatz", align: "right" }],
                          rows: clientProjects.map((project) =>
                            TableRow({
                              children: html`
                                ${Td({
                                  children: html`
                                    <a
                                      href="/projekte/${project.id}"
                                      class="font-medium text-primary hover:underline"
                                    >${project.name}</a>
                                    <div class="text-xs text-text-muted">${project.code}</div>
                                  `,
                                })}
                                ${Td({
                                  align: "right",
                                  extraClass: "text-text-secondary",
                                  children: `${project.daily_rate.toFixed(2)} €/Tag`,
                                })}
                              `,
                            }),
                          ),
                        })}
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

// Update project
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

function renderProjectForm(project: Project | null, clients: Pick<Client, "id" | "name">[]) {
  const isNew = !project;
  const action = isNew ? "/projekte" : `/projekte/${project.id}`;

  const clientOptions = [
    { value: "", label: "-- Wählen --" },
    ...clients.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  return html`
    <div class="max-w-2xl">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-text-primary">
          ${isNew ? "Neues Projekt" : `Projekt: ${project.name}`}
        </h1>
        ${
          !isNew
            ? html`<form method="post" action="/projekte/${project.id}/delete" class="inline">
                ${Button({
                  variant: "danger",
                  type: "submit",
                  children: "Löschen",
                  attrs: `onclick="return confirm('Wirklich löschen?')"`,
                })}
              </form>`
            : ""
        }
      </div>

      <form
        method="post"
        action="${action}"
        class="space-y-6 rounded-lg border border-border-subtle bg-bg-surface p-6 shadow-card"
      >
        ${FormField({
          type: "select",
          id: "client_id",
          name: "client_id",
          label: "Kunde",
          required: true,
          value: project ? String(project.client_id) : "",
          options: clientOptions,
        })}

        <div class="grid grid-cols-2 gap-4">
          ${FormField({
            type: "text",
            id: "code",
            name: "code",
            label: "Kürzel",
            required: true,
            value: project?.code || "",
            hint: "Internes Projektkürzel (z.B. PROJ-001). Erscheint in der Zeiterfassung.",
          })}
          ${FormField({
            type: "text",
            id: "name",
            name: "name",
            label: "Name",
            required: true,
            value: project?.name || "",
          })}
        </div>

        <div class="grid grid-cols-2 gap-4">
          ${FormField({
            type: "number",
            id: "daily_rate",
            name: "daily_rate",
            label: "Tagessatz",
            required: true,
            value: project?.daily_rate || "",
            hint: "Dein Tagessatz in Euro (netto). Wird für die Rechnungsberechnung verwendet.",
            attrs: 'min="0" step="0.01"',
          })}
          ${FormField({
            type: "number",
            id: "budget_days",
            name: "budget_days",
            label: "Budget (Tage)",
            value: project?.budget_days || "",
            hint: "Geplante Anzahl Arbeitstage. Optional — hilft bei der Auslastungsübersicht.",
            attrs: 'min="0" step="0.5"',
          })}
        </div>

        <div class="grid grid-cols-2 gap-4">
          ${FormField({
            type: "date",
            id: "start_date",
            name: "start_date",
            label: "Startdatum",
            value: project?.start_date || "",
          })}
          ${FormField({
            type: "date",
            id: "end_date",
            name: "end_date",
            label: "Enddatum",
            value: project?.end_date || "",
          })}
        </div>

        ${FormField({
          type: "textarea",
          id: "service_description",
          name: "service_description",
          label: "Leistungsbeschreibung",
          value: project?.service_description || "",
          hint: "Was du lieferst. Wird auf die Rechnung übernommen.",
        })}

        <div class="grid grid-cols-2 gap-4">
          ${FormField({
            type: "text",
            id: "contract_number",
            name: "contract_number",
            label: "Vertragsnummer",
            value: project?.contract_number || "",
            hint: "Optional. Referenz zum Rahmenvertrag.",
          })}
          ${FormField({
            type: "date",
            id: "contract_date",
            name: "contract_date",
            label: "Vertragsdatum",
            value: project?.contract_date || "",
          })}
        </div>

        ${FormField({
          type: "textarea",
          id: "notes",
          name: "notes",
          label: "Notizen",
          value: project?.notes || "",
        })}

        <div class="flex justify-end gap-4 border-t border-border-subtle pt-6">
          ${Button({ variant: "link", href: "/projekte", children: "Abbrechen" })}
          ${Button({ variant: "primary", type: "submit", children: "Speichern" })}
        </div>
      </form>
    </div>
  `;
}
