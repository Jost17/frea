import { Hono } from "hono";
import { html } from "hono/html";
import { completeOnboarding, getSettings, isOnboardingComplete, updateSettings } from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { invalidateOnboardingCache } from "../middleware/onboarding-guard";
import { Layout } from "../templates/layout";
import { parseFormFields } from "../utils/form-parser";
import { settingsSchema } from "../validation/schemas";

export const settingsRoutes = new Hono<AppEnv>();

const SETTINGS_FIELDS = {
  company_name: "string",
  address: "string",
  postal_code: "string",
  city: "string",
  email: "string",
  phone: "string",
  bank_name: "string",
  iban: "string",
  bic: "string",
  tax_number: "string",
  ust_id: "string",
  vat_rate: "float",
  payment_days: "int",
  invoice_prefix: "string",
  kleinunternehmer: "bool",
  smtp_host: "string",
  smtp_port: "int",
  smtp_user: "string",
  smtp_password: "string",
  smtp_from: "string",
} as const;

settingsRoutes.get("/", (c) => {
  try {
    const settings = getSettings();
    if (!settings) {
      throw new AppError("Einstellungen nicht initialisiert", 500);
    }

    const onboarding = !isOnboardingComplete();
    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Einstellungen",
        activeNav: "einstellungen",
        overdueCount,
        children: html`
          <div class="max-w-2xl">
            ${onboarding
              ? html`
                  <div
                    class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4"
                    role="status"
                  >
                    <h2 class="mb-1 text-base font-semibold text-blue-900">
                      Willkommen bei FREA!
                    </h2>
                    <p class="text-sm text-blue-700">
                      Bitte gib zuerst deine Firmendaten ein. Diese werden auf allen Rechnungen
                      verwendet.
                    </p>
                  </div>
                `
              : ""}
            <h1 class="mb-2 text-2xl font-semibold">Firmeneinstellungen</h1>
            <p class="mb-6 text-sm text-gray-500">
              Deine Firmendaten und Rechnungseinstellungen. Änderungen wirken sich auf neue Rechnungen aus — bereits
              erstellte Rechnungen bleiben unverändert.
            </p>
            <form
              method="post"
              action="/einstellungen"
              class="space-y-6 rounded-lg border border-gray-200 bg-white p-6"
            >
              <fieldset>
                <legend class="mb-4 text-lg font-semibold text-gray-900">
                  Allgemeine Informationen
                </legend>
                <div class="space-y-4">
                  <div>
                    <label for="company_name" class="block text-sm font-medium text-gray-700"
                      >Firma *</label
                    >
                    <input
                      type="text"
                      id="company_name"
                      name="company_name"
                      required
                      value="${settings.company_name}"
                      class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="postal_code" class="block text-sm font-medium text-gray-700"
                        >PLZ</label
                      >
                      <input
                        type="text"
                        id="postal_code"
                        name="postal_code"
                        value="${settings.postal_code}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label for="city" class="block text-sm font-medium text-gray-700">Stadt</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value="${settings.city}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label for="address" class="block text-sm font-medium text-gray-700"
                      >Adresse</label
                    >
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value="${settings.address}"
                      class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="email" class="block text-sm font-medium text-gray-700"
                        >E-Mail *</label
                      >
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value="${settings.email}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label for="phone" class="block text-sm font-medium text-gray-700"
                        >Telefon</label
                      >
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value="${settings.phone}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend class="mb-4 text-lg font-semibold text-gray-900">Steuerdaten</legend>
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="tax_number" class="block text-sm font-medium text-gray-700"
                        >Steuernummer *</label
                      >
                      <input
                        type="text"
                        id="tax_number"
                        name="tax_number"
                        required
                        value="${settings.tax_number}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label for="ust_id" class="block text-sm font-medium text-gray-700"
                        >Ust-IdNr.</label
                      >
                      <input
                        type="text"
                        id="ust_id"
                        name="ust_id"
                        value="${settings.ust_id}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label for="vat_rate" class="block text-sm font-medium text-gray-700"
                      >MwSt-Satz</label
                    >
                    <input
                      type="number"
                      id="vat_rate"
                      name="vat_rate"
                      min="0"
                      max="1"
                      step="0.01"
                      value="${settings.vat_rate}"
                      class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      aria-describedby="vat-rate-hint"
                    />
                    <p id="vat-rate-hint" class="mt-1 text-xs text-gray-500">Standard ist 19%. Nur ändern bei Sonderfällen (z.B. 7% für bestimmte Leistungen).</p>
                  </div>

                  <div>
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        id="kleinunternehmer"
                        name="kleinunternehmer"
                        value="1"
                        ${settings.kleinunternehmer === 1 ? "checked" : ""}
                        class="h-4 w-4 rounded border-gray-300"
                        aria-describedby="kleinunternehmer-hint"
                      />
                      <label for="kleinunternehmer" class="ml-2 text-sm font-medium text-gray-700"
                        >Kleinunternehmer (\u00A719 UStG)</label
                      >
                    </div>
                    <p id="kleinunternehmer-hint" class="mt-1 text-xs text-gray-500">Nach §19 UStG wird keine MwSt. ausgewiesen. Auf Rechnungen erscheint ein Hinweistext.</p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend class="mb-4 text-lg font-semibold text-gray-900">Bankdaten</legend>
                <div class="space-y-4">
                  <div>
                    <label for="bank_name" class="block text-sm font-medium text-gray-700"
                      >Bankname</label
                    >
                    <input
                      type="text"
                      id="bank_name"
                      name="bank_name"
                      value="${settings.bank_name}"
                      class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="iban" class="block text-sm font-medium text-gray-700"
                        >IBAN *</label
                      >
                      <input
                        type="text"
                        id="iban"
                        name="iban"
                        required
                        value="${settings.iban}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label for="bic" class="block text-sm font-medium text-gray-700"
                        >BIC *</label
                      >
                      <input
                        type="text"
                        id="bic"
                        name="bic"
                        required
                        value="${settings.bic}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend class="mb-4 text-lg font-semibold text-gray-900">Rechnungseinstellungen</legend>
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="invoice_prefix" class="block text-sm font-medium text-gray-700"
                        >Rechnungspräfix</label
                      >
                      <input
                        type="text"
                        id="invoice_prefix"
                        name="invoice_prefix"
                        value="${settings.invoice_prefix}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        aria-describedby="prefix-hint"
                      />
                      <p id="prefix-hint" class="mt-1 text-xs text-gray-500">Wird der Rechnungsnummer vorangestellt (z.B. RE-2026-001).</p>
                    </div>
                    <div>
                      <label for="payment_days" class="block text-sm font-medium text-gray-700"
                        >Zahlungsziel (Tage)</label
                      >
                      <input
                        type="number"
                        id="payment_days"
                        name="payment_days"
                        min="0"
                        value="${settings.payment_days}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        aria-describedby="payment-days-hint"
                      />
                      <p id="payment-days-hint" class="mt-1 text-xs text-gray-500">Frist in Tagen, die dein Kunde zum Bezahlen hat. Standard: 28 Tage.</p>
                    </div>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend class="mb-4 text-lg font-semibold text-gray-900">E-Mail Versand (SMTP)</legend>
                <div class="space-y-4">
                  <p class="text-sm text-gray-600">
                    Konfiguriere deinen SMTP-Server um Rechnungen per E-Mail zu versenden.
                  </p>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="smtp_host" class="block text-sm font-medium text-gray-700"
                        >SMTP Server</label
                      >
                      <input
                        type="text"
                        id="smtp_host"
                        name="smtp_host"
                        placeholder="smtp.example.de"
                        value="${settings.smtp_host || ""}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        aria-describedby="smtp-host-hint"
                      />
                      <p id="smtp-host-hint" class="mt-1 text-xs text-gray-500">z.B. smtp.gmail.com oder mail.example.de</p>
                    </div>
                    <div>
                      <label for="smtp_port" class="block text-sm font-medium text-gray-700"
                        >SMTP Port</label
                      >
                      <input
                        type="number"
                        id="smtp_port"
                        name="smtp_port"
                        min="1"
                        max="65535"
                        value="${settings.smtp_port || 587}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        aria-describedby="smtp-port-hint"
                      />
                      <p id="smtp-port-hint" class="mt-1 text-xs text-gray-500">587 (TLS) oder 465 (SSL)</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="smtp_user" class="block text-sm font-medium text-gray-700"
                        >Benutzername / E-Mail</label
                      >
                      <input
                        type="text"
                        id="smtp_user"
                        name="smtp_user"
                        placeholder="deine-email@example.de"
                        value="${settings.smtp_user || ""}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label for="smtp_password" class="block text-sm font-medium text-gray-700"
                        >Passwort / Token</label
                      >
                      <input
                        type="password"
                        id="smtp_password"
                        name="smtp_password"
                        placeholder="••••••••"
                        value="${settings.smtp_password || ""}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        aria-describedby="smtp-password-hint"
                      />
                      <p id="smtp-password-hint" class="mt-1 text-xs text-gray-500">Verwende bei Gmail ein App-Passwort, nicht dein Konto-Passwort.</p>
                    </div>
                  </div>

                  <div>
                    <label for="smtp_from" class="block text-sm font-medium text-gray-700"
                      >Absender E-Mail</label
                    >
                    <input
                      type="email"
                      id="smtp_from"
                      name="smtp_from"
                      placeholder="rechnungen@example.de"
                      value="${settings.smtp_from || ""}"
                      class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      aria-describedby="smtp-from-hint"
                    />
                    <p id="smtp-from-hint" class="mt-1 text-xs text-gray-500">Die E-Mail-Adresse, von der Rechnungen versendet werden.</p>
                  </div>
                </div>
              </fieldset>

              <div class="flex justify-end gap-4 border-t border-gray-200 pt-6">
                <button
                  type="submit"
                  class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Einstellungen konnte nicht geladen werden", 500);
  }
});

settingsRoutes.post("/", async (c) => {
  try {
    const firstSetup = !isOnboardingComplete();
    const body = await c.req.formData();
    const data = parseFormFields(body, SETTINGS_FIELDS);
    const result = settingsSchema.safeParse({ ...data, country: "Deutschland" });
    if (!result.success) throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
    updateSettings(result.data);

    if (firstSetup) {
      completeOnboarding();
      invalidateOnboardingCache();
      return c.redirect("/?onboarding_done=1");
    }

    return c.redirect("/einstellungen?success=1");
  } catch (err) {
    return handleMutationError(c, err, "Einstellungen konnten nicht gespeichert werden");
  }
});
