import { html } from "hono/html";

export interface TableColumn {
  label: string;
  align?: "left" | "center" | "right";
  extraClass?: string;
}

export interface TableProps {
  columns: TableColumn[];
  /** Use html`...` from hono/html for row content */
  rows: ReturnType<typeof html> | ReturnType<typeof html>[];
  extraClass?: string;
}

const ALIGN: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function Table({ columns, rows, extraClass = "" }: TableProps) {
  return html`
    <div class="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden${extraClass ? ` ${extraClass}` : ""}">
      <table class="min-w-full divide-y divide-border-subtle text-sm">
        <thead class="bg-bg-surface-raised">
          <tr>
            ${columns.map(
              (col) =>
                html`<th
                  scope="col"
                  class="px-4 py-3 font-semibold text-text-secondary ${ALIGN[col.align ?? "left"]}${col.extraClass ? ` ${col.extraClass}` : ""}"
                >${col.label}</th>`
            )}
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle">
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

export function TableRow({
  children,
  extraClass = "",
}: {
  children: ReturnType<typeof html> | ReturnType<typeof html>[];
  extraClass?: string;
}) {
  return html`<tr class="hover:bg-bg-surface-raised${extraClass ? ` ${extraClass}` : ""}">${children}</tr>`;
}

export function Td({
  children,
  align = "left",
  extraClass = "",
}: {
  children: ReturnType<typeof html> | string;
  align?: "left" | "center" | "right";
  extraClass?: string;
}) {
  return html`<td class="px-4 py-3 ${ALIGN[align]}${extraClass ? ` ${extraClass}` : ""}">${children}</td>`;
}
