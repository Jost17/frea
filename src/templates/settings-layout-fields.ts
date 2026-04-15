import { html } from "hono/html";
import type { InvoiceLayoutConfig } from "../validation/schemas";

export function renderInvoiceLayoutFieldset(layoutConfig: InvoiceLayoutConfig) {
  return html`
    <fieldset>
      <legend class="mb-4 text-lg font-semibold text-gray-900">Rechnungslayout</legend>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="accent_color" class="block text-sm font-medium text-gray-700">Akzentfarbe</label>
            <input
              type="color"
              id="accent_color"
              name="accent_color"
              value="${layoutConfig.accent_color}"
              class="mt-1 block h-10 w-full rounded border border-gray-300 px-2 py-1"
            />
          </div>
          <div>
            <label for="font_size" class="block text-sm font-medium text-gray-700">Schriftgröße</label>
            <select
              id="font_size"
              name="font_size"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="sm" ${layoutConfig.font_size === "sm" ? "selected" : ""}>Klein</option>
              <option value="md" ${layoutConfig.font_size === "md" ? "selected" : ""}>Mittel</option>
              <option value="lg" ${layoutConfig.font_size === "lg" ? "selected" : ""}>Groß</option>
            </select>
          </div>
        </div>

        <div>
          <label for="paper_size" class="block text-sm font-medium text-gray-700">Papierformat</label>
          <select
            id="paper_size"
            name="paper_size"
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="a4" ${layoutConfig.paper_size === "a4" ? "selected" : ""}>A4</option>
            <option value="letter" ${layoutConfig.paper_size === "letter" ? "selected" : ""}>Letter (US)</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="show_logo" value="1" class="rounded border-gray-300" ${layoutConfig.show_logo ? "checked" : ""} />
            Platzhalter-Logo anzeigen
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="show_payment_terms" value="1" class="rounded border-gray-300" ${layoutConfig.show_payment_terms ? "checked" : ""} />
            Zahlungsbedingungen anzeigen
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="show_bank_details" value="1" class="rounded border-gray-300" ${layoutConfig.show_bank_details ? "checked" : ""} />
            Bankdaten anzeigen
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="show_tax_number" value="1" class="rounded border-gray-300" ${layoutConfig.show_tax_number ? "checked" : ""} />
            Steuerangaben anzeigen
          </label>
        </div>
      </div>
    </fieldset>
  `;
}
