import { z } from "zod";
import { createInvoice, roundToEuro } from "../db/invoice-queries";
import { appendAuditLog, getAllActiveProjectsWithClient, getSettings } from "../db/queries";
import { db } from "../db/schema";

export const PROTOCOL_VERSION = "2024-11-05";

export const SERVER_INFO = {
  name: "FREA",
  version: "1.0.0",
  description: "German invoicing compliance framework — real-time validation for freelancers",
};

export const CAPABILITIES = {
  resources: { subscribe: false, listChanged: false },
  tools: { listChanged: false },
};

// ─── Resource: Legal Framework ────────────────────────────────────────────────

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

// ─── Resource: Onboarding Checklist ──────────────────────────────────────────

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

// ─── Tool: validate_invoice ───────────────────────────────────────────────────

export const validateInvoiceSchema = z.object({
  clientName: z.string().min(1),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        amount: z.number().min(0),
        taxRate: z.number().refine((r) => [0.0, 0.07, 0.19].includes(r), {
          message: "taxRate muss 0.0, 0.07 oder 0.19 sein",
        }),
      }),
    )
    .min(1, "Mindestens eine Position erforderlich"),
});

export type ValidateInvoiceInput = z.infer<typeof validateInvoiceSchema>;

export interface ValidationResult {
  isCompliant: boolean;
  violations: string[];
  suggestions: string[];
  calculatedTaxTotal: number | null;
}

export function validateInvoice(input: ValidateInvoiceInput): ValidationResult {
  const violations: string[] = [];
  const suggestions: string[] = [];

  if (input.invoiceDate >= input.dueDate) {
    violations.push("Fälligkeitsdatum muss nach dem Rechnungsdatum liegen");
  }

  let calculatedTaxTotal: number | null = null;
  try {
    calculatedTaxTotal = input.items.reduce((sum, item) => {
      const vatAmount = Math.round(item.amount * item.taxRate * 100) / 100;
      return Math.round((sum + vatAmount) * 100) / 100;
    }, 0);
  } catch {
    violations.push("Fehler bei MwSt-Berechnung");
  }

  const blankDescriptions = input.items.filter((i) => i.description.trim().length < 3);
  if (blankDescriptions.length > 0) {
    violations.push(
      `${blankDescriptions.length} Position(en) mit unzureichender Leistungsbeschreibung — §14 UStG fordert eindeutige Beschreibung`,
    );
  }

  const zeroItems = input.items.filter((i) => i.amount === 0);
  if (zeroItems.length > 0) {
    suggestions.push(
      `${zeroItems.length} Position(en) mit Betrag 0 — falls gewollt, ggf. als Rabatt kennzeichnen`,
    );
  }

  const allTaxRates = new Set(input.items.map((i) => i.taxRate));
  if (allTaxRates.has(0.0) && allTaxRates.size > 1) {
    suggestions.push(
      "Mischung aus steuerfreien und steuerpflichtigen Positionen — stelle sicher, dass Steuerbefreiungsgrund angegeben ist",
    );
  }

  suggestions.push("Rechnungsnummer auf Lückenlosigkeit prüfen (§14 UStG)");
  suggestions.push("Leistungszeitraum explizit angeben, auch wenn identisch mit Rechnungsdatum");

  if (input.items.some((i) => i.taxRate === 0.07)) {
    suggestions.push(
      "Ermäßigter MwSt-Satz 7% — prüfe ob Leistung tatsächlich dem ermäßigten Satz unterliegt",
    );
  }

  return {
    isCompliant: violations.length === 0,
    violations,
    suggestions,
    calculatedTaxTotal: violations.length === 0 ? calculatedTaxTotal : null,
  };
}

// ─── JSON-RPC Helpers ─────────────────────────────────────────────────────────

export function jsonRpcSuccess(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

export function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

// ─── MCP Method Handlers ──────────────────────────────────────────────────────

export function handleInitialize(id: string | number | null) {
  return jsonRpcSuccess(id, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: CAPABILITIES,
    serverInfo: SERVER_INFO,
  });
}

export function handleResourcesList(id: string | number | null) {
  return jsonRpcSuccess(id, {
    resources: [
      {
        uri: LEGAL_RESOURCE_URI,
        name: "German Invoicing Legal Requirements",
        description: "§14 UStG compliance, GoBD audit rules, MwSt calculation rules",
        mimeType: "text/markdown",
      },
      {
        uri: ONBOARDING_RESOURCE_URI,
        name: "Freelancer Onboarding Checklist",
        description: "Step-by-step setup guide for FREA (Stammdaten, Client, Invoice, Audit-Log)",
        mimeType: "application/json",
      },
    ],
  });
}

