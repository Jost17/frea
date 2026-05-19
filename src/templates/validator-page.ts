import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import type { ValidationIssue, ZUGFeRDProfile } from "../lib/zugferd-validator";
import { PROFILE_LABELS, RULE_DESCRIPTIONS } from "../lib/zugferd-validator";

type HtmlResult = HtmlEscapedString | Promise<HtmlEscapedString>;

const HOST = Bun.env.FREA_PUBLIC_URL ?? "http://localhost:3114";
const HOSTING_LOCATION = Bun.env.FREA_HOSTING_LOCATION ?? "EU/Deutschland";

// ─── Standalone-Layout (kein Nav, kein Login nötig) ──────────────────────────

function validatorLayout(title: string, children: HtmlResult): HtmlResult {
  return html`<!doctype html>
    <html lang="de" class="h-full bg-gray-50">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title} · FREA ZUGFeRD-Validator</title>
        <link rel="icon" type="image/svg+xml" href="/static/logo/frea-favicon.svg" />
        <link rel="stylesheet" href="/static/styles.css" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="Kostenloser ZUGFeRD- und E-Rechnungs-Validator — prüft Ihre Rechnung auf EN16931-Konformität." />
        <script src="/static/htmx.min.js"></script>
        <script src="/static/lucide.min.js"></script>
      </head>
      <body class="h-full">
        <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700 focus:rounded focus:shadow">
          Zum Hauptinhalt
        </a>

        <!-- Minimal-Header -->
        <header class="bg-white border-b border-gray-200 px-4 py-3">
          <div class="max-w-3xl mx-auto flex items-center justify-between">
            <a href="/validator" class="flex items-center gap-2 font-semibold text-gray-900 hover:text-blue-700">
              <img src="/static/logo/frea-logo-light.svg" alt="FREA" class="h-7 w-auto" />
              <span class="text-sm text-gray-500 font-normal">ZUGFeRD-Validator</span>
            </a>
            <a href="/" class="text-sm text-blue-700 hover:underline">Zu FREA →</a>
          </div>
        </header>

        <main id="main-content" class="max-w-3xl mx-auto px-4 py-8">
          ${children}
        </main>

        <footer class="max-w-3xl mx-auto px-4 py-6 text-center text-xs text-gray-500 border-t border-gray-200 mt-8">
          <p>
            🔒 <strong>Datenschutz:</strong> Die hochgeladene Datei wird nur im Arbeitsspeicher verarbeitet und nicht gespeichert.
            Das Validierungsergebnis (ohne Dateiinhalt) wird 7 Tage für den Permalink gespeichert, dann automatisch gelöscht.
          </p>
          <p class="mt-2">
            🖥 Hosting: ${HOSTING_LOCATION} — Keine US-Dienste, kein Google Analytics, keine externen CDN-Anfragen.
          </p>
          <p class="mt-2">
            Ein kostenloses Tool von <a href="/" class="text-blue-700 hover:underline">FREA</a> —
            ZUGFeRD-konforme Rechnungserstellung für Freelancer.
          </p>
        </footer>

        <script>
          // Drag & Drop
          const zone = document.getElementById('drop-zone');
          const input = document.getElementById('rechnung-input');
          if (zone && input) {
            zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('border-blue-500','bg-blue-50'); });
            zone.addEventListener('dragleave', () => { zone.classList.remove('border-blue-500','bg-blue-50'); });
            zone.addEventListener('drop', e => {
              e.preventDefault();
              zone.classList.remove('border-blue-500','bg-blue-50');
              const files = e.dataTransfer?.files;
              if (files?.length) { const dt = new DataTransfer(); dt.items.add(files[0]); input.files = dt.files; updateLabel(files[0].name); }
            });
            input.addEventListener('change', () => { if (input.files?.[0]) updateLabel(input.files[0].name); });
            function updateLabel(name) {
              const lbl = document.getElementById('file-label');
              if (lbl) lbl.textContent = name;
            }
          }
          lucide.createIcons();
        </script>
      </body>
    </html>`;
}

// ─── Upload-Seite ─────────────────────────────────────────────────────────────

