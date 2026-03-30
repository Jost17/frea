import { html } from 'hono/html';
import { Layout } from '../templates/components/index.js';
import { formatEuro } from '../utils/format.js';

interface Stats {
  umsatz: number;
  stunden: number;
  offene_rechnungen_count: number;
  offene_rechnungen_amount: number;
  aktive_projekte: number;
  gesamt_kunden: number;
  month: string;
}

export function DashboardView(stats: Stats, navItems: Array<{ label: string; href: string; active?: boolean }>) {
  const kpis = [
    {
      label: 'Umsatz',
      sublabel: `${stats.month}`,
      value: formatEuro(stats.umsatz),
      icon: '💶',
      color: 'text-emerald-600',
    },
    {
      label: 'Stunden',
      sublabel: `${stats.month}`,
      value: `${stats.stunden} h`,
      icon: '⏱️',
      color: 'text-blue-600',
    },
    {
      label: 'Offene Rechnungen',
      sublabel: `${stats.offene_rechnungen_count} Stück`,
      value: formatEuro(stats.offene_rechnungen_amount),
      icon: '📋',
      color: 'text-amber-600',
    },
    {
      label: 'Aktive Projekte',
      sublabel: 'laufend',
      value: String(stats.aktive_projekte),
      icon: '🚀',
      color: 'text-violet-600',
    },
  ];

  const kpiCards = kpis.map(kpi => html`
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">${kpi.label}</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">${kpi.sublabel}</p>
          <p class="text-2xl font-bold mt-2 ${kpi.color}">${kpi.value}</p>
        </div>
        <span class="text-3xl" role="img" aria-hidden="true">${kpi.icon}</span>
      </div>
    </div>
  `);

  const quickActions = html`
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Schnellzugriff</h2>
      <div class="flex flex-wrap gap-3">
        <a href="/kunden"
           hx-get="/kunden"
           hx-target="#content"
           hx-swap="innerHTML"
           class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Neuer Kunde
        </a>
        <a href="/projekte"
           hx-get="/projekte"
           hx-target="#content"
           hx-swap="innerHTML"
           class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Neues Projekt
        </a>
        <a href="/kunden"
           class="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors">
          Kunden verwalten
        </a>
        <a href="/projekte"
           class="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors">
          Projekte verwalten
        </a>
      </div>
    </div>
  `;

  return Layout({
    title: 'Dashboard — FREA',
    navItems,
    children: html`
      <div id="content">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Willkommen zurück. Hier ist dein Überblick.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${kpiCards}
        </div>

        ${quickActions}
      </div>
    `,
  });
}
