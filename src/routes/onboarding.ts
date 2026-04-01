import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { AppError, logAndRespond } from "../middleware/error-handler";
import { updateSettings } from "../db/queries";
import { parseFormFields } from "../utils/form-parser";
import { z } from "zod";

export const onboardingRoutes = new Hono<AppEnv>();

const ONBOARDING_FIELDS = {
  company_name: "string",
  address: "string",
  postal_code: "string",
  city: "string",
  email: "string",
  tax_number: "string",
  ust_id: "string",
  iban: "string",
  bic: "string",
  bank_name: "string",
  kleinunternehmer: "bool",
} as const;

const onboardingSchema = z.object({
  company_name: z
    .string()
    .min(1, "Firmenname erforderlich")
    .refine((v) => v !== "Mein Unternehmen", "Bitte einen echten Firmennamen eingeben"),
  address: z.string().min(1, "Straße erforderlich"),
  postal_code: z.string().refine((v) => /^\d{5}$/.test(v), "PLZ muss 5 Ziffern haben"),
  city: z.string().min(1, "Stadt erforderlich"),
  email: z.string().email("Gültige E-Mail erforderlich"),
  tax_number: z.string().optional().default(""),
  ust_id: z.string().optional().default(""),
  iban: z
    .string()
    .min(1, "IBAN erforderlich")
    .refine((v) => /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(v), "Ungültige IBAN"),
  bic: z.string().min(1, "BIC erforderlich"),
  bank_name: z.string().optional().default(""),
  kleinunternehmer: z.number().default(0),
});

function OnboardingPage(errorMsg?: string) {
  return html`<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FREA — Einrichtung</title>
    <link rel="stylesheet" href="/static/styles.css" />
  </head>
  <body class="min-h-screen bg-bg-base flex items-center justify-center py-12 px-4">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded">
      Zum Hauptinhalt
    </a>
    <main id="main-content" class="w-full max-w-xl">
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-text-primary">Willkommen bei FREA</h1>
        <p class="mt-2 text-text-secondary">Richte dein Freelancer-Tool in 2 Minuten ein. Du brauchst nur deine Firmendaten und Bankverbindung.</p>
      </div>

      ${
        errorMsg
          ? html`<div role="alert" class="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              ${errorMsg}
            </div>`
          : ""
      }

      <form method="post" action="/onboarding" class="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        <fieldset>
          <legend class="mb-4 text-lg font-semibold text-gray-900">Allgemeine Informationen</legend>
          <div class="space-y-4">
            <div>
              <label for="company_name" class="block text-sm font-medium text-gray-700">Firma *</label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                required
                autocomplete="organization"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p class="mt-1 text-xs text-gray-500">So erscheinst du auf deinen Rechnungen.</p>
            </div>
            <div>
              <label for="address" class="block text-sm font-medium text-gray-700">Straße und Hausnummer *</label>
              <input
                type="text"
                id="address"
                name="address"
                required
                autocomplete="street-address"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="postal_code" class="block text-sm font-medium text-gray-700">PLZ *</label>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  required
                  pattern="[0-9]{5}"
                  maxlength="5"
                  autocomplete="postal-code"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label for="city" class="block text-sm font-medium text-gray-700">Stadt *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  required
                  autocomplete="address-level2"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p class="mt-1 text-xs text-gray-500">Für Rechnungsversand und Kontakt.</p>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend class="mb-4 text-lg font-semibold text-gray-900">Steuerdaten</legend>
          <p class="mb-3 text-sm text-gray-500">Mindestens Steuernummer oder Ust-IdNr. angeben.</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="tax_number" class="block text-sm font-medium text-gray-700">Steuernummer</label>
              <input
                type="text"
                id="tax_number"
                name="tax_number"
                placeholder="12/345/67890"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p class="mt-1 text-xs text-gray-500">Vom Finanzamt zugeteilte Nummer.</p>
            </div>
            <div>
              <label for="ust_id" class="block text-sm font-medium text-gray-700">Ust-IdNr.</label>
              <input
                type="text"
                id="ust_id"
                name="ust_id"
                placeholder="DE123456789"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p class="mt-1 text-xs text-gray-500">Nur nötig wenn du EU-weit Rechnungen stellst.</p>
            </div>
          </div>
          <div class="mt-4 flex items-center">
            <input
              type="checkbox"
              id="kleinunternehmer"
              name="kleinunternehmer"
              value="1"
              class="h-4 w-4 rounded border-gray-300 focus:ring-primary"
            />
            <label for="kleinunternehmer" class="ml-2 text-sm font-medium text-gray-700">
              Kleinunternehmer (§19 UStG)
            </label>
          </div>
          <p class="mt-1 ml-6 text-xs text-gray-500">Aktivieren, wenn du keine MwSt. ausweist.</p>
        </fieldset>

        <fieldset>
          <legend class="mb-4 text-lg font-semibold text-gray-900">Bankdaten</legend>
          <div class="space-y-4">
            <div>
              <label for="bank_name" class="block text-sm font-medium text-gray-700">Bankname</label>
              <input
                type="text"
                id="bank_name"
                name="bank_name"
                autocomplete="off"
                class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p class="mt-1 text-xs text-gray-500">Wird auf deinen Rechnungen abgedruckt.</p>
              </div>
              <div>
                <label for="bic" class="block text-sm font-medium text-gray-700">BIC *</label>
                <input
                  type="text"
                  id="bic"
                  name="bic"
                  required
                  autocomplete="off"
                  class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </fieldset>

        <div class="flex justify-end border-t border-gray-200 pt-6">
          <button
            type="submit"
            class="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Einrichtung abschließen
          </button>
        </div>
      </form>
    </main>
  </body>
</html>`;
}

onboardingRoutes.get("/", (c) => {
  return c.html(OnboardingPage());
});

onboardingRoutes.post("/", async (c) => {
  try {
    const body = await c.req.formData();
    const data = parseFormFields(body, ONBOARDING_FIELDS);

    const parsed = onboardingSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Ungültige Eingabe";
      return c.html(OnboardingPage(firstError), 422);
    }

    const { tax_number, ust_id } = parsed.data;
    if (!tax_number && !ust_id) {
      return c.html(OnboardingPage("Steuernummer oder Ust-IdNr. ist erforderlich"), 422);
    }

    updateSettings(parsed.data);
    return c.redirect("/");
  } catch (err) {
    if (err instanceof AppError) {
      return c.html(OnboardingPage(err.message), 422);
    }
    return logAndRespond(c, err, "Einrichtung konnte nicht gespeichert werden", 500);
  }
});
