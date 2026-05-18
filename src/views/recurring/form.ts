import { html } from "hono/html";
import type { RecurringTemplate, RecurringTemplateItem } from "../../recurring/repository";
import type { Client } from "../../validation/schemas";

type ClientListItem = Omit<Client, "created_at" | "archived">;

interface RecurringFormProps {
  clients: ClientListItem[];
  template?: RecurringTemplate;
  items?: RecurringTemplateItem[];
  error?: string;
}

function clientOptions(clients: ClientListItem[], selectedId?: number) {
  return clients.map(
    (c) =>
      html`<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${c.name}</option>`,
  );
}

function itemRow(item?: Partial<RecurringTemplateItem>, index = 0) {
  return html`
    <div class="grid grid-cols-12 gap-2 items-end recurring-item-row">
      <div class="col-span-5">
        <label class="sr-only" for="item_desc_${index}">Beschreibung</label>
        <input
          id="item_desc_${index}"
          type="text"
          name="item_description[]"
          value="${item?.description ?? ""}"
          placeholder="Beschreibung"
          required
          class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div class="col-span-2">
        <label class="sr-only" for="item_qty_${index}">Menge</label>
        <input
          id="item_qty_${index}"
          type="number"
          name="item_quantity[]"
          value="${item?.quantity ?? 1}"
          min="0.01"
          step="0.01"
          placeholder="Menge"
          required
          class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div class="col-span-2">
        <label class="sr-only" for="item_price_${index}">Einzelpreis €</label>
        <input
          id="item_price_${index}"
          type="number"
          name="item_unit_price[]"
          value="${item?.unit_price ?? ""}"
          min="0"
          step="0.01"
          placeholder="Preis €"
          required
          class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div class="col-span-2">
        <label class="sr-only" for="item_vat_${index}">MwSt %</label>
        <input
          id="item_vat_${index}"
          type="number"
          name="item_vat_rate[]"
          value="${item?.vat_rate ?? 19}"
          min="0"
          max="100"
          step="0.1"
          placeholder="MwSt %"
          required
          class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div class="col-span-1 flex justify-center">
        <button
          type="button"
          onclick="this.closest('.recurring-item-row').remove()"
          class="rounded p-1.5 text-accent-danger hover:bg-red-50"
          aria-label="Position entfernen"
        >
          <i data-lucide="trash-2" class="h-4 w-4"></i>
        </button>
      </div>
    </div>
  `;
}

