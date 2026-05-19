import { Hono } from "hono";
import { html, raw } from "hono/html";
import {
  completeOnboarding,
  getSettings,
  isOnboardingComplete,
  updateSettings,
} from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { invalidateOnboardingCache } from "../middleware/onboarding-guard";
import { Button } from "../templates/components/button";
import { FormField } from "../templates/components/form-field";
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
            ${
              onboarding
                ? html`
                  <div
                    class="mb-6 rounded-lg border border-accent-info/30 bg-accent-info/10 p-4"
                    role="status"
                  >
                    <h2 class="mb-1 text-base font-semibold text-text-primary">
                      Willkommen bei FREA!
                    </h2>
                    <p class="text-sm text-text-secondary">
                      Bitte gib zuerst deine Firmendaten ein. Diese werden auf allen Rechnungen
                      verwendet.
                    </p>
                  </div>
                `
                : ""
            }
            <h1 class="mb-2 text-2xl font-semibold text-text-primary">Firmeneinstellungen</h1>
            <p class="mb-6 text-sm text-text-muted">
              Deine Firmendaten und Rechnungseinstellungen. Änderungen wirken sich auf neue Rechnungen aus —
              bereits erstellte Rechnungen bleiben unverändert.
            </p>

            <form
              method="post"
              action="/einstellungen"
              class="space-y-8 rounded-lg border border-border-subtle bg-bg-surface p-6 shadow-card"
            >
              <fieldset>
                <legend class="mb-4 text-lg font-semibold text-text-primary">
                  Allgemeine Informationen
                </legend>
                <div class="space-y-4">
                  ${FormField({
                    type: "text",
                    id: "company_name",
                    name: "company_name",
                    label: "Firma",
                    required: true,
                    value: settings.company_name,
                  })}

                  <div class="grid grid-cols-2 gap-4">
                    ${FormField({
                      type: "text",
                      id: "postal_code",
                      name: "postal_code",
                      label: "PLZ",
                      value: settings.postal_code,
                    })}
                    ${FormField({
                      type: "text",
                      id: "city",
                      name: "city",
                      label: "Stadt",
                      value: settings.city,
                    })}
                  </div>

                  ${FormField({
                    type: "text",
                    id: "address",
                    name: "address",
                    label: "Adresse",
                    value: settings.address,
                  })}

                  <div class="grid grid-cols-2 gap-4">
                    ${FormField({
                      type: "email",
                      id: "email",
                      name: "email",
                      label: "E-Mail",
                      required: true,
                      value: settings.email,
                    })}
                    ${FormField({
                      type: "tel",
                      id: "phone",
                      name: "phone",
                      label: "Telefon",
                      value: settings.phone,
                    })}
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend class="mb-4 text-lg font-semibold text-text-primary">Steuerdaten</legend>
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    ${FormField({
                      type: "text",
                      id: "tax_number",
                      name: "tax_number",
                      label: "Steuernummer",
                      required: true,
                      value: settings.tax_number,
                    })}
                    ${FormField({
                      type: "text",
                      id: "ust_id",
                      name: "ust_id",
                      label: "Ust-IdNr.",
                      value: settings.ust_id,
                    })}
                  </div>

                  ${FormField({
                    type: "number",
                    id: "vat_rate",
                    name: "vat_rate",
                    label: "MwSt-Satz",
                    value: settings.vat_rate,
                    hint: "Standard ist 19%. Nur ändern bei Sonderfällen (z.B. 7% für bestimmte Leistungen).",
                    attrs: 'min="0" max="1" step="0.01"',
                  })}

                  <div>
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        id="kleinunternehmer"
                        name="kleinunternehmer"
                        value="1"
                        ${settings.kleinunternehmer === 1 ? "checked" : ""}
                        class="h-4 w-4 rounded border-border-medium accent-primary"
                        aria-describedby="kleinunternehmer-hint"
                      />
                      <label for="kleinunternehmer" class="ml-2 text-sm font-medium text-text-primary">
                        Kleinunternehmer (${raw("&#xA7;")}19 UStG)
                      </label>
                    </div>
                    <p id="kleinunternehmer-hint" class="mt-1 text-xs text-text-muted">
                      Nach §19 UStG wird keine MwSt. ausgewiesen. Auf Rechnungen erscheint ein Hinweistext.
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend class="mb-4 text-lg font-semibold text-text-primary">Bankdaten</legend>
                <div class="space-y-4">
                  ${FormField({
                    type: "text",
                    id: "bank_name",
                    name: "bank_name",
                    label: "Bankname",
                    value: settings.bank_name,
                  })}

                  <div class="grid grid-cols-2 gap-4">
                    ${FormField({
                      type: "text",
                      id: "iban",
                      name: "iban",
                      label: "IBAN",
                      required: true,
                      value: settings.iban,
                      extraClass: "font-mono",
                    })}
                    ${FormField({
                      type: "text",
                      id: "bic",
                      name: "bic",
                      label: "BIC",
                      required: true,
                      value: settings.bic,
                      extraClass: "font-mono",
                    })}
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend class="mb-4 text-lg font-semibold text-text-primary">
                  Rechnungseinstellungen
                </legend>
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    ${FormField({
                      type: "text",
                      id: "invoice_prefix",
                      name: "invoice_prefix",
                      label: "Rechnungspräfix",
                      value: settings.invoice_prefix,
                      hint: "Wird der Rechnungsnummer vorangestellt (z.B. RE-2026-001).",
                    })}
                    ${FormField({
                      type: "number",
                      id: "payment_days",
                      name: "payment_days",
                      label: "Zahlungsziel (Tage)",
                      value: settings.payment_days,
                      hint: "Frist in Tagen, die dein Kunde zum Bezahlen hat. Standard: 28 Tage.",
                      attrs: 'min="0"',
                    })}
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend class="mb-4 text-lg font-semibold text-text-primary">
                  E-Mail-Versand (SMTP)
                </legend>
                <p class="mb-4 text-sm text-text-secondary">
                  Konfiguriere SMTP-Einstellungen für den automatischen Rechnungsversand per E-Mail.
                </p>
                <div class="space-y-4">
                  ${FormField({
                    type: "text",
                    id: "smtp_host",
                    name: "smtp_host",
                    label: "SMTP-Server",
                    placeholder: "z.B. mail.example.com",
                    value: settings.smtp_host || "",
                    hint: "Hostname deines Mail-Servers — meist unter 'E-Mail-Einstellungen' bei deinem Hosting-Anbieter.",
                  })}

                  <div class="grid grid-cols-2 gap-4">
                    ${FormField({
                      type: "number",
                      id: "smtp_port",
                      name: "smtp_port",
                      label: "Port",
                      placeholder: "587 oder 465",
                      value: settings.smtp_port ?? "",
                      hint: "587 für STARTTLS (empfohlen) · 465 für SSL/TLS.",
                      attrs: 'min="1" max="65535"',
                    })}
                    ${FormField({
                      type: "text",
                      id: "smtp_user",
                      name: "smtp_user",
                      label: "Benutzer",
                      placeholder: "dein@email.com",
                      value: settings.smtp_user || "",
                      hint: "Meist identisch mit der E-Mail-Adresse.",
                    })}
                  </div>

                  ${FormField({
                    type: "text",
                    id: "smtp_password",
                    name: "smtp_password",
                    label: "Passwort",
                    placeholder: "Dein SMTP-Passwort",
                    value: settings.smtp_password || "",
                    hint: "Bei Gmail oder Outlook: App-Passwort verwenden, nicht das normale Account-Passwort.",
                  })}

                  ${FormField({
                    type: "email",
                    id: "smtp_from",
                    name: "smtp_from",
                    label: "Von-Adresse",
                    placeholder: "z.B. rechnungen@example.com",
                    value: settings.smtp_from || "",
                    hint: "Erscheint beim Empfänger als Absender-Adresse.",
                  })}
                </div>
              </fieldset>

              <div class="flex justify-end border-t border-border-subtle pt-6">
                ${Button({ variant: "primary", type: "submit", children: "Speichern" })}
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
    if (!result.success)
      throw new AppError(result.error.issues[0]?.message ?? "Ungültige Eingabe", 422);
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