export function handleResourcesRead(id: string | number | null, params: unknown) {
  const p = params as { uri?: string } | undefined;
  if (!p?.uri) {
    return jsonRpcError(id, -32602, "Fehlender Parameter: uri");
  }
  if (p.uri === LEGAL_RESOURCE_URI) {
    return jsonRpcSuccess(id, {
      contents: [
        { uri: LEGAL_RESOURCE_URI, mimeType: "text/markdown", text: LEGAL_RESOURCE_CONTENT },
      ],
    });
  }
  if (p.uri === ONBOARDING_RESOURCE_URI) {
    return jsonRpcSuccess(id, {
      contents: [
        {
          uri: ONBOARDING_RESOURCE_URI,
          mimeType: "application/json",
          text: JSON.stringify(ONBOARDING_RESOURCE_CONTENT, null, 2),
        },
      ],
    });
  }
  return jsonRpcError(id, -32602, `Unbekannte Ressource: ${p.uri}`);
}

// ─── Tool: create_invoice_from_times ─────────────────────────────────────────

const GERMAN_MONTHS: Record<string, number> = {
  januar: 1,
  februar: 2,
  märz: 3,
  maerz: 3,
  april: 4,
  mai: 5,
  juni: 6,
  juli: 7,
  august: 8,
  september: 9,
  oktober: 10,
  november: 11,
  dezember: 12,
};

function parseMonth(value: string | number): number | null {
  if (typeof value === "number") return value >= 1 && value <= 12 ? value : null;
  const lower = value.toLowerCase().trim();
  if (GERMAN_MONTHS[lower]) return GERMAN_MONTHS[lower];
  const n = parseInt(lower, 10);
  return !Number.isNaN(n) && n >= 1 && n <= 12 ? n : null;
}

export const createInvoiceFromTimesSchema = z.object({
  projectQuery: z.string().min(1, "Projektname oder -kürzel erforderlich"),
  month: z.union([z.string(), z.number()]),
  year: z.number().int().min(2020).max(2099),
  invoiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD")
    .optional(),
});

export type CreateInvoiceFromTimesInput = z.infer<typeof createInvoiceFromTimesSchema>;

interface UnbilledTimeRow {
  id: number;
  project_id: number;
  date: string;
  duration: number;
  description: string | null;
  billable: number;
  invoice_id: number | null;
  created_at: string;
}

interface ProjectRow {
  id: number;
  client_id: number;
  code: string;
  name: string;
  daily_rate: number;
  start_date: string | null;
  end_date: string | null;
  budget_days: number | null;
  service_description: string | null;
  contract_number: string | null;
  contract_date: string | null;
  notes: string | null;
  created_at: string;
  archived: number;
}

export function handleCreateInvoiceFromTimes(
  id: string | number | null,
  args: CreateInvoiceFromTimesInput,
): ReturnType<typeof jsonRpcSuccess | typeof jsonRpcError> {
  const month = parseMonth(args.month);
  if (!month) {
    return jsonRpcError(id, -32602, `Ungültiger Monat: ${args.month}`);
  }

  const settings = getSettings();
  if (!settings) {
    return jsonRpcError(id, -32603, "Einstellungen nicht konfiguriert");
  }

  // Find matching project (case-insensitive name or code)
  const allProjects = getAllActiveProjectsWithClient();
  const query = args.projectQuery.toLowerCase();
  const match = allProjects.find(
    (p) => p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query),
  );

  if (!match) {
    const names = allProjects.map((p) => `${p.code} (${p.name})`).join(", ");
    return jsonRpcError(
      id,
      -32602,
      `Kein aktives Projekt gefunden für "${args.projectQuery}". Verfügbar: ${names || "keine"}`,
    );
  }

  // Fetch full project row
  const project = db
    .query<ProjectRow, [number]>(
      `SELECT id, client_id, code, name, daily_rate, start_date, end_date, budget_days,
              service_description, contract_number, contract_date, notes, created_at, archived
       FROM projects WHERE id = ?`,
    )
    .get(match.id);

  if (!project) {
    return jsonRpcError(id, -32603, `Projekt ${match.id} nicht gefunden`);
  }

  // Fetch unbilled time entries for this project in the given month/year
  const monthStr = month.toString().padStart(2, "0");
  const periodPrefix = `${args.year}-${monthStr}`;

  const entries = db
    .query<UnbilledTimeRow, [number, string]>(
      `SELECT id, project_id, date, duration, description, billable, invoice_id, created_at
       FROM time_entries
       WHERE project_id = ? AND invoice_id IS NULL AND date LIKE ?
       ORDER BY date`,
    )
    .all(match.id, `${periodPrefix}-%`);

  if (entries.length === 0) {
    return jsonRpcError(
      id,
      -32602,
      `Keine abrechenbaren Zeiteinträge für Projekt "${match.name}" im ${monthStr}/${args.year} gefunden`,
    );
  }

  const invoiceDate = args.invoiceDate ?? new Date().toISOString().split("T")[0];

  // Build TimeEntry-compatible objects for createInvoice
  const timeEntries = entries.map((e) => ({
    id: e.id,
    project_id: e.project_id,
    date: e.date,
    duration: e.duration,
    description: e.description ?? "",
    billable: e.billable,
    invoice_id: e.invoice_id,
    created_at: e.created_at,
  }));

  const invoiceData = {
    client_id: match.client_id,
    project_id: match.id,
    time_entry_ids: entries.map((e) => e.id),
    invoice_date: invoiceDate,
    period_month: month,
    period_year: args.year,
    po_number: "",
    service_period_from: `${periodPrefix}-01`,
    service_period_to: new Date(args.year, month, 0).toISOString().split("T")[0],
  };

  const invoiceId = createInvoice(invoiceData, timeEntries, settings);

  // Audit log for MCP source
  appendAuditLog(
    "invoice",
    invoiceId,
    "create",
    { source_tool: "mcp:create_invoice_from_times" },
    "api",
  );

  // Compute totals for response
  const isKleinunternehmer = Boolean(settings.kleinunternehmer);
  const effectiveVatRate = isKleinunternehmer ? 0 : settings.vat_rate;
  const totalNet = roundToEuro(
    timeEntries.reduce((sum, e) => sum + e.duration * project.daily_rate, 0),
  );
  const totalVat = roundToEuro(totalNet * effectiveVatRate);

  const payload = {
    invoiceId,
    project: match.name,
    client: match.client_name,
    period: `${monthStr}/${args.year}`,
    timeEntryCount: entries.length,
    totalHours: roundToEuro(timeEntries.reduce((sum, e) => sum + e.duration, 0)),
    totalNet,
    totalVat,
    totalGross: roundToEuro(totalNet + totalVat),
    invoiceDate,
    message: `Rechnung #${invoiceId} für "${match.name}" (${monthStr}/${args.year}) erstellt — ${entries.length} Zeiteinträge, ${totalNet.toFixed(2)} € netto`,
  };

  return jsonRpcSuccess(id, {
    content: [{ type: "text", text: JSON.stringify(payload) }],
  });
}

