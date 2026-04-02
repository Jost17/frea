import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import {
  createInvoice,
  getActiveProjectsForClient,
  getAllActiveClients,
  getAllInvoices,
  getClient,
  getInvoice,
  getInvoiceItems,
  getProject,
  getSettings,
  getTimeEntriesForProject,
  updateInvoiceStatus,
} from "../db/queries";
import { Layout } from "../templates/layout";
import { invoiceCreateSchema } from "../validation/schemas";
import { parseFormFields } from "../utils/form-parser";

export const invoiceRoutes = new Hono<AppEnv>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("de-DE").format(new Date(`${dateStr}T00:00:00`));
}

function statusBadge(status: string): string {
  const map: Record<string, { label: string; class: string }> = {
    draft: { label: "Entwurf", class: "bg-gray-100 text-gray-700" },
    sent: { label: "Versendet", class: "bg-blue-100 text-blue-700" },
    paid: { label: "Bezahlt", class: "bg-green-100 text-green-700" },
    cancelled: { label: "Storniert", class: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, class: "bg-gray-100 text-gray-700" };
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.class}">${s.label}</span>`;
}

// ─── List ────────────────────────────────────────────────────────────────────

invoiceRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const invoices = getAllInvoices();
    const now = new Date().toISOString().split("T")[0];

    return c.html(
      Layout({
        title: "Rechnungen",
        activeNav: "rechnungen",
        overdueCount,
        children: html`
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold">Rechnungen</h1>
            <a
              href="/rechnungen/create"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Neue Rechnung
            </a>
          </div>

          ${
            invoices.length === 0
              ? html`
              <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <p class="text-sm text-gray-600">
                  Noch keine Rechnungen erstellt. Erfasse zuerst Zeiten für ein Projekt, dann kannst du eine Rechnung generieren.
                </p>
                <a href="/rechnungen/create" class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Neue Rechnung erstellen
                </a>
              </div>
            `
              : html`
              <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-3 text-left font-semibold text-gray-700">Rechnungsnummer</th>
                      <th class="px-4 py-3 text-left font-semibold text-gray-700">Kunde</th>
                      <th class="px-4 py-3 text-right font-semibold text-gray-700">Betrag</th>
                      <th class="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                      <th class="px-4 py-3 text-right font-semibold text-gray-700">Rechnungsdatum</th>
                      <th class="px-4 py-3 text-right font-semibold text-gray-700">Fällig</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    ${invoices.map((inv) => {
                      const isOverdue = inv.status === "sent" && inv.due_date < now;
                      return html`
                        <tr class="hover:bg-gray-50">
                          <td class="px-4 py-3">
                            <a href="/rechnungen/${inv.id}" class="font-medium text-blue-600 hover:underline">
                              ${inv.invoice_number}
                            </a>
                          </td>
                          <td class="px-4 py-3 text-gray-600">${inv.client_name}</td>
                          <td class="px-4 py-3 text-right font-medium text-gray-900">${formatCurrency(inv.gross_amount)}</td>
                          <td class="px-4 py-3 text-center">${statusBadge(inv.status)}</td>
                          <td class="px-4 py-3 text-right text-gray-600">${formatDate(inv.invoice_date)}</td>
                          <td class="px-4 py-3 text-right text-gray-600 ${isOverdue ? "text-red-600 font-medium" : ""}">
                            ${formatDate(inv.due_date)}${isOverdue ? " ⚠" : ""}
                          </td>
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>
            `
          }
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Rechnungen konnten nicht geladen werden", 500);
  }
});

// ─── Create: Step 1 — Select Client ─────────────────────────────────────────

invoiceRoutes.get("/create", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const clients = getAllActiveClients();

    if (clients.length === 0) {
      return c.html(
        Layout({
          title: "Neue Rechnung",
          activeNav: "rechnungen",
          overdueCount,
          children: html`
            <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <p class="text-sm text-gray-600">
                Bitte erstelle zuerst einen Kunden und ein Projekt mit Zeiteinträgen.
              </p>
              <a href="/kunden/new" class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Neuen Kunden erstellen
              </a>
            </div>
          `,
        }),
      );
    }

    return c.html(
      Layout({
        title: "Neue Rechnung — Kunde wählen",
        activeNav: "rechnungen",
        overdueCount,
        children: html`
          <div class="max-w-2xl">
            <h1 class="mb-6 text-2xl font-semibold">Neue Rechnung erstellen</h1>
            <p class="mb-6 text-sm text-gray-600">Wähle den Kunden, für den du eine Rechnung erstellen möchtest.</p>

            <div class="space-y-3">
              ${clients.map(
                (client) => html`
                <a
                  href="/rechnungen/create?client_id=${client.id}"
                  class="block rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <div class="flex justify-between items-center">
                    <div>
                      <p class="font-semibold text-gray-900">${client.name}</p>
                      <p class="text-sm text-gray-500">${client.city || "—"}</p>
                    </div>
                    <span class="text-gray-400">→</span>
                  </div>
                </a>
              `,
              )}
            </div>
          </div>
        `,
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Fehler beim Laden", 500);
  }
});

// ─── Create: Step 2 — Select Project & Preview ───────────────────────────────

invoiceRoutes.get("/create", (c) => {
  try {
    const clientId = parseInt(c.req.query("client_id") || "", 10);
    if (!clientId) return c.redirect("/rechnungen/create");

    const overdueCount = c.get("overdueCount");
    const client = getClient(clientId);
    if (!client) return c.redirect("/rechnungen/create");

    const projects = getActiveProjectsForClient(clientId);
    const settings = getSettings();
    if (!settings) throw new AppError("Einstellungen nicht gefunden", 500);

    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + (settings.payment_days || 28) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    return c.html(
      Layout({
        title: "Neue Rechnung — Projekt wählen",
        activeNav: "rechnungen",
        overdueCount,
        children: html`
          <div class="max-w-3xl">
            <a href="/rechnungen/create" class="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center">
              ← Zurück
            </a>
            <h1 class="mb-2 text-2xl font-semibold">Neue Rechnung erstellen</h1>
            <p class="mb-6 text-sm text-gray-600">Kunde: <strong>${client.name}</strong></p>

            ${
              projects.length === 0
                ? html`
                <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
                  <p class="text-sm text-gray-600">Für diesen Kunden gibt es keine aktiven Projekte.</p>
                </div>
              `
                : html`
                <div class="space-y-4">
                  ${projects.map((project) => {
                    const entries = getTimeEntriesForProject(project.id);
                    const unbilledEntries = entries.filter((e) => e.invoice_id === null);
                    const totalHours = unbilledEntries.reduce((sum, e) => sum + e.duration, 0);
                    const totalDays = totalHours / 8;
                    const netAmount = totalDays * project.daily_rate;
                    const vatAmount = netAmount * settings.vat_rate;
                    const grossAmount = netAmount + vatAmount;
                    const isKleinunternehmer = Boolean(settings.kleinunternehmer);

                    return html`
                      <div class="rounded-lg border border-gray-200 bg-white p-6">
                        <div class="flex justify-between items-start mb-4">
                          <div>
                            <h2 class="text-lg font-semibold text-gray-900">${project.code} — ${project.name}</h2>
                            <p class="text-sm text-gray-500">
                              Tagessatz: ${formatCurrency(project.daily_rate)} · ${unbilledEntries.length} offene Einträge
                            </p>
                          </div>
                          <div class="text-right">
                            <p class="text-lg font-bold text-gray-900">${formatCurrency(grossAmount)}</p>
                            <p class="text-xs text-gray-500">
                              ${totalDays.toFixed(1)} Tage · Netto: ${formatCurrency(netAmount)}
                            </p>
                          </div>
                        </div>

                        ${
                          unbilledEntries.length === 0
                            ? html`<p class="text-sm text-gray-400 italic">Keine unberechneten Zeiteinträge.</p>`
                            : html`
                              <form method="post" action="/rechnungen/create" class="space-y-4">
                                <input type="hidden" name="client_id" value="${clientId}" />
                                <input type="hidden" name="project_id" value="${project.id}" />

                                <div class="grid grid-cols-2 gap-4">
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Rechnungsdatum *</label>
                                    <input type="date" name="invoice_date" value="${today}" required
                                      class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                  </div>
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Abrechnungsmonat *</label>
                                    <input type="number" name="period_month" value="${new Date().getMonth() + 1}" min="1" max="12" required
                                      class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                  </div>
                                </div>

                                <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-1">Abrechnungsjahr *</label>
                                  <input type="number" name="period_year" value="${new Date().getFullYear()}" min="2000" max="2099" required
                                    class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Bestellnummer (optional)</label>
                                    <input type="text" name="po_number" placeholder="z.B. PO-2026-001"
                                      class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                  </div>
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Fällig am</label>
                                    <input type="date" name="due_date" value="${dueDate}"
                                      class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                  </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Leistungszeitraum von</label>
                                    <input type="date" name="service_period_from"
                                      class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                  </div>
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Leistungszeitraum bis</label>
                                    <input type="date" name="service_period_to"
                                      class="block w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                                  </div>
                                </div>

                                <div class="border-t border-gray-200 pt-4">
                                  <p class="text-sm font-medium text-gray-700 mb-2">Abzurechnende Zeiteinträge</p>
                                  <div class="space-y-1 max-h-40 overflow-y-auto bg-gray-50 rounded p-2">
                                    ${unbilledEntries.map((entry) => {
                                      const days = entry.duration / 8;
                                      const net = days * project.daily_rate;
                                      return html`
                                        <div class="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-0">
                                          <span class="text-gray-700">
                                            ${formatDate(entry.date)} · ${entry.duration.toFixed(1)}h
                                            ${entry.description ? `— ${entry.description}` : ""}
                                          </span>
                                          <span class="text-gray-500 font-medium">${formatCurrency(net)}</span>
                                        </div>
                                      `;
                                    })}
                                  </div>
                                </div>

                                <div class="flex justify-between items-center pt-4 border-t border-gray-200">
                                  <div class="text-sm text-gray-500">
                                    ${
                                      isKleinunternehmer
                                        ? html`<span class="text-green-600">§19 UStG: Keine MwSt.</span>`
                                        : html`<span>MwSt (${(settings.vat_rate * 100).toFixed(0)}%): ${formatCurrency(vatAmount)}</span>`
                                    }
                                  </div>
                                  <div class="flex gap-3">
                                    <a href="/rechnungen/create" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                                      Abbrechen
                                    </a>
                                    <button type="submit"
                                      class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                      Rechnung erstellen
                                    </button>
                                  </div>
                                </div>
                              </form>
                            `
                        }
                      </div>
                    `;
                  })}
                </div>
              `
            }
          </div>
        `,
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Fehler beim Laden", 500);
  }
});

// ─── Create: POST handler ─────────────────────────────────────────────────────

const INVOICE_FORM_FIELDS = {
  client_id: "int",
  project_id: "int",
  invoice_date: "string",
  period_month: "int",
  period_year: "int",
  po_number: "string",
  due_date: "string",
  service_period_from: "string",
  service_period_to: "string",
  reverse_charge: "bool",
} as const;

invoiceRoutes.post("/create", async (c) => {
  try {
    const body = await c.req.formData();
    const data = parseFormFields(body, INVOICE_FORM_FIELDS);

    // Build time_entry_ids from form
    const timeEntryIds: number[] = [];
    for (const [key, value] of body.entries()) {
      if (key === "time_entry_ids" && typeof value === "string") {
        const id = parseInt(value, 10);
        if (!Number.isNaN(id)) timeEntryIds.push(id);
      }
    }

    const validated = invoiceCreateSchema.parse({
      client_id: data.client_id as number,
      project_id: data.project_id as number,
      time_entry_ids: timeEntryIds,
      invoice_date: data.invoice_date as string,
      period_month: data.period_month as number,
      period_year: data.period_year as number,
      po_number: (data.po_number as string) || "",
      service_period_from: (data.service_period_from as string) || "",
      service_period_to: (data.service_period_to as string) || "",
      reverse_charge: Boolean(data.reverse_charge),
    });
    const settings = getSettings();
    if (!settings) throw new AppError("Einstellungen nicht gefunden", 500);

    // Validate: client and project belong together
    const client = getClient(validated.client_id);
    if (!client) throw new AppError("Kunde nicht gefunden", 404);

    const project = getProject(validated.project_id);
    if (!project) throw new AppError("Projekt nicht gefunden", 404);
    if (project.client_id !== validated.client_id) {
      throw new AppError("Projekt gehört nicht zum ausgewählten Kunden", 400);
    }

    // Get time entries for this project
    const allEntries = getTimeEntriesForProject(validated.project_id);
    const unbilledEntries = allEntries.filter((e) => e.invoice_id === null);

    if (unbilledEntries.length === 0) {
      throw new AppError("Keine unberechneten Zeiteinträge für dieses Projekt", 400);
    }

    // Validate Reverse Charge eligibility
    if (validated.reverse_charge) {
      if (!settings.ust_id) {
        throw new AppError("Reverse Charge erfordert eine USt-IdNr. in den Einstellungen", 400);
      }
      if (!client.vat_id) {
        throw new AppError("Reverse Charge erfordert eine USt-IdNr. des Kunden", 400);
      }
    }

    // Create invoice
    const invoiceId = createInvoice(
      {
        client_id: validated.client_id,
        project_id: validated.project_id,
        time_entry_ids: [],
        invoice_date: validated.invoice_date,
        period_month: validated.period_month,
        period_year: validated.period_year,
        po_number: validated.po_number,
        service_period_from: validated.service_period_from,
        service_period_to: validated.service_period_to,
        reverse_charge: validated.reverse_charge,
      },
      unbilledEntries,
      settings,
      { reverseCharge: validated.reverse_charge },
    );

    return c.redirect(`/rechnungen/${invoiceId}`);
  } catch (err) {
    return handleMutationError(c, err, "Rechnung konnte nicht erstellt werden");
  }
});

// ─── View Invoice ────────────────────────────────────────────────────────────

invoiceRoutes.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    const invoice = getInvoice(id);
    if (!invoice) throw new AppError("Rechnung nicht gefunden", 404);

    const items = getInvoiceItems(id);
    const client = getClient(invoice.client_id);
    const settings = getSettings();

    if (!client || !settings) throw new AppError("Daten fehlen", 500);

    const overdueCount = c.get("overdueCount");
    const now = new Date().toISOString().split("T")[0];
    const isOverdue = invoice.status === "sent" && invoice.due_date < now;
    const isKleinunternehmer = Boolean(settings.kleinunternehmer);
    const isReverseCharge = Boolean(invoice.reverse_charge);

    const effectiveVatRate = isKleinunternehmer || isReverseCharge ? 0 : settings.vat_rate;

    return c.html(
      Layout({
        title: `Rechnung ${invoice.invoice_number}`,
        activeNav: "rechnungen",
        overdueCount,
        children: html`
          <div class="max-w-4xl">
            <div class="mb-6 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <h1 class="text-2xl font-semibold">Rechnung ${invoice.invoice_number}</h1>
                ${statusBadge(invoice.status)}
                ${isOverdue ? html`<span class="text-sm text-red-600 font-medium">Überfällig ⚠</span>` : ""}
              </div>
              <div class="flex gap-2">
                ${
                  invoice.status === "draft"
                    ? html`
                      <form method="post" action="/rechnungen/${invoice.id}/status" class="inline">
                        <input type="hidden" name="status" value="sent" />
                        <button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                          Als versendet markieren
                        </button>
                      </form>
                    `
                    : invoice.status === "sent"
                      ? html`
                        <form method="post" action="/rechnungen/${invoice.id}/status" class="inline">
                          <input type="hidden" name="status" value="paid" />
                          <button type="submit" class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                            Als bezahlt markieren
                          </button>
                        </form>
                      `
                      : ""
                }
              </div>
            </div>

            <div class="rounded-lg border border-gray-200 bg-white p-8">
              <!-- Header — DIN 5008 Type B -->
              <div class="mb-8 flex justify-between">
                <div>
                  <!-- Absender (leistender Unternehmer) -->
                  <p class="text-xs text-gray-500 mb-1">Rechnungssteller:</p>
                  <p class="font-semibold text-gray-900">${settings.company_name}</p>
                  <p class="text-sm text-gray-600">${settings.address || ""}</p>
                    <p class="text-sm text-gray-600">${settings.postal_code ? `${settings.postal_code} ` : ""}${settings.city || ""}</p>
                </div>
                <div class="text-right text-sm text-gray-600">
                  <p>Rechnungsnummer: <strong class="text-gray-900">${invoice.invoice_number}</strong></p>
                  <p>Rechnungsdatum: ${formatDate(invoice.invoice_date)}</p>
                  <p>Leistungszeitraum: ${invoice.service_period_from ? formatDate(invoice.service_period_from) : "—"} – ${invoice.service_period_to ? formatDate(invoice.service_period_to) : "—"}</p>
                  <p>Fällig am: ${formatDate(invoice.due_date)}</p>
                  ${invoice.po_number ? html`<p>Bestellnummer: ${invoice.po_number}</p>` : ""}
                </div>
              </div>

              <!-- Rechnungsempfänger -->
              <div class="mb-8 border-t border-gray-200 pt-6">
                <p class="text-xs text-gray-500 mb-1">Rechnungsempfänger:</p>
                <p class="font-semibold text-gray-900">${client.name}</p>
                <p class="text-sm text-gray-600">${client.address || ""}</p>
                <p class="text-sm text-gray-600">${client.postal_code ? `${client.postal_code} ` : ""}${client.city || ""}</p>
                ${client.vat_id ? html`<p class="text-sm text-gray-500 mt-1">USt-IdNr.: ${client.vat_id}</p>` : ""}
              </div>

              <!-- Positions table — DIN 5008 -->
              <div class="mb-8">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b-2 border-gray-300">
                      <th class="py-2 text-left font-semibold text-gray-700">Nr.</th>
                      <th class="py-2 text-left font-semibold text-gray-700">Beschreibung</th>
                      <th class="py-2 text-right font-semibold text-gray-700">Zeitraum</th>
                      <th class="py-2 text-right font-semibold text-gray-700">Tage</th>
                      <th class="py-2 text-right font-semibold text-gray-700">Tagessatz</th>
                      <th class="py-2 text-right font-semibold text-gray-700">Netto</th>
                      ${
                        effectiveVatRate > 0
                          ? html`<th class="py-2 text-right font-semibold text-gray-700">MwSt ${(effectiveVatRate * 100).toFixed(0)}%</th>`
                          : html`<th class="py-2 text-right font-semibold text-gray-700">MwSt</th>`
                      }
                      <th class="py-2 text-right font-semibold text-gray-700">Brutto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map((item, i) => {
                      const periodStr = `${formatDate(item.period_start)} – ${formatDate(item.period_end)}`;
                      return html`
                        <tr class="border-b border-gray-100">
                          <td class="py-2 text-gray-600">${i + 1}</td>
                          <td class="py-2 text-gray-900">${item.description}</td>
                          <td class="py-2 text-right text-gray-600 text-xs">${periodStr}</td>
                          <td class="py-2 text-right text-gray-600">${item.days.toFixed(2)}</td>
                          <td class="py-2 text-right text-gray-600">${formatCurrency(item.daily_rate)}</td>
                          <td class="py-2 text-right font-medium text-gray-900">${formatCurrency(item.net_amount)}</td>
                          ${
                            item.vat_rate > 0
                              ? html`
                                <td class="py-2 text-right text-gray-600">${formatCurrency(item.vat_amount)}</td>
                                <td class="py-2 text-right font-medium text-gray-900">${formatCurrency(item.gross_amount)}</td>
                              `
                              : html`<td class="py-2 text-right text-gray-400 italic">0,00 €</td><td class="py-2 text-right font-medium text-gray-900">${formatCurrency(item.gross_amount)}</td>`
                          }
                        </tr>
                      `;
                    })}
                  </tbody>
                </table>
              </div>

              <!-- Totals -->
              <div class="mb-8 flex justify-end">
                <div class="w-72 space-y-2 border-t border-gray-200 pt-4">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Zwischensumme (Netto):</span>
                    <span class="font-medium text-gray-900">${formatCurrency(invoice.net_amount)}</span>
                  </div>
                  ${
                    effectiveVatRate > 0
                      ? html`
                        <div class="flex justify-between text-sm">
                          <span class="text-gray-600">MwSt (${(effectiveVatRate * 100).toFixed(0)}%):</span>
                          <span class="font-medium text-gray-900">${formatCurrency(invoice.vat_amount)}</span>
                        </div>
                      `
                      : ""
                  }
                  ${
                    isKleinunternehmer
                      ? html`<p class="text-sm text-green-700 italic">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</p>`
                      : isReverseCharge
                        ? html`<p class="text-sm text-gray-600 italic">Steuerschuldnerschaft des Leistungsempfängers (§13b UStG).</p>`
                        : ""
                  }
                  <div class="flex justify-between border-t border-gray-200 pt-2 text-lg">
                    <span class="font-semibold text-gray-900">Gesamtbetrag:</span>
                    <span class="font-bold text-gray-900">${formatCurrency(invoice.gross_amount)}</span>
                  </div>
                </div>
              </div>

              <!-- Footer — §14 UStG Pflichtangaben -->
              <div class="border-t border-gray-200 pt-6 text-xs text-gray-500 space-y-1">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="font-medium text-gray-700">Rechnungssteller:</p>
                    <p>${settings.company_name} · ${settings.address || ""} · ${settings.postal_code || ""} ${settings.city || ""}</p>
                    ${settings.ust_id ? html`<p>USt-IdNr.: ${settings.ust_id}</p>` : ""}
                    ${settings.tax_number ? html`<p>Steuernummer: ${settings.tax_number}</p>` : ""}
                  </div>
                  <div>
                    <p class="font-medium text-gray-700">Zahlungsbedingungen:</p>
                    <p>Netto ${settings.payment_days} Tage</p>
                    ${settings.bank_name ? html`<p>Kontoinhaber: ${settings.bank_name}</p>` : ""}
                    ${settings.iban ? html`<p>IBAN: ${settings.iban}</p>` : ""}
                    ${settings.bic ? html`<p>BIC: ${settings.bic}</p>` : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `,
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Rechnung konnte nicht geladen werden", 500);
  }
});

// ─── Status Change ─────────────────────────────────────────────────────────────

invoiceRoutes.post("/:id/status", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (Number.isNaN(id)) throw new AppError("Ungültige Rechnungs-ID", 400);

    const body = await c.req.formData();
    const status = body.get("status") as string;

    if (!["sent", "paid", "cancelled"].includes(status)) {
      throw new AppError("Ungültiger Status", 400);
    }

    updateInvoiceStatus(id, status as "sent" | "paid" | "cancelled");
    return c.redirect(`/rechnungen/${id}`);
  } catch (err) {
    return handleMutationError(c, err, "Status konnte nicht geändert werden");
  }
});
