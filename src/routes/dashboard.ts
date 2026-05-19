import { Hono } from "hono";
import { html } from "hono/html";
import {
  type CashflowMonth,
  type DashboardStats,
  getCashflowForecast,
  getDashboardStats,
  getOpenInvoicesByClient,
  getQuarterlyRevenue,
  getWeeklyTimeStats,
} from "../db/dashboard-queries";
import { getDashboardPersona, hasNoClients } from "../db/queries";
import type { AppEnv } from "../env";
import { AppError } from "../middleware/error-handler";
import {
  liquidityForecastWidget,
  openInvoicesByClientWidget,
  overdueAlertWidget,
  quarterlyRevenueWidget,
  weeklyTimeWidget,
} from "../templates/components/dashboard-widgets";
import { Layout } from "../templates/layout";

export const dashboardRoutes = new Hono<AppEnv>();

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function personaACashflowWidget(months: CashflowMonth[]): ReturnType<typeof html> {
  if (months.length === 0) {
    return html`
      <div class="card p-4">
        <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Liquiditäts-Forecast</p>
        <p class="mt-3 text-sm text-text-secondary">Keine offenen Rechnungen — kein Forecast möglich.</p>
      </div>
    `;
  }

  const maxAmount = Math.max(...months.map((m) => m.expected_amount));
  const bars = months.map((m) => {
    const barWidth = maxAmount > 0 ? Math.round((m.expected_amount / maxAmount) * 100) : 0;
    const overdueClass = m.is_overdue ? "bg-red-400" : "bg-blue-400";
    const labelClass = m.is_overdue ? "text-red-600" : "text-text-primary";
    return html`
      <div class="flex items-center gap-3">
        <div class="w-24 shrink-0 text-right">
          <span class="text-xs font-medium ${labelClass}">${m.label}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="h-5 rounded bg-gray-100 overflow-hidden">
            <div class="h-full rounded ${overdueClass}" style="width: ${barWidth}%"></div>
          </div>
        </div>
        <div class="w-28 shrink-0">
          <span class="text-xs font-semibold ${labelClass}">${formatEuro(m.expected_amount)}</span>
          <span class="ml-1 text-xs text-text-muted">(${m.invoice_count})</span>
        </div>
      </div>
    `;
  });

  return html`
    <div class="card p-4">
      <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Liquiditäts-Forecast</p>
      <p class="mt-0.5 text-xs text-text-secondary">Erwartete Zahlungseingänge offener Rechnungen</p>
      <div class="mt-4 space-y-2">${bars}</div>
      ${months.some((m) => m.is_overdue) ? html`<p class="mt-1 text-xs text-red-500">Rot = Zahlungsziel überschritten</p>` : ""}
    </div>
  `;
}

function renderPersonaA(stats: DashboardStats, forecast: CashflowMonth[]): ReturnType<typeof html> {
  const hasOverdue = stats.overdue_invoices_count > 0;
  return html`
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="card p-4">
        <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Offene Rechnungen</p>
        <p class="mt-2 text-2xl font-semibold text-text-primary">${stats.open_invoices_count}</p>
        <p class="mt-1 text-sm text-text-secondary">${formatEuro(stats.open_invoices_sum)}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Umsatz diesen Monat</p>
        <p class="mt-2 text-2xl font-semibold text-text-primary">${formatEuro(stats.revenue_current_month)}</p>
      </div>
      <div class="${hasOverdue ? "rounded-lg border border-accent-danger bg-status-overdue-bg shadow-card p-4" : "card p-4"}">
        <p class="text-xs font-medium ${hasOverdue ? "text-status-overdue-text" : "text-text-muted"} uppercase tracking-wide">Überfällig</p>
        <p class="mt-2 text-2xl font-semibold ${hasOverdue ? "text-status-overdue-text" : "text-text-muted"}">${stats.overdue_invoices_count}</p>
        <p class="mt-1 text-sm ${hasOverdue ? "text-status-overdue-text" : "text-text-muted"}">
          ${hasOverdue ? "Rechnungen überfällig" : "Keine überfälligen Rechnungen"}
        </p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Aktive Kunden</p>
        <p class="mt-2 text-2xl font-semibold text-text-primary">${stats.active_clients_count}</p>
      </div>
      <div class="card p-4">
        <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Aktive Projekte</p>
        <p class="mt-2 text-2xl font-semibold text-text-primary">${stats.active_projects_count}</p>
      </div>
    </div>
    ${personaACashflowWidget(forecast)}
  `;
}

