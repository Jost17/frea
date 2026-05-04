import { Hono } from "hono";
import { html } from "hono/html";
import type { AppEnv } from "../env";
import { getDashboardStats } from "../db/dashboard-queries";
import { AppError } from "../middleware/error-handler";
import { Layout } from "../templates/layout";

export const reportRoutes = new Hono<AppEnv>();

interface RevenueSnapshot {
  week: string;
  revenue: number;
}

// Mock data: 12 weeks of revenue data
function generateMockRevenueData(): RevenueSnapshot[] {
  const data: RevenueSnapshot[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekNum = Math.ceil((weekStart.getDate() + new Date(weekStart.getFullYear(), weekStart.getMonth(), 1).getDay()) / 7);
    const year = weekStart.getFullYear();
    const baseRevenue = 3000 + Math.random() * 4000;
    const variance = baseRevenue * (0.8 + Math.random() * 0.4);
    data.push({
      week: `KW ${weekNum} ${year}`,
      revenue: Math.round(variance),
    });
  }
  return data;
}

// API endpoint for revenue snapshot data
reportRoutes.get("/api/revenue-snapshot", (c) => {
  try {
    const stats = getDashboardStats();
    const weeklyRevenue = generateMockRevenueData();

    return c.json({
      success: true,
      data: {
        currentMonth: stats.revenue_current_month,
        weeklyRevenue,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[reports] Failed to load revenue snapshot:", err);
    throw new AppError("Umsatz-Daten konnten nicht geladen werden", 500);
  }
});

// HTML page for revenue snapshot
reportRoutes.get("/umsatz-snapshot", (c) => {
  try {
    const stats = getDashboardStats();
    const weeklyData = generateMockRevenueData();

    const maxRevenue = Math.max(...weeklyData.map((w) => w.revenue));
    const minRevenue = Math.min(...weeklyData.map((w) => w.revenue));
    const avgRevenue = Math.round(
      weeklyData.reduce((sum, w) => sum + w.revenue, 0) / weeklyData.length
    );

    const shareText = encodeURIComponent(
      `Mein Umsatz in den letzten 12 Wochen: ⬆️ ${avgRevenue.toLocaleString("de-DE")}€ Durchschnitt. Mit FREA - der GoBD-konformen Rechnungssoftware für deutsche Freelancer.`
    );
    const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}`;
    const linkedinUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${shareText}`;

    // Generate SVG chart
    const chartHeight = 200;
    const chartWidth = 800;
    const padding = 40;
    const graphWidth = chartWidth - 2 * padding;
    const graphHeight = chartHeight - 2 * padding;

    const range = maxRevenue - minRevenue || 1;
    const xStep = graphWidth / (weeklyData.length - 1);

    const points = weeklyData
      .map((w, i) => {
        const x = padding + i * xStep;
        const y = padding + graphHeight - ((w.revenue - minRevenue) / range) * graphHeight;
        return `${x},${y}`;
      })
      .join(" ");

    const chartSvg = html`
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="w-full h-auto">
        <!-- Background -->
        <rect width="${chartWidth}" height="${chartHeight}" fill="#ffffff" />

        <!-- Grid lines -->
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${chartHeight - padding}" stroke="#e5e7eb" stroke-width="2" />
        <line x1="${padding}" y1="${chartHeight - padding}" x2="${chartWidth - padding}" y2="${chartHeight - padding}" stroke="#e5e7eb" stroke-width="2" />

        <!-- Revenue line -->
        <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Data points -->
        ${weeklyData
          .map((_, i) => {
            const parts = points.split(" ");
            const [x, y] = parts[i].split(",");
            return html`<circle cx="${x}" cy="${y}" r="4" fill="#3b82f6" />`;
          })
          .join("")}
      </svg>
    `;

    const content = html`
      <div class="space-y-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Dein Umsatz-Snapshot</h1>

        <!-- Key Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ø Wöchentlich</p>
            <p class="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">${avgRevenue.toLocaleString("de-DE")}€</p>
          </div>
          <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Höchst</p>
            <p class="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">${maxRevenue.toLocaleString("de-DE")}€</p>
          </div>
          <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dieser Monat</p>
            <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">${stats.revenue_current_month.toLocaleString("de-DE")}€</p>
          </div>
        </div>

        <!-- Chart -->
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Umsatz letzte 12 Wochen</h2>
          ${chartSvg}
        </div>

        <!-- Share Section -->
        <div class="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 shadow-sm p-6">
          <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">Teile deinen Erfolg</h3>
          <p class="text-sm text-blue-800 dark:text-blue-200 mb-4">
            Zeige deinem Netzwerk deinen Umsatz. Jeder Share = kostenlose Sichtbarkeit für FREA.
          </p>
          <div class="flex flex-wrap gap-3">
            <a
              href="${twitterUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition"
              aria-label="Auf X/Twitter teilen"
            >
              𝕏 Auf X teilen
            </a>
            <a
              href="${linkedinUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium transition"
              aria-label="Auf LinkedIn teilen"
            >
              in Auf LinkedIn teilen
            </a>
          </div>
        </div>

        <!-- Footer branding -->
        <div class="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>Erstellt mit <strong>FREA</strong> — GoBD-konform, für deutsche Freelancer</p>
        </div>
      </div>
    `;

    const overdueCount = c.get("overdueCount") ?? 0;

    return c.html(
      Layout({
        title: "Umsatz-Snapshot",
        activeNav: "reports",
        overdueCount,
        children: content,
      }),
    );
  } catch (err) {
    console.error("[reports] Failed to load revenue snapshot page:", err);
    throw new AppError("Seite konnte nicht geladen werden", 500);
  }
});
