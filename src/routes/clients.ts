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
            <h1 class="text-2xl font-semibold">Kunden</h1>
            <a
              href="/kunden/new"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Neuer Kunde
            </a>
          </div>

          ${
            clients.length === 0
              ? html`
                <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
                  <p class="text-sm text-gray-600">
                    Noch keine Kunden angelegt. Erstelle deinen ersten Kunden, um Projekte und Rechnungen zuordnen zu
                    können.
                  </p>
                  <a
                    href="/kunden/new"
                    class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Neuen Kunden anlegen
                  </a>
                </div>
              `
              : html`
                <div class="rounded-lg border border-gray-200 overflow-hidden bg-white">
                  <table class="w-full text-sm">
                    <thead class="border-b bg-gray-50">
                      <tr>
                        <th class="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                        <th class="px-4 py-3 text-left font-semibold text-gray-700">Stadt</th>
                        <th class="px-4 py-3 text-left font-semibold text-gray-700">E-Mail</th>
                        <th class="px-4 py-3 text-center font-semibold text-gray-700">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${clients.map((client) => {
                        return html`
                          <tr class="border-t hover:bg-gray-50">
                            <td class="px-4 py-3 font-medium text-gray-900">${client.name}</td>
                            <td class="px-4 py-3 text-gray-600">${client.city || "\u2014"}</td>
                            <td class="px-4 py-3 text-gray-600">${client.email || "\u2014"}</td>
                            <td class="px-4 py-3 text-center">
                              <a
                                href="/kunden/${client.id}"
                                class="text-blue-600 hover:underline text-xs"
                              >
                                Bearbeiten
                              </a>
                            </td>
                          </tr>
                        `;
                      })}
                    </tbody>
                  </table>
                </div>
              `
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
    const validated = clientSchema.parse({ ...data, country: "Deutschland" });
    const id = createClient(validated);
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
    const validated = clientSchema.parse({ ...data, country: "Deutschland" });
    updateClient(id, validated);

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
        <h1 class="text-2xl font-semibold">${isNew ? "Neuer Kunde" : `Kunde: ${client.name}`}</h1>
        ${
          !isNew
            ? html`<form method="post" action="/kunden/${client.id}/delete" class="inline">
              <button
                type="submit"
                onclick="return confirm('Wirklich loeschen?')"
                class="text-red-600 hover:underline text-xs"
              >
                Loeschen
              </button>
            </form>`
            : ""
        }
      </div>

      <form method="post" action="${action}" class="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value="${client?.name || ""}"
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            aria-describedby="name-hint"
          />
          <p id="name-hint" class="mt-1 text-xs text-gray-500">Firmenname oder Name der Person.</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="postal_code" class="block text-sm font-medium text-gray-700">PLZ</label>
            <input
              type="text"
              id="postal_code"
              name="postal_code"
              value="${client?.postal_code || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="city" class="block text-sm font-medium text-gray-700">Stadt</label>
            <input
              type="text"
              id="city"
              name="city"
              value="${client?.city || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label for="address" class="block text-sm font-medium text-gray-700">Adresse</label>
          <input
            type="text"
            id="address"
            name="address"
            value="${client?.address || ""}"
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">E-Mail</label>
            <input
              type="email"
              id="email"
              name="email"
              value="${client?.email || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="phone" class="block text-sm font-medium text-gray-700">Telefon</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value="${client?.phone || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label for="contact_person" class="block text-sm font-medium text-gray-700">Kontaktperson</label>
          <input
            type="text"
            id="contact_person"
            name="contact_person"
            value="${client?.contact_person || ""}"
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            aria-describedby="contact-person-hint"
          />
          <p id="contact-person-hint" class="mt-1 text-xs text-gray-500">Optional. Erscheint auf der Rechnung als Kontaktperson.</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="vat_id" class="block text-sm font-medium text-gray-700">USt-IdNr. (Kunde)</label>
            <input
              type="text"
              id="vat_id"
              name="vat_id"
              value="${client?.vat_id || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              aria-describedby="vat-id-hint"
            />
            <p id="vat-id-hint" class="mt-1 text-xs text-gray-500">Für innergemeinschaftliche Leistungen (Reverse Charge).</p>
          </div>
          <div>
            <label for="buyer_reference" class="block text-sm font-medium text-gray-700">Käuferreferenz</label>
            <input
              type="text"
              id="buyer_reference"
              name="buyer_reference"
              value="${client?.buyer_reference || ""}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              aria-describedby="buyer-ref-hint"
            />
            <p id="buyer-ref-hint" class="mt-1 text-xs text-gray-500">Leitweg-ID oder Bestellnummer — nur nötig, wenn dein Kunde das verlangt.</p>
          </div>
        </div>

        <div>
          <label for="notes" class="block text-sm font-medium text-gray-700">Notizen</label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            aria-describedby="notes-hint"
          >
${client?.notes || ""}</textarea
          >
          <p id="notes-hint" class="mt-1 text-xs text-gray-500">Interne Notizen — werden nicht auf Rechnungen gedruckt.</p>
        </div>

        <div class="flex justify-end gap-4 border-t border-gray-200 pt-6">
          <a href="/kunden" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"> Abbrechen </a>
          <button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Speichern
          </button>
        </div>
      </form>
    </div>
  `;
}
