import { z } from "zod";

// ─── Input Schemas (Zod) ──────────────────────────────────────────────────────

// Settings
export const settingsSchema = z.object({
  company_name: z.string().min(1, "Firma erforderlich"),
  address: z.string().default(""),
  postal_code: z.string().default(""),
  city: z.string().default(""),
  country: z.string().default("Deutschland"),
  email: z.string().email("Gueltige E-Mail erforderlich"),
  phone: z.string().optional().default(""),
  mobile: z.string().optional().default(""),
  bank_name: z.string().default(""),
  iban: z.string().min(1, "IBAN erforderlich"),
  bic: z.string().min(1, "BIC erforderlich"),
  tax_number: z.string().min(1, "Steuernummer erforderlich"),
  ust_id: z.string().optional().default(""),
  vat_rate: z.number().default(0.19),
  payment_days: z.number().default(28),
  invoice_prefix: z.string().default("RE"),
  next_invoice_number: z.number().default(1),
  kleinunternehmer: z.number().default(0),
});

export type Settings = z.infer<typeof settingsSchema> & { id: number };

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

export interface AuditLog {
  id: number;
  timestamp: string;
  entity_type: string;
  entity_id: number;
  action: "create" | "update" | "delete" | "status_change";
  changes: string | null;
  source: "web" | "api";
}
