import { html, raw } from "hono/html";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "link";

export interface ButtonProps {
  variant?: ButtonVariant;
  href?: string;
  type?: "submit" | "button" | "reset";
  icon?: string;
  disabled?: boolean;
  /** Raw HTML attributes string — for HTMX attrs. Server-controlled, never user input. */
  attrs?: string;
  extraClass?: string;
  children: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "rounded-md px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
  secondary:
    "rounded-md px-4 py-2 text-sm font-medium text-primary bg-primary-subtle hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
  danger:
    "rounded-md px-4 py-2 text-sm font-medium text-white bg-accent-danger hover:bg-accent-danger/90 focus:outline-none focus:ring-2 focus:ring-accent-danger focus:ring-offset-2",
  ghost:
    "p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
  link: "text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 text-sm",
};

export function Button({
  variant = "primary",
  href,
  type = "button",
  icon,
  disabled = false,
  attrs = "",
  extraClass = "",
  children,
}: ButtonProps) {
  const iconClass = icon ? " flex items-center gap-1" : "";
  const classes =
    VARIANT_CLASSES[variant] + iconClass + (extraClass ? ` ${extraClass}` : "");
  const iconHtml = icon ? raw(`<span aria-hidden="true">${icon}</span>`) : raw("");
  const disabledAttr = disabled
    ? raw(' disabled aria-disabled="true" opacity-50 cursor-not-allowed')
    : raw("");

  if (href) {
    return html`<a href="${href}" class="${classes}"${disabledAttr}${raw(attrs ? ` ${attrs}` : "")}>${iconHtml}${children}</a>`;
  }

  return html`<button type="${type}" class="${classes}"${disabledAttr}${raw(attrs ? ` ${attrs}` : "")}>${iconHtml}${children}</button>`;
}
