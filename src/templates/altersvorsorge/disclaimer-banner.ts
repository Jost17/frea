import { html } from "hono/html";

export const renderDisclaimer = () => html`
  <div
    class="rounded-lg border border-accent-warning/30 bg-accent-warning/5 p-4"
    role="note"
    aria-label="Hinweis zu Steuer- und Anlageberatung"
  >
    <div class="flex gap-3">
      <i data-lucide="alert-circle" class="h-5 w-5 text-accent-warning flex-shrink-0 mt-0.5"></i>
      <div class="text-sm text-text-secondary">
        <strong>Hinweis:</strong> Diese Informationen dienen ausschließlich der allgemeinen Bildung
        und stellen keine Steuer-, Rechts- oder Anlageberatung dar. Sie ersetzen nicht die
        individuelle Beratung durch einen zugelassenen Steuerberater, Rechtsanwalt oder
        BaFin-regulierten Finanzberater.
      </div>
    </div>
  </div>
`;
