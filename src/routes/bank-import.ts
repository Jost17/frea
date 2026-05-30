import { Hono } from "hono";
import { updateInvoiceStatus } from "../db/invoice-queries";
import { db } from "../db/schema";
import type { AppEnv } from "../env";
import { parseCamt053 } from "../lib/bank-import/camt-parser";
import { parseBankCsv } from "../lib/bank-import/csv-parser";
import type { InvoiceForMatching } from "../lib/bank-import/matcher";
import { matchTransactions } from "../lib/bank-import/matcher";
import { AppError, handleMutationError, logAndRespond } from "../middleware/error-handler";
import {
  renderBankImportPage,
  renderImportSuccess,
  renderMatchPreview,
} from "../templates/bank-import";
import { Layout } from "../templates/layout";

export const bankImportRoutes = new Hono<AppEnv>();

function getOpenInvoices(): InvoiceForMatching[] {
  return db
    .query<InvoiceForMatching, []>(
      `SELECT i.id, i.invoice_number, i.gross_amount, c.name as client_name, i.due_date
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.status = 'sent'
       ORDER BY i.due_date ASC`,
    )
    .all();
}

bankImportRoutes.get("/", (c) => {
  try {
    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Kontoauszug importieren",
        activeNav: "rechnungen",
        overdueCount,
        children: renderBankImportPage(),
      }),
    );
  } catch (err) {
    return logAndRespond(c, err, "Bank-Import konnte nicht geladen werden", 500);
  }
});

bankImportRoutes.post("/parse", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      throw new AppError("Keine Datei hochgeladen", 400);
    }

    const filename = (file as File).name.toLowerCase();
    const content = await (file as File).text();

    if (!content.trim()) {
      throw new AppError("Datei ist leer", 400);
    }

    let transactions = [];
    let format = "unbekannt";

    if (filename.endsWith(".xml") || content.trimStart().startsWith("<")) {
      transactions = parseCamt053(content);
      format = "CAMT.053";
    } else {
      const result = parseBankCsv(content);
      transactions = result.transactions;
      format =
        result.format === "unknown" ? "CSV (Format nicht erkannt)" : `CSV (${result.format})`;
    }

    if (transactions.length === 0) {
      return c.html(
        `<div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4 max-w-2xl">
          <p class="text-sm text-yellow-800 dark:text-yellow-300">
            Keine Gutschriften gefunden (Format: ${format}). Bitte prüfe, ob die Datei Zahlungseingänge enthält.
          </p>
        </div>`,
      );
    }

    const openInvoices = getOpenInvoices();
    const report = matchTransactions(transactions, openInvoices);

    return c.html(renderMatchPreview(report, format) as unknown as string);
  } catch (err) {
    if (err instanceof AppError) {
      return c.html(
        `<div class="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4 max-w-2xl">
          <p class="text-sm text-red-800 dark:text-red-300">${err.message}</p>
        </div>`,
        err.statusCode,
      );
    }
    return logAndRespond(c, err, "Datei konnte nicht verarbeitet werden", 500);
  }
});

bankImportRoutes.post("/confirm", async (c) => {
  try {
    const formData = await c.req.formData();
    const rawIds = formData.getAll("invoice_ids");

    const invoiceIds = rawIds
      .map((v) => parseInt(String(v), 10))
      .filter((n) => !Number.isNaN(n) && n > 0);

    if (invoiceIds.length === 0) {
      throw new AppError("Keine Rechnungen ausgewählt", 400);
    }

    let markedCount = 0;
    const errors: string[] = [];

    for (const id of invoiceIds) {
      try {
        updateInvoiceStatus(id, "paid");
        markedCount++;
      } catch (err) {
        const msg = err instanceof AppError ? err.message : `Rechnung ${id}: unbekannter Fehler`;
        errors.push(msg);
        console.error(`[bank-import] Failed to mark invoice ${id} as paid:`, err);
      }
    }

    if (markedCount === 0) {
      const errText = errors.join("; ");
      return c.html(
        `<div class="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4 max-w-2xl">
          <p class="text-sm text-red-800 dark:text-red-300">Keine Rechnung konnte aktualisiert werden: ${errText}</p>
        </div>`,
        422,
      );
    }

    return c.html(renderImportSuccess(markedCount) as unknown as string);
  } catch (err) {
    return handleMutationError(c, err, "Bank-Import");
  }
});
