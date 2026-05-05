import { html } from "hono/html";

export interface CardProps {
  children: ReturnType<typeof html> | string;
  hover?: boolean;
  extraClass?: string;
}

export function Card({ children, hover = false, extraClass = "" }: CardProps) {
  const hoverClass = hover
    ? " cursor-pointer transition-shadow hover:shadow-card-hover hover:border-border-medium"
    : "";
  return html`<div
    class="rounded-lg border border-border-subtle bg-bg-surface shadow-card${hoverClass}${extraClass ? ` ${extraClass}` : ""}"
  >${children}</div>`;
}

export interface CardHeaderProps {
  children: ReturnType<typeof html> | string;
  extraClass?: string;
}

export function CardHeader({ children, extraClass = "" }: CardHeaderProps) {
  return html`<div
    class="border-b border-border-subtle px-6 py-4${extraClass ? ` ${extraClass}` : ""}"
  >${children}</div>`;
}

export interface CardBodyProps {
  children: ReturnType<typeof html> | string;
  extraClass?: string;
}

export function CardBody({ children, extraClass = "" }: CardBodyProps) {
  return html`<div class="px-6 py-4${extraClass ? ` ${extraClass}` : ""}">${children}</div>`;
}
