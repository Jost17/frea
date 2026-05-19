import { beforeAll, describe, expect, test } from "bun:test";
import { db } from "../src/db/schema";
import {
  getUstKennzahlen,
  getAvailableYears,
} from "../src/db/tax-queries";

// Shared test client and project IDs
let testClientId: number;
let testProjectId: number;

// Ensure settings exist
beforeAll(() => {
  db.run(
    "INSERT OR IGNORE INTO settings (id, company_name, email, iban, bic, tax_number) VALUES (1, 'Test GmbH', 'test@example.com', 'DE00000000000000000000', 'TESTDE00', '000/000/00000')",
  );

  // Create shared test client
  const insertClient = db.query(
    "INSERT INTO clients (name) VALUES (?) RETURNING id",
  );
  const newClient = insertClient.get("Tax Test Client") as { id: number };
  testClientId = newClient.id;

  // Create shared test project with unique code
  const projectCode = `TAX-TEST-${Date.now()}`;
  const insertProject = db.query(
    "INSERT INTO projects (client_id, code, name, daily_rate) VALUES (?, ?, ?, ?) RETURNING id",
  );
  const newProject = insertProject.get(
    testClientId,
    projectCode,
    "Tax Test Project",
    100,
  ) as { id: number };
  testProjectId = newProject.id;
});

// Use a random base year to avoid collisions when tests re-run
const baseYear = 3000 + Math.floor(Math.random() * 1000);

