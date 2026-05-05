import { html } from "hono/html";

export type BadgeStatus = "draft" | "sent" | "paid" | "cancelled" | "overdue";

const STATUS_CLASSES: Record<BadgeStatus, string> = {
  draft: "bg-status-draft-bg text-status-draft-text",
  sent: "bg-status-open-bg text-status-open-text",
  paid: "bg-status-paid-bg text-status-paid-text",
  overdue: "bg-status-overdue-bg text-status-overdue-text",
  cancelled: "bg-status-cancelled-bg text-status-cancelled-text",
};

const STATUS_LABELS: Record<BadgeStatus, string> = {
  draft: "Entwurf",
  sent: "Versendet",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
};

export interface BadgeProps {
  status: BadgeStatus;
  label?: string;
}

export function Badge({ status, label }: BadgeProps) {
  const displayLabel = label ?? STATUS_LABELS[status];
  return html`<span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}"
  >${displayLabel}</span>`;
}
