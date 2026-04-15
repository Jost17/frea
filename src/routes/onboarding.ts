import { Hono } from "hono";
import { ZodError } from "zod";
import { updateSettings } from "../db/queries";
import type { AppEnv } from "../env";
import { AppError, logAndRespond } from "../middleware/error-handler";
import { OnboardingPage } from "../templates/onboarding-page";
import { parseFormFields } from "../utils/form-parser";
import { onboardingCompletionSchema } from "../validation/schemas";

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

onboardingRoutes.get("/", (c) => {
  return c.html(OnboardingPage({}));
});

onboardingRoutes.post("/", async (c) => {
  try {
    const body = await c.req.formData();
    const data = parseFormFields(body, ONBOARDING_FIELDS);

    const parsed = onboardingCompletionSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Ungültige Eingabe";
      console.warn("[onboarding POST] Validation failed:", parsed.error.issues);
      return c.html(OnboardingPage({ errorMsg: firstError }), 422);
    }

    // Merge validated onboarding fields with the additional bank_name and
    // kleinunternehmer fields that the wizard captures but the completion
    // schema doesn't cover.
    updateSettings({
      ...parsed.data,
      bank_name: typeof data.bank_name === "string" ? data.bank_name : "",
      kleinunternehmer: typeof data.kleinunternehmer === "number" ? data.kleinunternehmer : 0,
    });

    return c.redirect("/");
  } catch (err) {
    if (err instanceof ZodError) {
      const msg = err.issues[0]?.message ?? "Ungültige Eingabe";
      return c.html(OnboardingPage({ errorMsg: msg }), 422);
    }
    if (err instanceof AppError) {
      return c.html(OnboardingPage({ errorMsg: err.message }), 422);
    }
    return logAndRespond(c, err, "Einrichtung konnte nicht gespeichert werden", 500);
  }
});
