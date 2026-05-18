import { Hono } from "hono";
import { completeOnboarding, updateSettings } from "../db/queries";
import type { AppEnv } from "../env";
import { DEFAULT_PRESET, INDUSTRY_PRESETS } from "../lib/industry-presets";
import { AppError, logAndRespond } from "../middleware/error-handler";
import { invalidateOnboardingCache } from "../middleware/onboarding-guard";
import { OnboardingStep1, OnboardingStep2 } from "../templates/onboarding-wizard";
import { parseFormFields } from "../utils/form-parser";
import { settingsSchema } from "../validation/schemas";

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
  vat_rate: "float",
  payment_days: "int",
  invoice_prefix: "string",
  branche: "string",
} as const;

onboardingRoutes.get("/", (c) => {
  const step = c.req.query("step");
  const brancheKey = (c.req.query("branche") ?? "").toUpperCase();

  if (step === "2") {
    const preset = INDUSTRY_PRESETS[brancheKey] ?? DEFAULT_PRESET;
    const branche = INDUSTRY_PRESETS[brancheKey] ? brancheKey : "SONSTIGE";
    return c.html(OnboardingStep2({ branche, preset }));
  }

  return c.html(OnboardingStep1());
});

onboardingRoutes.post("/", async (c) => {
  const body = await c.req.formData();
  const brancheKey = (body.get("branche") as string | null)?.toUpperCase() ?? "SONSTIGE";

  try {
    const data = parseFormFields(body, ONBOARDING_FIELDS);
    const result = settingsSchema.safeParse({ ...data, country: "Deutschland" });

    if (!result.success) {
      const firstError = result.error.issues[0]?.message ?? "Ungültige Eingabe";
      console.warn("[onboarding POST] Validation failed:", result.error.issues);
      const preset = INDUSTRY_PRESETS[brancheKey] ?? DEFAULT_PRESET;
      return c.html(OnboardingStep2({ branche: brancheKey, preset, errorMsg: firstError }), 422);
    }

    updateSettings(result.data);
    completeOnboarding();
    invalidateOnboardingCache();

    return c.redirect("/?onboarding_done=1");
  } catch (err) {
    if (err instanceof AppError) {
      const preset = INDUSTRY_PRESETS[brancheKey] ?? DEFAULT_PRESET;
      return c.html(OnboardingStep2({ branche: brancheKey, preset, errorMsg: err.message }), 422);
    }
    return logAndRespond(c, err, "Einrichtung konnte nicht gespeichert werden", 500);
  }
});
