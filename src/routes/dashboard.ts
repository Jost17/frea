import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { Layout } from "../templates/layout";
import { getDashboardStats, type DashboardStats } from "../db/queries";

export const dashboardRoutes = new Hono<AppEnv>();

// German locale formatting helper
function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

dashboardRoutes.get("/", (c) => {
  const stats = getDashboardStats();
  const overdueCount = stats.overdue_invoices_count;

  const allZero =
    stats.open_invoices_count === 0 &&
    stats.revenue_current_month === 0 &&
    stats.active_clients_count === 0 &&
    stats.active_projects_count === 0 &&
    stats.overdue_invoices_count === 0;

  const hasOverdue = stats.overdue_invoices_count > 0;

  const kpiCards = allZero
    ? html`
        <div class="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p class="text-gray-500 text-sm">Noch keine Daten vorhanden. Lege zunächst Kunden und Projekte an.</p>
        </div>`
    : html`
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Offene Rechnungen -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <i data-lucide="file-text" class="h-5 w-5 text-blue-600"></i>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Offene Rechnungen</p>
                <p class="mt-1 text-lg font-semibold text-gray-900">${stats.open_invoices_count} Rechnungen · ${formatEuro(stats.open_invoices_sum)}</p>
              </div>
            </div>
          </div>

          <!-- Umsatz diesen Monat -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <i data-lucide="trending-up" class="h-5 w-5 text-green-600"></i>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Umsatz diesen Monat</p>
                <p class="mt-1 text-lg font-semibold text-gray-900">${formatEuro(stats.revenue_current_month)}</p>
              </div>
            </div>
          </div>

          <!-- Aktive Kunden -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <i data-lucide="users" class="h-5 w-5 text-purple-600"></i>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Aktive Kunden</p>
                <p class="mt-1 text-lg font-semibold text-gray-900">${stats.active_clients_count}</p>
              </div>
            </div>
          </div>

          <!-- Aktive Projekte -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <i data-lucide="folder-kanban" class="h-5 w-5 text-orange-600"></i>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Aktive Projekte</p>
                <p class="mt-1 text-lg font-semibold text-gray-900">${stats.active_projects_count}</p>
              </div>
            </div>
          </div>

          <!-- Überfällige Rechnungen -->
          ${hasOverdue
            ? html`
          <div class="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4 sm:col-span-2 lg:col-span-1">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <i data-lucide="alert-triangle" class="h-5 w-5 text-red-600"></i>
              </div>
              <div>
                <p class="text-xs font-medium text-red-600 uppercase tracking-wide">Überfällige Rechnungen</p>
                <p class="mt-1 text-lg font-semibold text-red-700">${stats.overdue_invoices_count}</p>
              </div>
            </div>
          </div>`
            : html`
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:col-span-2 lg:col-span-1">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <i data-lucide="check-circle" class="h-5 w-5 text-gray-400"></i>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Überfällige Rechnungen</p>
                <p class="mt-1 text-lg font-semibold text-gray-400">0</p>
              </div>
            </div>
          </div>`}
        </div>`;

  return c.html(
    Layout({
      title: "Dashboard",
      activeNav: "dashboard",
      overdueCount,
      children: html`
        <div class="space-y-6">
          <h1 class="text-xl font-semibold text-gray-900">Dashboard</h1>
          ${kpiCards}
        </div>
      `,
    }),
  );
});
