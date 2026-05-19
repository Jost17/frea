import { html } from "hono/html";
import { renderDisclaimer } from "./disclaimer-banner";

export const renderAltersvorsorgeIndex = () => html`
  <div class="max-w-6xl mx-auto">
    ${renderDisclaimer()}

    <div class="mt-8">
      <h1 class="text-3xl font-semibold mb-2">Altersvorsorge für Freelancer</h1>
      <p class="text-text-secondary mb-8">
        Informationen zu den wichtigsten Altersvorsorgeoptionen für Freiberufler und Selbstständige
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <a
        href="/altersvorsorge/gesetzliche-rv"
        class="group rounded-lg border border-bg-border bg-bg-surface-raised p-6 hover:border-primary hover:bg-bg-surface hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div class="flex items-start gap-3">
          <i data-lucide="landmark" class="h-6 w-6 text-primary flex-shrink-0 mt-1"></i>
          <div>
            <h2 class="text-lg font-semibold group-hover:text-primary transition-colors">
              Gesetzliche Rentenversicherung
            </h2>
            <p class="text-sm text-text-secondary mt-2">
              Altersrente, Erwerbsminderungsschutz und Hinterbliebenenversicherung
            </p>
          </div>
        </div>
      </a>

      <a
        href="/altersvorsorge/ruerup"
        class="group rounded-lg border border-bg-border bg-bg-surface-raised p-6 hover:border-primary hover:bg-bg-surface hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div class="flex items-start gap-3">
          <i data-lucide="briefcase" class="h-6 w-6 text-primary flex-shrink-0 mt-1"></i>
          <div>
            <h2 class="text-lg font-semibold group-hover:text-primary transition-colors">
              Rürup-Versicherung
            </h2>
            <p class="text-sm text-text-secondary mt-2">
              Basisversorgung mit Steuervergünstigungen für Selbstständige
            </p>
          </div>
        </div>
      </a>

      <a
        href="/altersvorsorge/private-vorsorge"
        class="group rounded-lg border border-bg-border bg-bg-surface-raised p-6 hover:border-primary hover:bg-bg-surface hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div class="flex items-start gap-3">
          <i data-lucide="trending-up" class="h-6 w-6 text-primary flex-shrink-0 mt-1"></i>
          <div>
            <h2 class="text-lg font-semibold group-hover:text-primary transition-colors">
              Private Altersvorsorge
            </h2>
            <p class="text-sm text-text-secondary mt-2">
              Flexible Geldanlage und Riester-Sparpläne mit Förderung
            </p>
          </div>
        </div>
      </a>

      <a
        href="/altersvorsorge/betriebliche-av"
        class="group rounded-lg border border-bg-border bg-bg-surface-raised p-6 hover:border-primary hover:bg-bg-surface hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div class="flex items-start gap-3">
          <i data-lucide="building2" class="h-6 w-6 text-primary flex-shrink-0 mt-1"></i>
          <div>
            <h2 class="text-lg font-semibold group-hover:text-primary transition-colors">
              Betriebliche Altersvorsorge
            </h2>
            <p class="text-sm text-text-secondary mt-2">
              Versorgungsverpflichtung und Pensionsfonds für Beschäftigte
            </p>
          </div>
        </div>
      </a>
    </div>

    <div class="mt-12 rounded-lg bg-bg-surface-raised border border-bg-border p-6">
      <h3 class="font-semibold mb-3">Nächste Schritte</h3>
      <ul class="text-sm text-text-secondary space-y-2 list-disc list-inside">
        <li>Informieren Sie sich über die verschiedenen Vorsorgeoptionen</li>
        <li>Vergleichen Sie die Vor- und Nachteile für Ihre Situation</li>
        <li>Konsultieren Sie einen zugelassenen Steuerberater oder Finanzberater</li>
        <li>Treffen Sie eine informierte Entscheidung basierend auf Ihren Zielen</li>
      </ul>
    </div>
  </div>
`;
