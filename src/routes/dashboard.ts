import { Hono } from "hono";
import { html } from "hono/html";
import { type DashboardStats, getDashboardStats } from "../db/dashboard-queries";
import { hasNoClients } from "../db/queries";
import type { AppEnv } from "../env";
import { AppError } from "../middleware/error-handler";
import { Layout } from "../templates/layout";

export const dashboardRoutes = new Hono<AppEnv>();

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

dashboardRoutes.get("/", (c) => {
  let stats: DashboardStats;
  let noClients: boolean;
  try {
    stats = getDashboardStats();
    noClients = hasNoClients();
  } catch (err) {
    console.error("[dashboard] Failed to load stats:", err);
    throw new AppError("Dashboard-Daten konnten nicht geladen werden", 500);
  }

  const overdueCount = c.get("overdueCount") ?? 0;
  const hasOverdue = stats.overdue_invoices_count > 0;
  const overdueCardClass = hasOverdue ? "border-accent-danger/30 bg-status-overdue-bg" : "border-border-subtle bg-bg-surface";
  const overdueLabelClass = hasOverdue ? "text-accent-danger" : "text-text-muted";

  const firstTimeHint = noClients
    ? html`<div class="rounded-lg border border-accent-info/30 bg-accent-info/5 p-4" role="note" aria-label="Erste Schritte">
        <p class="text-sm font-medium text-text-primary">Alles eingerichtet.</p>
        <p class="mt-1 text-sm text-text-secondary">Leg jetzt deinen ersten Kunden an — danach kannst du Projekte erstellen und Zeiten erfassen.</p>
        <a href="/kunden/new" class="mt-2 inline-block text-sm font-medium text-primary hover:underline">Ersten Kunden anlegen →</a>
      </div>`
    : "";

  const content = html`
    <div class="space-y-6">
      <h1 class="text-xl font-semibold text-text-primary">Dashboard</h1>
      ${firstTimeHint}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="rounded-lg border border-border-subtle bg-bg-surface shadow-card p-5">
          <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Offene Rechnungen</p>
          <p class="mt-2 text-2xl font-semibold text-text-primary">${stats.open_invoices_count}</p>
          <p class="mt-1 text-sm text-text-secondary">${formatEuro(stats.open_invoices_sum)}</p>
        </div>
        <div class="rounded-lg border border-border-subtle bg-bg-surface shadow-card p-5">
          <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Umsatz diesen Monat</p>
          <p class="mt-2 text-2xl font-semibold text-text-primary">${formatEuro(stats.revenue_current_month)}</p>
        </div>
        <div class="rounded-lg border shadow-card p-5 ${overdueCardClass}">
          <p class="text-xs font-medium uppercase tracking-wide ${overdueLabelClass}">Überfällig</p>
          <p class="mt-2 text-2xl font-semibold ${overdueLabelClass}">${stats.overdue_invoices_count}</p>
          <p class="mt-1 text-sm ${overdueLabelClass}">${hasOverdue ? "Rechnungen überfällig" : "Keine überfälligen Rechnungen"}</p>
        </div>
        <div class="rounded-lg border border-border-subtle bg-bg-surface shadow-card p-5">
          <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Aktive Kunden</p>
          <p class="mt-2 text-2xl font-semibold text-text-primary">${stats.active_clients_count}</p>
        </div>
        <div class="rounded-lg border border-border-subtle bg-bg-surface shadow-card p-5">
          <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Aktive Projekte</p>
          <p class="mt-2 text-2xl font-semibold text-text-primary">${stats.active_projects_count}</p>
        </div>
      </div>
    </div>
  `;

  const onboardingDone = c.req.query("onboarding_done") === "1";
  const children = onboardingDone
    ? html`<div class="mb-6 rounded-lg border border-accent-success/30 bg-status-paid-bg p-4" role="status">
        <p class="text-sm font-medium text-status-paid-text">Einrichtung abgeschlossen! Firmendaten wurden gespeichert.</p>
      </div>${content}`
    : content;

  return c.html(Layout({ title: "Dashboard", activeNav: "dashboard", overdueCount, children }));
});