export function renderRecurringForm({
  clients,
  template,
  items = [],
  error,
}: RecurringFormProps): ReturnType<typeof html> {
  const isEdit = Boolean(template);
  const action = isEdit ? `/vorlagen/${template!.id}` : "/vorlagen";
  const today = new Date().toISOString().split("T")[0];

  return html`
    <form method="POST" action="${action}" class="space-y-6 max-w-2xl">
      ${isEdit ? html`<input type="hidden" name="_method" value="PUT" />` : ""}

      ${error ? html`<div class="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">${error}</div>` : ""}

      <!-- Basis-Daten -->
      <fieldset class="rounded-lg border border-border-subtle bg-bg-surface p-5 space-y-4">
        <legend class="text-sm font-semibold text-text-primary px-1">Vorlage</legend>

        <div>
          <label for="title" class="block text-sm font-medium text-text-secondary mb-1">
            Titel <span class="text-accent-danger" aria-hidden="true">*</span>
          </label>
          <input
            id="title"
            type="text"
            name="title"
            value="${template?.title ?? ""}"
            required
            placeholder="z.B. Monatlicher Retainer"
            class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label for="client_id" class="block text-sm font-medium text-text-secondary mb-1">
            Kunde <span class="text-accent-danger" aria-hidden="true">*</span>
          </label>
          <select
            id="client_id"
            name="client_id"
            required
            class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Bitte wählen …</option>
            ${clientOptions(clients, template?.client_id)}
          </select>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label for="interval" class="block text-sm font-medium text-text-secondary mb-1">
              Intervall <span class="text-accent-danger" aria-hidden="true">*</span>
            </label>
            <select
              id="interval"
              name="interval"
              required
              class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="monthly" ${template?.interval === "monthly" ? "selected" : ""}>Monatlich</option>
              <option value="quarterly" ${template?.interval === "quarterly" ? "selected" : ""}>Vierteljährlich</option>
              <option value="yearly" ${template?.interval === "yearly" ? "selected" : ""}>Jährlich</option>
            </select>
          </div>

          <div>
            <label for="start_date" class="block text-sm font-medium text-text-secondary mb-1">
              Startdatum <span class="text-accent-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="start_date"
              type="date"
              name="start_date"
              value="${template?.start_date ?? today}"
              required
              class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label for="next_due" class="block text-sm font-medium text-text-secondary mb-1">
              Nächste Fälligkeit <span class="text-accent-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="next_due"
              type="date"
              name="next_due"
              value="${template?.next_due ?? today}"
              required
              class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label for="end_date" class="block text-sm font-medium text-text-secondary mb-1">
            Enddatum <span class="text-text-muted text-xs">(leer = unbefristet)</span>
          </label>
          <input
            id="end_date"
            type="date"
            name="end_date"
            value="${template?.end_date ?? ""}"
            class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </fieldset>

      <!-- Positionen -->
      <fieldset class="rounded-lg border border-border-subtle bg-bg-surface p-5 space-y-4">
        <legend class="text-sm font-semibold text-text-primary px-1">Positionen</legend>

        <!-- Header row -->
        <div class="grid grid-cols-12 gap-2 text-xs font-medium text-text-muted uppercase tracking-wide">
          <div class="col-span-5">Beschreibung</div>
          <div class="col-span-2">Menge</div>
          <div class="col-span-2">Preis €</div>
          <div class="col-span-2">MwSt %</div>
          <div class="col-span-1"></div>
        </div>

        <div id="recurring-items-container" class="space-y-2">
          ${items.length > 0 ? items.map((item, i) => itemRow(item, i)) : itemRow(undefined, 0)}
        </div>

        <!-- Hidden template row for JS cloning — no user content, safe DOM clone -->
        <template id="recurring-item-template">
          <div class="grid grid-cols-12 gap-2 items-end recurring-item-row">
            <div class="col-span-5">
              <label class="sr-only">Beschreibung</label>
              <input type="text" name="item_description[]" placeholder="Beschreibung" required
                class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div class="col-span-2">
              <label class="sr-only">Menge</label>
              <input type="number" name="item_quantity[]" value="1" min="0.01" step="0.01" placeholder="Menge" required
                class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div class="col-span-2">
              <label class="sr-only">Einzelpreis €</label>
              <input type="number" name="item_unit_price[]" min="0" step="0.01" placeholder="Preis €" required
                class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div class="col-span-2">
              <label class="sr-only">MwSt %</label>
              <input type="number" name="item_vat_rate[]" value="19" min="0" max="100" step="0.1" placeholder="MwSt %" required
                class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div class="col-span-1 flex justify-center">
              <button type="button" onclick="this.closest('.recurring-item-row').remove()"
                class="rounded p-1.5 text-accent-danger hover:bg-red-50" aria-label="Position entfernen">
                <i data-lucide="trash-2" class="h-4 w-4"></i>
              </button>
            </div>
          </div>
        </template>

        <button
          type="button"
          class="flex items-center gap-1.5 text-sm text-primary hover:underline"
          onclick="(function(){
            var tpl = document.getElementById('recurring-item-template');
            var clone = tpl.content.cloneNode(true);
            document.getElementById('recurring-items-container').appendChild(clone);
            if (typeof lucide !== 'undefined') lucide.createIcons();
          })()"
        >
          <i data-lucide="plus" class="h-4 w-4"></i>
          Position hinzufügen
        </button>
      </fieldset>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          class="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          ${isEdit ? "Speichern" : "Vorlage erstellen"}
        </button>
        <a
          href="/vorlagen"
          class="rounded-md border border-border-subtle px-5 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface-raised"
        >
          Abbrechen
        </a>
      </div>
    </form>
  `;
}
