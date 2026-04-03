import { html } from "hono/html";

export interface EmptyStateProps {
  message: string;
  actionHref: string;
  actionLabel: string;
}

export function EmptyState({ message, actionHref, actionLabel }: EmptyStateProps) {
  return html`
    <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <p class="text-sm text-gray-600">${message}</p>
      <a
        href="${actionHref}"
        class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        ${actionLabel}
      </a>
    </div>
  `;
}
