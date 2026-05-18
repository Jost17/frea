// Static content served via the MCP server (legal reference + onboarding checklist).

export const LEGAL_RESOURCE_URI = "frea://legal/invoicing-requirements-de";

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

## Kaufmännische Rundung

- Immer auf 2 Dezimalstellen runden
- Standard kaufmännisches Runden: ab 0,005 → aufrunden
- Keine Abschneidevarianten

## Gültige MwSt-Sätze (Deutschland 2024)

| Satz | Anwendung |
|------|-----------|
| 19%  | Regelsteuersatz (die meisten Leistungen) |
| 7%   | Ermäßigter Satz (Lebensmittel, Bücher, ÖPNV) |
| 0%   | Steuerbefreiungen (z.B. innergemeinschaftliche Lieferungen, Kleinunternehmer §19 UStG) |

## Rechnungsnummern

- Lückenlose, chronologisch aufsteigende Nummerierung
- Einmal vergebene Nummern dürfen nicht gelöscht werden
- Stornorechnungen erhalten eine neue Nummer mit Verweis auf die Original-Rechnung
- Empfehlung: Präfix + Jahr + laufende Nummer (z.B. RE-2026-001)

## Fälligkeitsdatum / Zahlungsziel

- Gesetzlich: 30 Tage nach Rechnungserhalt (§271a BGB)
- Empfehlung: Explizites Zahlungsziel auf Rechnung angeben (z.B. "zahlbar bis 2026-06-04")
- Skontofristen müssen klar benannt sein

## GoBD-Anforderungen (Buchführung)

- Rechnungen müssen **unveränderbar** aufbewahrt werden
- **Aufbewahrungspflicht:** 10 Jahre
- **Audit-Log:** Alle Änderungen müssen nachvollziehbar protokolliert sein (append-only)
- **Maschinelle Auswertbarkeit:** Digitale Rechnungen müssen in strukturiertem Format vorliegen
- **ZUGFeRD/XRechnung:** Empfohlen für B2B und öffentliche Auftraggeber (verpflichtend ab 2025 für B2G)

## Reverse Charge (Umkehrung der Steuerschuld)

- **Innergemeinschaftliche Leistungen (B2B, EU):** Steuerschuldner ist der Leistungsempfänger
  - Hinweis auf Rechnung: "Steuerschuldnerschaft des Leistungsempfängers"
  - USt-IdNr. beider Parteien erforderlich
- **Drittland (Nicht-EU):** Keine deutsche MwSt, ggf. ausländische Steuer
- **Nachweis:** Dokumentation der USt-IdNr. und Unternehmereigenschaft des Kunden

## Kleinunternehmerregelung (§19 UStG)

Bei Inanspruchnahme der Kleinunternehmerregelung:
- Keine MwSt ausweisen
- Hinweis auf Rechnung: "Kein Steuerausweis gemäß §19 UStG"
- Keine MwSt-Sätze angeben
`;

export const ONBOARDING_RESOURCE_URI = "frea://setup/freelancer-onboarding";

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
