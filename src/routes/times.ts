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
import { Button } from "../templates/components/button";
import { EmptyState } from "../templates/components/empty-state";
import { FormField } from "../templates/components/form-field";
import { Table, TableRow, Td } from "../templates/components/table";
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
            <h1 class="text-2xl font-semibold text-text-primary">Zeiteinträge</h1>
            ${Button({ href: "/zeiten/new", children: "+ Neuer Zeiteintrag" })}
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
                <p class="mb-4 text-sm text-text-muted">Hier siehst du alle noch nicht abgerechneten Zeiten.</p>
                <div class="space-y-8">
                  ${[...byClient.entries()].map(([clientName, clientEntries]) => {
                    return html`
                      <div>
                        <h2 class="text-lg font-semibold text-text-primary mb-3">${clientName}</h2>
                        ${Table({
                          columns: [
                            { label: "Projekt" },
                            { label: "Datum" },
                            { label: "Stunden", align: "right" },
                            { label: "Beschreibung" },
                            { label: "Aktion", align: "center" },
                          ],
                          rows: clientEntries.map((entry) =>
                            TableRow({
                              children: html`
                                ${Td({
                                  children: html`<span class="font-medium text-text-primary">${entry.project_name}</span>`,
                                })}
                                ${Td({ children: entry.date, extraClass: "text-text-secondary" })}
                                ${Td({
                                  align: "right",
                                  extraClass: "text-text-secondary",
                                  children: `${entry.duration.toFixed(1)}h`,
                                })}
                                ${Td({
                                  extraClass: "text-text-secondary text-xs",
                                  children: entry.description || "—",
                                })}
                                ${Td({
                                  align: "center",
                                  children: Button({
                                    variant: "link",
                                    href: `/zeiten/${entry.id}`,
                                    children: "Bearbeiten",
                                  }),
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
    const result = timeEntrySchema.safeParse(data);
    if (!result.success)
      throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    const id = createTimeEntry(result.data);
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
    const result = timeEntrySchema.safeParse(data);
    if (!result.success)
      throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    updateTimeEntry(id, result.data);

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

  const projectOptions = [
    { value: "", label: "-- Wählen --" },
    ...allProjects.map((p) => ({
      value: String(p.id),
      label: `${p.client_name} / ${p.name} (${p.code})`,
    })),
  ];

  return html`
    <div class="max-w-2xl">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-text-primary">
          ${isNew ? "Neuer Zeiteintrag" : "Zeiteintrag bearbeiten"}
        </h1>
      </div>

      <form
        method="post"
        action="${action}"
        class="space-y-6 rounded-lg border border-border-subtle bg-bg-surface p-6 shadow-card"
      >
        ${FormField({
          type: "select",
          id: "project_id",
          name: "project_id",
          label: "Projekt",
          required: true,
          value: entry ? String(entry.project_id) : "",
          options: projectOptions,
        })}

        <div class="grid grid-cols-2 gap-4">
          ${FormField({
            type: "date",
            id: "date",
            name: "date",
            label: "Datum",
            required: true,
            value: entry?.date || "",
          })}
          ${FormField({
            type: "number",
            id: "duration",
            name: "duration",
            label: "Dauer",
            required: true,
            value: entry?.duration || "",
            hint: "Dauer in Stunden (z.B. 8 für einen ganzen Tag, 4.5 für einen halben).",
            attrs: 'min="0.25" max="24" step="0.25"',
          })}
        </div>

        ${FormField({
          type: "textarea",
          id: "description",
          name: "description",
          label: "Beschreibung",
          value: entry?.description || "",
          hint: "Kurze Beschreibung der Tätigkeit. Erscheint auf der Rechnung.",
        })}

        <div>
          <div class="flex items-center">
            <input
              type="checkbox"
              id="billable"
              name="billable"
              ${entry?.billable === 1 ? "checked" : ""}
              class="h-4 w-4 rounded border-border-medium accent-primary"
              aria-describedby="billable-hint"
            />
            <label for="billable" class="ml-2 text-sm font-medium text-text-primary">Abrechenbar</label>
          </div>
          <p id="billable-hint" class="mt-1 text-xs text-text-muted">Deaktivieren für interne Aufgaben, die nicht in Rechnung gestellt werden.</p>
        </div>

        <div class="flex justify-end gap-4 border-t border-border-subtle pt-6">
          ${Button({ variant: "link", href: "/zeiten", children: "Abbrechen" })}
          ${
            !isNew
              ? html`<form method="post" action="/zeiten/${entry.id}/delete" class="inline">
                  ${Button({
                    variant: "danger",
                    type: "submit",
                    children: "Löschen",
                    attrs: `onclick="return confirm('Wirklich löschen?')"`,
                  })}
                </form>`
              : ""
          }
          ${Button({ variant: "primary", type: "submit", children: "Speichern" })}
        </div>
      </form>
    </div>
  `;
}
