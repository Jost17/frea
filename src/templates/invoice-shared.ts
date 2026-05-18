import {
  type InvoiceLayoutConfig,
  invoiceLayoutConfigSchema,
  type Settings,
} from "../validation/schemas";
import { Badge, type BadgeStatus } from "./components/badge";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("de-DE").format(new Date(`${dateStr}T00:00:00`));
}

const VALID_STATUSES: BadgeStatus[] = ["draft", "sent", "paid", "cancelled", "overdue"];

export function statusBadge(status: string) {
  const safeStatus: BadgeStatus = VALID_STATUSES.includes(status as BadgeStatus)
    ? (status as BadgeStatus)
    : "draft";
  return Badge({ status: safeStatus });
}

export function parseInvoiceLayoutConfig(settings: Settings): InvoiceLayoutConfig {
  const raw = settings.invoice_layout_config || "{}";
  try {
    const parsed = JSON.parse(raw) as unknown;
    return invoiceLayoutConfigSchema.parse(parsed);
  } catch (err) {
    console.warn("[invoice-shared] Invalid invoice_layout_config, falling back to defaults:", err);
    return invoiceLayoutConfigSchema.parse({});
  }
}

export function fontSizeClass(size: InvoiceLayoutConfig["font_size"]): string {
  if (size === "sm") return "text-sm";
  if (size === "lg") return "text-lg";
  return "text-base";
}

export function paperClass(paper: InvoiceLayoutConfig["paper_size"]): string {
  return paper === "letter" ? "max-w-[8.5in]" : "max-w-[210mm]";
}
