import { html } from "hono/html";
import { renderDisclaimer } from "./disclaimer-banner";

export const renderBetrieblicheAv = () => html`
  <div class="max-w-4xl mx-auto">
    ${renderDisclaimer()}
    <div class="mt-8 mb-8">
      <a href="/altersvorsorge" class="text-primary hover:underline text-sm mb-4 inline-block">← Zurück</a>
      <h1 class="text-3xl font-semibold mb-2">Betriebliche Altersvorsorge (bAV)</h1>
      <p class="text-text-secondary">Versorgungsverpflichtungen und Pensionsfonds für Beschäftigte</p>
    </div>
    <div class="space-y-8">
      <section>
        <h2 class="text-xl font-semibold mb-4">Überblick</h2>
        <p class="text-text-secondary">Zusätzliche Altersversorgung, die Arbeitgeber für Mitarbeiter aufbauen können.</p>
      </section>
      <section>
        <h2 class="text-xl font-semibold mb-4">Systeme</h2>
        <ul class="space-y-2 text-text-secondary list-disc list-inside">
          <li>Pensionszusagen (interne Deckung)</li>
          <li>Pensionsfonds (externe Deckung)</li>
          <li>Direktversicherungen</li>
          <li>Pensionskassen</li>
        </ul>
      </section>
      <section>
        <h2 class="text-xl font-semibold mb-4">Leistungen</h2>
        <ul class="space-y-2 text-text-secondary list-disc list-inside">
          <li>Altersrente</li>
          <li>Erwerbsminderungsrente</li>
          <li>Hinterbliebenenleistungen</li>
        </ul>
      </section>
    </div>
  </div>
`;
