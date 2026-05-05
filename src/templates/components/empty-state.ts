import { html, raw } from "hono/html";

export interface EmptyStateProps {
  message: string;
  actionHref?: string;
  actionLabel?: string;
  /** Inline SVG string for the icon (no CDN) */
  icon?: string;
}

export function EmptyState({ message, actionHref, actionLabel, icon }: EmptyStateProps) {
  const hasAction = Boolean(actionHref && actionLabel);
  return html`
    <div class="rounded-lg border border-border-subtle bg-bg-surface p-8 text-center">
      ${
        icon
          ? html`<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-surface-raised text-text-muted">
            ${raw(icon)}
          </div>`
          : ""
      }
      <p class="text-sm text-text-secondary">${message}</p>
      ${
        hasAction
          ? html`
            <a
              href="${actionHref}"
              class="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              ${actionLabel}
            </a>
          `
          : ""
      }
    </div>
  `;
}
