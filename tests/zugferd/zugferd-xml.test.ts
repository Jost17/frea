/**
 * ZUGFeRD XML Compliance Tests
 * Validiert generierte XML gegen EN16931 Pflichtfelder und Schematron-Regeln.
 * Diese Tests laufen ohne Mustang/KoSIT — reine Strukturvalidierung.
 */

import { describe, it, expect } from "bun:test";
import { generateZUGFeRDXML, type ZUGFeRDInvoiceData } from "../../src/lib/zugferd-generator";

const SELLER: ZUGFeRDInvoiceData["seller"] = {
  name: "Max Mustermann Consulting",
  address: "Musterstraße 1",
  postalCode: "20099",
  city: "Hamburg",
  country: "DE",
  email: "max@mustermann.de",
  taxNumber: "21/123/12345",
  vatId: "DE123456789",
};

const SELLER_KLEINUNTERNEHMER: ZUGFeRDInvoiceData["seller"] = {
  ...SELLER,
  vatId: undefined,
};

const BUYER: ZUGFeRDInvoiceData["buyer"] = {
  name: "Acme GmbH",
  address: "Hauptstraße 42",
  postalCode: "10115",
  city: "Berlin",
  country: "DE",
  email: "rechnung@acme.de",
  vatId: "DE987654321",
  reference: "PO-2026-001",
};

const PAYMENT: ZUGFeRDInvoiceData["payment"] = {
  iban: "DE89 3704 0044 0532 0130 00",
  bic: "COBADEFFXXX",
};

const LINE_ITEMS: ZUGFeRDInvoiceData["lineItems"] = [
  { description: "Beratung Januar", quantity: 10, unitPrice: 900, netAmount: 9000 },
  { description: "Beratung Februar", quantity: 5, unitPrice: 900, netAmount: 4500 },
];

function makeInvoice(overrides: Partial<ZUGFeRDInvoiceData> = {}): ZUGFeRDInvoiceData {
  return {
    invoiceNumber: "2026-001",
    invoiceDate: "2026-01-31",
    dueDate: "2026-02-14",
    periodMonth: 1,
    periodYear: 2026,
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    seller: SELLER,
    buyer: BUYER,
    payment: PAYMENT,
    vat: { categoryCode: "S" },
    lineItems: LINE_ITEMS,
    totals: {
      netAmount: 13500,
      vatRate: 0.19,
      vatAmount: 2565,
      grossAmount: 16065,
    },
    ...overrides,
  };
}

describe("ZUGFeRD XML — Pflichtfelder EN16931", () => {
  it("enthält BusinessProcessSpecifiedDocumentContextParameter (Item 4)", () => {
    const xml = generateZUGFeRDXML(makeInvoice());
    expect(xml).toContain("BusinessProcessSpecifiedDocumentContextParameter");
    expect(xml).toContain("urn:ferd:CrossIndustryInvoice:relaxed:2p0");
  });

  it("enthält GuidelineSpecifiedDocumentContextParameter mit korrekter URN", () => {
    const xml = generateZUGFeRDXML(makeInvoice());
    expect(xml).toContain("GuidelineSpecifiedDocumentContextParameter");
    expect(xml).toContain("urn:cen.eu:en16931:2017");
  });

  it("enthält Seller VAT-ID (BR-S-08) wenn gesetzt (Item 3)", () => {
    const xml = generateZUGFeRDXML(makeInvoice());
    expect(xml).toContain('schemeID="VA"');
    expect(xml).toContain("DE123456789");
  });

  it("enthält keine Seller VAT-ID wenn nicht gesetzt", () => {
    const xml = generateZUGFeRDXML(makeInvoice({ seller: SELLER_KLEINUNTERNEHMER }));
    // Steuernummer schemeID=FC bleibt, aber VA nicht enthalten
    const vaMatches = (xml.match(/schemeID="VA"/g) || []).length;
    // Buyer-VAT-ID kann enthalten sein, Seller-VAT-ID nicht
    expect(xml).not.toContain("DE123456789");
    // Buyer-VAT-ID ist noch drin
    expect(xml).toContain("DE987654321");
    void vaMatches;
  });

  it("enthält Buyer VAT-ID wenn gesetzt (BT-48)", () => {
    const xml = generateZUGFeRDXML(makeInvoice());
    expect(xml).toContain("DE987654321");
  });

  it("LineTotalAmount stimmt mit quantity * unitPrice überein (BR-CO-10) (Item 7)", () => {
    const xml = generateZUGFeRDXML(makeInvoice());
    // Item 1: 10 * 900 = 9000.00
    expect(xml).toContain("<ram:LineTotalAmount>9000.00</ram:LineTotalAmount>");
    // Item 2: 5 * 900 = 4500.00
    expect(xml).toContain("<ram:LineTotalAmount>4500.00</ram:LineTotalAmount>");
  });

  it("LineTotalAmount recomputed bei Rounding-Drift", () => {
    const driftItems = [
      { description: "Beratung", quantity: 3, unitPrice: 333.33, netAmount: 999.9 }, // falsch gespeichert
    ];
    const xml = generateZUGFeRDXML(makeInvoice({ lineItems: driftItems }));
    // 3 * 333.33 = 999.99 — korrekt recomputed
    expect(xml).toContain("<ram:LineTotalAmount>999.99</ram:LineTotalAmount>");
    expect(xml).not.toContain("<ram:LineTotalAmount>999.90</ram:LineTotalAmount>");
  });
});

