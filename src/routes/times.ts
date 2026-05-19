import { Hono } from "hono";
import { html } from "hono/html";
import {
  createTimeEntry,
  deleteTimeEntry,
  deleteTimer,
  getActiveTimerForProject,
  getAllActiveProjectsWithClient,
  getAllActiveTimers,
  getAllUnbilledTimeEntries,
  getTimeEntriesForWeek,
  getTimeEntry,
  startTimer,
  stopTimer,
  type TimeEntryWithContext,
  updateTimeEntry,
  upsertTimeEntryByProjectDate,
} from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { EmptyState } from "../templates/components/empty-state";
import { Layout } from "../templates/layout";
import {
  renderTimeForm,
  renderTimerSection,
  renderTimerStartForm,
  renderUnbilledList,
} from "../templates/times-list";
import { renderCellContent, renderCellForm, renderWeekGrid } from "../templates/times-week";
import { parseDuration } from "../utils/duration-parser";
import { parseFormFields } from "../utils/form-parser";
import { getIsoWeekBounds, shiftWeek, todayIso } from "../utils/iso-week";
import { timeEntrySchema } from "../validation/schemas";

export const timeRoutes = new Hono<AppEnv>();

const TIME_ENTRY_FIELDS = {
  project_id: "int",
  date: "string",
  duration: "string", // raw text — parsed manually before Zod
  description: "string",
  billable: "bool",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDurationField(raw: string): number {
  const parsed = parseDuration(raw);
  if (parsed === null) throw new AppError("Ungültige Dauerangabe", 422);
  return parsed;
}

// ─── List all unbilled time entries ───────────────────────────────────────────

timeRoutes.get("/", (c) => {
  try {
    const entries = getAllUnbilledTimeEntries();
    const timers = getAllActiveTimers();
    const allProjects = getAllActiveProjectsWithClient();
    const overdueCount = c.get("overdueCount");

    // Two-level grouping: client → project
    const byClient = new Map<string, Map<string, TimeEntryWithContext[]>>();
    for (const e of entries) {
      if (!byClient.has(e.client_name)) {
        byClient.set(e.client_name, new Map());
      }
      const byProject = byClient.get(e.client_name)!;
      if (!byProject.has(e.project_name)) {
        byProject.set(e.project_name, []);
      }
      byProject.get(e.project_name)!.push(e);
    }

    return c.html(
      Layout({
        title: "Zeiten",
        activeNav: "zeiten",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Zeiteinträge</h1>
            <div class="flex gap-2">
              <a
                href="/zeiten/woche"
                class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Wochenansicht
              </a>
              <button
                type="button"
                onclick="document.getElementById('timer-start-form').classList.toggle('hidden')"
                class="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                &#9654; Timer starten
              </button>
              <a
                href="/zeiten/new"
                class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Neuer Zeiteintrag
              </a>
            </div>
          </div>

          ${renderTimerStartForm(allProjects)}

          <!-- Active Timers (HTMX polling every 5s) -->
          <div
            id="timer-section"
            hx-get="/zeiten/timer/status"
            hx-trigger="load, every 5s"
            hx-target="#timer-section"
            hx-swap="outerHTML"
          >
            ${renderTimerSection(timers)}
          </div>

          ${
            byClient.size === 0
              ? EmptyState({
                  message:
                    "Keine Zeiteinträge vorhanden. Erstelle einen Zeiteintrag, um geleistete Stunden zu dokumentieren.",
                  actionHref: "/zeiten/new",
                  actionLabel: "Zeit erfassen",
                })
              : renderUnbilledList(byClient)
          }
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Zeiteinträge konnten nicht geladen werden", 500);
  }
});

// ─── Timer routes ─────────────────────────────────────────────────────────────

timeRoutes.get("/timer/status", (c) => {
  try {
    const timers = getAllActiveTimers();
    return c.html(renderTimerSection(timers) as unknown as string);
  } catch (err) {
    return logAndRespond(c, err, "Timer-Status konnte nicht geladen werden", 500);
  }
});

timeRoutes.post("/timer/start", async (c) => {
  try {
    const body = await c.req.formData();
    const projectId = parseInt(body.get("project_id") as string, 10);
    const description = (body.get("description") as string | null) ?? "";

    if (Number.isNaN(projectId) || projectId <= 0) {
      throw new AppError("Ungültiges Projekt", 422);
    }

    const existing = getActiveTimerForProject(projectId);
    if (existing) throw new AppError("Für dieses Projekt läuft bereits ein Timer", 409);

    startTimer(projectId, description.trim());
    return c.redirect("/zeiten");
  } catch (err) {
    return handleMutationError(c, err, "Timer konnte nicht gestartet werden");
  }
});

timeRoutes.post("/timer/:id/stop", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Timer-ID", 400);

    const body = await c.req.formData();
    const description = ((body.get("description") as string | null) ?? "").trim();

    const result = stopTimer(id);
    if (!result) throw new AppError("Timer nicht gefunden", 404);

    createTimeEntry({
      project_id: result.projectId,
      date: result.date,
      duration: result.durationHours,
      description,
      billable: 1,
    });

    return c.redirect("/zeiten");
  } catch (err) {
    return handleMutationError(c, err, "Timer konnte nicht gestoppt werden");
  }
});

timeRoutes.post("/timer/:id/discard", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Timer-ID", 400);

    deleteTimer(id);
    return c.redirect("/zeiten");
  } catch (err) {
    return logAndRespond(c, err, "Timer konnte nicht verworfen werden", 500);
  }
});

// ─── Week Grid routes ─────────────────────────────────────────────────────────

