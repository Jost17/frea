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

const STATUS_TRANSITIONS: Record<
  string,
  Array<{ label: string; targetStatus: "sent" | "paid" | "cancelled" }>
> = {
  draft: [{ label: "Versenden", targetStatus: "sent" }],
  sent: [{ label: "Als bezahlt markieren", targetStatus: "paid" }],
  paid: [],
  cancelled: [],
};

export function interactiveStatusBadge(
  invoiceId: number,
  status: string,
  isOverdue: boolean,
): HtmlEscapedString | Promise<HtmlEscapedString> {
  const badgeInfo =
    isOverdue && status === "sent"
      ? { label: "Überfällig", className: "bg-red-100 text-red-700" }
      : (STATUS_BADGE_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-700" });
  const transitions = STATUS_TRANSITIONS[status] ?? [];
  const cls = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeInfo.className}`;

  if (transitions.length === 0) {
    return html`<div id="status-widget-${invoiceId}"><span class="${cls}">${badgeInfo.label}</span></div>`;
  }

  const actions = transitions.map(
    ({ label, targetStatus }) =>
      html`<button
        type="button"
        class="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-bg-surface-raised focus:bg-bg-surface-raised focus:outline-none"
        hx-post="/rechnungen/${invoiceId}/status"
        hx-vals='{"status":"${targetStatus}"}'
        hx-target="#status-widget-${invoiceId}"
        hx-swap="outerHTML"
      >${label}</button>`,
  );

  const reminder =
    status === "sent"
      ? html`<a
          href="/rechnungen/${invoiceId}"
          class="block px-4 py-2 text-sm text-text-secondary hover:bg-bg-surface-raised"
        >Zahlungserinnerung senden</a>`
      : html``;

  return html`
    <div id="status-widget-${invoiceId}">
      <details class="relative inline-block">
        <summary
          class="${cls} status-badge"
          aria-label="Status ändern: ${badgeInfo.label}"
        >${badgeInfo.label}</summary>
        <div
          class="absolute z-20 top-full left-0 mt-1 min-w-max rounded-md border border-border-subtle bg-bg-surface py-1 shadow-card"
          role="menu"
        >
          ${actions}
          ${reminder}
        </div>
      </details>
    </div>
  `;
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
