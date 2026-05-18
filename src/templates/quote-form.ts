import { html } from "hono/html";
import type { Client } from "../validation/schemas";

type ActiveClient = Omit<Client, "created_at" | "archived">;

interface QuoteFormProps {
  clients: ActiveClient[];
  vatRate: number;
  isKleinunternehmer: boolean;
}

export function renderQuoteForm({ clients, vatRate, isKleinunternehmer }: QuoteFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const validUntilDefault = new Date();
  validUntilDefault.setDate(validUntilDefault.getDate() + 30);
  const validUntilStr = validUntilDefault.toISOString().split("T")[0];

  const displayVatRate = (isKleinunternehmer ? 0 : vatRate * 100).toFixed(0);
  const vatRateValue = isKleinunternehmer ? 0 : vatRate;

  const clientOptions = clients.map((c) => html`<option value="${c.id}">${c.name}</option>`);

  return html`
    <div class="max-w-4xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold">Neues Angebot</h1>
        <p class="text-text-secondary text-sm mt-1">Erstelle einen Kostenvoranschlag für deinen Kunden</p>
      </div>

      <form method="post" action="/angebote" id="quote-form">
        <div class="rounded-lg border border-border-subtle bg-bg-surface p-6 space-y-6">

          <!-- Kundenwahl -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="client_id" class="block text-sm font-medium text-text-primary mb-1">
                Kunde <span aria-hidden="true">*</span>
              </label>
              <select
                id="client_id"
                name="client_id"
                required
                class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Bitte wählen —</option>
                ${clientOptions}
              </select>
            </div>

            <div>
              <label for="valid_until" class="block text-sm font-medium text-text-primary mb-1">
                Gültig bis
              </label>
              <input
                type="date"
                id="valid_until"
                name="valid_until"
                value="${validUntilStr}"
                min="${today}"
                class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label for="subject" class="block text-sm font-medium text-text-primary mb-1">
              Betreff / Titel <span aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              required
              placeholder="z.B. Webentwicklung Q3 2026"
              class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label for="notes" class="block text-sm font-medium text-text-primary mb-1">
              Notizen / Bedingungen
            </label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              placeholder="Zahlungsbedingungen, Hinweise, etc."
              class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            ></textarea>
          </div>
        </div>

        <!-- Positionen -->
        <div class="mt-6 rounded-lg border border-border-subtle bg-bg-surface p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-text-primary">Positionen</h2>
            <button
              type="button"
              id="add-item-btn"
              class="rounded-md border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-bg-surface-raised"
            >
              + Position hinzufügen
            </button>
          </div>

          <div id="items-container" class="space-y-4">
            <!-- Template row (first item) -->
            <div class="item-row grid grid-cols-12 gap-2 items-end" data-index="0">
              <div class="col-span-4">
                <label class="block text-xs font-medium text-text-secondary mb-1">Beschreibung *</label>
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="Leistungsbeschreibung"
                  class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-text-secondary mb-1">Menge *</label>
                <input
                  type="number"
                  name="quantity"
                  required
                  min="0.01"
                  step="0.01"
                  value="1"
                  class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-text-secondary mb-1">Einheit</label>
                <input
                  type="text"
                  name="unit"
                  value="Tag"
                  class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div class="col-span-2">
                <label class="block text-xs font-medium text-text-secondary mb-1">Einzelpreis (€) *</label>
                <input
                  type="number"
                  name="unit_price"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div class="col-span-1">
                <label class="block text-xs font-medium text-text-secondary mb-1">MwSt %</label>
                <input
                  type="number"
                  name="vat_rate"
                  value="${vatRateValue}"
                  min="0"
                  max="1"
                  step="0.01"
                  class="block w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p class="text-xs text-text-muted mt-0.5">${displayVatRate}%</p>
              </div>
              <div class="col-span-1">
                <button
                  type="button"
                  class="remove-item-btn w-full rounded-md border border-border-subtle px-2 py-2 text-sm text-accent-danger hover:bg-red-50 disabled:opacity-30"
                  aria-label="Position entfernen"
                  disabled
                >
                  <i data-lucide="trash-2" class="h-4 w-4 mx-auto"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-6 flex justify-end gap-3">
          <a
            href="/angebote"
            class="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-raised"
          >
            Abbrechen
          </a>
          <button
            type="submit"
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Angebot erstellen
          </button>
        </div>
      </form>
    </div>

    <script>
      (function() {
        const container = document.getElementById('items-container');
        const addBtn = document.getElementById('add-item-btn');
        const defaultVatRate = ${vatRateValue};

        function updateRemoveButtons() {
          const rows = container.querySelectorAll('.item-row');
          rows.forEach(function(row) {
            const btn = row.querySelector('.remove-item-btn');
            if (btn) btn.disabled = rows.length <= 1;
          });
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        addBtn.addEventListener('click', function() {
          const rows = container.querySelectorAll('.item-row');
          const newIndex = rows.length;
          const template = rows[0].cloneNode(true);
          template.setAttribute('data-index', newIndex);
          // Clear input values in the clone
          template.querySelectorAll('input').forEach(function(input) {
            if (input.name === 'quantity') { input.value = '1'; }
            else if (input.name === 'unit') { input.value = 'Tag'; }
            else if (input.name === 'vat_rate') { input.value = defaultVatRate; }
            else { input.value = ''; }
            input.removeAttribute('required');
            if (input.name === 'description' || input.name === 'quantity' || input.name === 'unit_price') {
              input.setAttribute('required', '');
            }
          });
          const removeBtn = template.querySelector('.remove-item-btn');
          if (removeBtn) {
            removeBtn.disabled = false;
            removeBtn.addEventListener('click', function() {
              template.remove();
              updateRemoveButtons();
            });
          }
          container.appendChild(template);
          updateRemoveButtons();
        });

        container.querySelectorAll('.remove-item-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            btn.closest('.item-row').remove();
            updateRemoveButtons();
          });
        });
      })();
    </script>
  `;
}
