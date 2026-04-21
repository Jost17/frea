// Reusable validation predicates for schema consolidation
// These functions extract complex refine() logic into discoverable, testable units

// Postal code validation (5 digits for German PLZ)
export function isValidPostalCode(value: string): boolean {
  return !value || /^\d{5}$/.test(value);
}

// Tax number validation (Steuernummer)
// Formats: "12/345/67890" (8 digits, 3 digits, 5 digits) OR "12345678901" (10-11 digits)
export function isValidTaxNumber(value: string): boolean {
  return !value || /^\d{2}\/\d{3}\/\d{5}$/.test(value) || /^\d{10,11}$/.test(value);
}

// Cross-field validation: at least one of tax_number OR ust_id must be provided
export function hasTaxIdNumber(data: { tax_number?: string; ust_id?: string }): boolean {
  return !!(data.tax_number?.trim() || data.ust_id?.trim());
}

// Email format validation (Zod's built-in .email() uses RFC 5321, but we can override)
// For now, rely on Zod's built-in .email() — this is here for future customization
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// IBAN validation (ISO 13616 MOD-97 checksum)
// Kept here for reference — exists in schemas.ts, should be consolidated
export function isValidIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(iban)) return false;
  // Move first 4 chars to end, convert letters to digits (A=10, B=11, ..., Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  // MOD-97 on large number (process in chunks to avoid BigInt dependency)
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}
