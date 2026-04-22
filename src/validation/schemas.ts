import { z } from "zod";

// ─── IBAN Checksum (ISO 13616 MOD-97) ───────────────────────────────────────

function isValidIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(iban)) return false;
  // Move first 4 chars to end, convert letters to digits (A=10, B=11, ..., Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  // MOD-97 on large number (process in chunks to avoid BigInt dependency)
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

// ─── Input Schemas (Zod) ──────────────────────────────────────────────────────

// Settings
export const settingsSchema = z
  .object({
    company_name: z.string().min(1, "Firma erforderlich"),
    address: z.string().default(""),
    postal_code: z
      .string()
      .refine((v) => !v || /^\d{5}$/.test(v), "PLZ muss 5 Ziffern haben")
      .default(""),
    city: z.string().default(""),
    country: z.string().default("Deutschland"),
    email: z.string().email("Gueltige E-Mail erforderlich"),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    bank_name: z.string().default(""),
    iban: z
      .string()
      .min(1, "IBAN erforderlich")
      .refine((v) => isValidIban(v), "Ungültige IBAN (Prüfziffer stimmt nicht)"),
    bic: z.string().min(1, "BIC erforderlich"),
    // Optional individually — cross-field rule: at least one of tax_number or ust_id required.
    tax_number: z
      .string()
      .optional()
      .default("")
      .refine(
        (v) => !v || /^\d{2}\/\d{3}\/\d{5}$/.test(v) || /^\d{10,11}$/.test(v),
        "Ungültige Steuernummer (Format: 12/345/67890 oder 12345678901)",
      ),
    ust_id: z.string().optional(),
    vat_rate: z.number().default(0.19),
    payment_days: z.number().default(28),
    invoice_prefix: z.string().default("RE"),
    next_invoice_number: z.number().default(1),
    kleinunternehmer: z.number().default(0),
    smtp_host: z.string().default(""),
    smtp_port: z.number().default(587),
    smtp_user: z.string().default(""),
    smtp_password: z.string().default(""),
    smtp_from: z.string().email("Ungültige E-Mail").or(z.literal("")).default(""),
  })
  .superRefine((data, ctx) => {
    if (!data.tax_number?.trim() && !data.ust_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Steuernummer oder Ust-IdNr. ist erforderlich",
        path: ["tax_number"],
      });
    }
  });

export type Settings = z.infer<typeof settingsSchema> & { id: number; invoice_layout_config?: string };

// ─── Invoice Layout Config ─────────────────────────────────────────────────────

export const invoiceLayoutConfigSchema = z.object({
  accent_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Akzentfarbe muss Hex-Format (#RRGGBB) haben")
    .default("#2563eb"),
  font_size: z.enum(["sm", "md", "lg"]).default("md"),
  paper_size: z.enum(["a4", "letter"]).default("a4"),
  show_logo: z.boolean().default(false),
  show_payment_terms: z.boolean().default(true),
  show_bank_details: z.boolean().default(true),
  show_tax_number: z.boolean().default(true),
});

export type InvoiceLayoutConfig = z.infer<typeof invoiceLayoutConfigSchema>;

// Clients
export const clientSchema = z.object({
  name: z.string().min(1, "Name erforderlich"),
  address: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  city: z.string().optional().default(""),
  country: z.string().optional().default("Deutschland"),
  email: z.string().email("Gueltige E-Mail").optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  contact_person: z.string().optional().default(""),
  vat_id: z.string().optional().default(""),
  buyer_reference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type Client = z.infer<typeof clientSchema> & {
  id: number;
  created_at: string;
  archived: number;
};

// Projects
export const projectSchema = z.object({
  client_id: z.number().int(),
  code: z.string().min(1, "Projektcode erforderlich"),
  name: z.string().min(1, "Projektname erforderlich"),
  daily_rate: z.number().min(0, "Tageshonorar erforderlich"),
  start_date: z.string().optional().default(""),
  end_date: z.string().optional().default(""),
  budget_days: z.number().optional().default(0),
  service_description: z.string().optional().default(""),
  contract_number: z.string().optional().default(""),
  contract_date: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type Project = z.infer<typeof projectSchema> & {
  id: number;
  created_at: string;
  archived: number;
};

// Time Entries
export const timeEntrySchema = z.object({
  project_id: z.number().int(),
  date: z.string().min(1, "Datum erforderlich"),
  duration: z.number().min(0.25, "Mindestens 15 Min.").max(24),
  description: z.string().optional().default(""),
  billable: z.number().default(1),
});

export type TimeEntry = z.infer<typeof timeEntrySchema> & {
  id: number;
  created_at: string;
  invoice_id: number | null;
};

// Invoices
export const invoiceCreateSchema = z.object({
  client_id: z.number().int(),
  project_id: z.number().int(),
  time_entry_ids: z.array(z.number().int()),
  invoice_date: z.string().min(1, "Rechnungsdatum erforderlich"),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int().min(2000).max(2099),
  po_number: z.string().optional().default(""),
  service_period_from: z.string().optional().default(""),
  service_period_to: z.string().optional().default(""),
});

export type InvoiceCreate = z.infer<typeof invoiceCreateSchema>;

// ─── DB Row Types (not Zod-validated, represent SELECT results) ───────────────

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  project_id: number;
  invoice_date: string;
  due_date: string;
  period_month: number;
  period_year: number;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  status: "draft" | "sent" | "paid" | "cancelled";
  pdf_path: string | null;
  po_number: string | null;
  service_period_from: string | null;
  service_period_to: string | null;
  paid_date: string | null;
  reminder_level: number;
  created_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  period_start: string;
  period_end: string;
  days: number;
  daily_rate: number;
  net_amount: number;
  vat_rate: number;
  vat_amount: number;
  gross_amount: number;
}

// Invoice Status Update
export const invoiceStatusUpdateSchema = z.object({
  status: z.enum(["sent", "paid", "cancelled"]),
});

export type InvoiceStatusUpdate = z.infer<typeof invoiceStatusUpdateSchema>;

export interface AuditLog {
  id: number;
  timestamp: string;
  entity_type: string;
  entity_id: number;
  action: "create" | "update" | "delete" | "status_change";
  changes: string | null;
  source: "web" | "api";
}

// ─── Invoice List (moved from queries.ts for type colocation) ───────────────

export interface InvoiceListItem {
  id: number;
  invoice_number: string;
  client_name: string;
  invoice_date: string;
  due_date: string;
  gross_amount: number;
  status: Invoice["status"];
  paid_date: string | null;
}

export const VALID_INVOICE_FILTER_VALUES = new Set([
  "open",
  "overdue",
  "draft",
  "sent",
  "paid",
  "cancelled",
]);

// ─── Onboarding Completion Schema (single source of truth for guard + wizard) ─

const DEFAULT_COMPANY_NAME = "Mein Unternehmen";

export const onboardingCompletionSchema = z.object({
  company_name: z
    .string()
    .min(1)
    .refine((v) => v !== DEFAULT_COMPANY_NAME),
  address: z.string().min(1),
  postal_code: z.string().refine((v) => /^\d{5}$/.test(v)),
  city: z.string().min(1),
  email: z.string().email(),
  iban: z.string().min(1).refine((v) => isValidIban(v)),
  bic: z.string().min(1),
  tax_number: z.string().optional().default(""),
  ust_id: z.string().optional().default(""),
}).refine(
  (data) => !!(data.tax_number?.trim() || data.ust_id?.trim()),
  { message: "Steuernummer oder Ust-IdNr. erforderlich" },
);
