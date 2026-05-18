import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";
import type { Client, Invoice, InvoiceItem, Settings } from "../../validation/schemas";
import { generateZUGFeRDXML } from "../zugferd-generator";
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

export async function generateInvoicePdf(
  data: InvoicePdfData,
  options?: GeneratePdfOptions,
): Promise<PdfResult> {
  ensurePdfDir();

  const html = buildInvoiceHtml(data);
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

    if (options?.embedZugferd && options.zugferdXml) {
      await embedZUGFeRDInPDF(filePath, options.zugferdXml);
    }

    return { success: true, filePath, fileName };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[invoice-pdf] PDF generation failed:", message);
    return { success: false, error: message };
  }
}

export async function getInvoicePdfPath(invoiceId: number): Promise<string | null> {
  const { getInvoice } = await import("../../db/invoice-queries");
  const invoice = getInvoice(invoiceId);
  if (!invoice || !invoice.pdf_path) return null;
  return invoice.pdf_path;
}

export async function generatePdfForInvoice(
  invoice: Invoice,
  items: InvoiceItem[],
  client: Client,
  settings: Settings,
): Promise<PdfResult> {
  let zugferdXml: string | undefined;
  if (!settings.kleinunternehmer && items.length > 0) {
    zugferdXml = generateZUGFeRDXML({
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      periodMonth: invoice.period_month,
      periodYear: invoice.period_year,
      periodStart: invoice.service_period_from || invoice.invoice_date,
      periodEnd: invoice.service_period_to || invoice.invoice_date,
      seller: {
        name: settings.company_name,
        address: settings.address || "",
        postalCode: settings.postal_code || "",
        city: settings.city || "",
        country: "Deutschland",
        email: settings.email,
        taxNumber: settings.tax_number,
        vatId: settings.ust_id || undefined,
      },
      buyer: {
        name: client.name,
        address: client.address || null,
        postalCode: client.postal_code || null,
        city: client.city || null,
        country: "Deutschland",
        email: client.email || undefined,
        reference: invoice.po_number || invoice.invoice_number,
      },
      payment: {
        iban: settings.iban,
        bic: settings.bic,
      },
      vat: { categoryCode: "S" },
      lineItems: items.map((item) => ({
        description: item.description,
        quantity: item.days,
        unitPrice: item.daily_rate,
        netAmount: item.net_amount,
      })),
      totals: {
        netAmount: invoice.net_amount,
        vatRate: settings.vat_rate,
        vatAmount: invoice.vat_amount,
        grossAmount: invoice.gross_amount,
      },
    });
  }
  return generateInvoicePdf(
    { invoice, items, client, settings },
    zugferdXml ? { embedZugferd: true, zugferdXml } : undefined,
  );
}