timeRoutes.get("/woche", (c) => {
  const d = c.req.query("d");
  if (!d) {
    const today = todayIso();
    const { weekStart } = getIsoWeekBounds(today);
    return c.redirect(`/zeiten/woche?d=${weekStart}`);
  }

  try {
    const bounds = getIsoWeekBounds(d);
    const entries = getTimeEntriesForWeek(bounds.weekStart, bounds.weekEnd);
    const overdueCount = c.get("overdueCount");
    const todayMonday = getIsoWeekBounds(todayIso()).weekStart;

    return c.html(
      Layout({
        title: `Wochenansicht ${bounds.label}`,
        activeNav: "zeiten",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Wochenansicht</h1>
            <a href="/zeiten" class="text-sm text-blue-600 hover:underline">← Alle Zeiten</a>
          </div>
          ${renderWeekGrid({
            weekStart: bounds.weekStart,
            weekEnd: bounds.weekEnd,
            label: bounds.label,
            entries,
            prevMonday: shiftWeek(d, -1),
            nextMonday: shiftWeek(d, 1),
            todayMonday,
            currentDate: bounds.weekStart,
          })}
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Wochenansicht konnte nicht geladen werden", 500);
  }
});

timeRoutes.get("/woche/cell", (c) => {
  try {
    const projectId = parseInt(c.req.query("project_id") ?? "", 10);
    const date = c.req.query("date") ?? "";

    if (Number.isNaN(projectId) || !date) throw new AppError("Ungültige Parameter", 400);

    const entries = getTimeEntriesForWeek(date, date);
    const existing = entries.find((e) => e.project_id === projectId) ?? null;

    return c.html(renderCellForm(projectId, date, existing) as unknown as string);
  } catch (err) {
    return logAndRespond(c, err, "Zellformular konnte nicht geladen werden", 500);
  }
});

timeRoutes.get("/woche/cell/cancel", (c) => {
  try {
    const projectId = parseInt(c.req.query("project_id") ?? "", 10);
    const date = c.req.query("date") ?? "";

    if (Number.isNaN(projectId) || !date) throw new AppError("Ungültige Parameter", 400);

    const entries = getTimeEntriesForWeek(date, date);
    const existing = entries.find((e) => e.project_id === projectId) ?? null;

    return c.html(renderCellContent(existing) as unknown as string);
  } catch (err) {
    return logAndRespond(c, err, "Abbruch fehlgeschlagen", 500);
  }
});

timeRoutes.post("/woche/cell", async (c) => {
  try {
    const body = await c.req.formData();
    const projectId = parseInt((body.get("project_id") as string) ?? "", 10);
    const date = (body.get("date") as string) ?? "";
    const durationText = (body.get("duration_text") as string) ?? "";
    const entryIdRaw = body.get("entry_id") as string | null;
    const entryId = entryIdRaw ? parseInt(entryIdRaw, 10) : undefined;

    if (Number.isNaN(projectId) || !date) throw new AppError("Ungültige Parameter", 400);

    const duration = parseDurationField(durationText);
    upsertTimeEntryByProjectDate(projectId, date, duration, entryId);

    const entries = getTimeEntriesForWeek(date, date);
    const updated = entries.find((e) => e.project_id === projectId) ?? null;

    const response = c.html(renderCellContent(updated) as unknown as string);
    response.headers.set("HX-Trigger", "weekRefresh");
    return response;
  } catch (err) {
    return handleMutationError(c, err, "Zeiteintrag konnte nicht gespeichert werden");
  }
});

// ─── Entry CRUD ───────────────────────────────────────────────────────────────

timeRoutes.get("/new", (c) => {
  try {
    const allProjects = getAllActiveProjectsWithClient();
    const overdueCount = c.get("overdueCount");
    const dateParam = c.req.query("date") ?? "";

    return c.html(
      Layout({
        title: "Neuer Zeiteintrag",
        activeNav: "zeiten",
        overdueCount,
        children: renderTimeForm(null, allProjects, dateParam),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Formular konnte nicht geladen werden", 500);
  }
});

timeRoutes.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Eintrag-ID", 400);

    const entry = getTimeEntry(id);
    if (!entry) throw new AppError("Eintrag nicht gefunden", 404);

    const allProjects = getAllActiveProjectsWithClient();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: "Zeiteintrag bearbeiten",
        activeNav: "zeiten",
        overdueCount,
        children: renderTimeForm(entry, allProjects, ""),
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Eintrag konnte nicht geladen werden", 500);
  }
});

timeRoutes.post("/", async (c) => {
  try {
    const body = await c.req.formData();
    const raw = parseFormFields(body, TIME_ENTRY_FIELDS);
    const duration = parseDurationField(raw.duration as string);
    const result = timeEntrySchema.safeParse({ ...raw, duration });
    if (!result.success)
      throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    const id = createTimeEntry(result.data);
    if (!id) throw new AppError("Zeiteintrag konnte nicht erstellt werden", 500);

    return c.redirect(`/zeiten/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Zeiteintrag konnte nicht erstellt werden");
  }
});

timeRoutes.post("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Eintrag-ID", 400);

    const body = await c.req.formData();
    const raw = parseFormFields(body, TIME_ENTRY_FIELDS);
    const duration = parseDurationField(raw.duration as string);
    const result = timeEntrySchema.safeParse({ ...raw, duration });
    if (!result.success)
      throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    updateTimeEntry(id, result.data);

    return c.redirect(`/zeiten/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Zeiteintrag konnte nicht aktualisiert werden");
  }
});

timeRoutes.post("/:id/delete", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Eintrag-ID", 400);

    deleteTimeEntry(id);
    return c.redirect("/zeiten");
  } catch (err) {
    return logAndRespond(c, err, "Eintrag konnte nicht gelöscht werden", 500);
  }
});
