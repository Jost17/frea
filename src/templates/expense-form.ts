import { html } from "hono/html";
import type { Expense } from "../db/expense-queries";
import { EXPENSE_CATEGORIES_ZOD } from "../validation/schemas";

interface ExpenseFormProps {
  expense?: Expense;
  error?: string;
}

const VAT_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "0 % (steuerfrei)" },
  { value: 0.07, label: "7 % (ermäßigt)" },
  { value: 0.19, label: "19 % (Regelsteuersatz)" },
];

export function renderExpenseForm({ expense, error }: ExpenseFormProps) {
  const isEdit = Boolean(expense);
  const today = new Date().toISOString().split("T")[0];
  const action = isEdit ? `/ausgaben/${expense!.id}/edit` : "/ausgaben/create";

  return html`
    <div class="max-w-2xl">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-semibold">${isEdit ? "Ausgabe bearbeiten" : "Neue Ausgabe"}</h1>
        <a href="/ausgaben" class="text-sm text-text-secondary hover:text-text-primary">← Zurück</a>
      </div>

      ${error ? html`<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">${error}</div>` : ""}

      <form
        method="post"
        action="${action}"
        enctype="multipart/form-data"
        class="rounded-lg border border-border-subtle bg-bg-surface p-6 space-y-5"
      >
        <!-- Datum -->
        <div>
          <label for="date" class="block text-sm font-medium text-text-primary mb-1">
            Datum <span class="text-accent-danger" aria-hidden="true">*</span>
          </label>
          <input
            type="date"
            id="date"
            name="date"
            required
            value="${expense?.date ?? today}"
            class="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Beschreibung -->
        <div>
          <label for="description" class="block text-sm font-medium text-text-primary mb-1">
            Beschreibung <span class="text-accent-danger" aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="description"
            name="description"
            required
            maxlength="500"
            value="${expense?.description ?? ""}"
            placeholder="z. B. Bürostühle für Home Office"
            class="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Lieferant -->
        <div>
          <label for="vendor" class="block text-sm font-medium text-text-primary mb-1">
            Lieferant / Anbieter
          </label>
          <input
            type="text"
            id="vendor"
            name="vendor"
            maxlength="200"
            value="${expense?.vendor ?? ""}"
            placeholder="z. B. Amazon, Telekom, IKEA"
            class="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Kategorie -->
        <div>
          <label for="category" class="block text-sm font-medium text-text-primary mb-1">
            Kategorie <span class="text-accent-danger" aria-hidden="true">*</span>
          </label>
          <select
            id="category"
            name="category"
            required
            class="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            ${EXPENSE_CATEGORIES_ZOD.map(
              (cat) =>
                html`<option value="${cat}" ${expense?.category === cat ? "selected" : ""}>${cat}</option>`,
            )}
          </select>
        </div>

        <!-- Nettobetrag + MwSt-Satz -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="amount" class="block text-sm font-medium text-text-primary mb-1">
              Nettobetrag (€) <span class="text-accent-danger" aria-hidden="true">*</span>
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              required
              min="0.01"
              step="0.01"
              value="${expense?.amount.toFixed(2) ?? ""}"
              placeholder="0,00"
              class="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label for="vat_rate" class="block text-sm font-medium text-text-primary mb-1">
              Steuersatz <span class="text-accent-danger" aria-hidden="true">*</span>
            </label>
            <select
              id="vat_rate"
              name="vat_rate"
              required
              class="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              ${VAT_OPTIONS.map(
                (opt) =>
                  html`<option
                    value="${opt.value}"
                    ${
                      expense
                        ? expense.vat_rate === opt.value
                          ? "selected"
                          : ""
                        : opt.value === 0.19
                          ? "selected"
                          : ""
                    }
                  >${opt.label}</option>`,
              )}
            </select>
          </div>
        </div>

        <!-- Beleg-Upload -->
        <div>
          <label for="receipt" class="block text-sm font-medium text-text-primary mb-1">
            Beleg (PDF, JPG, PNG — max. 10 MB)
          </label>
          ${
            expense?.receipt_path
              ? html`<p class="text-xs text-text-secondary mb-2">
                Aktueller Beleg:
                <a href="/ausgaben/${expense.id}/beleg" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Öffnen</a>
                — neues Dokument hochladen um zu ersetzen
              </p>`
              : ""
          }
          <input
            type="file"
            id="receipt"
            name="receipt"
            accept=".pdf,.jpg,.jpeg,.png"
            class="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-subtle file:text-primary hover:file:bg-primary hover:file:text-white"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <button
            type="submit"
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            ${isEdit ? "Speichern" : "Ausgabe erfassen"}
          </button>
          <a
            href="/ausgaben"
            class="rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface-raised"
          >
            Abbrechen
          </a>
        </div>
      </form>

      <p class="mt-3 text-xs text-text-muted">
        MwSt wird automatisch berechnet: Brutto = Netto × (1 + Steuersatz), kaufmännisch gerundet.
      </p>
    </div>
  `;
}
