import { Hono } from "hono";
import { z } from "zod";
import { updateSettings } from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, logAndRespond } from "../middleware/error-handler";
import { OnboardingPage } from "../templates/onboarding-page";
import { parseFormFields } from "../utils/form-parser";

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

onboardingRoutes.get("/", (c) => {
  return c.html(OnboardingPage({}));
});

onboardingRoutes.post("/", async (c) => {
  try {
    const body = await c.req.formData();
    const data = parseFormFields(body, ONBOARDING_FIELDS);

    const parsed = onboardingSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Ungültige Eingabe";
      return c.html(OnboardingPage({ errorMsg: firstError }), 422);
    }

    const { tax_number, ust_id } = parsed.data;
    if (!tax_number && !ust_id) {
      return c.html(OnboardingPage({ errorMsg: "Steuernummer oder Ust-IdNr. ist erforderlich" }), 422);
    }

    updateSettings(parsed.data);
    return c.redirect("/");
  } catch (err) {
    if (err instanceof AppError) {
      return c.html(OnboardingPage({ errorMsg: err.message }), 422);
    }
    return logAndRespond(c, err, "Einrichtung konnte nicht gespeichert werden", 500);
  }
});
