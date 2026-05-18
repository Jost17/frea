import { Hono } from "hono";
import { z } from "zod";
import { getEurData } from "../db/eur-queries";
import { getSettings } from "../db/queries";
import type { AppEnv } from "../env";
import { buildEurHtml } from "../lib/eur-html";
import { AppError } from "../middleware/error-handler";

export const exportRoutes = new Hono<AppEnv>();

const yearSchema = z
  .string()
  .regex(/^\d{4}$/, "Jahr muss 4 Ziffern haben")
  .transform(Number)
  .refine((y) => y >= 2000 && y <= 2100, "Jahr außerhalb des erlaubten Bereichs");

function getCurrentYear(): number {
  return new Date().getFullYear();
}

// ─── UI: EÜR-Export Seite ──────────────────────────────────────────────────────

exportRoutes.get("/eur", (c) => {
  const yearParam = c.req.query("jahr");
  const selectedYear = yearParam ? Number(yearParam) : getCurrentYear();
  const currentYear = getCurrentYear();

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const settings = getSettings();
  const hasData = !!settings;

  let eurHtml = "";
  let errorMessage = "";

  if (yearParam) {
    const parsed = yearSchema.safeParse(yearParam);
    if (!parsed.success) {
      errorMessage = parsed.error.issues[0]?.message ?? "Ungültige Jahresangabe";
    } else {
      try {
        const data = getEurData(parsed.data);
        eurHtml = renderEurTable(data);
      } catch (err) {
        console.error("[exports/eur] Fehler beim Laden der EÜR-Daten:", err);
        errorMessage = "EÜR-Daten konnten nicht geladen werden.";
      }
    }
  }

  return c.html(
    `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>EÜR-Export — FREA</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body class="bg-gray-50 min-h-screen">
  <a href="#main-content" class="sr-only focus:not-sr-only">Zum Hauptinhalt</a>
  <nav class="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
    <a href="/" class="text-sm text-gray-500 hover:text-gray-800">Dashboard</a>
    <span class="text-gray-300">/</span>
    <span class="text-sm font-medium text-gray-800">EÜR-Export</span>
  </nav>

  <main id="main-content" class="max-w-5xl mx-auto px-6 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Einnahmen-Überschuss-Rechnung</h1>
      <p class="text-sm text-gray-500 mt-1">
        Jahresübersicht aller bezahlten Rechnungen (Zufluss-Prinzip, §4 Abs. 3 EStG)
      </p>
    </div>

    ${
      !hasData
        ? `<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        Bitte zuerst die <a href="/einstellungen" class="underline">Einstellungen</a> vervollständigen.
      </div>`
        : ""
    }

    <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <form method="GET" action="/exporte/eur" class="flex flex-wrap items-end gap-4">
        <div>
          <label for="jahr" class="block text-sm font-medium text-gray-700 mb-1">Wirtschaftsjahr</label>
          <select id="jahr" name="jahr"
            class="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            ${yearOptions.map((y) => `<option value="${y}" ${y === selectedYear ? "selected" : ""}>${y}</option>`).join("")}
          </select>
        </div>
        <button type="submit"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          Anzeigen
        </button>
        ${
          yearParam
            ? `<a href="/exporte/eur/csv?jahr=${selectedYear}"
            class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
            CSV herunterladen
          </a>
          <a href="/exporte/eur/pdf?jahr=${selectedYear}"
            class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
            PDF herunterladen
          </a>`
            : ""
        }
      </form>
    </div>

    ${errorMessage ? `<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 mb-6">${errorMessage}</div>` : ""}
    ${eurHtml}
  </main>
</body>
</html>`,
  );
});

// ─── CSV-Download ──────────────────────────────────────────────────────────────

exportRoutes.get("/eur/csv", (c) => {
  const yearParam = c.req.query("jahr");
  const parsed = yearSchema.safeParse(yearParam ?? String(getCurrentYear()));
  if (!parsed.success) {
    throw new AppError("Ungültige Jahresangabe", 400);
  }

  const data = getEurData(parsed.data);

  const deNum = (n: number) => n.toFixed(2).replace(".", ",");

  const lines: string[] = [
    // Header
    `EÜR ${data.year}`,
    "",
    "Betriebseinnahmen",
    is_kleinunternehmer_label(data.is_kleinunternehmer)
      ? `Steuerfreie Umsätze (Kleinunternehmer §19 UStG);${deNum(data.revenue_net_0)}`
      : [
          `Umsätze 19 % MwSt (netto);${deNum(data.revenue_net_19)}`,
          `Umsätze 7 % MwSt (netto);${deNum(data.revenue_net_7)}`,
        ].join("\n"),
    `Betriebseinnahmen netto gesamt;${deNum(data.revenue_net_total)}`,
    "",
    "Eingenommene Umsatzsteuer",
    `Umsatzsteuer 19 %;${deNum(data.vat_collected_19)}`,
    `Umsatzsteuer 7 %;${deNum(data.vat_collected_7)}`,
    `Umsatzsteuer gesamt;${deNum(data.vat_collected_total)}`,
    "",
    "Betriebsausgaben",
    `Betriebsausgaben gesamt;0,00`,
    "",
    "Gewinn / Verlust",
    `Gewinn (vor Steuern);${deNum(data.revenue_net_total)}`,
    "",
    "Einzelnachweise",
    "Rechnungsnummer;Kunde;Zahlungsdatum;Nettobetrag;MwSt;Bruttobetrag",
    ...data.invoices.map(
      (inv) =>
        `${inv.invoice_number};${inv.client_name};${inv.paid_date};${deNum(inv.net_amount)};${deNum(inv.vat_amount)};${deNum(inv.gross_amount)}`,
    ),
    "",
    `Summe Rechnungen;${data.invoice_count};${deNum(data.revenue_net_total)};${deNum(data.vat_collected_total)};${deNum(data.gross_total)}`,
  ];

  const csv = lines.join("\n");
  const filename = `EÜR_${data.year}.csv`;

  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  return c.body("﻿" + csv); // BOM für Excel-Kompatibilität
});

// ─── PDF-Download ──────────────────────────────────────────────────────────────

exportRoutes.get("/eur/pdf", async (c) => {
  const yearParam = c.req.query("jahr");
  const parsed = yearSchema.safeParse(yearParam ?? String(getCurrentYear()));
  if (!parsed.success) {
    throw new AppError("Ungültige Jahresangabe", 400);
  }

  const settings = getSettings();
  if (!settings) {
    throw new AppError("Einstellungen nicht gefunden — bitte zuerst Einstellungen anlegen", 400);
  }
  const data = getEurData(parsed.data);
  const html = buildEurHtml(data, settings);

  let pdfBytes: Uint8Array;
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "25mm", left: "20mm" },
    });
    await browser.close();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[exports/eur/pdf] PDF-Generierung fehlgeschlagen:", message);
    throw new AppError("PDF konnte nicht erstellt werden", 500);
  }

  const filename = `EÜR_${data.year}.pdf`;
  c.header("Content-Type", "application/pdf");
  c.header("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  return c.body(Buffer.from(pdfBytes));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function is_kleinunternehmer_label(flag: boolean): boolean {
  return flag;
}

function renderEurTable(data: ReturnType<typeof getEurData>): string {
  const fmtEur = (n: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

  const noInvoices =
    data.invoice_count === 0
      ? `<div class="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
        Keine bezahlten Rechnungen im Jahr ${data.year} gefunden.
      </div>`
      : "";

  if (data.invoice_count === 0) return noInvoices;

  const vatRows = data.is_kleinunternehmer
    ? `<tr><td class="py-2 text-sm text-gray-700">Steuerfreie Umsätze (Kleinunternehmer §19 UStG)</td><td class="py-2 text-sm text-right font-mono text-gray-900">${fmtEur(data.revenue_net_0)}</td></tr>`
    : `<tr><td class="py-2 text-sm text-gray-700">Umsätze 19 % MwSt (netto)</td><td class="py-2 text-sm text-right font-mono text-gray-900">${fmtEur(data.revenue_net_19)}</td></tr>
       <tr><td class="py-2 text-sm text-gray-700">Umsätze 7 % MwSt (netto)</td><td class="py-2 text-sm text-right font-mono text-gray-900">${fmtEur(data.revenue_net_7)}</td></tr>`;

  const invoiceRows = data.invoices
    .map(
      (inv) => `
    <tr class="hover:bg-gray-50">
      <td class="py-2 text-sm text-gray-700">${escRow(inv.invoice_number)}</td>
      <td class="py-2 text-sm text-gray-700">${escRow(inv.client_name)}</td>
      <td class="py-2 text-sm text-gray-500">${new Intl.DateTimeFormat("de-DE").format(new Date(`${inv.paid_date}T00:00:00`))}</td>
      <td class="py-2 text-sm text-right font-mono text-gray-900">${fmtEur(inv.net_amount)}</td>
      <td class="py-2 text-sm text-right font-mono text-gray-500">${fmtEur(inv.vat_amount)}</td>
      <td class="py-2 text-sm text-right font-mono text-gray-900">${fmtEur(inv.gross_amount)}</td>
    </tr>`,
    )
    .join("");

  return `
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Betriebseinnahmen netto</p>
        <p class="text-2xl font-bold text-gray-900">${fmtEur(data.revenue_net_total)}</p>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Gewinn (vor Steuern)</p>
        <p class="text-2xl font-bold text-green-700">${fmtEur(data.revenue_net_total)}</p>
        <p class="text-xs text-gray-400 mt-1">Betriebsausgaben bitte manuell ergänzen</p>
      </div>
    </div>

    <div class="bg-white rounded-lg border border-gray-200 mb-6">
      <div class="px-4 py-3 border-b border-gray-100">
        <h2 class="text-sm font-semibold text-gray-700">Betriebseinnahmen</h2>
      </div>
      <table class="w-full">
        <tbody class="divide-y divide-gray-100 px-4">
          <tr class="px-4">${vatRows}</tr>
          <tr class="bg-gray-50 font-semibold">
            <td class="px-4 py-2 text-sm text-gray-900">Gesamt netto</td>
            <td class="px-4 py-2 text-sm text-right font-mono text-gray-900">${fmtEur(data.revenue_net_total)}</td>
          </tr>
          ${
            !data.is_kleinunternehmer
              ? `<tr class="bg-gray-50">
              <td class="px-4 py-2 text-sm text-gray-500">+ Eingenommene USt</td>
              <td class="px-4 py-2 text-sm text-right font-mono text-gray-500">${fmtEur(data.vat_collected_total)}</td>
            </tr>
            <tr class="bg-gray-50 font-semibold">
              <td class="px-4 py-2 text-sm text-gray-900">Brutto gesamt</td>
              <td class="px-4 py-2 text-sm text-right font-mono text-gray-900">${fmtEur(data.gross_total)}</td>
            </tr>`
              : ""
          }
        </tbody>
      </table>
    </div>

    <div class="bg-white rounded-lg border border-gray-200">
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-700">Einzelnachweise (${data.invoice_count} Rechnungen)</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <th class="px-4 py-2 text-left">Rechnungsnr.</th>
              <th class="px-4 py-2 text-left">Kunde</th>
              <th class="px-4 py-2 text-left">Zahlungsdatum</th>
              <th class="px-4 py-2 text-right">Netto</th>
              <th class="px-4 py-2 text-right">MwSt</th>
              <th class="px-4 py-2 text-right">Brutto</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 px-4">
            ${invoiceRows}
            <tr class="bg-gray-50 font-semibold">
              <td class="px-4 py-2 text-sm" colspan="3">Summe</td>
              <td class="px-4 py-2 text-sm text-right font-mono">${fmtEur(data.revenue_net_total)}</td>
              <td class="px-4 py-2 text-sm text-right font-mono">${fmtEur(data.vat_collected_total)}</td>
              <td class="px-4 py-2 text-sm text-right font-mono">${fmtEur(data.gross_total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

function escRow(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