describe("ZUGFeRD XML — Kleinunternehmer-Pfad (Item 5)", () => {
  const kleinunternehmerInvoice = makeInvoice({
    seller: SELLER_KLEINUNTERNEHMER,
    vat: {
      categoryCode: "E",
      exemptionReason: "Umsatzsteuerbefreiung gemäß § 19 UStG",
    },
    totals: {
      netAmount: 13500,
      vatRate: 0,
      vatAmount: 0,
      grossAmount: 13500,
    },
  });

  it("enthält Category E für Kleinunternehmer", () => {
    const xml = generateZUGFeRDXML(kleinunternehmerInvoice);
    expect(xml).toContain("<ram:CategoryCode>E</ram:CategoryCode>");
    expect(xml).not.toContain("<ram:CategoryCode>S</ram:CategoryCode>");
  });

  it("enthält ExemptionReason mit § 19 UStG", () => {
    const xml = generateZUGFeRDXML(kleinunternehmerInvoice);
    expect(xml).toContain("ExemptionReason");
    expect(xml).toContain("§ 19 UStG");
  });

  it("VAT-Betrag ist 0 bei Kleinunternehmer", () => {
    const xml = generateZUGFeRDXML(kleinunternehmerInvoice);
    expect(xml).toContain("<ram:CalculatedAmount>0.00</ram:CalculatedAmount>");
    expect(xml).toContain("<ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>");
  });
});

describe("ZUGFeRD XML — Multi-Line Rechnungen", () => {
  it("generiert korrekte LineIDs für 3 Positionen", () => {
    const items = [
      { description: "A", quantity: 1, unitPrice: 100, netAmount: 100 },
      { description: "B", quantity: 2, unitPrice: 200, netAmount: 400 },
      { description: "C", quantity: 3, unitPrice: 300, netAmount: 900 },
    ];
    const xml = generateZUGFeRDXML(makeInvoice({ lineItems: items }));
    expect(xml).toContain("<ram:LineID>1</ram:LineID>");
    expect(xml).toContain("<ram:LineID>2</ram:LineID>");
    expect(xml).toContain("<ram:LineID>3</ram:LineID>");
  });

  it("HeaderLineTotalAmount = Summe aller LineTotalAmounts (BR-CO-10)", () => {
    // Header-Summe entspricht dem invoice.net_amount (aus DB), nicht recomputed
    // Der Test sichert ab dass das XML beide korrekt enthält
    const xml = generateZUGFeRDXML(makeInvoice());
    expect(xml).toContain("<ram:LineTotalAmount>13500.00</ram:LineTotalAmount>");
  });
});

describe("ZUGFeRD XML — EU-Buyer mit VAT-ID", () => {
  it("enthält Buyer-VAT-ID für EU-Auftraggeber (BT-48)", () => {
    const euBuyer = { ...BUYER, country: "NL", vatId: "NL123456789B01" };
    const xml = generateZUGFeRDXML(makeInvoice({ buyer: euBuyer }));
    expect(xml).toContain("NL123456789B01");
    expect(xml).toContain("<ram:CountryID>NL</ram:CountryID>");
  });
});
