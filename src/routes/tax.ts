import { Hono } from "hono";
import { z } from "zod";
import { getAvailableYears, getUstKennzahlen } from "../db/tax-queries";
import type { AppEnv } from "../env";
import { renderTaxOverview } from "../templates/tax-overview";

export const taxRoutes = new Hono<AppEnv>();

const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
});

function resolvePeriod(raw: { year?: number; month?: number; quarter?: number }) {
  const currentYear = new Date().getFullYear();
  const year = raw.year ?? currentYear;

  // month wins over quarter when both provided
  const month = raw.month ?? null;
  const quarter = month === null ? (raw.quarter ?? null) : null;

  return { year, month, quarter };
}

taxRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    const currentYear = new Date().getFullYear();
    const availableYears = getAvailableYears();
    const years = availableYears.includes(currentYear)
      ? availableYears
      : [currentYear, ...availableYears];

    const parsed = periodSchema.safeParse({
      year: c.req.query("year"),
      month: c.req.query("month") || undefined,
      quarter: c.req.query("quarter") || undefined,
    });

    if (!parsed.success) {
      return c.html(
        renderTaxOverview({
          years,
          year: currentYear,
          month: null,
          quarter: null,
          kennzahlen: { kz81: 0, kz83: 0, kz86: 0, kz85: 0, kz66: 0, verbleibende_ust: 0 },
          overdueCount,
        }),
        400,
      );
    }

    const { year, month, quarter } = resolvePeriod(parsed.data);
    const kennzahlen = getUstKennzahlen(year, month, quarter);

    return c.html(renderTaxOverview({ years, year, month, quarter, kennzahlen, overdueCount }));
  } catch (err) {
    console.error("[tax] GET /steuern fehlgeschlagen:", err);
    throw err;
  }
});

taxRoutes.get("/export", (c) => {
  try {
    const parsed = periodSchema.safeParse({
      year: c.req.query("year"),
      month: c.req.query("month") || undefined,
      quarter: c.req.query("quarter") || undefined,
    });

    if (!parsed.success) {
      return c.json({ error: "Ungültige Periodenparameter" }, 400);
    }

    const { year, month, quarter } = resolvePeriod(parsed.data);
    const k = getUstKennzahlen(year, month, quarter);

    const rows = [
      ["Kennzahl", "Bezeichnung", "Betrag (EUR)"],
      ["81", "Steuerpflichtige Umsätze 19%", k.kz81.toFixed(2)],
      ["83", "Umsatzsteuer 19%", k.kz83.toFixed(2)],
      ["86", "Steuerpflichtige Umsätze 7%", k.kz86.toFixed(2)],
      ["85", "Umsatzsteuer 7%", k.kz85.toFixed(2)],
      ["66", "Abziehbare Vorsteuerbeträge", k.kz66.toFixed(2)],
      ["", "Verbleibende Umsatzsteuer", k.verbleibende_ust.toFixed(2)],
    ];

    const periodSuffix =
      month !== null
        ? `${year}-${String(month).padStart(2, "0")}`
        : quarter !== null
          ? `${year}-Q${quarter}`
          : `${year}`;

    const csv = rows.map((r) => r.join(";")).join("\r\n");

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="ust-voranmeldung-${periodSuffix}.csv"`);
    return c.body(csv);
  } catch (err) {
    console.error("[tax] GET /steuern/export fehlgeschlagen:", err);
    throw err;
  }
});