export function renderValidatorPage(): HtmlResult {
  return validatorLayout(
    "ZUGFeRD-Validator",
    html`
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-3">ZUGFeRD- &amp; E-Rechnungs-Validator</h1>
        <p class="text-lg text-gray-600 max-w-xl mx-auto">
          Prüfen Sie kostenlos, ob Ihre Rechnung den <strong>EN16931</strong>-Anforderungen
          der deutschen E-Rechnungspflicht (ab 2025 B2B) entspricht.
        </p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <form method="POST" action="/validator" enctype="multipart/form-data">
          <label class="block mb-4">
            <span class="text-sm font-medium text-gray-700 mb-2 block">Rechnung hochladen</span>
            <div
              id="drop-zone"
              class="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onclick="document.getElementById('rechnung-input').click()"
              role="button"
              tabindex="0"
              aria-label="Datei auswählen oder hierher ziehen"
              onkeydown="if(event.key==='Enter'||event.key===' ')this.click()"
            >
              <i data-lucide="upload-cloud" class="h-10 w-10 text-gray-400 mx-auto mb-3"></i>
              <p id="file-label" class="text-gray-600 font-medium">PDF oder XML hierher ziehen oder klicken</p>
              <p class="text-xs text-gray-400 mt-1">Max. 10 MB · .pdf oder .xml</p>
            </div>
            <input
              type="file"
              id="rechnung-input"
              name="rechnung"
              accept=".pdf,.xml"
              required
              class="sr-only"
            />
          </label>

          <button
            type="submit"
            class="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Rechnung prüfen
          </button>
        </form>
      </div>

      <div class="grid grid-cols-3 gap-4 text-center text-sm text-gray-600">
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <i data-lucide="shield-check" class="h-6 w-6 text-green-600 mx-auto mb-2"></i>
          <p class="font-medium">EN16931-Prüfung</p>
          <p class="text-xs text-gray-400 mt-1">Pflichtfelder nach EU-Norm</p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <i data-lucide="tag" class="h-6 w-6 text-blue-600 mx-auto mb-2"></i>
          <p class="font-medium">Profil-Erkennung</p>
          <p class="text-xs text-gray-400 mt-1">MINIMUM bis XRechnung</p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <i data-lucide="share-2" class="h-6 w-6 text-purple-600 mx-auto mb-2"></i>
          <p class="font-medium">Teilbares Ergebnis</p>
          <p class="text-xs text-gray-400 mt-1">Permalink für 7 Tage</p>
        </div>
      </div>
    `,
  );
}

// ─── Ergebnis-Seite ───────────────────────────────────────────────────────────

