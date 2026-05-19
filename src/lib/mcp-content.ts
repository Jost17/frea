export const LEGAL_RESOURCE_URI = "frea://legal/invoicing-requirements-de";
export const ONBOARDING_RESOURCE_URI = "frea://setup/freelancer-onboarding";

export const LEGAL_RESOURCE_CONTENT = `# Deutsche Rechnungsanforderungen (§14 UStG + GoBD)

> Hinweis: Diese Informationen dienen der Orientierung. Für verbindliche Rechtsauskunft wende dich an einen Steuerberater.

## Pflichtangaben nach §14 UStG

Jede Rechnung muss enthalten:

1. **Vollständiger Name und Anschrift** des leistenden Unternehmers und des Leistungsempfängers
2. **Steuernummer oder USt-IdNr.** des leistenden Unternehmers
3. **Ausstellungsdatum** der Rechnung
4. **Fortlaufende Rechnungsnummer** (lückenlos, chronologisch)
5. **Leistungsdatum / Leistungszeitraum** (auch wenn identisch mit Ausstellungsdatum)
6. **Beschreibung der Leistung** oder Lieferung
7. **Entgelt (Nettobetrag)** aufgeschlüsselt nach Steuersätzen
8. **MwSt-Satz und -Betrag** (oder Hinweis auf Steuerbefreiung)
9. **Bruttobetrag** (inkl. MwSt)
10. **Bankverbindung / Zahlungshinweis** (empfohlen)

Bei Rechnungen über €250 (Kleinbetragsrechnungen): vereinfachte Angaben möglich.

## MwSt-Berechnung (kritisch)

**Richtig:** MwSt wird **pro Rechnungsposition** berechnet, dann summiert.

\`\`\`
Position 1: Netto 150,00 € × 19% = 28,50 €
Position 2: Netto  80,00 € ×  7% =  5,60 €
MwSt gesamt: 28,50 + 5,60 = 34,10 €
\`\`\`

**Falsch:** MwSt auf den Gesamtnettobetrag — führt zu Rundungsfehlern und ist rechtlich inkorrekt.

## GoBD-Anforderungen (Buchführung)

- Rechnungen müssen **unveränderbar** aufbewahrt werden
- **Aufbewahrungspflicht:** 10 Jahre
- **Audit-Log:** Alle Änderungen müssen nachvollziehbar protokolliert sein (append-only)

## Kleinunternehmerregelung (§19 UStG)

Bei Inanspruchnahme der Kleinunternehmerregelung:
- Keine MwSt ausweisen
- Hinweis auf Rechnung: "Kein Steuerausweis gemäß §19 UStG"
`;

export const ONBOARDING_RESOURCE_CONTENT = {
  stammdaten: {
    label: "Grunddaten eingeben",
    fields: ["Firmenname", "IBAN", "BIC", "Steuernummer oder USt-IdNr.", "MwSt-Satz"],
    required: true,
    description: "Vollständige Firmendaten sind Voraussetzung für §14-UStG-konforme Rechnungen.",
  },
  first_client: {
    label: "Ersten Kunden anlegen",
    fields: ["Name", "Adresse", "USt-IdNr. (für EU B2B)", "Käuferreferenz (optional)"],
    required: true,
    description:
      "Kundendaten werden auf jeder Rechnung ausgewiesen. USt-IdNr. bei EU-Kunden für Reverse Charge.",
  },
  first_invoice: {
    label: "Erste Rechnung erstellen",
    template: "Verwende FREAs Vorlage mit §14-UStG-Konformität",
    required: true,
    description:
      "FREA generiert Rechnungsnummer, berechnet MwSt pro Position und erstellt PDF mit allen Pflichtangaben.",
  },
  audit_log: {
    label: "Audit-Log initialisieren",
    description: "GoBD-konformes Append-Only-Logging wird automatisch aktiviert.",
    required: true,
  },
  zugferd: {
    label: "ZUGFeRD 2.1 aktivieren (empfohlen)",
    description:
      "Hybrides PDF/XML-Format — Pflicht für öffentliche Auftraggeber ab 2025, empfohlen für alle B2B-Rechnungen.",
    required: false,
  },
};
