import { html } from "hono/html";
import type {
  CashflowMonth,
  OpenInvoiceByClient,
  QuarterlyRevenueSummary,
  WeeklyTimeStats,
} from "../../db/dashboard-queries";

// ─── Shared ───────────────────────────────────────────────────────────────────

function formatEuro(amount: number): string {
  return amount.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Widget 1: Zeiterfassung diese Woche ─────────────────────────────────────

export function weeklyTimeWidget(stats: WeeklyTimeStats): ReturnType<typeof html> {
  const noEntries = stats.entry_count === 0;
  return html`
    <div class="card p-4" role="region" aria-label="Zeiterfassung diese Woche">
      <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Zeiten diese Woche</p>
      <p class="mt-2 text-2xl font-semibold tabular-nums text-text-primary">
        ${noEntries ? "—" : formatHours(stats.total_hours)}
      </p>
      <p class="mt-1 text-sm text-text-secondary">
        ${noEntries
          ? "Noch keine Einträge"
          : `${stats.entry_count} ${stats.entry_count === 1 ? "Eintrag" : "Einträge"}, ${stats.project_count} ${stats.project_count === 1 ? "Projekt" : "Projekte"}`}
      </p>
      <p class="mt-1 text-xs text-text-muted">Nicht fakturiert</p>
    </div>
  `;
}

// ─── Widget 2: Offene Rechnungen nach Kunden ─────────────────────────────────

export function openInvoicesByClientWidget(rows: OpenInvoiceByClient[]): ReturnType<typeof html> {
  if (rows.length === 0) {
    return html`
      <div class="card p-4" role="region" aria-label="Offene Rechnungen nach Kunden">
        <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Offene Rechnungen nach Kunden</p>
        <p class="mt-3 text-sm text-text-muted">Keine offenen Rechnungen.</p>
      </div>
    `;
  }

  const clientRows = rows.map((row) => {
    const isOverdue = row.has_overdue === 1;
    const aging = row.oldest_due_date
      ? (() => {
          const days = Math.floor(
            (Date.now() - new Date(row.oldest_due_date).getTime()) / 86_400_000,
          );
          return days > 0 ? `${days}d überfällig` : null;
        })()
      : null;

    return html`
      <tr class="border-t border-border-subtle">
        <td class="py-2 pr-3">
          <a
            href="/rechnungen?client=${row.client_id}"
            class="text-sm font-medium text-text-primary hover:text-primary transition-colors"
          >
            ${row.client_name}
          </a>
          ${isOverdue && aging
            ? html`<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-status-overdue-bg text-status-overdue-text">${aging}</span>`
            : ""}
        </td>
        <td class="py-2 pr-3 text-sm text-text-secondary text-right tabular-nums">
          ${row.invoice_count} ${row.invoice_count === 1 ? "Rechnung" : "Rechnungen"}
        </td>
        <td class="py-2 text-sm font-semibold tabular-nums text-right ${isOverdue ? "text-status-overdue-text" : "text-text-primary"}">
          ${formatEuro(row.total_amount)}
        </td>
      </tr>
    `;
  });

  const total = rows.reduce((s, r) => s + r.total_amount, 0);

  return html`
    <div class="card p-4" role="region" aria-label="Offene Rechnungen nach Kunden">
      <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Offene Rechnungen nach Kunden</p>
      <table class="mt-3 w-full" aria-label="Offene Rechnungen nach Kunden">
        <thead class="sr-only">
          <tr>
            <th scope="col">Kunde</th>
            <th scope="col">Rechnungen</th>
            <th scope="col">Betrag</th>
          </tr>
        </thead>
        <tbody>
          ${clientRows}
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-border-medium">
            <td class="pt-2 text-xs font-medium text-text-muted uppercase tracking-wide" colspan="2">Gesamt</td>
            <td class="pt-2 text-sm font-bold tabular-nums text-right text-text-primary">${formatEuro(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

// ─── Widget 3: Quartalsumsatz YTD ────────────────────────────────────────────

export function quarterlyRevenueWidget(data: QuarterlyRevenueSummary): ReturnType<typeof html> {
  const trend = data.prev_year_gross > 0
    ? Math.round(((data.ytd_gross - data.prev_year_gross) / data.prev_year_gross) * 100)
    : null;

  const trendBadge = trend !== null
    ? html`
        <span
          class="ml-2 text-xs font-medium px-1.5 py-0.5 rounded
            ${trend >= 0
              ? "bg-status-paid-bg text-status-paid-text"
              : "bg-status-overdue-bg text-status-overdue-text"}"
          aria-label="Trend gegenüber Vorjahr: ${trend >= 0 ? "+" : ""}${trend}%"
        >${trend >= 0 ? "+" : ""}${trend}% ggü. Vorjahr</span>`
    : "";

  const quarterBars = data.quarters.map((q) => {
    const maxGross = Math.max(...data.quarters.map((x) => x.gross_revenue), 1);
    const barPct = Math.round((q.gross_revenue / maxGross) * 100);
    return html`
      <div class="flex items-center gap-3 mt-2">
        <span class="w-8 shrink-0 text-xs font-medium text-text-muted">Q${q.quarter}</span>
        <div class="flex-1 min-w-0">
          <div class="h-4 rounded bg-bg-surface-raised overflow-hidden">
            <div
              class="h-full rounded bg-primary transition-all"
              style="width: ${barPct}%"
              role="presentation"
            ></div>
          </div>
        </div>
        <span class="w-28 shrink-0 text-xs font-semibold tabular-nums text-right text-text-secondary">
          ${formatEuro(q.gross_revenue)}
        </span>
      </div>
    `;
  });

  return html`
    <div class="card p-4" role="region" aria-label="Quartalsumsatz YTD">
      <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Quartalsumsatz (YTD)</p>
      <div class="mt-2 flex items-baseline gap-1 flex-wrap">
        <p class="text-2xl font-semibold tabular-nums text-text-primary">${formatEuro(data.ytd_gross)}</p>
        ${trendBadge}
      </div>
      <p class="mt-0.5 text-xs text-text-muted">Netto: ${formatEuro(data.ytd_net)}</p>
      ${data.quarters.length > 0 ? html`<div class="mt-3">${quarterBars}</div>` : ""}
    </div>
  `;
}

// ─── Widget 4: Liquiditäts-Forecast ──────────────────────────────────────────

export function liquidityForecastWidget(months: CashflowMonth[]): ReturnType<typeof html> {
  if (months.length === 0) {
    return html`
      <div class="card p-4" role="region" aria-label="Liquiditäts-Forecast">
        <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Liquiditäts-Forecast</p>
        <p class="mt-3 text-sm text-text-muted">Keine offenen Rechnungen — kein Forecast möglich.</p>
      </div>
    `;
  }

  const maxAmount = Math.max(...months.map((m) => m.expected_amount), 1);

  const bars = months.map((m) => {
    const barWidth = Math.round((m.expected_amount / maxAmount) * 100);
    const overdueClass = m.is_overdue ? "bg-accent-danger" : "bg-primary";
    const labelClass = m.is_overdue ? "text-status-overdue-text" : "text-text-secondary";

    return html`
      <div class="flex items-center gap-3">
        <div class="w-24 shrink-0 text-right">
          <span class="text-xs font-medium ${labelClass}">${m.label}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="h-5 rounded bg-bg-surface-raised overflow-hidden">
            <div
              class="h-full rounded ${overdueClass} transition-all"
              style="width: ${barWidth}%"
              role="presentation"
              aria-label="${m.label}: ${formatEuro(m.expected_amount)}"
            ></div>
          </div>
        </div>
        <div class="w-28 shrink-0 text-right">
          <span class="text-xs font-semibold tabular-nums ${labelClass}">${formatEuro(m.expected_amount)}</span>
          <span class="ml-1 text-xs text-text-muted">(${m.invoice_count})</span>
        </div>
      </div>
    `;
  });

  const hasOverdue = months.some((m) => m.is_overdue);

  return html`
    <div class="card p-4" role="region" aria-label="Liquiditäts-Forecast 12 Monate">
      <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Liquiditäts-Forecast</p>
      <p class="mt-0.5 text-xs text-text-muted">Erwartete Zahlungseingänge offener Rechnungen (12 Monate)</p>
      <div class="mt-4 space-y-2">
        ${bars}
      </div>
      ${hasOverdue
        ? html`<p class="mt-2 text-xs text-status-overdue-text">Rot = Zahlungsziel überschritten</p>`
        : ""}
    </div>
  `;
}

// ─── Widget 5: Überfällig-Alert ───────────────────────────────────────────────

export function overdueAlertWidget(count: number): ReturnType<typeof html> {
  if (count === 0) {
    return html`
      <div class="card p-4" role="region" aria-label="Überfällige Rechnungen">
        <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Überfällig</p>
        <p class="mt-2 text-2xl font-semibold text-text-muted">0</p>
        <p class="mt-1 text-sm text-text-muted">Keine überfälligen Rechnungen</p>
      </div>
    `;
  }

  return html`
    <div
      class="rounded-lg border border-accent-danger bg-status-overdue-bg shadow-card p-4"
      role="alert"
      aria-label="Überfällige Rechnungen: ${count}"
    >
      <p class="text-xs font-medium text-status-overdue-text uppercase tracking-wide">Überfällig</p>
      <p class="mt-2 text-2xl font-semibold tabular-nums text-status-overdue-text">${count}</p>
      <p class="mt-1 text-sm text-status-overdue-text">
        ${count === 1 ? "Rechnung überfällig" : "Rechnungen überfällig"}
      </p>
      <a
        href="/rechnungen?status=overdue"
        class="mt-2 inline-block text-xs font-medium text-status-overdue-text underline hover:no-underline"
      >
        Jetzt ansehen →
      </a>
    </div>
  `;
}
