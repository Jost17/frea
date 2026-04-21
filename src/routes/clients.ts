import { Hono } from "hono";
import {
  createClient,
  deleteClient,
  getAllActiveClients,
  getClient,
  updateClient,
} from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { Layout } from "../templates/layout";
import { renderClientForm } from "../templates/client-form";
import { renderClientList } from "../templates/client-list";
import { parseFormFields } from "../utils/form-parser";
import { clientSchema } from "../validation/schemas";

export const clientRoutes = new Hono<AppEnv>();

const CLIENT_FIELDS = {
  name: "string",
  address: "string",
  postal_code: "string",
  city: "string",
  email: "string",
  phone: "string",
  contact_person: "string",
  vat_id: "string",
  buyer_reference: "string",
  notes: "string",
} as const;

clientRoutes.get("/", (c) => {
  try {
    const clients = getAllActiveClients();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: "Kunden",
        activeNav: "kunden",
        overdueCount,
        children: renderClientList(clients),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Kunden konnten nicht geladen werden", 500);
  }
});

clientRoutes.get("/new", (c) => {
  const overdueCount = c.get("overdueCount");
  return c.html(
    Layout({
      title: "Neuer Kunde",
      activeNav: "kunden",
      overdueCount,
      children: renderClientForm(null),
    }),
  );
});

clientRoutes.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Kunden-ID", 400);

    const client = getClient(id);
    if (!client) throw new AppError("Kunde nicht gefunden", 404);

    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: `Kunde: ${client.name}`,
        activeNav: "kunden",
        overdueCount,
        children: renderClientForm(client),
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Kunde konnte nicht geladen werden", 500);
  }
});

clientRoutes.post("/", async (c) => {
  try {
    const body = await c.req.formData();
    const data = parseFormFields(body, CLIENT_FIELDS);
    const result = clientSchema.safeParse({ ...data, country: "Deutschland" });
    if (!result.success) throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    const id = createClient(result.data);
    if (!id) throw new AppError("Kunde konnte nicht erstellt werden", 500);

    return c.redirect(`/kunden/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Kunde konnte nicht erstellt werden");
  }
});

clientRoutes.post("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Kunden-ID", 400);

    const body = await c.req.formData();
    const data = parseFormFields(body, CLIENT_FIELDS);
    const result = clientSchema.safeParse({ ...data, country: "Deutschland" });
    if (!result.success) throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    updateClient(id, result.data);

    return c.redirect(`/kunden/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Kunde konnte nicht aktualisiert werden");
  }
});

clientRoutes.post("/:id/delete", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Kunden-ID", 400);

    deleteClient(id);
    return c.redirect("/kunden");
  } catch (err) {
    return logAndRespond(c, err, "Kunde konnte nicht geloescht werden", 500);
  }
});
