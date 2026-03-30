/**
 * Shared formatting utilities for FREA.
 * All display formatting lives here — keep UI code free of formatting logic.
 */

const DE_NUMBER_FORMAT = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

/**
 * Format a number as Euro currency (de-DE locale).
 * Example: formatEuro(1234.5) → "1.234,50 €"
 */
export function formatEuro(n: number): string {
  return DE_NUMBER_FORMAT.format(n);
}
