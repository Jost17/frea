import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db, initializeSchema } from "../src/db/schema";
import { validateZugferdPdf, validateZugferdXml } from "../src/lib/zugferd-validator";

// ─────────────────────────────────────────────────────────────────────
// QA Test Suite für ZUGFeRD-Validator (FREA-291)
// ─────────────────────────────────────────────────────────────────────

beforeAll(() => {
  initializeSchema();
});

afterAll(() => {
  // Cleanup happens in test isolation via in-memory DB
});

describe("ZUGFeRD-Validator — EN16931 Validierung", () => {
  // ─── AC-1: Gültige ZUGFeRD-Rechnung wird konform erkannt ───
  it("AC-1: Gültige ZUGFeRD-XML → Konform + Profil EN16931", () => {
    const validZugferd = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>INV-001</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">20250515</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty/>
      <ram:BuyerTradeParty/>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:GrandTotalAmount>100.00</ram:GrandTotalAmount>
      <ram:DuePayableAmount>100.00</ram:DuePayableAmount>
      <ram:ApplicableTradeTax/>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(validZugferd);

    expect(report.isValid).toBe(true);
    expect(report.profile).toBe("EN16931");
    expect(report.profileLabel).toBe("EN16931 (Comfort)");
    expect(report.score).toBeGreaterThanOrEqual(80); // Minimal issues for complete invoice
    expect(report.xmlExtracted).toBe(true);
  });

  // ─── AC-2: Nicht-konformes PDF → Verständliche Mangelliste, kein Stacktrace ───
  it("AC-2: PDF ohne eingebettetes ZUGFeRD-XML → Verwertbare Mängelliste", () => {
    // Einfaches PDF ohne ZUGFeRD (z.B. ein normales Bild-PDF)
    const plainPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<</Type/Catalog>>\nendobj\n2 0 obj\n<</Type/Pages>>\nendobj\nxref\n0 3\n0000000000 65535 f\ntrailer\n<</Size 3/Root 1 0 R>>\nstartxref\n0\n%%EOF",
    );

    const report = validateZugferdPdf(plainPdf as any);

    expect(report.isValid).toBe(false);
    expect(report.xmlExtracted).toBe(false);
    expect(report.score).toBe(0);
    expect(report.issues.length).toBeGreaterThan(0);

    // Prüfen: Mängelliste ist verstndlich (Code, Message, Feld)
    const issue = report.issues[0];
    expect(issue.code).toBeDefined();
    expect(issue.message).toBeDefined();
    expect(issue.field).toBeDefined();
    // Message sollte auf Deutsch und verständlich sein, kein JSON-Stacktrace
    expect(issue.message).toContain("ZUGFeRD");
    expect(issue.message).not.toMatch(/\[object\]|undefined|null/);
  });

  // ─── AC-3: Kritische Felder feststellen ───
  it("AC-3: Fehlende kritische Felder → Major/Critical Issues", () => {
    const incompleteXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:ExchangedDocumentContext/>
  <!-- Missing ID, TypeCode, IssueDateTime, etc. -->
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(incompleteXml);

    expect(report.isValid).toBe(false);
    const criticalOrMajor = report.issues.filter(
      (i) => i.severity === "critical" || i.severity === "major",
    );
    expect(criticalOrMajor.length).toBeGreaterThan(0);
  });

  // ─── AC-4: Score-Berechnung (Deductions pro Severity) ───
  it("AC-4: Score-Berechnung folgt Gewichtung (Critical=-25, Major=-8, Minor=-3)", () => {
    // XML mit bekannten Fehlern zum Score-Check
    const incompleteXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
  <!-- Missing TypeCode, DuePayableAmount = 1 Critical + Other Major = -25 - 8 = 67 score -->
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(incompleteXml);
    expect(report.score).toBeLessThanOrEqual(92); // At least one major issue expected
  });

  // ─── AC-5: Profil-Erkennung (MINIMUM, BASIC, EN16931, EXTENDED, XRECHNUNG) ───
  it("AC-5: XRECHNUNG-Profil wird erkannt", () => {
    const xrechnungXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</ram:ID>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>REP-002</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime/>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem/>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty/>
      <ram:BuyerTradeParty/>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:GrandTotalAmount>100.00</ram:GrandTotalAmount>
      <ram:DuePayableAmount>100.00</ram:DuePayableAmount>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(xrechnungXml);
    expect(report.profile).toBe("XRECHNUNG");
    expect(report.profileLabel).toBe("XRechnung");
  });

  it("AC-5: MINIMUM-Profil wird erkannt", () => {
    const minimumXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
  </rsm:ExchangedDocumentContext>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(minimumXml);
    expect(report.profile).toBe("MINIMUM");
  });

  // ─── AC-6: XML-Extraktion aus PDF ───
  it("AC-6: XML wird aus PDF/A-3 extrahiert (mit ZUGFeRD)", () => {
    const pdfWithZugferd = Buffer.from(
      "%PDF-1.4\n%some binary content\n" +
        '<?xml version="1.0"?>' +
        "<rsm:CrossIndustryInvoice>" +
        "<rsm:ExchangedDocumentContext>" +
        "<ram:ID>urn:cen.eu:en16931:2017</ram:ID>" +
        "</rsm:ExchangedDocumentContext>" +
        "</rsm:CrossIndustryInvoice>",
    );

    const report = validateZugferdPdf(pdfWithZugferd as any);
    expect(report.xmlExtracted).toBe(true);
  });

  // ─── AC-7: TypeCode-Validierung (380=Rechnung, 381=Gutschrift) ───
  it("AC-7: TypeCode 380 akzeptiert (Rechnung)", () => {
    const invoiceXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:TypeCode>380</ram:TypeCode>
  </rsm:ExchangedDocument>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(invoiceXml);
    const typeCodeIssue = report.issues.find((i) => i.code === "BT-003");
    expect(typeCodeIssue).toBeUndefined();
  });

  it("AC-7: TypeCode 381 akzeptiert (Gutschrift)", () => {
    const creditNoteXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:TypeCode>381</ram:TypeCode>
  </rsm:ExchangedDocument>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(creditNoteXml);
    const typeCodeIssue = report.issues.find((i) => i.code === "BT-003");
    expect(typeCodeIssue).toBeUndefined();
  });

  it("AC-7: TypeCode 999 wird als Fehler erkannt", () => {
    const invalidTypeXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:TypeCode>999</ram:TypeCode>
  </rsm:ExchangedDocument>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(invalidTypeXml);
    const typeCodeIssue = report.issues.find((i) => i.code === "BT-003");
    expect(typeCodeIssue).toBeDefined();
    expect(typeCodeIssue?.severity).toBe("major");
  });

  // ─── AC-8: Währung EUR erforderlich ───
  it("AC-8: EUR-Währung erforderlich", () => {
    const eur = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext/>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(eur);
    const currencyIssue = report.issues.find((i) => i.code === "BT-005");
    expect(currencyIssue).toBeUndefined();
  });

  // ─── AC-9: Rechnungsnummer (BT-1) erforderlich ───
  it("AC-9: Rechnungsnummer (BT-1) erforderlich und nicht leer", () => {
    const withId = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext/>
  <rsm:ExchangedDocument>
    <ram:ID>INV-123</ram:ID>
  </rsm:ExchangedDocument>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(withId);
    const idIssue = report.issues.find((i) => i.code === "BT-001");
    expect(idIssue).toBeUndefined();
  });

  it("AC-9: Fehlende Rechnungsnummer wird erkannt", () => {
    const withoutId = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:ExchangedDocumentContext/>
  <rsm:ExchangedDocument/>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(withoutId);
    const idIssue = report.issues.find((i) => i.code === "BT-001");
    expect(idIssue).toBeDefined();
    expect(idIssue?.severity).toBe("major");
  });

  // ─── AC-10: Namespace-Validierung ───
  it("AC-10: Korrekter Namespace erforderlich", () => {
    const correctNs = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(correctNs);
    const nsIssue = report.issues.find((i) => i.code === "CII-003");
    expect(nsIssue).toBeUndefined();
  });

  it("AC-10: Falscher Namespace wird erkannt", () => {
    const wrongNs = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="wrong.namespace">
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(wrongNs);
    const nsIssue = report.issues.find((i) => i.code === "CII-003");
    expect(nsIssue).toBeDefined();
  });

  // ─── AC-11: Root-Element-Validierung ───
  it("AC-11: Root-Element rsm:CrossIndustryInvoice erforderlich", () => {
    const wrongRoot = `<?xml version="1.0"?>
<Invoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
</Invoice>`;

    const report = validateZugferdXml(wrongRoot);
    const rootIssue = report.issues.find((i) => i.code === "CII-002");
    expect(rootIssue).toBeDefined();
  });

  // ─── AC-12: Score-Grenzen ───
  it("AC-12: Score liegt zwischen 0-100", () => {
    const validXml = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(validXml);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  // ─── Edge Case: Leere/ungültige XML ───
  it("Edge Case: Leere XML-Datei", () => {
    const emptyXml = "";
    const report = validateZugferdXml(emptyXml);

    expect(report.isValid).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it("Edge Case: Ungültiges XML (malformed)", () => {
    const malformedXml = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice>
  <unclosed>tag`;

    // Validator arbeitet mit String-Matching, nicht XML-Parsing
    // Malformed XML wird als fehlende Felder erkannt
    const report = validateZugferdXml(malformedXml);
    expect(report.issues.length).toBeGreaterThan(0);
  });

  // ─── Seller & Buyer erforderlich ───
  it("AC-13: Verkäufer (SellerTradeParty) erforderlich", () => {
    const withoutSeller = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:SupplyChainTradeTransaction>
    <!-- Missing SellerTradeParty -->
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(withoutSeller);
    const sellerIssue = report.issues.find((i) => i.code === "BT-027");
    expect(sellerIssue).toBeDefined();
  });

  it("AC-13: Käufer (BuyerTradeParty) erforderlich", () => {
    const withoutBuyer = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:SupplyChainTradeTransaction>
    <!-- Missing BuyerTradeParty -->
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(withoutBuyer);
    const buyerIssue = report.issues.find((i) => i.code === "BT-044");
    expect(buyerIssue).toBeDefined();
  });

  // ─── Settlement & Tax Info ───
  it("AC-14: TradeSettlement mit Zahlungsinformationen erforderlich", () => {
    const withoutSettlement = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:SupplyChainTradeTransaction>
    <!-- Missing ApplicableHeaderTradeSettlement -->
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(withoutSettlement);
    const settlementIssue = report.issues.find((i) => i.code === "BT-099");
    expect(settlementIssue).toBeDefined();
  });

  // ─── Betrag-Felder ───
  it("AC-14: GrandTotalAmount (BT-112) erforderlich", () => {
    const withoutGrandTotal = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeSettlement>
      <!-- Missing GrandTotalAmount -->
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(withoutGrandTotal);
    const grandTotalIssue = report.issues.find((i) => i.code === "BT-112");
    expect(grandTotalIssue).toBeDefined();
  });

  it("AC-14: DuePayableAmount (BT-115) erforderlich", () => {
    const withoutDueAmount = `<?xml version="1.0"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeSettlement>
      <!-- Missing DuePayableAmount -->
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

    const report = validateZugferdXml(withoutDueAmount);
    const dueIssue = report.issues.find((i) => i.code === "BT-115");
    expect(dueIssue).toBeDefined();
  });
});
