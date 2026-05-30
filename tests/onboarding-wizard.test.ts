import { describe, expect, test } from "bun:test";
import { app } from "../src/app";
import { DEFAULT_PRESET, INDUSTRY_PRESETS } from "../src/lib/industry-presets";

const VALID_FORM: Record<string, string> = {
  company_name: "Musterfirma GmbH",
  address: "Musterstraße 1",
  postal_code: "20095",
  city: "Hamburg",
  email: "info@musterfirma.de",
  tax_number: "22/123/45678",
  ust_id: "",
  iban: "DE89370400440532013000",
  bic: "COBADEFFXXX",
  bank_name: "Commerzbank",
  kleinunternehmer: "0",
  vat_rate: "0.19",
  payment_days: "14",
  invoice_prefix: "RE",
  branche: "IT",
};

function formBody(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

describe("Onboarding-Wizard GET", () => {
  test("GET / zeigt Schritt 1 (Branchenauswahl)", async () => {
    const res = await app.request("/onboarding");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("IT");
    expect(body).toContain("HANDWERK");
  });

  test("GET /?step=2&branche=IT zeigt vorausgefülltes Formular", async () => {
    const res = await app.request("/onboarding?step=2&branche=IT");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("14");
  });

  test("GET /?step=2 ohne Branche fällt auf DEFAULT_PRESET zurück", async () => {
    const res = await app.request("/onboarding?step=2");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain(String(DEFAULT_PRESET.payment_days));
  });
});

describe("Onboarding-Wizard Branchen-Presets", () => {
  test("IT-Preset hat 14 Zahlungstage", () => {
    expect(INDUSTRY_PRESETS.IT.payment_days).toBe(14);
  });

  test("HANDWERK-Preset hat 30 Zahlungstage", () => {
    expect(INDUSTRY_PRESETS.HANDWERK.payment_days).toBe(30);
  });

  test("SONSTIGE-Preset hat 30 Zahlungstage", () => {
    expect(INDUSTRY_PRESETS.SONSTIGE.payment_days).toBe(30);
  });

  test("DEFAULT_PRESET ist SONSTIGE", () => {
    expect(DEFAULT_PRESET).toBe(INDUSTRY_PRESETS.SONSTIGE);
  });

  test("Alle 6 Branchen sind definiert", () => {
    const expected = ["IT", "BERATUNG", "KREATIV", "HANDWERK", "GESUNDHEIT", "SONSTIGE"];
    for (const key of expected) {
      expect(INDUSTRY_PRESETS[key]).toBeDefined();
    }
  });
});

describe("Onboarding-Wizard POST", () => {
  test("Valides Formular leitet zu /?onboarding_done=1 weiter", async () => {
    const res = await app.request("/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody(VALID_FORM),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/?onboarding_done=1");
  });

  test("Fehlendes company_name liefert 422", async () => {
    const { company_name: _, ...noName } = VALID_FORM;
    const res = await app.request("/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody(noName),
    });
    expect(res.status).toBe(422);
  });

  test("Ungültige IBAN liefert 422", async () => {
    const res = await app.request("/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({ ...VALID_FORM, iban: "INVALID" }),
    });
    expect(res.status).toBe(422);
  });
});
