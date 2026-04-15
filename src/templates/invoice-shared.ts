import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import {
  type InvoiceLayoutConfig,
  invoiceLayoutConfigSchema,
  type Settings,
} from "../validation/schemas";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("de-DE").format(new Date(`${dateStr}T00:00:00`));
}

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Entwurf", className: "bg-gray-100 text-gray-700" },
  sent: { label: "Versendet", className: "bg-blue-100 text-blue-700" },
  paid: { label: "Bezahlt", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Storniert", className: "bg-red-100 text-red-700" },
};

export function statusBadge(status: string): HtmlEscapedString | Promise<HtmlEscapedString> {
  const fallback = { label: status, className: "bg-gray-100 text-gray-700" };
  const { label, className } = STATUS_BADGE_MAP[status] ?? fallback;
  return html`<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}">${label}</span>`;
}

export function parseInvoiceLayoutConfig(settings: Settings): InvoiceLayoutConfig {
  const raw = settings.invoice_layout_config || "{}";
  try {
    const parsed = JSON.parse(raw) as unknown;
    return invoiceLayoutConfigSchema.parse(parsed);
  } catch (err) {
    console.warn(
      "[invoice-shared] Invalid invoice_layout_config, falling back to defaults:",
      err,
    );
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
