import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { Layout } from "../templates/layout";
import { getDashboardStats, type DashboardStats } from "../db/dashboard-queries";
import { AppError } from "../middleware/error-handler";

export const dashboardRoutes = new Hono<AppEnv>();

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

dashboardRoutes.get("/", (c) => {
  let stats: DashboardStats;
  try {
    stats = getDashboardStats();
  } catch (err) {
    console.error("[dashboard] Failed to load stats:", err);
    throw new AppError("Dashboard-Daten konnten nicht geladen werden", 500);
  }

  // Reuse stats value for nav badge — avoids duplicate overdue query from middleware
  const overdueCount = stats.overdue_invoices_count;
  const isEmpty =
    stats.open_invoices_count === 0 &&
    stats.active_clients_count === 0 &&
    stats.active_projects_count === 0;
  const hasOverdue = stats.overdue_invoices_count > 0;

  const content = isEmpty
    ? html`
        <div class="space-y-6">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
            <p class="text-gray-500 dark:text-gray-400 text-sm">
              Noch keine Daten vorhanden. Lege zunächst Kunden und Projekte an.
            </p>
          </div>
        </div>
      `
    : html`
        <div class="space-y-6">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <!-- Offene Rechnungen -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Offene Rechnungen</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">${stats.open_invoices_count}</p>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">${formatEuro(stats.open_invoices_sum)}</p>
            </div>

            <!-- Umsatz diesen Monat -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Umsatz diesen Monat</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">${formatEuro(stats.revenue_current_month)}</p>
            </div>

            <!-- Überfällige Rechnungen -->
            <div class="rounded-lg border ${hasOverdue ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"} shadow-sm p-4">
              <p class="text-xs font-medium ${hasOverdue ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"} uppercase tracking-wide">Überfällig</p>
              <p class="mt-2 text-2xl font-semibold ${hasOverdue ? "text-red-700 dark:text-red-300" : "text-gray-400 dark:text-gray-500"}">${stats.overdue_invoices_count}</p>
              <p class="mt-1 text-sm ${hasOverdue ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}">
                ${hasOverdue ? "Rechnungen überfällig" : "Keine überfälligen Rechnungen"}
              </p>
            </div>

            <!-- Aktive Kunden -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Aktive Kunden</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">${stats.active_clients_count}</p>
            </div>

            <!-- Aktive Projekte -->
            <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Aktive Projekte</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">${stats.active_projects_count}</p>
            </div>

          </div>
        </div>
      `;

  return c.html(
    Layout({
      title: "Dashboard",
      activeNav: "dashboard",
      overdueCount,
      children: content,
    }),
  );
});
