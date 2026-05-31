import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";
import { generateEpcQrDataUrl } from "./epc-qr";
import { buildInvoiceHtml, type InvoicePdfData } from "./invoice-html";
import { embedZUGFeRDInPDF } from "./zugferd-embed";

const PDF_OUTPUT_DIR = join(import.meta.dir, "../../../../data/pdfs");

function ensurePdfDir(): void {
  try {
    mkdirSync(PDF_OUTPUT_DIR, { recursive: true });
  } catch (err) {
    console.error("[invoice-pdf] Failed to create PDF directory:", err);
  }
}

let browserSingleton: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserSingleton?.connected) return browserSingleton;
  browserSingleton = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  return browserSingleton;
}

export async function closeBrowserSingleton(): Promise<void> {
  if (browserSingleton?.connected) {
    try {
      await browserSingleton.close();
      browserSingleton = null;
      console.log("[invoice-pdf] Browser singleton closed");
    } catch (err) {
      console.warn("[invoice-pdf] Error closing browser singleton:", err);
    }
  }
}

export interface PdfGenerationResult {
  success: true;
  filePath: string;
  fileName: string;
  // FREA-115: false, wenn ZUGFeRD angefordert war, das Embedding aber fehlschlug
  // (Mustang/Ghostscript/Java fehlen) — das reine PDF ist trotzdem valide.
  zugferdEmbedded: boolean;
}

export interface PdfGenerationError {
  success: false;
  error: string;
}

export type PdfResult = PdfGenerationResult | PdfGenerationError;

export interface GeneratePdfOptions {
  embedZugferd?: true;
  zugferdXml?: string;
}

/**
 * FREA-115: Bettet ZUGFeRD ein und degradiert graceful. Das Embedding braucht
 * Mustang-CLI.jar + Java + Ghostscript — fehlen die, darf NICHT die ganze
 * Rechnung scheitern (500). Das reine PDF ist eine valide USt-Rechnung; nur das
 * eingebettete XML entfällt. Wirft nie — gibt true bei Erfolg, sonst false.
 */
export async function tryEmbedZugferd(filePath: string, xmlContent: string): Promise<boolean> {
  try {
    await embedZUGFeRDInPDF(filePath, xmlContent);
    return true;
  } catch (embedErr) {
    const message = embedErr instanceof Error ? embedErr.message : String(embedErr);
    console.warn(`[invoice-pdf] ZUGFeRD-Embedding übersprungen, PDF bleibt valide: ${message}`);
    return false;
  }
}

export async function generateInvoicePdf(
  data: InvoicePdfData,
  options?: GeneratePdfOptions,
): Promise<PdfResult> {
  ensurePdfDir();

  const epcQrDataUrl = await generateEpcQrDataUrl({
    // Beneficiary = the account holder (the freelancer), never the bank name.
    recipientName: data.settings.company_name,
    iban: data.settings.iban ?? "",
    bic: data.settings.bic ?? undefined,
    amount: data.invoice.gross_amount,
    reference: data.invoice.invoice_number,
  });

  const html = buildInvoiceHtml({ ...data, epcQrDataUrl });
  const safeInvoiceNumber = data.invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, "_");
  const fileName = `${safeInvoiceNumber}.pdf`;
  const filePath = join(PDF_OUTPUT_DIR, fileName);

  try {
    const browser = await getBrowser();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "25mm", left: "20mm" },
    });

    await writeFile(filePath, pdfBytes);

    const zugferdEmbedded =
      options?.embedZugferd && options.zugferdXml
        ? await tryEmbedZugferd(filePath, options.zugferdXml)
        : false;

    return { success: true, filePath, fileName, zugferdEmbedded };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[invoice-pdf] PDF generation failed:", message);
    return { success: false, error: message };
  }
}

export async function getInvoicePdfPath(invoiceId: number): Promise<string | null> {
  const { getInvoice } = await import("../../db/invoice-queries");
  const invoice = getInvoice(invoiceId);
  if (!invoice?.pdf_path) return null;
  return invoice.pdf_path;
}
