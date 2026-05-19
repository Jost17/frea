/**
 * ZUGFeRD/E-Rechnung Validator
 * Extrahiert eingebettetes XML aus PDF/A-3 und validiert gegen EN16931.
 * Keine externe Bibliothek — pragmatische Regex/String-Checks.
 */

export type ZUGFeRDProfile =
  | "MINIMUM"
  | "BASIC_WL"
  | "BASIC"
  | "EN16931"
  | "EXTENDED"
  | "XRECHNUNG"
  | "UNKNOWN";

export type IssueSeverity = "critical" | "major" | "minor";

export interface ValidationIssue {
  code: string;
  severity: IssueSeverity;
  field: string;
  message: string;
  rule?: string;
}

export interface ValidationReport {
  isValid: boolean;
  profile: ZUGFeRDProfile;
  profileLabel: string;
  score: number;
  issues: ValidationIssue[];
  xmlExtracted: boolean;
}

const PROFILE_MAP: Record<string, ZUGFeRDProfile> = {
  "urn:factur-x.eu:1p0:minimum": "MINIMUM",
  "urn:factur-x.eu:1p0:basicwl": "BASIC_WL",
  "urn:factur-x.eu:1p0:basic": "BASIC",
  "urn:cen.eu:en16931:2017": "EN16931",
  "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended": "EXTENDED",
  "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0": "XRECHNUNG",
  "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.3": "XRECHNUNG",
  "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.2": "XRECHNUNG",
};

export const PROFILE_LABELS: Record<ZUGFeRDProfile, string> = {
  MINIMUM: "MINIMUM",
  BASIC_WL: "BASIC WL",
  BASIC: "BASIC",
  EN16931: "EN16931 (Comfort)",
  EXTENDED: "EXTENDED",
  XRECHNUNG: "XRechnung",
  UNKNOWN: "Unbekannt",
};

const SCORE_DEDUCTIONS: Record<IssueSeverity, number> = {
  critical: 25,
  major: 8,
  minor: 3,
};

/** Extrahiert das eingebettete ZUGFeRD-XML aus einem PDF-Buffer. */
export function extractXmlFromPdf(buffer: Uint8Array): string | null {
  // PDF/A-3 embeds ZUGFeRD XML as a file attachment stream.
  // The XML appears as a readable text stream in the binary — locate by root element.
  const text = Buffer.from(buffer).toString("latin1");

  const xmlStart = text.indexOf("<?xml");
  if (xmlStart === -1) return null;

  // Try ZUGFeRD (CII) root element
  const ciiClose = "</rsm:CrossIndustryInvoice>";
  const ciiEnd = text.indexOf(ciiClose, xmlStart);
  if (ciiEnd !== -1) {
    return text.slice(xmlStart, ciiEnd + ciiClose.length);
  }

  // Try UBL Invoice root element (XRechnung UBL variant)
  const ublClose = "</Invoice>";
  const ublEnd = text.indexOf(ublClose, xmlStart);
  if (ublEnd !== -1) {
    return text.slice(xmlStart, ublEnd + ublClose.length);
  }

  return null;
}

/** Erkennt das ZUGFeRD-Profil aus der GuidelineID. */
function detectProfile(xml: string): ZUGFeRDProfile {
  const match = xml.match(/<ram:ID>([^<]+)<\/ram:ID>/);
  if (!match) return "UNKNOWN";
  const id = match[1].trim();
  return PROFILE_MAP[id] ?? "UNKNOWN";
}

interface CheckResult {
  pass: boolean;
  issue?: ValidationIssue;
}

function check(
  condition: boolean,
  issue: Omit<ValidationIssue, "code"> & { code: string },
): CheckResult {
  if (condition) return { pass: true };
  return { pass: false, issue };
}

function xmlContains(xml: string, tag: string): boolean {
  return xml.includes(tag);
}

