/**
 * XRechnung XML Generator (CIUS-DE, CII-Syntax)
 * XRechnung 3.0 — für öffentliche Auftraggeber (B2G)
 * Nutzt dasselbe Datenmodell wie ZUGFeRD; unterscheidet sich nur im Profil-Identifier.
 * Spec: https://xeinkauf.de/xrechnung/
 */

import { generateZUGFeRDXML, type ZUGFeRDInvoiceData } from "./zugferd-generator";

// Re-export the shared data type so callers can use a single import
export type { ZUGFeRDInvoiceData as XRechnungInvoiceData };

const XRECHNUNG_PROFILE =
  "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0";

const ZUGFERD_EN16931_PROFILE = "urn:cen.eu:en16931:2017";

/**
 * Generates a standalone XRechnung 3.0 XML string.
 * The output is CII-syntax identical to ZUGFeRD EN16931 except for the
 * GuidelineSpecifiedDocumentContextParameter ID which carries the CIUS-DE profile.
 *
 * BT-10 (BuyerReference) MUST contain the Leitweg-ID for German public authorities.
 */
export function generateXRechnungXML(data: ZUGFeRDInvoiceData): string {
  const zugferdXml = generateZUGFeRDXML(data);
  return zugferdXml.replace(ZUGFERD_EN16931_PROFILE, XRECHNUNG_PROFILE);
}
