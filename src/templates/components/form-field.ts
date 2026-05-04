import { html, raw } from "hono/html";

export type FormFieldType = "text" | "textarea" | "select" | "date" | "number" | "email" | "tel";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormFieldProps {
  type: FormFieldType;
  id: string;
  name: string;
  label: string;
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  hint?: string;
  error?: string;
  /** For select fields */
  options?: SelectOption[];
  /** Raw HTML attributes — server-controlled only */
  attrs?: string;
  extraClass?: string;
}

const INPUT_BASE =
  "mt-1 block w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1";
const INPUT_NORMAL =
  "border-border-medium bg-bg-surface text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-primary";
const INPUT_ERROR =
  "border-accent-danger bg-bg-surface text-text-primary focus:border-accent-danger focus:ring-accent-danger";
const INPUT_DISABLED =
  "border-border-subtle bg-bg-surface-raised text-text-muted cursor-not-allowed opacity-60";

export function FormField({
  type,
  id,
  name,
  label,
  value,
  placeholder,
  required = false,
  disabled = false,
  readonly: isReadonly = false,
  hint,
  error,
  options = [],
  attrs = "",
  extraClass = "",
}: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ");

  const stateClass = disabled ? INPUT_DISABLED : error ? INPUT_ERROR : INPUT_NORMAL;
  const inputClass = `${INPUT_BASE} ${stateClass}${extraClass ? ` ${extraClass}` : ""}`;

  const ariaAttrs = [
    error ? 'aria-invalid="true"' : "",
    describedBy ? `aria-describedby="${describedBy}"` : "",
    disabled ? "disabled" : "",
    isReadonly ? "readonly" : "",
    required ? "required" : "",
    attrs,
  ]
    .filter(Boolean)
    .join(" ");

  const valueAttr = value !== undefined ? `value="${String(value)}"` : "";
  const placeholderAttr = placeholder ? `placeholder="${placeholder}"` : "";

  let inputEl: ReturnType<typeof html>;

  if (type === "textarea") {
    inputEl = html`<textarea
      id="${id}"
      name="${name}"
      class="${inputClass} min-h-[80px]"
      ${raw(ariaAttrs)}
    >${value ?? ""}</textarea>`;
  } else if (type === "select") {
    inputEl = html`<select
      id="${id}"
      name="${name}"
      class="${inputClass}"
      ${raw(ariaAttrs)}
    >
      ${options.map(
        (opt) =>
          html`<option value="${opt.value}"${raw(String(value) === opt.value ? " selected" : "")}>${opt.label}</option>`
      )}
    </select>`;
  } else {
    inputEl = html`<input
      type="${type}"
      id="${id}"
      name="${name}"
      class="${inputClass}"
      ${raw(valueAttr)}
      ${raw(placeholderAttr)}
      ${raw(ariaAttrs)}
    />`;
  }

  return html`
    <div>
      <label for="${id}" class="block text-sm font-medium text-text-primary">
        ${label}${raw(required ? ' <span aria-hidden="true" class="text-accent-danger">*</span>' : "")}
      </label>
      ${inputEl}
      ${hint && !error
        ? html`<p id="${hintId}" class="mt-1 text-xs text-text-muted">${hint}</p>`
        : ""}
      ${error
        ? html`<p id="${errorId}" class="mt-1 text-xs text-accent-danger" role="alert">${error}</p>`
        : ""}
    </div>
  `;
}
