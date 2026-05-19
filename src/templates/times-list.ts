import { html } from "hono/html";
import type { ActiveTimer, ProjectWithClient, TimeEntryWithContext } from "../db/queries";
import type { TimeEntry } from "../validation/schemas";

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export function renderTimerStartForm(allProjects: ProjectWithClient[]) {
  return html`
    <div id="timer-start-form" class="hidden mb-6">
      <form
        method="post"
        action="/zeiten/timer/start"
        class="rounded-lg border border-blue-200 bg-blue-50 p-4 flex flex-wrap gap-3 items-end"
      >
        <div class="flex-1 min-w-48">
          <label for="timer-project" class="block text-xs font-medium text-gray-700 mb-1">Projekt</label>
          <select
            id="timer-project"
            name="project_id"
            required
            class="block w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">-- Wählen --</option>
            ${allProjects.map(
              (p) =>
                html`<option value="${p.id}">${p.client_name} / ${p.name} (${p.code})</option>`,
            )}
          </select>
        </div>
        <div class="flex-1 min-w-48">
          <label for="timer-desc" class="block text-xs font-medium text-gray-700 mb-1">Beschreibung</label>
          <input
            id="timer-desc"
            type="text"
            name="description"
            placeholder="Woran arbeitest du?"
            class="block w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
          />
        </div>
        <button
          type="submit"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 whitespace-nowrap"
        >
          &#9654; Starten
        </button>
      </form>
    </div>
  `;
}