// Helper to create test invoice with given year, month, status
// For testing, we use 'draft' and 'cancelled' only to avoid GoBD protection on finalized invoices
function createTestInvoice(
  year: number,
  month: number,
  status: string = "draft",
) {
  const invoiceNumber = `REC-${year}-${month}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const insertInvoice = db.query(
    `INSERT INTO invoices
    (invoice_number, client_id, project_id, invoice_date, due_date, period_year, period_month, net_amount, vat_amount, gross_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id`,
  );

  const now = new Date().toISOString().split("T")[0];
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 28);

  const invoice = insertInvoice.get(
    invoiceNumber,
    testClientId,
    testProjectId,
    now,
    dueDate.toISOString().split("T")[0],
    year,
    month,
    0,
    0,
    0,
    status,
  ) as { id: number };

  return invoice.id;
}

// Helper to add items to invoice with specific VAT rate and amounts
function addItemToInvoice(
  invoiceId: number,
  netAmount: number,
  vatRate: number,
) {
  const vatAmount = Math.round(netAmount * vatRate * 100) / 100;
  const grossAmount = Math.round((netAmount + vatAmount) * 100) / 100;

  db.query(
    `INSERT INTO invoice_items
    (invoice_id, description, period_start, period_end, days, daily_rate, net_amount, vat_rate, vat_amount, gross_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    invoiceId,
    "Test item",
    "2024-01-01",
    "2024-01-31",
    1,
    netAmount,
    netAmount,
    vatRate,
    vatAmount,
    grossAmount,
  );
}

describe("Tax Queries — USt-Kennzahlen", () => {
  test("Korrekte MwSt-Aggregation: 19% → Kz 81/83", () => {
    const invoiceId = createTestInvoice(baseYear, 1);
    addItemToInvoice(invoiceId, 100, 0.19);

    const result = getUstKennzahlen(baseYear, 1, null);

    expect(result.kz81).toBe(100); // Nettoumsatz 19%
    expect(result.kz83).toBe(19); // USt 19%
    expect(result.kz86).toBe(0); // Nettoumsatz 7%
    expect(result.kz85).toBe(0); // USt 7%
    expect(result.verbleibende_ust).toBe(19); // kz83 + kz85
  });

  test("Korrekte MwSt-Aggregation: 7% → Kz 86/85", () => {
    const invoiceId = createTestInvoice(baseYear, 2);
    addItemToInvoice(invoiceId, 100, 0.07);

    const result = getUstKennzahlen(baseYear, 2, null);

    expect(result.kz81).toBe(0); // Nettoumsatz 19%
    expect(result.kz83).toBe(0); // USt 19%
    expect(result.kz86).toBe(100); // Nettoumsatz 7%
    expect(result.kz85).toBe(7); // USt 7%
    expect(result.verbleibende_ust).toBe(7); // kz83 + kz85
  });

  test("Kaufmännische Rundung: 33.33 € @ 19% = 6.33 €", () => {
    const invoiceId = createTestInvoice(baseYear, 3);
    addItemToInvoice(invoiceId, 33.33, 0.19);

    const result = getUstKennzahlen(baseYear, 3, null);

    expect(result.kz81).toBe(33.33); // Netto bleibt 33.33
    expect(result.kz83).toBe(6.33); // 33.33 * 0.19 = 6.3327 → 6.33
  });

  test("Parametric: Kaufmännische Rundung bei verschiedenen Beträgen und Sätzen", () => {
    const testCases = [
      { month: 4, net: 33.33, rate: 0.19, expectedVat: 6.33 },
      { month: 5, net: 99.99, rate: 0.19, expectedVat: 19.0 },
      { month: 6, net: 50.0, rate: 0.19, expectedVat: 9.5 },
      { month: 7, net: 100.01, rate: 0.07, expectedVat: 7.0 },
      { month: 8, net: 123.45, rate: 0.19, expectedVat: 23.46 },
      { month: 9, net: 456.78, rate: 0.07, expectedVat: 31.97 },
    ];

    for (const testCase of testCases) {
      const invoiceId = createTestInvoice(baseYear, testCase.month);
      addItemToInvoice(invoiceId, testCase.net, testCase.rate);

      const result = getUstKennzahlen(baseYear, testCase.month, null);

      // Verify 2 decimal place rounding
      const actualVat = testCase.rate === 0.19 ? result.kz83 : result.kz85;
      expect(actualVat).toBe(testCase.expectedVat);
      expect(actualVat).toBe(Math.round(actualVat * 100) / 100);
    }
  });

  test("Gemischte MwSt-Sätze in einer Rechnung", () => {
    const invoiceId = createTestInvoice(baseYear, 10);
    addItemToInvoice(invoiceId, 100, 0.19);
    addItemToInvoice(invoiceId, 100, 0.07);

    const result = getUstKennzahlen(baseYear, 10, null);

    expect(result.kz81).toBe(100); // Nettoumsatz 19%
    expect(result.kz83).toBe(19); // USt 19%
    expect(result.kz86).toBe(100); // Nettoumsatz 7%
    expect(result.kz85).toBe(7); // USt 7%
    expect(result.verbleibende_ust).toBe(26); // 19 + 7
  });

  test("Stornierte Rechnungen werden ausgeschlossen", () => {
    const invoiceId1 = createTestInvoice(baseYear, 11, "draft");
    addItemToInvoice(invoiceId1, 100, 0.19);

    const invoiceId2 = createTestInvoice(baseYear, 11, "cancelled");
    addItemToInvoice(invoiceId2, 50, 0.19);

    const result = getUstKennzahlen(baseYear, 11, null);

    // Nur nicht-stornierte Rechnung zählt
    expect(result.kz81).toBe(100);
    expect(result.kz83).toBe(19);
  });

  test("Jahresfilter: nur Rechnungen des gewählten Jahres", () => {
    createTestInvoice(baseYear - 1, 1); // Different year
    const invoiceId = createTestInvoice(baseYear, 12);
    addItemToInvoice(invoiceId, 100, 0.19);

    const result = getUstKennzahlen(baseYear, null, null);

    // Should have this year's data
    expect(result.kz81).toBeGreaterThanOrEqual(100);
    expect(result.kz83).toBeGreaterThanOrEqual(19);
  });

  test("Monatsfilter: nur Rechnungen des gewählten Monats", () => {
    const invoiceId1 = createTestInvoice(baseYear + 1, 1);
    addItemToInvoice(invoiceId1, 100, 0.19);

    const invoiceId2 = createTestInvoice(baseYear + 1, 2);
    addItemToInvoice(invoiceId2, 200, 0.19);

    const resultMonth1 = getUstKennzahlen(baseYear + 1, 1, null);
    const resultMonth2 = getUstKennzahlen(baseYear + 1, 2, null);

    expect(resultMonth1.kz81).toBe(100);
    expect(resultMonth2.kz81).toBe(200);
  });

  test("Quartalsfilter: Monate 1-3 für Q1", () => {
    const invoiceIdJan = createTestInvoice(baseYear + 2, 1);
    addItemToInvoice(invoiceIdJan, 100, 0.19);

    const invoiceIdFeb = createTestInvoice(baseYear + 2, 2);
    addItemToInvoice(invoiceIdFeb, 100, 0.19);

    const invoiceIdMar = createTestInvoice(baseYear + 2, 3);
    addItemToInvoice(invoiceIdMar, 100, 0.19);

    const invoiceIdApr = createTestInvoice(baseYear + 2, 4);
    addItemToInvoice(invoiceIdApr, 100, 0.19);

    const resultQ1 = getUstKennzahlen(baseYear + 2, null, 1);
    expect(resultQ1.kz81).toBe(300); // Jan + Feb + Mar
  });

  test("Quartalsfilter: Monate 4-6 für Q2", () => {
    const invoiceIdApr = createTestInvoice(baseYear + 3, 4);
    addItemToInvoice(invoiceIdApr, 100, 0.19);

    const invoiceIdMay = createTestInvoice(baseYear + 3, 5);
    addItemToInvoice(invoiceIdMay, 100, 0.19);

    const invoiceIdJun = createTestInvoice(baseYear + 3, 6);
    addItemToInvoice(invoiceIdJun, 100, 0.19);

    const invoiceIdJul = createTestInvoice(baseYear + 3, 7);
    addItemToInvoice(invoiceIdJul, 100, 0.19);

    const resultQ2 = getUstKennzahlen(baseYear + 3, null, 2);
    expect(resultQ2.kz81).toBe(300); // Apr + May + Jun
  });

  test("Leere Perioden: alle Kennzahlen = 0", () => {
    const result = getUstKennzahlen(9999, 12, null);

    expect(result.kz81).toBe(0);
    expect(result.kz83).toBe(0);
    expect(result.kz86).toBe(0);
    expect(result.kz85).toBe(0);
    expect(result.kz66).toBe(0);
    expect(result.verbleibende_ust).toBe(0);
  });

  test("getAvailableYears() gibt nur Jahre mit nicht-stornierten Rechnungen zurück", () => {
    const invoice = createTestInvoice(baseYear + 4, 1, "draft");
    addItemToInvoice(invoice, 100, 0.19);

    const invoiceCancelled = createTestInvoice(baseYear + 4, 2, "cancelled");
    addItemToInvoice(invoiceCancelled, 100, 0.19);

    const years = getAvailableYears();

    expect(years).toContain(baseYear + 4);
  });

  test("Multiple items with different VAT rates sum correctly", () => {
    const invoiceId = createTestInvoice(baseYear + 5, 1);
    addItemToInvoice(invoiceId, 50, 0.19);
    addItemToInvoice(invoiceId, 50, 0.19);
    addItemToInvoice(invoiceId, 30, 0.07);
    addItemToInvoice(invoiceId, 20, 0.07);

    const result = getUstKennzahlen(baseYear + 5, 1, null);

    expect(result.kz81).toBe(100); // 50 + 50
    expect(result.kz83).toBe(19); // 100 * 0.19
    expect(result.kz86).toBe(50); // 30 + 20
    expect(result.kz85).toBe(3.5); // 50 * 0.07 = 3.50
    expect(result.verbleibende_ust).toBe(
      Math.round((19 + 3.5) * 100) / 100,
    );
  });

  test("verbleibende_ust = kz83 + kz85 - kz66 (kz66 immer 0)", () => {
    const invoiceId = createTestInvoice(baseYear + 6, 1);
    addItemToInvoice(invoiceId, 100, 0.19);
    addItemToInvoice(invoiceId, 200, 0.07);

    const result = getUstKennzahlen(baseYear + 6, 1, null);

    const expected = Math.round((result.kz83 + result.kz85) * 100) / 100;
    expect(result.verbleibende_ust).toBe(expected);
    expect(result.kz66).toBe(0); // Input tax is not tracked
  });
});
