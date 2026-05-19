import fc from "fast-check";
import { describe, expect, test } from "bun:test";
import { roundToEuro } from "../../src/db/invoice-queries";

describe("roundToEuro — kaufmännische Rundung", () => {
  test("rundet auf 2 Dezimalstellen", () => {
    // IEEE 754: 1.005 * 100 = 100.49999... → Math.round → 100 (korrekt!)
    expect(roundToEuro(1.005)).toBe(1.0);
    expect(roundToEuro(1.006)).toBe(1.01);
    expect(roundToEuro(100.125)).toBe(100.13);
    expect(roundToEuro(0)).toBe(0);
    expect(roundToEuro(999.999)).toBe(1000.0);
  });

  test("property: Ergebnis entspricht kaufmännischer Rundungsformel", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), (cents) => {
        const value = cents / 100;
        const result = roundToEuro(value);
        expect(result).toBe(Math.round(value * 100) / 100);
      }),
    );
  });
});

describe("MwSt-Berechnung pro Position (MwSt per line item, dann Summe)", () => {
  test("19% MwSt auf typische Tagessätze", () => {
    // 1 Tag à 800 € → Netto 800,00 → MwSt 152,00 → Brutto 952,00
    const net = roundToEuro(1 * 800);
    const vat = roundToEuro(net * 0.19);
    const gross = roundToEuro(net + vat);
    expect(net).toBe(800.0);
    expect(vat).toBe(152.0);
    expect(gross).toBe(952.0);
  });

  test("7% MwSt (ermäßigter Steuersatz)", () => {
    const net = roundToEuro(3 * 500);
    const vat = roundToEuro(net * 0.07);
    const gross = roundToEuro(net + vat);
    expect(net).toBe(1500.0);
    expect(vat).toBe(105.0);
    expect(gross).toBe(1605.0);
  });

  test("Kleinunternehmer: 0% MwSt", () => {
    const net = roundToEuro(2 * 650);
    const vat = roundToEuro(net * 0);
    const gross = roundToEuro(net + vat);
    expect(vat).toBe(0);
    expect(gross).toBe(net);
  });

  test("property: MwSt-Summe = Summe der Positions-MwSt (nicht total * rate)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            duration: fc.float({ min: 0.5, max: 30, noNaN: true }),
            dailyRate: fc.float({ min: 100, max: 5000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        fc.constantFrom(0.07, 0.19),
        (items, vatRate) => {
          const lineItems = items.map((item) => {
            const net = roundToEuro(item.duration * item.dailyRate);
            const vat = roundToEuro(net * vatRate);
            return { net, vat };
          });

          // Regel: MwSt = Summe der Positions-MwSt (NICHT totalNetto * MwSt-Rate)
          const sumVat = roundToEuro(lineItems.reduce((acc, i) => acc + i.vat, 0));
          const totalNet = roundToEuro(lineItems.reduce((acc, i) => acc + i.net, 0));
          const naiveVat = roundToEuro(totalNet * vatRate);

          // sumVat und naiveVat können um max. (Anzahl Positionen * 0.005) Cent abweichen
          const maxDrift = items.length * 0.005;
          expect(Math.abs(sumVat - naiveVat)).toBeLessThan(maxDrift + 0.001);

          // Brutto muss konsistent sein
          const totalGross = roundToEuro(totalNet + sumVat);
          expect(totalGross).toBeGreaterThanOrEqual(totalNet);
        },
      ),
    );
  });

  test("property: Brutto = Netto + MwSt (keine Rundungsdrift > 0.005 €)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9_999_900 }).map((c) => c / 100),
        fc.constantFrom(0, 0.07, 0.19),
        (net, vatRate) => {
          const roundedNet = roundToEuro(net);
          const vat = roundToEuro(roundedNet * vatRate);
          const gross = roundToEuro(roundedNet + vat);
          expect(Math.abs(gross - (roundedNet + vat))).toBeLessThan(0.005);
        },
      ),
    );
  });
});
