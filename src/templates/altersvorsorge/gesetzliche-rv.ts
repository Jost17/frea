import { html } from "hono/html";
import { renderDisclaimer } from "./disclaimer-banner";

export const renderGesetzlicheRv = () => html`
  <div class="max-w-4xl mx-auto">
    ${renderDisclaimer()}

    <div class="mt-8 mb-8">
      <a href="/altersvorsorge" class="text-primary hover:underline text-sm mb-4 inline-block">← Zurück zur Übersicht</a>
      <h1 class="text-3xl font-semibold mb-2">Gesetzliche Rentenversicherung</h1>
      <p class="text-text-secondary">Altersrente, Erwerbsminderungsschutz und Hinterbliebenenversicherung</p>
    </div>

    <div class="space-y-8">
      <section>
        <h2 class="text-xl font-semibold mb-4">Überblick</h2>
        <p class="text-text-secondary">Die gesetzliche Rentenversicherung ist ein Umlagesystem für Altersrente, Erwerbsminderung und Hinterbliebenenversicherung.</p>
      </section>
      <section>
        <h2 class="text-xl font-semibold mb-4">Versichertenkreis</h2>
        <ul class="space-y-2 text-text-secondary list-disc list-inside">
          <li>Arbeitnehmer (Versicherungspflicht)</li>
          <li>Selbstständige und Freiberufler (unter bestimmten Bedingungen)</li>
          <li>Künstler und Publizisten (Künstlersozialversicherung)</li>
        </ul>
      </section>
      <section>
        <h2 class="text-xl font-semibold mb-4">Leistungen</h2>
        <ul class="space-y-2 text-text-secondary list-disc list-inside">
          <li>Altersrente ab Regelaltersgrenze (aktuell 67 Jahre)</li>
          <li>Erwerbsminderungsrente bei Berufsunfähigkeit</li>
          <li>Hinterbliebenenleistungen für Angehörige</li>
        </ul>
      </section>
    </div>
  </div>
`;