function renderPersonaB(
  weeklyTime: ReturnType<typeof getWeeklyTimeStats>,
  openByClient: ReturnType<typeof getOpenInvoicesByClient>,
  quarterlyRevenue: ReturnType<typeof getQuarterlyRevenue>,
  forecast: ReturnType<typeof getCashflowForecast>,
  overdueCount: number,
): ReturnType<typeof html> {
  return html`
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      ${weeklyTimeWidget(weeklyTime)}
      ${quarterlyRevenueWidget(quarterlyRevenue)}
      ${overdueAlertWidget(overdueCount)}
    </div>
    ${openInvoicesByClientWidget(openByClient)}
    ${liquidityForecastWidget(forecast)}
  `;
}

dashboardRoutes.get("/", (c) => {
  let noClients: boolean;
  let persona: "A" | "B";

  // Shared data
  let forecast: ReturnType<typeof getCashflowForecast>;

  // Persona B specific
  let weeklyTime: ReturnType<typeof getWeeklyTimeStats>;
  let openByClient: ReturnType<typeof getOpenInvoicesByClient>;
  let quarterlyRevenue: ReturnType<typeof getQuarterlyRevenue>;

  // Persona A specific
  let stats: DashboardStats;

  try {
    persona = getDashboardPersona();
    noClients = hasNoClients();
    forecast = getCashflowForecast();

    if (persona === "A") {
      stats = getDashboardStats();
    } else {
      weeklyTime = getWeeklyTimeStats();
      openByClient = getOpenInvoicesByClient();
      quarterlyRevenue = getQuarterlyRevenue();
    }
  } catch (err) {
    console.error("[dashboard] Fehler beim Laden der Dashboard-Daten:", err);
    throw new AppError("Dashboard-Daten konnten nicht geladen werden", 500);
  }

  const overdueCount = c.get("overdueCount") ?? 0;

  const firstTimeHint = noClients
    ? html`
        <div class="rounded-lg border border-accent-info bg-status-info-bg p-4" role="note" aria-label="Erste Schritte">
          <p class="text-sm font-medium text-status-info-text">Alles eingerichtet.</p>
          <p class="mt-1 text-sm text-status-info-text">
            Leg jetzt deinen ersten Kunden an — danach kannst du Projekte erstellen und Zeiten erfassen.
          </p>
          <a href="/kunden/new" class="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            Ersten Kunden anlegen →
          </a>
        </div>
      `
    : "";

  const widgetContent =
    persona === "A"
      ? renderPersonaA(stats!, forecast)
      : renderPersonaB(weeklyTime!, openByClient!, quarterlyRevenue!, forecast, overdueCount);

  const content = html`
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-text-primary">Dashboard</h1>
        <a href="/einstellungen#dashboard-ansicht" class="text-xs text-text-muted hover:text-primary">
          Ansicht: ${persona === "A" ? "Übersicht" : "Finanzen"} ›
        </a>
      </div>
      ${firstTimeHint}
      ${widgetContent}
    </div>
  `;

  const onboardingDone = c.req.query("onboarding_done") === "1";
  const children = onboardingDone
    ? html`
        <div class="mb-6 rounded-lg border border-accent-success bg-status-paid-bg p-4" role="status">
          <p class="text-sm font-medium text-status-paid-text">
            Einrichtung abgeschlossen! Firmendaten wurden gespeichert.
          </p>
        </div>
        ${content}
      `
    : content;

  return c.html(
    Layout({
      title: "Dashboard",
      activeNav: "dashboard",
      overdueCount,
      children,
    }),
  );
});
