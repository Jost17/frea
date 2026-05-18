import { Hono } from "hono";
import { getExportableYears, getInvoicesForDATEVExport } from "../db/export-queries";
import type { AppEnv } from "../env";
import { generateDATEVExport } from "../lib/datev-generator";
import { AppError } from "../middleware/error-handler";
import { renderDATEVExportPage } from "../templates/datev-export-page";

export const exportRoutes = new Hono<AppEnv>();

// GET /export/datev → show export page
// GET /export/datev?year=2025&download=1 → stream CSV file
exportRoutes.get("/datev", (c) => {
  const overdueCount = c.get("overdueCount") ?? 0;
  const years = getExportableYears();

  const yearParam = c.req.query("year");
  const download = c.req.query("download") === "1";

  if (!download) {
    return c.html(
      renderDATEVExportPage({
        years,
        overdueCount,
        message:
          years.length === 0
            ? "Noch keine versendeten oder bezahlten Rechnungen vorhanden. Sende zuerst eine Rechnung, bevor du exportierst."
            : undefined,
      }),
    );
  }

  const year = yearParam ? Number.parseInt(yearParam, 10) : new Date().getFullYear();

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    throw new AppError("Ungültiges Jahr", 400);
  }

  const rows = getInvoicesForDATEVExport(year);

  if (rows.length === 0) {
    return c.html(
      renderDATEVExportPage({
        years,
        overdueCount,
        message: `Keine exportierbaren Rechnungen für ${year} gefunden.`,
      }),
    );
  }

  const csvBytes = generateDATEVExport({ rows, year });
  if (!csvBytes) {
    throw new AppError("Export fehlgeschlagen", 500);
  }

  const filename = `DATEV_Buchungsstapel_${year}.csv`;

  return new Response(csvBytes, {
    headers: {
      "Content-Type": "text/csv; charset=windows-1252",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(csvBytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
});
