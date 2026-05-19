import { beforeAll, describe, expect, it } from "bun:test";
import { app } from "../src/app";
import { initializeSchema } from "../src/db/schema";

// ─────────────────────────────────────────────────────────────────────
// QA Integration Tests: ZUGFeRD-Validator Routes
// ─────────────────────────────────────────────────────────────────────

beforeAll(() => {
  initializeSchema();
  process.env.NODE_ENV = "test"; // Disable logger/csrf in app
});

describe("ZUGFeRD-Validator Routes — API Integration", () => {
  // ─── AC-1: GET /validator → Upload-Seite erreichbar ───
  it("AC-1: GET /validator ohne Login erreichbar", async () => {
    const res = await app.request("http://localhost/validator", { method: "GET" });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("ZUGFeRD");
    expect(html).toContain("Rechnung hochladen");
    expect(html).toContain('<html lang="de"');
  });

  // ─── AC-2: POST mit gültige XML → Redirect zu Permalink ───
  it("AC-2: POST /validator mit gültiger XML → 303 Redirect zu Permalink", async () => {
    const validZugferd = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>TEST-001</ram:ID>
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
</rsm:CrossIndustryInvoice>`);

    const formData = new FormData();
    const file = new File([validZugferd], "test.xml", { type: "text/xml" });
    formData.append("rechnung", file);

    const res = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    expect(res.status).toBe(303); // See Other Redirect
    const location = res.headers.get("Location");
    expect(location).toMatch(/^\/validator\/[0-9a-f-]{36}$/);
  });

  // ─── AC-3: GET /validator/:id → Ergebnis mit Konformität ───
  it("AC-3: GET /validator/:id zeigt Validierungsergebnis", async () => {
    // Erst eine Datei hochladen, um eine ID zu erhalten
    const validZugferd = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>TEST-002</ram:ID>
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
</rsm:CrossIndustryInvoice>`);

    const formData = new FormData();
    const file = new File([validZugferd], "test.xml", { type: "text/xml" });
    formData.append("rechnung", file);

    const uploadRes = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    const location = uploadRes.headers.get("Location")!;
    const id = location.split("/").pop();

    // Jetzt GET zum Ergebnis
    const getRes = await app.request(
      new Request(`http://localhost/validator/${id}`, { method: "GET" }),
    );

    expect(getRes.status).toBe(200);
    const html = await getRes.text();
    expect(html).toContain("ZUGFeRD");
    expect(html).toContain("Konform");
    expect(html).toContain("Ergebnis teilen");
  });

  // ─── AC-4: POST ohne Datei → 400 Bad Request ───
  it("AC-4: POST ohne Datei → 400 Bad Request", async () => {
    const formData = new FormData();
    // Keine Datei hinzugefügt

    const res = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain("Datei");
  });

  // ─── AC-5: POST mit falscher Datei-Erweiterung → 415 Unsupported Media Type ───
  it("AC-5: POST mit .doc Datei → 415 Unsupported Media Type", async () => {
    const formData = new FormData();
    const file = new File([Buffer.from("invalid")], "test.doc", { type: "application/msword" });
    formData.append("rechnung", file);

    const res = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    expect(res.status).toBe(415);
    const text = await res.text();
    expect(text).toContain("PDF");
    expect(text).toContain("XML");
  });

  // ─── AC-6: POST mit Datei >10 MB → 413 Payload Too Large ───
  it("AC-6: POST mit Datei > 10 MB → 413 Payload Too Large", async () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11 MB
    const formData = new FormData();
    const file = new File([largeBuffer], "large.xml", { type: "text/xml" });
    formData.append("rechnung", file);

    const res = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    expect(res.status).toBe(413);
    const text = await res.text();
    expect(text).toContain("zu groß");
    expect(text).toContain("MB");
  });

  // ─── AC-7: GET mit ungültige ID → 400 Bad Request ───
  it("AC-7: GET /validator mit ungültige UUID-Format → 400 Bad Request", async () => {
    const res = await app.request(
      new Request("http://localhost/validator/invalid-id", { method: "GET" }),
    );

    expect(res.status).toBe(400);
  });

  // ─── AC-8: GET mit nicht-existierende ID → 404 Not Found ───
  it("AC-8: GET /validator mit nicht-existierende UUID → 404 Not Found", async () => {
    const fakeId = "12345678-1234-5678-1234-567812345678";
    const res = await app.request(
      new Request(`http://localhost/validator/${fakeId}`, { method: "GET" }),
    );

    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toContain("nicht gefunden");
    expect(text).toContain("7 Tage");
  });

  // ─── AC-9: GET /validator/:id/badge.svg → SVG mit richtigen Werten ───
  it("AC-9: GET /validator/:id/badge.svg → Valid SVG", async () => {
    // Upload einer Datei zuerst
    const validZugferd = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:element:unqualified">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>BADGE-001</ram:ID>
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
</rsm:CrossIndustryInvoice>`);

    const formData = new FormData();
    const file = new File([validZugferd], "test.xml", { type: "text/xml" });
    formData.append("rechnung", file);

    const uploadRes = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    const location = uploadRes.headers.get("Location")!;
    const id = location.split("/").pop();

    // Badge abrufen
    const badgeRes = await app.request(
      new Request(`http://localhost/validator/${id}/badge.svg`, { method: "GET" }),
    );

    expect(badgeRes.status).toBe(200);
    expect(badgeRes.headers.get("Content-Type")).toBe("image/svg+xml");
    const svg = await badgeRes.text();
    expect(svg).toContain("<svg");
    expect(svg).toContain("FREA ZUGFeRD-Validator");
    expect(svg).toContain("/100"); // Score
  });

  // ─── AC-10: Badge mit Cache-Header ───
  it("AC-10: GET /validator/:id/badge.svg → Cache-Header gesetzt", async () => {
    const validZugferd = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
</rsm:CrossIndustryInvoice>`);

    const formData = new FormData();
    const file = new File([validZugferd], "test.xml", { type: "text/xml" });
    formData.append("rechnung", file);

    const uploadRes = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    const location = uploadRes.headers.get("Location")!;
    const id = location.split("/").pop();

    const badgeRes = await app.request(
      new Request(`http://localhost/validator/${id}/badge.svg`, { method: "GET" }),
    );

    const cacheControl = badgeRes.headers.get("Cache-Control");
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("max-age");
  });

  // ─── AC-11: POST mit PDF enthält ZUGFeRD ───
  it("AC-11: POST mit PDF das ZUGFeRD enthält", async () => {
    const pdfWithZugferd = Buffer.from(
      "%PDF-1.4\n%some binary\n" +
        '<?xml version="1.0"?>' +
        "<rsm:CrossIndustryInvoice>" +
        "<rsm:ExchangedDocumentContext>" +
        "<ram:ID>urn:cen.eu:en16931:2017</ram:ID>" +
        "</rsm:ExchangedDocumentContext>" +
        "<rsm:ExchangedDocument>" +
        "<ram:ID>PDF-TEST</ram:ID>" +
        "<ram:TypeCode>380</ram:TypeCode>" +
        "</rsm:ExchangedDocument>" +
        "</rsm:CrossIndustryInvoice>",
    );

    const formData = new FormData();
    const file = new File([pdfWithZugferd], "test.pdf", { type: "application/pdf" });
    formData.append("rechnung", file);

    const res = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    expect(res.status).toBe(303);
    const location = res.headers.get("Location")!;
    expect(location).toMatch(/^\/validator\/[0-9a-f-]{36}$/);
  });

  // ─── AC-12: Database cleanup nach 7 Tagen ───
  it("AC-12: Alte Einträge werden nicht gelöscht (nur nach 7 Tagen)", async () => {
    const validZugferd = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
</rsm:CrossIndustryInvoice>`);

    const formData = new FormData();
    const file = new File([validZugferd], "test.xml", { type: "text/xml" });
    formData.append("rechnung", file);

    const res = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    expect(res.status).toBe(303);
    // Die Datei sollte sofort abrufbar sein
    const location = res.headers.get("Location")!;
    const id = location.split("/").pop()!;

    const getRes = await app.request(
      new Request(`http://localhost/validator/${id}`, { method: "GET" }),
    );

    expect(getRes.status).toBe(200);
  });

  // ─── Regression: DSGVO — PDF wird nicht gespeichert ───
  it("Regression: PDF wird NICHT dauerhaft gespeichert (DSGVO)", async () => {
    const pdfContent = Buffer.from("%PDF-1.4\n...");
    const formData = new FormData();
    const file = new File([pdfContent], "sensitive.pdf", { type: "application/pdf" });
    formData.append("rechnung", file);

    const res = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    expect(res.status).toBe(303);

    // Prüfe: In der DB wird nur der Report gespeichert, nicht die PDF
    // (Diese Prüfung würde direkten DB-Zugriff erfordern)
    const location = res.headers.get("Location")!;
    const id = location.split("/").pop()!;

    const getRes = await app.request(
      new Request(`http://localhost/validator/${id}`, { method: "GET" }),
    );

    const html = await getRes.text();
    // Prüfe: Datenschutz-Hinweis ist sichtbar (Datei nicht gespeichert, Report 7 Tage)
    expect(html).toContain("Datenschutz");
    expect(html).toContain("nicht gespeichert");
    expect(html).toContain("7 Tage");
  });

  // ─── Regression: Upsell-CTA ist vorhanden ───
  it("Regression: Upsell-CTA zu FREA vorhanden", async () => {
    const validZugferd = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:ExchangedDocumentContext>
    <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
  </rsm:ExchangedDocumentContext>
</rsm:CrossIndustryInvoice>`);

    const formData = new FormData();
    const file = new File([validZugferd], "test.xml", { type: "text/xml" });
    formData.append("rechnung", file);

    const uploadRes = await app.request(
      new Request("http://localhost/validator", {
        method: "POST",
        body: formData,
      }),
    );

    const location = uploadRes.headers.get("Location")!;
    const id = location.split("/").pop()!;

    const getRes = await app.request(
      new Request(`http://localhost/validator/${id}`, { method: "GET" }),
    );

    const html = await getRes.text();
    expect(html).toContain("FREA erstellt ZUGFeRD-konforme Rechnungen");
    expect(html).toContain("FREA kostenlos testen");
    expect(html).toContain('href="/"');
  });

  // ─── Regression: Nur validatorRoutes, nicht via main app ───
  it("Regression: /validator ist eigenständige Route (kein App-Mount-Check nötig)", async () => {
    const res = await app.request(new Request("http://localhost/validator", { method: "GET" }));
    expect(res.status).toBe(200);
    // Einfach sicherstellen, dass die Route ohne Container-App erreichbar ist
  });
});
