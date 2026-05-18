import { z } from "zod";

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
      `${blankDescriptions.length} Position(en) mit unzureichender Leistungsbeschreibung — §14 UStG`,
    );
  }

  const zeroItems = input.items.filter((i) => i.amount === 0);
  if (zeroItems.length > 0) {
    suggestions.push(
      `${zeroItems.length} Position(en) mit Betrag 0 — ggf. als Rabatt kennzeichnen`,
    );
  }

  const allTaxRates = new Set(input.items.map((i) => i.taxRate));
  if (allTaxRates.has(0.0) && allTaxRates.size > 1) {
    suggestions.push(
      "Mischung aus steuerfreien und steuerpflichtigen Positionen — Steuerbefreiungsgrund angeben",
    );
  }

  suggestions.push("Rechnungsnummer auf Lückenlosigkeit prüfen (§14 UStG)");
  suggestions.push("Leistungszeitraum explizit angeben");

  if (input.items.some((i) => i.taxRate === 0.07)) {
    suggestions.push("Ermäßigter MwSt-Satz 7% — prüfe Berechtigung");
  }

  return {
    isCompliant: violations.length === 0,
    violations,
    suggestions,
    calculatedTaxTotal: violations.length === 0 ? calculatedTaxTotal : null,
  };
}

export const TOOLS_DEFINITIONS = [
  {
    name: "frea:validate_invoice",
    description: "Validates invoice against §14 UStG, GoBD, MwSt per line item",
    inputSchema: {
      type: "object" as const,
      properties: {
        clientName: { type: "string", description: "Rechnungsempfänger" },
        invoiceDate: { type: "string", description: "Rechnungsdatum (YYYY-MM-DD)" },
        dueDate: { type: "string", description: "Fälligkeitsdatum (YYYY-MM-DD)" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              amount: { type: "number", minimum: 0 },
              taxRate: { type: "number", enum: [0.0, 0.07, 0.19] },
            },
            required: ["description", "amount", "taxRate"],
          },
        },
      },
      required: ["clientName", "invoiceDate", "dueDate", "items"],
    },
  },
];
