import { Hono } from "hono";
import { html } from "hono/html";
import {
  getCashflowForecast,
  getOpenInvoicesByClient,
  getQuarterlyRevenue,
  getWeeklyTimeStats,
} from "../db/dashboard-queries";
import { hasNoClients } from "../db/queries";
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

dashboardRoutes.get("/", (c) => {
  let weeklyTime: ReturnType<typeof getWeeklyTimeStats>;
  let openByClient: ReturnType<typeof getOpenInvoicesByClient>;
  let quarterlyRevenue: ReturnType<typeof getQuarterlyRevenue>;
  let forecast: ReturnType<typeof getCashflowForecast>;
  let noClients: boolean;

  try {
    weeklyTime = getWeeklyTimeStats();
    openByClient = getOpenInvoicesByClient();
    quarterlyRevenue = getQuarterlyRevenue();
    forecast = getCashflowForecast();
    noClients = hasNoClients();
  } catch (err) {
    console.error("[dashboard] Fehler beim Laden der Dashboard-Daten:", err);
    throw new AppError("Dashboard-Daten konnten nicht geladen werden", 500);
  }

  const overdueCount = c.get("overdueCount") ?? 0;

  const firstTimeHint = noClients
    ? html`
        <div
          class="rounded-lg border border-accent-info bg-status-info-bg p-4"
          role="note"
          aria-label="Erste Schritte"
        >
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

  const content = html`
    <div class="space-y-6">
      <h1 class="text-xl font-semibold text-text-primary">Dashboard</h1>

      ${firstTimeHint}

      <!-- Obere Metriken: 1 col → 3 col -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${weeklyTimeWidget(weeklyTime)}
        ${quarterlyRevenueWidget(quarterlyRevenue)}
        ${overdueAlertWidget(overdueCount)}
      </div>

      <!-- Offene Rechnungen nach Kunden: volle Breite -->
      ${openInvoicesByClientWidget(openByClient)}

      <!-- Liquiditäts-Forecast: volle Breite -->
      ${liquidityForecastWidget(forecast)}
    </div>
  `;

  const onboardingDone = c.req.query("onboarding_done") === "1";
  const children = onboardingDone
    ? html`
        <div
          class="mb-6 rounded-lg border border-accent-success bg-status-paid-bg p-4"
          role="status"
        >
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
