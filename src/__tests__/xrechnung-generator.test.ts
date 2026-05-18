import { expect, test } from "bun:test";
import { generateXRechnungXML } from "../lib/xrechnung-generator";
import type { ZUGFeRDInvoiceData } from "../lib/zugferd-generator";

const SAMPLE_DATA: ZUGFeRDInvoiceData = {
  invoiceNumber: "RE-2025-001",
  invoiceDate: "2025-01-31",
  dueDate: "2025-02-28",
  periodMonth: 1,
  periodYear: 2025,
  periodStart: "2025-01-01",
  periodEnd: "2025-01-31",
  seller: {
    name: "Mustermann IT GmbH",
    address: "Musterstraße 1",
    postalCode: "20099",
    city: "Hamburg",
    country: "DE",
    email: "info@mustermann-it.de",
    taxNumber: "12345678",
    vatId: "DE123456789",
  },
  buyer: {
    name: "Bundesministerium für Digitales",
    address: "Behördenstraße 1",
    postalCode: "10117",
    city: "Berlin",
    country: "DE",
    // BT-10: Leitweg-ID mandatory for B2G
    reference: "991-12345-06",
  },
  payment: {
    iban: "DE89370400440532013000",
    bic: "COBADEFFXXX",
  },
  vat: { categoryCode: "S" },
  lineItems: [
    {
      description: "IT-Beratung Januar 2025",
      quantity: 20,
      unitPrice: 1000,
      netAmount: 20000,
    },
  ],
  totals: {
    netAmount: 20000,
    vatRate: 0.19,
    vatAmount: 3800,
    grossAmount: 23800,
  },
};

test("generates valid XRechnung 3.0 XML with CIUS-DE profile", () => {
  const xml = generateXRechnungXML(SAMPLE_DATA);

  expect(xml).toContain("<?xml");
  expect(xml).toContain("rsm:CrossIndustryInvoice");
  expect(xml).toContain(
    "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0",
  );
  expect(xml).not.toContain('"urn:cen.eu:en16931:2017"');
});

test("contains Leitweg-ID in BuyerReference", () => {
  const xml = generateXRechnungXML(SAMPLE_DATA);
  expect(xml).toContain("<ram:BuyerReference>991-12345-06</ram:BuyerReference>");
});

test("contains required EN16931 elements", () => {
  const xml = generateXRechnungXML(SAMPLE_DATA);

  for (const element of [
    "rsm:ExchangedDocumentContext",
    "rsm:ExchangedDocument",
    "rsm:SupplyChainTradeTransaction",
    "ram:SellerTradeParty",
    "ram:BuyerTradeParty",
    "ram:ApplicableHeaderTradeSettlement",
    "ram:GrandTotalAmount",
    "EUR",
  ]) {
    expect(xml).toContain(element);
  }
});

test("invoice number and amounts are correct", () => {
  const xml = generateXRechnungXML(SAMPLE_DATA);
  expect(xml).toContain("RE-2025-001");
  expect(xml).toContain("20000.00");
  expect(xml).toContain("3800.00");
  expect(xml).toContain("23800.00");
});
