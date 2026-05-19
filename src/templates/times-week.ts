import { html } from "hono/html";
import type { WeekEntry } from "../db/queries";
import { formatWeekDayLabel, getWeekDays } from "../utils/iso-week";

interface WeekGridProps {
  weekStart: string;
  weekEnd: string;
  label: string;
  entries: WeekEntry[];
  prevMonday: string;
  nextMonday: string;
  todayMonday: string;
  currentDate: string; // the ?d= param value (any day in week)
}

/**
 * Formats a date as DD.MM. for display in the nav bar.
 */
function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}.${month}.`;
}

/**
 * Formats duration as "1,5h" (German decimal comma).
 */
function formatHours(h: number): string {
  return `${h.toFixed(1).replace(".", ",")}h`;
}

export function renderWeekGrid({
  weekStart,
  weekEnd,
  label,
  entries,
  prevMonday,
  nextMonday,
  todayMonday,
  currentDate,
}: WeekGridProps) {
  const days = getWeekDays(weekStart);

  // Build a map: project_id → { project_name, client_name } and entry lookup
  // Key for entry map: `${project_id}:${date}`
  const entryMap = new Map<string, WeekEntry>();
  for (const e of entries) {
    entryMap.set(`${e.project_id}:${e.date}`, e);
  }

  // Unique projects ordered by client_name, project_name
  const projectsSeen = new Set<number>();
  const projects: Array<{ project_id: number; project_name: string; client_name: string }> = [];
  for (const e of entries) {
    if (!projectsSeen.has(e.project_id)) {
      projectsSeen.add(e.project_id);
      projects.push({
        project_id: e.project_id,
        project_name: e.project_name,
        client_name: e.client_name,
      });
    }
  }

  // Daily totals
  const dayTotals = days.map((d) => {
    return entries.filter((e) => e.date === d).reduce((sum, e) => sum + e.duration, 0);
  });
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);

  return html`
    <!-- Week Navigation -->
    <div class="flex items-center justify-between mb-6 flex-wrap gap-2">
      <a
        href="/zeiten/woche?d=${prevMonday}"
        class="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        ← Vorwoche
      </a>
      <div class="text-center">
        <span class="font-semibold text-gray-900">${label}</span>
        <span class="text-gray-500 text-sm ml-2">(${formatShortDate(weekStart)}–${formatShortDate(weekEnd)})</span>
        ${
          currentDate !== todayMonday
            ? html`<a
              href="/zeiten/woche?d=${todayMonday}"
              class="ml-3 text-xs text-blue-600 hover:underline"
            >Heute</a>`
            : ""
        }
      </div>
      <a
        href="/zeiten/woche?d=${nextMonday}"
        class="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Nächste Woche →
      </a>
    </div>

    <!-- Week Grid -->
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="w-full text-sm border-collapse">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-gray-700 min-w-40">Projekt</th>
            ${days.map(
              (d) =>
                html`<th class="px-3 py-3 text-center font-medium text-gray-600 min-w-24">
                  ${formatWeekDayLabel(d)}
                </th>`,
            )}
          </tr>
        </thead>
        <tbody>
          ${
            projects.length === 0
              ? html`<tr>
                <td colspan="8" class="px-4 py-6 text-center text-sm text-gray-400">
                  Keine Zeiteinträge in dieser Woche.
                </td>
              </tr>`
              : projects.map(
                  ({ project_id, project_name, client_name }) => html`
                  <tr class="border-t border-gray-100 hover:bg-gray-50">
                    <td class="px-4 py-3">
                      <span class="text-xs text-gray-500">${client_name}</span><br />
                      <span class="font-medium text-gray-900">${project_name}</span>
                    </td>
                    ${days.map((d) => {
                      const entry = entryMap.get(`${project_id}:${d}`);
                      return html`
                        <td
                          class="px-3 py-3 text-center cursor-pointer hover:bg-blue-50 transition-colors"
                          hx-get="/zeiten/woche/cell?project_id=${project_id}&date=${d}"
                          hx-target="this"
                          hx-swap="innerHTML"
                        >
                          ${
                            entry
                              ? html`<span class="font-mono text-gray-700">${formatHours(entry.duration)}</span>`
                              : html`<span class="text-gray-300">—</span>`
                          }
                        </td>
                      `;
                    })}
                  </tr>
                `,
                )
          }
        </tbody>
        <tfoot class="bg-gray-50 border-t-2 border-gray-200">
          <tr>
            <td class="px-4 py-3 font-semibold text-gray-700">Gesamt</td>
            ${dayTotals.map(
              (total) =>
                html`<td class="px-3 py-3 text-center font-mono font-semibold text-gray-700">
                  ${total > 0 ? formatHours(total) : html`<span class="text-gray-300">—</span>`}
                </td>`,
            )}
          </tr>
          <tr class="border-t border-gray-200">
            <td class="px-4 py-2 text-xs text-gray-500" colspan="8">
              Wochengesamt: <strong>${formatHours(weekTotal)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Actions -->
    <div class="mt-4">
      <a
        href="/zeiten/new?date=${weekStart}"
        class="text-sm text-blue-600 hover:underline"
      >
        + Neuer Zeiteintrag
      </a>
    </div>
  `;
}

/**
 * Renders the mini inline cell form fragment (HTMX response).
 */
export function renderCellForm(projectId: number, date: string, existingEntry: WeekEntry | null) {
  return html`
    <form
      hx-post="/zeiten/woche/cell"
      hx-target="closest td"
      hx-swap="innerHTML"
      class="flex flex-col gap-1 items-center"
    >
      <input type="hidden" name="project_id" value="${projectId}" />
      <input type="hidden" name="date" value="${date}" />
      ${existingEntry ? html`<input type="hidden" name="entry_id" value="${existingEntry.id}" />` : ""}
      <input
        type="text"
        name="duration_text"
        value="${existingEntry ? String(existingEntry.duration) : ""}"
        placeholder="z.B. 1h30m"
        class="w-20 rounded border border-blue-300 px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
        autofocus
      />
      <div class="flex gap-1">
        <button
          type="submit"
          class="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700"
        >
          ✓
        </button>
        <button
          type="button"
          onclick="this.closest('form').replaceWith(this.closest('td').dataset.original || '')"
          hx-get="/zeiten/woche/cell/cancel?project_id=${projectId}&date=${date}${existingEntry ? `&entry_id=${existingEntry.id}` : ""}"
          hx-target="closest td"
          hx-swap="innerHTML"
          class="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>
    </form>
  `;
}

/**
 * Renders just the cell content (after save or cancel).
 */
export function renderCellContent(entry: WeekEntry | null) {
  if (!entry) return html`<span class="text-gray-300">—</span>`;
  return html`<span class="font-mono text-gray-700">${formatHours(entry.duration)}</span>`;
}
