import { Hono } from "hono";
import {
  createTimeEntry,
  deleteTimeEntry,
  getAllActiveProjectsWithClient,
  getAllUnbilledTimeEntries,
  getTimeEntry,
  updateTimeEntry,
} from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { Layout } from "../templates/layout";
import { renderTimeForm } from "../templates/time-form";
import { renderTimeList } from "../templates/time-list";
import { parseFormFields } from "../utils/form-parser";
import { timeEntrySchema } from "../validation/schemas";

export const timeRoutes = new Hono<AppEnv>();

const TIME_ENTRY_FIELDS = {
  project_id: "int",
  date: "string",
  duration: "float",
  description: "string",
  billable: "bool",
} as const;

timeRoutes.get("/", (c) => {
  try {
    const entries = getAllUnbilledTimeEntries();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: "Zeiten",
        activeNav: "zeiten",
        overdueCount,
        children: renderTimeList(entries),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Zeiteintraege konnten nicht geladen werden", 500);
  }
});

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

timeRoutes.post("/", async (c) => {
  try {
    const body = await c.req.formData();
    const data = parseFormFields(body, TIME_ENTRY_FIELDS);
    const result = timeEntrySchema.safeParse(data);
    if (!result.success) throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
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
    if (Number.isNaN(id)) throw new AppError("Ungueltige Eintrag-ID", 400);

    const body = await c.req.formData();
    const data = parseFormFields(body, TIME_ENTRY_FIELDS);
    const result = timeEntrySchema.safeParse(data);
    if (!result.success) throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    updateTimeEntry(id, result.data);

    return c.redirect(`/zeiten/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Zeiteintrag konnte nicht aktualisiert werden");
  }
});

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