export function renderTimerSection(timers: ActiveTimer[]) {
  if (timers.length === 0) return html`<div id="timer-section"></div>`;

  return html`
    <div id="timer-section" class="mb-6">
      <h2 class="text-base font-semibold text-gray-700 mb-2">Laufende Timer</h2>
      <div class="space-y-2">
        ${timers.map((timer) => {
          const h = Math.floor(timer.elapsed_seconds / 3600);
          const m = Math.floor((timer.elapsed_seconds % 3600) / 60);
          const s = timer.elapsed_seconds % 60;
          const elapsed = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
          return html`
            <div class="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <span class="text-amber-600 text-lg font-mono">&#9679;</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm text-gray-900">${timer.client_name} / ${timer.project_name}</p>
                ${timer.description ? html`<p class="text-xs text-gray-500 truncate">${timer.description}</p>` : ""}
              </div>
              <span class="font-mono text-sm font-semibold text-amber-700 tabular-nums">${elapsed}</span>
              <form method="post" action="/zeiten/timer/${timer.id}/stop" class="flex gap-1 items-center">
                <input type="hidden" name="description" value="${timer.description}" />
                <button
                  type="submit"
                  class="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                >
                  &#9646;&#9646; Stoppen
                </button>
              </form>
              <form method="post" action="/zeiten/timer/${timer.id}/discard">
                <button
                  type="submit"
                  onclick="return confirm('Timer verwerfen ohne Zeiteintrag?')"
                  class="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Verwerfen
                </button>
              </form>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

export function renderUnbilledList(byClient: Map<string, Map<string, TimeEntryWithContext[]>>) {
  return html`
    <p class="mb-4 text-sm text-gray-500">Hier siehst du alle noch nicht abgerechneten Zeiten.</p>
    <form method="post" action="/rechnungen/new" id="unbilled-form">
      <div class="space-y-8">
        ${[...byClient.entries()].map(([clientName, byProject]) => {
          return html`
            <div>
              <h2 class="text-lg font-semibold mb-3">${clientName}</h2>
              <div class="space-y-4">
                ${[...byProject.entries()].map(([projectName, projectEntries]) => {
                  const totalHours = projectEntries.reduce((s, e) => s + e.duration, 0);
                  const dailyRate = projectEntries[0]?.daily_rate ?? 0;
                  const hourlyRate = dailyRate / 8;
                  const totalAmount = totalHours * hourlyRate;
                  return html`
                    <div class="rounded-lg border border-gray-200 overflow-hidden bg-white">
                      <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <div class="flex items-center gap-3">
                          <input
                            type="checkbox"
                            class="project-select-all h-4 w-4 rounded border-gray-300"
                            data-project="${projectName}"
                            onchange="toggleProjectEntries(this)"
                            title="Alle Einträge dieses Projekts auswählen"
                          />
                          <span class="font-medium text-sm text-gray-900">${projectName}</span>
                        </div>
                        <span class="text-sm text-gray-600">
                          ${totalHours.toFixed(1).replace(".", ",")}h
                          ${hourlyRate > 0 ? html` = ${formatEuro(totalAmount)}` : ""}
                        </span>
                      </div>
                      <table class="w-full text-sm">
                        <thead class="border-b bg-gray-50">
                          <tr>
                            <th class="px-4 py-2 text-left font-semibold text-gray-700 w-8"></th>
                            <th class="px-4 py-2 text-left font-semibold text-gray-700">Datum</th>
                            <th class="px-4 py-2 text-right font-semibold text-gray-700">Stunden</th>
                            <th class="px-4 py-2 text-left font-semibold text-gray-700">Beschreibung</th>
                            <th class="px-4 py-2 text-center font-semibold text-gray-700">Aktion</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${projectEntries.map((entry) => {
                            return html`
                              <tr class="border-t hover:bg-gray-50">
                                <td class="px-4 py-2">
                                  <input
                                    type="checkbox"
                                    name="entry_ids"
                                    value="${entry.id}"
                                    class="entry-checkbox h-4 w-4 rounded border-gray-300"
                                    data-project="${entry.project_name}"
                                    onchange="updateSubmitButton()"
                                  />
                                </td>
                                <td class="px-4 py-2 text-gray-600">${entry.date}</td>
                                <td class="px-4 py-2 text-right text-gray-600">${entry.duration.toFixed(1)}h</td>
                                <td class="px-4 py-2 text-gray-600 text-xs">${entry.description || "—"}</td>
                                <td class="px-4 py-2 text-center">
                                  <a href="/zeiten/${entry.id}" class="text-blue-600 hover:underline text-xs">
                                    Bearbeiten
                                  </a>
                                </td>
                              </tr>
                            `;
                          })}
                        </tbody>
                      </table>
                    </div>
                  `;
                })}
              </div>
            </div>
          `;
        })}
      </div>
      <div class="mt-6 flex justify-end">
        <button
          type="submit"
          id="create-invoice-btn"
          disabled
          class="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Rechnung erstellen
        </button>
      </div>
    </form>
    <script>
      function updateSubmitButton() {
        const anyChecked = document.querySelectorAll('.entry-checkbox:checked').length > 0;
        document.getElementById('create-invoice-btn').disabled = !anyChecked;
      }
      function toggleProjectEntries(masterCheckbox) {
        const project = masterCheckbox.dataset.project;
        document.querySelectorAll('.entry-checkbox[data-project="' + project + '"]').forEach(function(cb) {
          cb.checked = masterCheckbox.checked;
        });
        updateSubmitButton();
      }
    </script>
  `;
}

export function renderTimeForm(
  entry: TimeEntry | null,
  allProjects: ProjectWithClient[],
  dateParam: string,
) {
  const isNew = !entry;
  const action = isNew ? "/zeiten" : `/zeiten/${entry.id}`;
  const dateValue = entry?.date || dateParam || "";
  const durationValue = entry ? String(entry.duration) : "";

  return html`
    <div class="max-w-2xl">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold">${isNew ? "Neuer Zeiteintrag" : "Zeiteintrag bearbeiten"}</h1>
      </div>

      <form method="post" action="${action}" class="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label for="project_id" class="block text-sm font-medium text-gray-700">Projekt *</label>
          <select
            id="project_id"
            name="project_id"
            required
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">-- Wählen --</option>
            ${allProjects.map((p) => {
              return html`<option value="${p.id}" ${entry?.project_id === p.id ? "selected" : ""}>${p.client_name} / ${p.name} (${p.code})</option>`;
            })}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="date" class="block text-sm font-medium text-gray-700">Datum *</label>
            <input
              type="date"
              id="date"
              name="date"
              required
              value="${dateValue}"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="duration" class="block text-sm font-medium text-gray-700">Dauer *</label>
            <input
              type="text"
              id="duration"
              name="duration"
              required
              value="${durationValue}"
              placeholder="z.B. 1h30m, 1.5, 90min"
              class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
              aria-describedby="duration-hint"
            />
            <p id="duration-hint" class="mt-1 text-xs text-gray-500">
              Format: 1h30m, 1h30, 90min, 1.5h oder 1.5 (Stunden)
            </p>
          </div>
        </div>

        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">Beschreibung</label>
          <textarea
            id="description"
            name="description"
            rows="3"
            class="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
            aria-describedby="description-hint"
          >
${entry?.description || ""}</textarea
          >
          <p id="description-hint" class="mt-1 text-xs text-gray-500">
            Kurze Beschreibung der Tätigkeit. Erscheint auf der Rechnung.
          </p>
        </div>

        <div>
          <div class="flex items-center">
            <input
              type="checkbox"
              id="billable"
              name="billable"
              ${entry?.billable === 1 ? "checked" : ""}
              class="h-4 w-4 rounded border-gray-300"
              aria-describedby="billable-hint"
            />
            <label for="billable" class="ml-2 text-sm font-medium text-gray-700">Abrechenbar</label>
          </div>
          <p id="billable-hint" class="mt-1 text-xs text-gray-500">
            Deaktivieren für interne Aufgaben, die nicht in Rechnung gestellt werden.
          </p>
        </div>

        <div class="flex justify-end gap-4 border-t border-gray-200 pt-6">
          <a href="/zeiten" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Abbrechen</a>
          ${
            !isNew
              ? html`
                <form method="post" action="/zeiten/${entry.id}/delete" class="inline">
                  <button
                    type="submit"
                    onclick="return confirm('Wirklich löschen?')"
                    class="px-4 py-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Löschen
                  </button>
                </form>
              `
              : ""
          }
          <button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Speichern
          </button>
        </div>
      </form>
    </div>
  `;
}
