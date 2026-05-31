import type { Invoice, Settings } from "../validation/schemas";

export interface TaxTreatment {
  isKleinunternehmer: boolean;
  effectiveVatRate: number;
}

/**
 * FREA-116: Ermittelt die USt-Behandlung beim Rendern/Emittieren einer
 * AUSGESTELLTEN Rechnung. Bevorzugt die bei Erstellung auf der Rechnung
 * eingefrorenen Werte; fällt pro Feld nur dann auf die aktuellen Settings
 * zurück, wenn der Snapshot fehlt (NULL = Rechnung vor der Freeze-Migration).
 *
 * Damit ändert sich eine ausgestellte Rechnung nicht mehr rückwirkend, wenn
 * der Nutzer später seine Settings umstellt (GoBD-Immutabilität). Der
 * Per-Feld-`??`-Fallback ist robust gegen einen partiellen Snapshot.
 */
export function resolveTaxTreatment(
  invoice: Pick<Invoice, "kleinunternehmer" | "vat_rate">,
  settings: Pick<Settings, "kleinunternehmer" | "vat_rate">,
): TaxTreatment {
  const isKleinunternehmer = Boolean(invoice.kleinunternehmer ?? settings.kleinunternehmer);
  const rate = invoice.vat_rate ?? settings.vat_rate;
  return {
    isKleinunternehmer,
    effectiveVatRate: isKleinunternehmer ? 0 : rate,
  };
}
