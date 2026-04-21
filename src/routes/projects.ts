import { Hono } from "hono";
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
import { Layout } from "../templates/layout";
import { renderProjectForm, renderProjectList } from "../templates/project-list";
import { parseFormFields } from "../utils/form-parser";
import { projectSchema } from "../validation/schemas";

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

    return c.html(
      Layout({
        title: "Projekte",
        activeNav: "projekte",
        overdueCount,
        children: renderProjectList(projects),
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
    if (!result.success) throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
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
    if (!result.success) throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
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
