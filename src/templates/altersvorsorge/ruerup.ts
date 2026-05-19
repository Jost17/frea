import { html } from "hono/html";
import { renderDisclaimer } from "./disclaimer-banner";

export const renderRuerup = () => html`
  <div class="max-w-4xl mx-auto">
    ${renderDisclaimer()}
    <div class="mt-8 mb-8">
      <a href="/altersvorsorge" class="text-primary hover:underline text-sm mb-4 inline-block">← Zurück</a>
      <h1 class="text-3xl font-semibold mb-2">Rürup-Versicherung (Basisversorgung)</h1>
      <p class="text-text-secondary">Steuerlich geförderte Altersversorgung für Selbstständige</p>
    </div>
    <div class="space-y-8">
      <section>
        <h2 class="text-xl font-semibold mb-4">Überblick</h2>
        <p class="text-text-secondary">Private Rentenversicherung mit Steuervergünstigungen für Selbstständige und Freiberufler.</p>
      </section>
      <section>
        <h2 class="text-xl font-semibold mb-4">Zielgruppe</h2>
        <ul class="space-y-2 text-text-secondary list-disc list-inside">
          <li>Selbstständige und Freiberufler</li>
          <li>Besserverdiener mit Steuervergünstigungen</li>
        </ul>
      </section>
      <section>
        <h2 class="text-xl font-semibold mb-4">Steuerliche Förderung</h2>
        <p class="text-text-secondary">Bis zu 27.565€ pro Jahr (Alleinstehende) als Sonderausgaben abzugsfähig.</p>
      </section>
    </div>
  </div>
`;
