import { html } from "hono/html";
import { renderDisclaimer } from "./disclaimer-banner";

export const renderPrivateVorsorge = () => html`
  <div class="max-w-4xl mx-auto">
    ${renderDisclaimer()}
    <div class="mt-8 mb-8">
      <a href="/altersvorsorge" class="text-primary hover:underline text-sm mb-4 inline-block">← Zurück</a>
      <h1 class="text-3xl font-semibold mb-2">Private Altersvorsorge</h1>
      <p class="text-text-secondary">Flexible Geldanlage und Riester-Sparpläne mit Förderung</p>
    </div>
    <div class="space-y-8">
      <section>
        <h2 class="text-xl font-semibold mb-4">Überblick</h2>
        <p class="text-text-secondary">Private Altersvorsorge mit Flexibilität und individuellen Gestaltungsmöglichkeiten, teilweise mit staatlicher Riester-Förderung.</p>
      </section>
      <section>
        <h2 class="text-xl font-semibold mb-4">Riester-Rente</h2>
        <ul class="space-y-2 text-text-secondary list-disc list-inside">
          <li>Grundzulage: 175€ pro Jahr</li>
          <li>Kinderzulage: 185€ pro Kind (300€ ab 2008 geborene)</li>
        </ul>
      </section>
      <section>
        <h2 class="text-xl font-semibold mb-4">Anlageformen</h2>
        <ul class="space-y-2 text-text-secondary list-disc list-inside">
          <li>ETF-Sparpläne und Investmentfonds</li>
          <li>Tagesgeld und Festgeld</li>
          <li>Private Rentenversicherungen</li>
        </ul>
      </section>
    </div>
  </div>
`;
