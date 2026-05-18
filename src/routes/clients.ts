import { Hono } from "hono";
import { html } from "hono/html";
import {
  createClient,
  deleteClient,
  getAllActiveClients,
  getClient,
  updateClient,
} from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { Button } from "../templates/components/button";
import { EmptyState } from "../templates/components/empty-state";
import { FormField } from "../templates/components/form-field";
import { Table, TableRow, Td } from "../templates/components/table";
import { Layout } from "../templates/layout";
import { parseFormFields } from "../utils/form-parser";
import { type Client, clientSchema } from "../validation/schemas";

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

// List all clients
clientRoutes.get("/", (c) => {
  try {
    const clients = getAllActiveClients();
    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: "Kunden",
        activeNav: "kunden",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold text-text-primary">Kunden</h1>
            ${Button({ href: "/kunden/new", children: "+ Neuer Kunde" })}
          </div>

          ${
            clients.length === 0
              ? EmptyState({
                  message:
                    "Noch keine Kunden angelegt. Erstelle deinen ersten Kunden, um Projekte und Rechnungen zuordnen zu können.",
                  actionHref: "/kunden/new",
                  actionLabel: "Neuen Kunden anlegen",
                })
              : Table({
                  columns: [
                    { label: "Name" },
                    { label: "Stadt" },
                    { label: "E-Mail" },
                    { label: "Aktionen", align: "center" },
                  ],
                  rows: clients.map((client) =>
                    TableRow({
                      children: html`
                        ${Td({
                          children: html`<span class="font-medium text-text-primary">${client.name}</span>`,
                        })}
                        ${Td({ children: client.city || "—", extraClass: "text-text-secondary" })}
                        ${Td({ children: client.email || "—", extraClass: "text-text-secondary" })}
                        ${Td({
                          align: "center",
                          children: Button({
                            variant: "link",
                            href: `/kunden/${client.id}`,
                            children: "Bearbeiten",
                          }),
                        })}
                      `,
                    }),
                  ),
                })
          }
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Kunden konnten nicht geladen werden", 500);
  }
});

// New client form
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

// View/edit client
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

// Create client
clientRoutes.post("/", async (c) => {
  try {
    const body = await c.req.formData();
    const data = parseFormFields(body, CLIENT_FIELDS);
    const result = clientSchema.safeParse({ ...data, country: "Deutschland" });
    if (!result.success)
      throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    const id = createClient(result.data);
    if (!id) throw new AppError("Kunde konnte nicht erstellt werden", 500);

    return c.redirect(`/kunden/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Kunde konnte nicht erstellt werden");
  }
});

// Update client
clientRoutes.post("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungueltige Kunden-ID", 400);

    const body = await c.req.formData();
    const data = parseFormFields(body, CLIENT_FIELDS);
    const result = clientSchema.safeParse({ ...data, country: "Deutschland" });
    if (!result.success)
      throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    updateClient(id, result.data);

    return c.redirect(`/kunden/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Kunde konnte nicht aktualisiert werden");
  }
});

// Delete client
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

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderClientForm(client: Client | null) {
  const isNew = !client;
  const action = isNew ? "/kunden" : `/kunden/${client.id}`;

  return html`
    <div class="max-w-2xl">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-text-primary">
          ${isNew ? "Neuer Kunde" : `Kunde: ${client.name}`}
        </h1>
        ${
          !isNew
            ? html`<form method="post" action="/kunden/${client.id}/delete" class="inline">
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
          type: "text",
          id: "name",
          name: "name",
          label: "Name",
          required: true,
          value: client?.name || "",
          hint: "Firmenname oder Name der Person.",
        })}

        <div class="grid grid-cols-2 gap-4">
          ${FormField({
            type: "text",
            id: "postal_code",
            name: "postal_code",
            label: "PLZ",
            value: client?.postal_code || "",
          })}
          ${FormField({
            type: "text",
            id: "city",
            name: "city",
            label: "Stadt",
            value: client?.city || "",
          })}
        </div>

        ${FormField({
          type: "text",
          id: "address",
          name: "address",
          label: "Adresse",
          value: client?.address || "",
        })}

        <div class="grid grid-cols-2 gap-4">
          ${FormField({
            type: "email",
            id: "email",
            name: "email",
            label: "E-Mail",
            value: client?.email || "",
          })}
          ${FormField({
            type: "tel",
            id: "phone",
            name: "phone",
            label: "Telefon",
            value: client?.phone || "",
          })}
        </div>

        ${FormField({
          type: "text",
          id: "contact_person",
          name: "contact_person",
          label: "Kontaktperson",
          value: client?.contact_person || "",
          hint: "Optional. Erscheint auf der Rechnung als Kontaktperson.",
        })}

        <div class="grid grid-cols-2 gap-4">
          ${FormField({
            type: "text",
            id: "vat_id",
            name: "vat_id",
            label: "USt-IdNr. (Kunde)",
            value: client?.vat_id || "",
            hint: "Für innergemeinschaftliche Leistungen (Reverse Charge).",
          })}
          ${FormField({
            type: "text",
            id: "buyer_reference",
            name: "buyer_reference",
            label: "Käuferreferenz",
            value: client?.buyer_reference || "",
            hint: "Leitweg-ID oder Bestellnummer — nur nötig, wenn dein Kunde das verlangt.",
          })}
        </div>

        ${FormField({
          type: "textarea",
          id: "notes",
          name: "notes",
          label: "Notizen",
          value: client?.notes || "",
          hint: "Interne Notizen — werden nicht auf Rechnungen gedruckt.",
        })}

        <div class="flex justify-end gap-4 border-t border-border-subtle pt-6">
          ${Button({ variant: "link", href: "/kunden", children: "Abbrechen" })}
          ${Button({ variant: "primary", type: "submit", children: "Speichern" })}
        </div>
      </form>
    </div>
  `;
}
