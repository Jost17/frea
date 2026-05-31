import { html } from "hono/html";
import { INDUSTRY_PRESETS, type IndustryPreset } from "../lib/industry-presets";

const INDUSTRY_ICONS: Record<string, string> = {
  IT: "&#x1F4BB;",
  BERATUNG: "&#x1F4CA;",
  KREATIV: "&#x1F3A8;",
  HANDWERK: "&#x1F528;",
  GESUNDHEIT: "&#x1FA7A;",
  SONSTIGE: "&#x1F4CB;",
};

function baseLayout(step: number, totalSteps: number, content: unknown) {
  const pct = Math.round((step / totalSteps) * 100);
  return html`<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FREA — Einrichtung (Schritt ${step}/${totalSteps})</title>
    <link rel="stylesheet" href="/static/styles.css" />
  </head>
  <body class="min-h-screen bg-bg-base flex items-center justify-center py-12 px-4">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded">
      Zum Hauptinhalt
    </a>
    <main id="main-content" class="w-full max-w-2xl">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-bold text-text-primary">Willkommen bei FREA</h1>
        <p class="mt-1 text-sm text-text-secondary">Schritt ${step} von ${totalSteps}</p>
      </div>

      <!-- Progress bar -->
      <div class="mb-8 h-2 w-full rounded-full bg-gray-200" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Einrichtungsfortschritt ${pct}%">
        <div class="h-2 rounded-full bg-blue-600 transition-all" style="width:${pct}%"></div>
      </div>

      ${content}
    </main>
  </body>
</html>`;
}

export function OnboardingStep1() {
  const cards = Object.entries(INDUSTRY_PRESETS).map(
    ([key, preset]) => html`
      <a
        href="/onboarding?step=2&branche=${key}"
        class="group flex flex-col rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Branche auswählen: ${preset.label}"
      >
        <span class="mb-2 text-2xl" aria-hidden="true">${INDUSTRY_ICONS[key] ?? "&#x1F4CB;"}</span>
        <span class="font-semibold text-gray-900">${preset.label}</span>
        <span class="mt-1 text-xs text-gray-500">${preset.description}</span>
      </a>
    `,
  );

  return baseLayout(
    1,
    2,
    html`
      <div class="rounded-lg border border-gray-200 bg-white p-6">
        <h2 class="mb-1 text-lg font-semibold text-gray-900">Wähle deine Branche</h2>
        <p class="mb-6 text-sm text-gray-500">
          Wir füllen passende Standardwerte vor — du kannst alles im nächsten Schritt anpassen.
        </p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          ${cards}
        </div>
      </div>
    `,
  );
}

interface Step2Props {
  branche: string;
  preset: IndustryPreset;
  errorMsg?: string;
}

