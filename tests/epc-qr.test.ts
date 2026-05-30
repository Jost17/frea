import { describe, expect, it } from "bun:test";
import { buildEpcString, generateEpcQrDataUrl } from "../src/lib/pdf/epc-qr";

const validInput = {
  recipientName: "Müller Beratung GmbH",
  iban: "DE89 3704 0044 0532 0130 00",
  bic: "COBADEFFXXX",
  amount: 1234.5,
  reference: "RE-2026-001",
};

describe("buildEpcString (EPC069-12 / GiroCode)", () => {
  it("produces the canonical 11-line EPC069-12 payload", () => {
    const lines = buildEpcString(validInput).split("\n");
    expect(lines).toHaveLength(11);
    expect(lines[0]).toBe("BCD"); // service tag
    expect(lines[1]).toBe("002"); // version
    expect(lines[2]).toBe("1"); // character set 1 = UTF-8 (NOT 2 = ISO 8859-1)
    expect(lines[3]).toBe("SCT"); // SEPA Credit Transfer
    expect(lines[4]).toBe("COBADEFFXXX"); // BIC
    expect(lines[5]).toBe("Müller Beratung GmbH"); // beneficiary name (UTF-8 umlaut preserved)
    expect(lines[6]).toBe("DE89370400440532013000"); // IBAN, whitespace stripped
    expect(lines[7]).toBe("EUR1234.50"); // amount with 2 decimals
    expect(lines[10]).toBe("RE-2026-001"); // unstructured remittance (reference)
  });

  it("preserves UTF-8 umlauts in the beneficiary name (charset must be 1)", () => {
    const lines = buildEpcString({ ...validInput, recipientName: "Schäfer & Söhne" }).split("\n");
    expect(lines[2]).toBe("1");
    expect(lines[5]).toBe("Schäfer & Söhne");
  });

  it("leaves the BIC line empty when no BIC is given (version 002 allows it)", () => {
    const lines = buildEpcString({ ...validInput, bic: undefined }).split("\n");
    expect(lines[4]).toBe("");
  });

  it("truncates name to 70 and reference to 140 chars", () => {
    const lines = buildEpcString({
      ...validInput,
      recipientName: "x".repeat(100),
      reference: "y".repeat(200),
    }).split("\n");
    expect(lines[5]).toHaveLength(70);
    expect(lines[10]).toHaveLength(140);
  });

  it("flattens CR/LF in fields so the line structure cannot be shifted (injection guard)", () => {
    const lines = buildEpcString({
      ...validInput,
      recipientName: "Evil\nDE99\n9999",
      reference: "ref\r\nline2",
    }).split("\n");
    // Must still be exactly 11 lines with IBAN/amount in their canonical slots.
    expect(lines).toHaveLength(11);
    expect(lines[5]).toBe("Evil DE99 9999");
    expect(lines[6]).toBe("DE89370400440532013000");
    expect(lines[7]).toBe("EUR1234.50");
    expect(lines[10]).toBe("ref line2");
  });

  it("keeps the total payload within the EPC 331-byte cap even with multibyte fields", () => {
    const payload = buildEpcString({
      ...validInput,
      recipientName: "ä".repeat(70),
      reference: "x".repeat(140),
      amount: 999999999.99,
    });
    expect(new TextEncoder().encode(payload).length).toBeLessThanOrEqual(331);
  });
});

describe("generateEpcQrDataUrl", () => {
  it("returns a PNG data URL for valid input", async () => {
    const url = await generateEpcQrDataUrl(validInput);
    expect(url).toMatch(/^data:image\/png;base64,/);
  });

  it("returns null when the IBAN is missing", async () => {
    expect(await generateEpcQrDataUrl({ ...validInput, iban: "" })).toBeNull();
  });

  it("returns null when the recipient name is missing", async () => {
    expect(await generateEpcQrDataUrl({ ...validInput, recipientName: "" })).toBeNull();
  });

  it("returns null for a non-positive amount", async () => {
    expect(await generateEpcQrDataUrl({ ...validInput, amount: 0 })).toBeNull();
  });

  it("returns null when the amount exceeds the EPC maximum (999999999.99)", async () => {
    expect(await generateEpcQrDataUrl({ ...validInput, amount: 1_000_000_000 })).toBeNull();
  });
});
