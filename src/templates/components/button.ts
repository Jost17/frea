import { html, raw } from "hono/html";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "link";

export interface ButtonProps {
  variant?: ButtonVariant;
  href?: string;
  type?: "submit" | "button" | "reset";
  icon?: string;
  iconOnly?: boolean;
  loading?: boolean;
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
    "rounded-md px-4 py-2 text-sm font-medium text-text-primary bg-primary-subtle hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
  danger:
    "rounded-md px-4 py-2 text-sm font-medium text-white bg-accent-danger hover:bg-accent-danger/90 focus:outline-none focus:ring-2 focus:ring-accent-danger focus:ring-offset-2",
  ghost:
    "p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
  link: "text-primary hover:underline cursor-pointer bg-transparent border-0 p-0 text-sm",
};

const DISABLED_BUTTON_CLASSES = "opacity-50 cursor-not-allowed";
const DISABLED_LINK_CLASSES = "opacity-50 cursor-not-allowed pointer-events-none";

const SPINNER_SVG = `<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`;

export function Button({
  variant = "primary",
  href,
  type = "button",
  icon,
  iconOnly = false,
  loading = false,
  disabled = false,
  attrs = "",
  extraClass = "",
  children,
}: ButtonProps) {
  const isEffectivelyDisabled = disabled || loading;
  const hasIcon = Boolean(icon) || loading;
  const iconClass = hasIcon && !iconOnly ? " flex items-center gap-1" : "";
  const iconOnlyClass = iconOnly ? " p-2 aspect-square" : "";
  const isLink = Boolean(href);
  const disabledClass = isEffectivelyDisabled
    ? ` ${isLink ? DISABLED_LINK_CLASSES : DISABLED_BUTTON_CLASSES}`
    : "";
  const classes =
    VARIANT_CLASSES[variant] +
    iconClass +
    iconOnlyClass +
    (extraClass ? ` ${extraClass}` : "") +
    disabledClass;

  const spinnerHtml = loading ? raw(`<span aria-hidden="true">${SPINNER_SVG}</span>`) : raw("");
  const iconHtml = !loading && icon ? raw(`<span aria-hidden="true">${icon}</span>`) : raw("");
  const labelHtml = iconOnly ? raw(`<span class="sr-only">${children}</span>`) : children;
  const extraAttrs = raw(attrs ? ` ${attrs}` : "");

  if (isLink) {
    const linkDisabledAttrs = isEffectivelyDisabled
      ? raw(' aria-disabled="true" tabindex="-1"')
      : raw("");
    return html`<a href="${href}" class="${classes}"${linkDisabledAttrs}${extraAttrs}>${spinnerHtml}${iconHtml}${labelHtml}</a>`;
  }

  const buttonDisabledAttrs = isEffectivelyDisabled
    ? raw(' disabled aria-disabled="true"')
    : raw("");
  const ariaLabel = loading ? raw(` aria-label="Wird geladen…"`) : raw("");
  return html`<button type="${type}" class="${classes}"${buttonDisabledAttrs}${ariaLabel}${extraAttrs}>${spinnerHtml}${iconHtml}${labelHtml}</button>`;
}
