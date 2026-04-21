import { Hono } from "hono";
import { completeOnboarding, getSettings, isOnboardingComplete, updateSettings } from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import { invalidateOnboardingCache } from "../middleware/onboarding-guard";
import { Layout } from "../templates/layout";
import { renderSettingsForm } from "../templates/settings-form";
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
        children: renderSettingsForm(settings, onboarding),
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