export function OnboardingStep2({ branche, preset, errorMsg }: Step2Props) {
  const vatPercent = (preset.vat_rate * 100).toFixed(0);

  return baseLayout(
    2,
    2,
    html`
      ${
        errorMsg
          ? html`<div role="alert" class="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            ${errorMsg}
          </div>`
          : ""
      }

      <form method="post" action="/onboarding" class="space-y-6">
        <input type="hidden" name="branche" value="${branche}" />

        <!-- Stammdaten -->
        <fieldset class="rounded-lg border border-gray-200 bg-white p-6">
          <legend class="mb-4 text-lg font-semibold text-gray-900">Firmendaten</legend>
          <div class="space-y-4">
            <div>
              <label for="company_name" class="block text-sm font-medium text-gray-700">Firma *</label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                required
                autocomplete="organization"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p class="mt-1 text-xs text-gray-500">Dein Name oder Firmenname — erscheint auf jeder Rechnung.</p>
            </div>

            <div>
              <label for="address" class="block text-sm font-medium text-gray-700">Straße und Hausnummer</label>
              <input
                type="text"
                id="address"
                name="address"
                autocomplete="street-address"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="postal_code" class="block text-sm font-medium text-gray-700">PLZ</label>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  pattern="[0-9]{5}"
                  maxlength="5"
                  autocomplete="postal-code"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label for="city" class="block text-sm font-medium text-gray-700">Stadt</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  autocomplete="address-level2"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">E-Mail *</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                autocomplete="email"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </fieldset>

        <!-- Steuerdaten -->
        <fieldset class="rounded-lg border border-gray-200 bg-white p-6">
          <legend class="mb-4 text-lg font-semibold text-gray-900">Steuerdaten</legend>
          <p class="mb-3 text-sm text-gray-500">Mindestens Steuernummer oder Ust-IdNr. angeben.</p>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="tax_number" class="block text-sm font-medium text-gray-700">Steuernummer</label>
                <input
                  type="text"
                  id="tax_number"
                  name="tax_number"
                  placeholder="12/345/67890"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label for="ust_id" class="block text-sm font-medium text-gray-700">Ust-IdNr.</label>
                <input
                  type="text"
                  id="ust_id"
                  name="ust_id"
                  placeholder="DE123456789"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label for="vat_rate" class="block text-sm font-medium text-gray-700">MwSt-Satz</label>
              <select
                id="vat_rate"
                name="vat_rate"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="0.19" ${vatPercent === "19" ? "selected" : ""}>19 % (Standard)</option>
                <option value="0.07" ${vatPercent === "7" ? "selected" : ""}>7 % (ermäßigt)</option>
                <option value="0" ${vatPercent === "0" ? "selected" : ""}>0 % (steuerbefreit)</option>
              </select>
            </div>

            <div class="flex items-start gap-2">
              <input
                type="checkbox"
                id="kleinunternehmer"
                name="kleinunternehmer"
                value="1"
                ${preset.kleinunternehmer === 1 ? "checked" : ""}
                class="mt-0.5 h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <label for="kleinunternehmer" class="text-sm font-medium text-gray-700">
                  Kleinunternehmer (§19 UStG)
                </label>
                <p class="text-xs text-gray-500">Keine MwSt. auf Rechnungen — möglich bis ca. 22.000 € Jahresumsatz.</p>
              </div>
            </div>
          </div>
        </fieldset>

        <!-- Bankdaten -->
        <fieldset class="rounded-lg border border-gray-200 bg-white p-6">
          <legend class="mb-4 text-lg font-semibold text-gray-900">Bankverbindung</legend>
          <div class="space-y-4">
            <div>
              <label for="bank_name" class="block text-sm font-medium text-gray-700">Bank</label>
              <input
                type="text"
                id="bank_name"
                name="bank_name"
                autocomplete="off"
                placeholder="z.B. Commerzbank"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="iban" class="block text-sm font-medium text-gray-700">IBAN *</label>
                <input
                  type="text"
                  id="iban"
                  name="iban"
                  required
                  autocomplete="off"
                  placeholder="DE89 3704 0044 0532 0130 00"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p class="mt-1 text-xs text-gray-500">Wird auf deinen Rechnungen gedruckt.</p>
              </div>
              <div>
                <label for="bic" class="block text-sm font-medium text-gray-700">BIC *</label>
                <input
                  type="text"
                  id="bic"
                  name="bic"
                  required
                  autocomplete="off"
                  placeholder="COBADEFFXXX"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </fieldset>

        <!-- Rechnungseinstellungen (preset) -->
        <fieldset class="rounded-lg border border-gray-200 bg-white p-6">
          <legend class="mb-4 text-lg font-semibold text-gray-900">Rechnungseinstellungen</legend>
          <p class="mb-4 text-sm text-gray-500">Vorausgefüllt für deine Branche — jederzeit in den Einstellungen änderbar.</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="invoice_prefix" class="block text-sm font-medium text-gray-700">Rechnungspräfix</label>
              <input
                type="text"
                id="invoice_prefix"
                name="invoice_prefix"
                value="${preset.invoice_prefix}"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p class="mt-1 text-xs text-gray-500">z.B. RE → RE-2026-001</p>
            </div>
            <div>
              <label for="payment_days" class="block text-sm font-medium text-gray-700">Zahlungsziel (Tage)</label>
              <input
                type="number"
                id="payment_days"
                name="payment_days"
                min="0"
                value="${preset.payment_days}"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </fieldset>

        <div class="flex items-center justify-between">
          <a href="/onboarding" class="text-sm text-gray-500 hover:text-gray-700">
            ← Branche ändern
          </a>
          <button
            type="submit"
            class="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Einrichtung abschließen →
          </button>
        </div>
      </form>
    `,
  );
}
