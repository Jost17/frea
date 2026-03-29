import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { AppError, logAndRespond } from "../middleware/error-handler";
import { getSettings, updateSettings } from "../db/queries";
import { settingsSchema } from "../validation/schemas";
import { Layout } from "../templates/layout";

export const settingsRoutes = new Hono<AppEnv>();

settingsRoutes.get("/", (c) => {
  try {
    const settings = getSettings();
    if (!settings) {
      throw new AppError("Einstellungen nicht initialisiert", 500);
    }

    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Einstellungen",
        activeNav: "einstellungen",
        overdueCount,
        children: html`
          <div class="max-w-2xl">
            <h1 class="mb-6 text-2xl font-semibold">Firmeneinstellungen</h1>
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
                    />
                  </div>

                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      id="kleinunternehmer"
                      name="kleinunternehmer"
                      value="1"
                      ${settings.kleinunternehmer === 1 ? "checked" : ""}
                      class="h-4 w-4 rounded border-gray-300"
                    />
                    <label for="kleinunternehmer" class="ml-2 text-sm font-medium text-gray-700"
                      >Kleinunternehmer (§19 UStG)</label
                    >
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
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono text-sm"
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
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono text-sm"
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
                        >Präfix</label
                      >
                      <input
                        type="text"
                        id="invoice_prefix"
                        name="invoice_prefix"
                        value="${settings.invoice_prefix}"
                        class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
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
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              <div class="flex justify-end gap-4 border-t border-gray-200 pt-6">
                <button
                  type="submit"
                  class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
    const body = await c.req.formData();

    const data = {
      company_name: String(body.get("company_name") ?? ""),
      address: String(body.get("address") ?? ""),
      postal_code: String(body.get("postal_code") ?? ""),
      city: String(body.get("city") ?? ""),
      country: "Deutschland",
      email: String(body.get("email") ?? ""),
      phone: String(body.get("phone") ?? ""),
      mobile: "",
      bank_name: String(body.get("bank_name") ?? ""),
      iban: String(body.get("iban") ?? ""),
      bic: String(body.get("bic") ?? ""),
      tax_number: String(body.get("tax_number") ?? ""),
      ust_id: String(body.get("ust_id") ?? ""),
      vat_rate: parseFloat(String(body.get("vat_rate") ?? "0.19")),
      payment_days: parseInt(String(body.get("payment_days") ?? "28")),
      invoice_prefix: String(body.get("invoice_prefix") ?? "RE"),
      kleinunternehmer: body.has("kleinunternehmer") ? 1 : 0,
    };

    const validated = settingsSchema.parse(data);
    updateSettings(validated);

    return c.redirect("/einstellungen?success=1");
  } catch (err) {
    if (err instanceof Error) {
      console.error("[settings POST] Validation error:", err);
      throw new AppError(err.message, 400);
    }
    return logAndRespond(c, err, "Einstellungen konnte nicht gespeichert werden", 500);
  }
});
