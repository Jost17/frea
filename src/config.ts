// Fail fast if required env vars are missing
const REQUIRED = ["COMPANY_NAME", "EMAIL", "IBAN", "BIC", "TAX_NUMBER"];
const missing = REQUIRED.filter((k) => !Bun.env[k]);

if (missing.length) {
  console.error(`Fehlende Umgebungsvariablen: ${missing.join(", ")}`);
  console.error("Starte mit: cp .env.example .env.local && editor .env.local");
  process.exit(1);
}

export const config = {
  companyName: Bun.env.COMPANY_NAME!,
  address: Bun.env.ADDRESS ?? "",
  postalCode: Bun.env.POSTAL_CODE ?? "",
  city: Bun.env.CITY ?? "",
  country: Bun.env.COUNTRY ?? "Deutschland",
  email: Bun.env.EMAIL!,
  phone: Bun.env.PHONE ?? "",
  mobile: Bun.env.MOBILE ?? "",
  bankName: Bun.env.BANK_NAME ?? "",
  iban: Bun.env.IBAN!,
  bic: Bun.env.BIC!,
  taxNumber: Bun.env.TAX_NUMBER!,
  ustId: Bun.env.UST_ID ?? "",
};
