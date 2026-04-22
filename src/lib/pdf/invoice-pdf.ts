import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";
import { embedZUGFeRDInPDF } from "./zugferd-embed";
import { buildInvoiceHtml, type InvoicePdfData } from "./invoice-html";

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

export interface PdfGenerationResult {
  success: true;
  filePath: string;
  fileName: string;
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

export async function generateInvoicePdf(data: InvoicePdfData, options?: GeneratePdfOptions): Promise<PdfResult> {
  ensurePdfDir();

  const html = buildInvoiceHtml(data);
  const safeInvoiceNumber = data.invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, "_");
  const fileName = `${safeInvoiceNumber}.pdf`;
  const filePath = join(PDF_OUTPUT_DIR, fileName);

  let browser: Browser | undefined;
  try {
    browser = await getBrowser();

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "25mm", left: "20mm" },
    });

    await writeFile(filePath, pdfBytes);

    if (options?.embedZugferd && options.zugferdXml) {
      const embedResult = await embedZUGFeRDInPDF(filePath, options.zugferdXml);
      if (!embedResult.success) {
        console.warn(`[invoice-pdf] ZUGFeRD embedding failed: ${embedResult.error}`);
        // Nicht abbrechen — PDF ist immer noch gültig ohne ZUGFeRD
      }
    }

    return { success: true, filePath, fileName };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[invoice-pdf] PDF generation failed:", message);
    return { success: false, error: message };
  } finally {
    if (browser) {
      await browser.close().catch((closeErr: unknown) => {
        console.warn("[invoice-pdf] Browser close failed:", closeErr);
      });
    }
  }
}

export async function getInvoicePdfPath(invoiceId: number): Promise<string | null> {
  const { getInvoice } = await import("../../db/invoice-queries");
  const invoice = getInvoice(invoiceId);
  if (!invoice || !invoice.pdf_path) return null;
  return invoice.pdf_path;
}
