import { html } from "hono/html";
import type { Client } from "../validation/schemas";

export function renderClientForm(client: Client | null): ReturnType<typeof html> {
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
          <p id="contact-person-hint" class="mt-1 text-xs text-gray-500">
            Optional. Erscheint auf der Rechnung als Kontaktperson.
          </p>
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
            <p id="vat-id-hint" class="mt-1 text-xs text-gray-500">
              Für innergemeinschaftliche Leistungen (Reverse Charge).
            </p>
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
            <p id="buyer-ref-hint" class="mt-1 text-xs text-gray-500">
              Leitweg-ID oder Bestellnummer — nur nötig, wenn dein Kunde das verlangt.
            </p>
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
          <p id="notes-hint" class="mt-1 text-xs text-gray-500">
            Interne Notizen — werden nicht auf Rechnungen gedruckt.
          </p>
        </div>

        <div class="flex justify-end gap-4 border-t border-gray-200 pt-6">
          <a href="/kunden" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Abbrechen</a>
          <button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Speichern
          </button>
        </div>
      </form>
    </div>
  `;
}