function xmlExtractText(xml: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<${escaped}>([^<]+)</${escaped}>`);
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

/** Validiert das XML gegen EN16931-Regeln. */
function validateXml(xml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const run = (c: CheckResult) => {
    if (!c.pass && c.issue) issues.push(c.issue);
  };

  // --- Kritische Strukturprüfungen ---
  run(
    check(xmlContains(xml, "<?xml"), {
      code: "CII-001",
      severity: "critical",
      field: "XML-Deklaration",
      message: "Keine XML-Deklaration gefunden (<?xml ...?>)",
    }),
  );

  run(
    check(xmlContains(xml, "rsm:CrossIndustryInvoice"), {
      code: "CII-002",
      severity: "critical",
      field: "rsm:CrossIndustryInvoice",
      message: "Fehlendes Root-Element rsm:CrossIndustryInvoice",
      rule: "BR-01",
    }),
  );

  const ZF_NS = "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100";
  run(
    check(xmlContains(xml, ZF_NS), {
      code: "CII-003",
      severity: "critical",
      field: "xmlns:rsm",
      message: `Fehlender ZUGFeRD-Namespace (${ZF_NS})`,
      rule: "BR-01",
    }),
  );

  run(
    check(xmlContains(xml, "rsm:ExchangedDocumentContext"), {
      code: "CII-004",
      severity: "critical",
      field: "rsm:ExchangedDocumentContext",
      message: "Fehlendes ExchangedDocumentContext (enthält Profil-ID)",
      rule: "BR-01",
    }),
  );

  // --- Pflichtfelder (BT = Business Term) ---
  const invoiceId = xmlExtractText(xml, "ram:ID");
  run(
    check(invoiceId !== null && invoiceId.length > 0, {
      code: "BT-001",
      severity: "major",
      field: "ram:ID",
      message: "Rechnungsnummer (BT-1) fehlt oder ist leer",
      rule: "BR-02",
    }),
  );

  const typeCode = xmlExtractText(xml, "ram:TypeCode");
  run(
    check(typeCode === "380" || typeCode === "381", {
      code: "BT-003",
      severity: "major",
      field: "ram:TypeCode",
      message: `TypeCode muss 380 (Rechnung) oder 381 (Gutschrift) sein — gefunden: "${typeCode ?? "fehlt"}"`,
      rule: "BR-04",
    }),
  );

  run(
    check(xmlContains(xml, "ram:IssueDateTime"), {
      code: "BT-002",
      severity: "major",
      field: "ram:IssueDateTime",
      message: "Rechnungsdatum (BT-2) fehlt",
      rule: "BR-03",
    }),
  );

  run(
    check(xmlContains(xml, "ram:SellerTradeParty"), {
      code: "BT-027",
      severity: "major",
      field: "ram:SellerTradeParty",
      message: "Verkäufer/Rechnungssteller (BT-27) fehlt",
      rule: "BR-07",
    }),
  );

  run(
    check(xmlContains(xml, "ram:BuyerTradeParty"), {
      code: "BT-044",
      severity: "major",
      field: "ram:BuyerTradeParty",
      message: "Käufer/Rechnungsempfänger (BT-44) fehlt",
      rule: "BR-07",
    }),
  );

  run(
    check(xmlContains(xml, "ram:ApplicableHeaderTradeSettlement"), {
      code: "BT-099",
      severity: "major",
      field: "ram:ApplicableHeaderTradeSettlement",
      message: "Zahlungs- und MwSt-Informationen (TradeSettlement) fehlen",
      rule: "BR-53",
    }),
  );

  run(
    check(xmlContains(xml, "EUR") || xmlContains(xml, "ram:InvoiceCurrencyCode"), {
      code: "BT-005",
      severity: "major",
      field: "ram:InvoiceCurrencyCode",
      message: "Währungscode (BT-5) fehlt — erwartet: EUR",
      rule: "BR-05",
    }),
  );

  run(
    check(xmlContains(xml, "<ram:GrandTotalAmount>"), {
      code: "BT-112",
      severity: "major",
      field: "ram:GrandTotalAmount",
      message: "Rechnungsgesamtbetrag inkl. MwSt (BT-112) fehlt",
      rule: "BR-53",
    }),
  );

  run(
    check(xmlContains(xml, "<ram:DuePayableAmount>"), {
      code: "BT-115",
      severity: "major",
      field: "ram:DuePayableAmount",
      message: "Fälliger Zahlungsbetrag (BT-115) fehlt",
      rule: "BR-53",
    }),
  );

  // --- Empfohlene Felder ---
  const hasVatId =
    xmlContains(xml, 'schemeID="VA"') || xmlContains(xml, "ram:TaxRegistrationNumber");
  const hasTaxNumber = xmlContains(xml, 'schemeID="FC"') || xmlContains(xml, "ram:TaxNumber");
  run(
    check(hasVatId || hasTaxNumber, {
      code: "BT-031",
      severity: "minor",
      field: "ram:SpecifiedTaxRegistration",
      message: "Weder Steuernummer (BT-32) noch USt-ID (BT-31) des Verkäufers angegeben",
      rule: "BR-CO-09",
    }),
  );

  run(
    check(
      xmlContains(xml, "ram:IBANID") ||
        xmlContains(xml, "ram:SpecifiedTradeSettlementPaymentMeans"),
      {
        code: "BT-084",
        severity: "minor",
        field: "ram:SpecifiedTradeSettlementPaymentMeans",
        message: "Bankverbindung (BT-84 IBAN) nicht angegeben",
      },
    ),
  );

  run(
    check(xmlContains(xml, "ram:IncludedSupplyChainTradeLineItem"), {
      code: "BG-025",
      severity: "minor",
      field: "ram:IncludedSupplyChainTradeLineItem",
      message: "Keine Rechnungspositionen (BG-25) gefunden",
      rule: "BR-16",
    }),
  );

  run(
    check(xmlContains(xml, "ram:ApplicableTradeTax"), {
      code: "BG-023",
      severity: "minor",
      field: "ram:ApplicableTradeTax",
      message: "MwSt-Aufschlüsselung (BG-23) fehlt",
      rule: "BR-47",
    }),
  );

  return issues;
}

/** Berechnet den Konformitäts-Score 0–100. */
function calculateScore(issues: ValidationIssue[]): number {
  const deduction = issues.reduce((sum, i) => sum + SCORE_DEDUCTIONS[i.severity], 0);
  return Math.max(0, 100 - deduction);
}

/** Hauptfunktion: validiert einen XML-String. */
export function validateZugferdXml(xml: string): ValidationReport {
  const issues = validateXml(xml);
  const score = calculateScore(issues);
  const profile = detectProfile(xml);
  return {
    isValid: issues.filter((i) => i.severity === "critical" || i.severity === "major").length === 0,
    profile,
    profileLabel: PROFILE_LABELS[profile],
    score,
    issues,
    xmlExtracted: true,
  };
}

/** Hauptfunktion: validiert ein PDF (extrahiert XML intern). */
export function validateZugferdPdf(buffer: Uint8Array): ValidationReport {
  const xml = extractXmlFromPdf(buffer);

  if (!xml) {
    return {
      isValid: false,
      profile: "UNKNOWN",
      profileLabel: PROFILE_LABELS.UNKNOWN,
      score: 0,
      issues: [
        {
          code: "PDF-001",
          severity: "critical",
          field: "PDF-Anhang",
          message:
            "Kein eingebettetes ZUGFeRD-XML im PDF gefunden. Stellen Sie sicher, dass es sich um ein PDF/A-3 mit eingebettetem Factur-X/ZUGFeRD-XML handelt.",
        },
      ],
      xmlExtracted: false,
    };
  }

  const report = validateZugferdXml(xml);
  return { ...report, xmlExtracted: true };
}