export function handleToolsList(id: string | number | null) {
  return jsonRpcSuccess(id, {
    tools: [
      {
        name: "frea:validate_invoice",
        description:
          "Validates a proposed invoice against German legal requirements (§14 UStG, GoBD, MwSt per line item)",
        inputSchema: {
          type: "object",
          properties: {
            clientName: { type: "string", description: "Name des Rechnungsempfängers" },
            invoiceDate: { type: "string", description: "Rechnungsdatum (YYYY-MM-DD)" },
            dueDate: { type: "string", description: "Fälligkeitsdatum (YYYY-MM-DD)" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  amount: { type: "number", minimum: 0, description: "Nettobetrag in EUR" },
                  taxRate: {
                    type: "number",
                    enum: [0.0, 0.07, 0.19],
                    description: "MwSt-Satz (0% / 7% / 19%)",
                  },
                },
                required: ["description", "amount", "taxRate"],
              },
            },
          },
          required: ["clientName", "invoiceDate", "dueDate", "items"],
        },
      },
      {
        name: "frea:create_invoice_from_times",
        description:
          "Creates a draft invoice from unbilled time entries for a project and month. Use natural language: project name or code, month (number or German name), year.",
        inputSchema: {
          type: "object",
          properties: {
            projectQuery: {
              type: "string",
              description:
                "Projektname oder Projektkürzel (Teilstring genügt, z.B. 'Acme' oder 'P-001')",
            },
            month: {
              oneOf: [
                { type: "number", minimum: 1, maximum: 12 },
                {
                  type: "string",
                  description: "Monat als Zahl (1–12) oder deutsch ('Mai', 'Juni')",
                },
              ],
            },
            year: { type: "number", description: "Jahr (z.B. 2026)" },
            invoiceDate: {
              type: "string",
              description: "Rechnungsdatum (YYYY-MM-DD), Standard: heute",
            },
          },
          required: ["projectQuery", "month", "year"],
        },
      },
    ],
  });
}

export function handleToolsCall(id: string | number | null, params: unknown) {
  const p = params as { name?: string; arguments?: unknown } | undefined;
  if (!p?.name) {
    return jsonRpcError(id, -32602, "Fehlender Parameter: name");
  }

  if (p.name === "frea:validate_invoice") {
    const parsed = validateInvoiceSchema.safeParse(p.arguments);
    if (!parsed.success) {
      return jsonRpcSuccess(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              isCompliant: false,
              violations: parsed.error.issues.map((i) => i.message),
              suggestions: [],
              calculatedTaxTotal: null,
            }),
          },
        ],
      });
    }
    const result = validateInvoice(parsed.data);
    return jsonRpcSuccess(id, {
      content: [{ type: "text", text: JSON.stringify(result) }],
    });
  }

  if (p.name === "frea:create_invoice_from_times") {
    const parsed = createInvoiceFromTimesSchema.safeParse(p.arguments);
    if (!parsed.success) {
      return jsonRpcSuccess(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: parsed.error.issues.map((i) => i.message).join("; "),
            }),
          },
        ],
      });
    }
    try {
      return handleCreateInvoiceFromTimes(id, parsed.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      return jsonRpcSuccess(id, {
        content: [{ type: "text", text: JSON.stringify({ error: msg }) }],
      });
    }
  }

  return jsonRpcError(id, -32602, `Unbekanntes Tool: ${p.name}`);
}
