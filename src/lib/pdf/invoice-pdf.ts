import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";
import { buildInvoiceHtml, type InvoicePdfData } from "./invoice-html";
import { embedZugferdXml } from "./zugferd-embed";

const PDF_OUTPUT_DIR = join(import.meta.dir, "../../../../data/pdfs");

function ensurePdfDir(): void {
  try {
    mkdirSync(PDF_OUTPUT_DIR, { recursive: true });
  } catch (err) {
    console.error("[invoice-pdf] Failed to create PDF directory:", err);
  }
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

export async function generateInvoicePdf(
  data: InvoicePdfData,
  options?: { embedZugferd?: boolean },
): Promise<PdfResult> {
  ensurePdfDir();

  const html = buildInvoiceHtml(data);
  const safeInvoiceNumber = data.invoice.invoice_number.replace(/[^a-zA-Z0-9-]/g, "_");
  const fileName = `${safeInvoiceNumber}.pdf`;
  const filePath = join(PDF_OUTPUT_DIR, fileName);

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "25mm", left: "20mm" },
    });

    let finalBuffer: Uint8Array;
    if (options?.embedZugferd) {
      const { generateZugferdXml } = await import("../zugferd-generator");
      const xml = generateZugferdXml(data);
      const embedResult = await embedZugferdXml(pdfBytes, xml);
      if (!embedResult.success) {
        console.warn(
          "[invoice-pdf] ZUGFeRD embedding failed, saving plain PDF:",
          embedResult.error,
        );
        finalBuffer = pdfBytes;
      } else {
        finalBuffer = embedResult.buffer;
      }
    } else {
      finalBuffer = pdfBytes;
    }

    writeFileSync(filePath, finalBuffer);

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
