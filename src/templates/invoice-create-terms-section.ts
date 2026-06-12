import { html } from "hono/html";
import { SectionCard } from "./invoice-create-layout";

interface TermsSectionArgs {
  today: string;
  paymentDays: number;
  currentMonth: number;
  currentYear: number;
}

export function TermsSection({ today, paymentDays, currentMonth, currentYear }: TermsSectionArgs) {
  return SectionCard({
    number: 3,
    title: "Konditionen",
    subtitle: "Rechnungsdatum, Zeitraum und Bestellnummer (optional)",
    children: html`
      <details class="group">
        <summary class="flex cursor-pointer items-center justify-between list-none text-sm text-text-secondary hover:text-text-primary focus:outline-none">
          <span class="flex items-center gap-1.5">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Konditionen anpassen
          </span>
          <svg class="h-4 w-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>

        <div class="mt-4 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="invoice-date" class="block text-sm font-medium text-text-primary mb-1">
                Rechnungsdatum *
              </label>
              <input
                type="date"
                id="invoice-date"
                name="invoice_date"
                value="${today}"
                required
                class="block w-full rounded-lg border border-border-subtle bg-bg-canvas px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="period-month" class="block text-sm font-medium text-text-primary mb-1">
                Abrechnungsmonat *
              </label>
              <input
                type="number"
                id="period-month"
                name="period_month"
                value="${currentMonth}"
                min="1"
                max="12"
                required
                class="block w-full rounded-lg border border-border-subtle bg-bg-canvas px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label for="period-year" class="block text-sm font-medium text-text-primary mb-1">
              Abrechnungsjahr *
            </label>
            <input
              type="number"
              id="period-year"
              name="period_year"
              value="${currentYear}"
              min="2000"
              max="2099"
              required
              class="block w-full rounded-lg border border-border-subtle bg-bg-canvas px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="po-number" class="block text-sm font-medium text-text-primary mb-1">
              Bestellnummer (optional)
            </label>
            <input
              type="text"
              id="po-number"
              name="po_number"
              placeholder="z.B. PO-2026-001"
              class="block w-full rounded-lg border border-border-subtle bg-bg-canvas px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="service-from" class="block text-sm font-medium text-text-primary mb-1">
                Leistungszeitraum von
              </label>
              <input
                type="date"
                id="service-from"
                name="service_period_from"
                class="block w-full rounded-lg border border-border-subtle bg-bg-canvas px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="service-to" class="block text-sm font-medium text-text-primary mb-1">
                Leistungszeitraum bis
              </label>
              <input
                type="date"
                id="service-to"
                name="service_period_to"
                class="block w-full rounded-lg border border-border-subtle bg-bg-canvas px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <p class="text-xs text-text-secondary">
            Fälligkeit: Rechnungsdatum + ${paymentDays} Tage (aus Firmeneinstellungen)
          </p>
        </div>
      </details>
    `,
  });
}
