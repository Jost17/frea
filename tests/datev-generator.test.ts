import { describe, expect, test } from "bun:test";
import {
  type DATEVExportParams,
  type DATEVInvoiceRow,
  encodeCP1252,
  generateDATEVExport,
} from "../src/lib/datev-generator";

const SAMPLE_ROW: DATEVInvoiceRow = {
  invoice_number: "RE-2025-0001",
  invoice_date: "2025-03-15",
  net_amount: 5000.0,
  vat_amount: 950.0,
  client_name: "Mustermann GmbH",
  effective_vat_rate: 0.19,
};

describe("generateDATEVExport", () => {
  test("returns null for empty rows", () => {
    const result = generateDATEVExport({ rows: [], year: 2025 });
    expect(result).toBeNull();
  });

  test("generates CP1252-encoded bytes", () => {
    const result = generateDATEVExport({ rows: [SAMPLE_ROW], year: 2025 });
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result!.byteLength).toBeGreaterThan(0);
  });

  test("header line starts with EXTF", () => {
    const bytes = generateDATEVExport({ rows: [SAMPLE_ROW], year: 2025 })!;
    const text = String.fromCharCode(...bytes);
    expect(text.startsWith('"EXTF"')).toBe(true);
  });

  test("header contains year in WJ-Beginn and date range", () => {
    const bytes = generateDATEVExport({ rows: [SAMPLE_ROW], year: 2025 })!;
    const text = String.fromCharCode(...bytes);
    const line1 = text.split("\r\n")[0];
    expect(line1).toContain("20250101"); // WJ-Beginn + von
    expect(line1).toContain("20251231"); // bis
  });

  test("column header line is line 2", () => {
    const bytes = generateDATEVExport({ rows: [SAMPLE_ROW], year: 2025 })!;
    const text = String.fromCharCode(...bytes);
    const line2 = text.split("\r\n")[1];
    expect(line2).toContain("Umsatz (ohne Soll/Haben-Kz)");
    expect(line2).toContain("Belegdatum");
    expect(line2).toContain("Buchungstext");
  });

  test("data row contains correct booking data", () => {
    const bytes = generateDATEVExport({ rows: [SAMPLE_ROW], year: 2025 })!;
    const text = String.fromCharCode(...bytes);
    const dataRow = text.split("\r\n")[2];
    expect(dataRow).toContain("5000,00"); // net amount, German decimal
    expect(dataRow).toContain(";S;"); // Soll
    expect(dataRow).toContain(";EUR;"); // currency
    expect(dataRow).toContain(";1400;"); // receivable account
    expect(dataRow).toContain(";8400;"); // revenue account 19%
    expect(dataRow).toContain(";1503;"); // DDMM for 2025-03-15
    expect(dataRow).toContain("RE-2025-0001");
    expect(dataRow).toContain("Mustermann GmbH");
  });

  test("uses 8300 for 7% VAT", () => {
    const row = { ...SAMPLE_ROW, effective_vat_rate: 0.07 };
    const bytes = generateDATEVExport({ rows: [row], year: 2025 })!;
    const text = String.fromCharCode(...bytes);
    expect(text).toContain(";8300;");
  });

  test("uses 8200 for 0% / Kleinunternehmer", () => {
    const row = { ...SAMPLE_ROW, effective_vat_rate: 0 };
    const bytes = generateDATEVExport({ rows: [row], year: 2025 })!;
    const text = String.fromCharCode(...bytes);
    expect(text).toContain(";8200;");
  });

  test("multiple invoices produce multiple data rows", () => {
    const rows: DATEVInvoiceRow[] = [
      SAMPLE_ROW,
      { ...SAMPLE_ROW, invoice_number: "RE-2025-0002", net_amount: 2000 },
    ];
    const bytes = generateDATEVExport({ rows, year: 2025 })!;
    const text = String.fromCharCode(...bytes);
    const lines = text.split("\r\n").filter(Boolean);
    expect(lines.length).toBe(4); // header + columns + 2 data rows
  });

  test("sanitizes semicolons in client name", () => {
    const row = { ...SAMPLE_ROW, client_name: "GmbH; Co. KG" };
    const bytes = generateDATEVExport({ rows: [row], year: 2025 })!;
    const text = String.fromCharCode(...bytes);
    const dataRow = text.split("\r\n")[2];
    // The semicolons within the name should be replaced with spaces
    expect(dataRow).toContain("GmbH  Co. KG");
  });

  test("custom beraternr and mandantnr appear in header", () => {
    const params: DATEVExportParams = {
      rows: [SAMPLE_ROW],
      year: 2025,
      beraternr: "9999",
      mandantnr: "42",
    };
    const bytes = generateDATEVExport(params)!;
    const text = String.fromCharCode(...bytes);
    const line1 = text.split("\r\n")[0];
    expect(line1).toContain(";9999;;42;");
  });
});

describe("encodeCP1252", () => {
  test("encodes ASCII unchanged", () => {
    const bytes = encodeCP1252("Hello");
    expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  test("encodes German umlauts correctly", () => {
    // ä = U+00E4 = 0xE4 in CP1252
    const bytes = encodeCP1252("äöüÄÖÜß");
    expect(bytes[0]).toBe(0xe4); // ä
    expect(bytes[1]).toBe(0xf6); // ö
    expect(bytes[2]).toBe(0xfc); // ü
    expect(bytes[3]).toBe(0xc4); // Ä
    expect(bytes[4]).toBe(0xd6); // Ö
    expect(bytes[5]).toBe(0xdc); // Ü
    expect(bytes[6]).toBe(0xdf); // ß
  });

  test("encodes euro sign as 0x80", () => {
    const bytes = encodeCP1252("€");
    expect(bytes[0]).toBe(0x80);
  });

  test("unknown codepoints become 0x3F (question mark)", () => {
    const bytes = encodeCP1252("中"); // Chinese char, not in CP1252
    expect(bytes[0]).toBe(0x3f);
  });
});