interface ResultProps {
  id: string;
  profile: ZUGFeRDProfile;
  score: number;
  isValid: boolean;
  issues: ValidationIssue[];
  fileName: string;
  createdAt: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-700";
  if (score >= 50) return "text-yellow-700";
  return "text-red-700";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-50 border-green-200";
  if (score >= 50) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

function severityBadge(severity: ValidationIssue["severity"]): HtmlResult {
  const map = {
    critical: html`<span class="inline-block text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">Kritisch</span>`,
    major: html`<span class="inline-block text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">Wichtig</span>`,
    minor: html`<span class="inline-block text-xs font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">Hinweis</span>`,
  };
  return map[severity];
}

export function renderValidatorResult(props: ResultProps): HtmlResult {
  const { id, profile, score, isValid, issues, fileName, createdAt } = props;
  const profileLabel = PROFILE_LABELS[profile] ?? profile;
  const permalink = `${HOST}/validator/${id}`;
  const badgeUrl = `${HOST}/validator/${id}/badge.svg`;
  const ogTitle = `${isValid ? "✓" : "✗"} ZUGFeRD-Score: ${score}/100 — ${profileLabel}`;
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const majorCount = issues.filter((i) => i.severity === "major").length;
  const minorCount = issues.filter((i) => i.severity === "minor").length;

  const issueRows = issues.map(
    (issue) => html`
      <li class="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
        <div class="flex-shrink-0 mt-0.5">${severityBadge(issue.severity)}</div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-gray-900">${issue.message}</p>
          <p class="text-xs text-gray-400 mt-0.5">
            Feld: <code class="font-mono">${issue.field}</code>
            ${issue.rule ? html` · EN16931: ${RULE_DESCRIPTIONS[issue.rule] ?? issue.rule}` : ""}
            · Code: ${issue.code}
          </p>
        </div>
      </li>
    `,
  );

  return validatorLayout(
    ogTitle,
    html`
      <!-- OG meta für den Permalink -->
      <meta property="og:title" content="${ogTitle}" />
      <meta property="og:image" content="${badgeUrl}" />
      <meta property="og:url" content="${permalink}" />

      <!-- Ergebnis-Header -->
      <div class="bg-white rounded-xl shadow-sm border ${scoreBg(score)} p-6 mb-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 mb-1">
              ${
                isValid
                  ? html`<span class="text-green-700">✓ Konform</span>`
                  : html`<span class="text-red-700">✗ Nicht konform</span>`
              }
            </h1>
            <p class="text-gray-500 text-sm">
              Datei: <span class="font-medium text-gray-700">${fileName}</span> ·
              Geprüft: ${createdAt.slice(0, 10)}
            </p>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-4xl font-bold ${scoreColor(score)}">${score}<span class="text-xl text-gray-400">/100</span></div>
            <div class="text-sm mt-1">
              <span class="inline-block bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded text-xs">${profileLabel}</span>
            </div>
          </div>
        </div>

        ${
          issues.length > 0
            ? html`<div class="mt-4 flex gap-3 text-xs font-medium">
              ${criticalCount > 0 ? html`<span class="bg-red-100 text-red-800 px-2 py-1 rounded">${criticalCount} kritisch</span>` : ""}
              ${majorCount > 0 ? html`<span class="bg-orange-100 text-orange-800 px-2 py-1 rounded">${majorCount} wichtig</span>` : ""}
              ${minorCount > 0 ? html`<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">${minorCount} Hinweis</span>` : ""}
            </div>`
            : html`<p class="mt-4 text-green-700 text-sm font-medium">Alle Pflichtfelder vorhanden — keine Mängel gefunden.</p>`
        }
      </div>

      <!-- Mängelliste -->
      ${
        issues.length > 0
          ? html`<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 class="text-base font-semibold text-gray-900 mb-4">Mängelliste</h2>
            <ul class="divide-y divide-gray-100">
              ${issueRows}
            </ul>
          </div>`
          : ""
      }

      <!-- Share-Box -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 class="text-base font-semibold text-gray-900 mb-3">Ergebnis teilen</h2>
        <div class="flex gap-2">
          <input
            id="permalink"
            type="text"
            readonly
            value="${permalink}"
            class="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onclick="navigator.clipboard.writeText(document.getElementById('permalink').value).then(()=>{this.textContent='Kopiert ✓'})"
            class="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Kopieren
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-2">Link ist 7 Tage gültig. Das Badge kann auf LinkedIn/Twitter geteilt werden.</p>
        <div class="mt-3">
          <img src="${badgeUrl}" alt="ZUGFeRD-Score-Badge" class="h-8" />
        </div>
      </div>

      <!-- Upsell CTA -->
      <div class="bg-blue-700 rounded-xl p-6 text-white text-center">
        <h2 class="text-lg font-bold mb-2">FREA erstellt ZUGFeRD-konforme Rechnungen</h2>
        <p class="text-blue-200 text-sm mb-4">
          Rechnungen, die FREA erstellt, bestehen diesen Test automatisch —
          EN16931-Pflichtfelder werden vollständig befüllt.
        </p>
        <a
          href="/"
          class="inline-block bg-white text-blue-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          FREA kostenlos testen →
        </a>
      </div>

      <!-- Nochmal prüfen -->
      <div class="text-center mt-6">
        <a href="/validator" class="text-sm text-blue-700 hover:underline">← Weitere Rechnung prüfen</a>
      </div>
    `,
  );
}

// ─── Score-Badge (SVG) ────────────────────────────────────────────────────────

export function renderValidatorBadgeSvg(score: number, isValid: boolean, profile: string): string {
  const color = score >= 80 ? "#15803d" : score >= 50 ? "#ca8a04" : "#dc2626";
  const label = isValid ? "ZUGFeRD-konform" : "Nicht konform";
  const profileLabel = PROFILE_LABELS[profile as ZUGFeRDProfile] ?? profile;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80">
  <rect width="320" height="80" rx="10" fill="#1e40af"/>
  <text x="16" y="28" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="white">FREA ZUGFeRD-Validator</text>
  <text x="16" y="50" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="${color}">${score}/100</text>
  <text x="90" y="46" font-family="system-ui,sans-serif" font-size="13" fill="white">${label}</text>
  <text x="90" y="62" font-family="system-ui,sans-serif" font-size="11" fill="#93c5fd">${profileLabel}</text>
</svg>`;
}
