import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

interface SectionCardArgs {
  number: number;
  title: string;
  subtitle?: string;
  children: HtmlEscapedString | Promise<HtmlEscapedString>;
  id?: string;
}

export function SectionCard({ number, title, subtitle, children, id }: SectionCardArgs) {
  return html`
    <div class="rounded-xl border border-border-subtle bg-bg-surface shadow-sm" id="${id ?? ""}">
      <div class="px-6 py-4 border-b border-border-subtle">
        <div class="flex items-center gap-3">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            ${number}
          </span>
          <div>
            <h2 class="text-base font-semibold text-text-primary">${title}</h2>
            ${subtitle ? html`<p class="text-xs text-text-secondary">${subtitle}</p>` : html``}
          </div>
        </div>
      </div>
      <div class="px-6 py-5">
        ${children}
      </div>
    </div>
  `;
}

interface SectionLayoutArgs {
  children: HtmlEscapedString | Promise<HtmlEscapedString>;
}

export function SectionLayout({ children }: SectionLayoutArgs) {
  return html`
    <div class="max-w-2xl">
      <div class="flex items-center justify-between mb-6">
        <div>
          <a href="/rechnungen" class="text-sm text-text-secondary hover:text-text-primary inline-flex items-center gap-1 mb-1">
            ← Rechnungen
          </a>
          <h1 class="text-2xl font-semibold text-text-primary">Neue Rechnung</h1>
        </div>
      </div>
      <div class="space-y-4">
        ${children}
      </div>
    </div>
  `;
}
