import PDFDocument from "pdfkit";
import { getClient, getInvoice, getInvoiceItems, getProject, getSettings } from "../db/queries";
import type { Client, Invoice, InvoiceItem, Project, Settings } from "../validation/schemas";

// ─── German number formatting ─────────────────────────────────────────────────

function fmtEur(value: number): string {
  // German convention: point as thousands separator, comma as decimal
  const fixed = Math.round(value * 100) / 100;
  const [int, dec] = String(fixed.toFixed(2)).split(".");
  const formatted = `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
  return `${formatted} €`;
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

export interface InvoicePdfData {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client;
  project: Project;
  settings: Settings;
}

export async function generateInvoicePdf(id: number): Promise<Buffer> {
  const invoice = getInvoice(id);
  if (!invoice) throw new Error(`Rechnung ${id} nicht gefunden`);

  const items = getInvoiceItems(id);
  const client = getClient(invoice.client_id);
  if (!client) throw new Error(`Kunde ${invoice.client_id} nicht gefunden`);

  const project = getProject(invoice.project_id);
  if (!project) throw new Error(`Projekt ${invoice.project_id} nicht gefunden`);

  const settings = getSettings();
  if (!settings) throw new Error("Einstellungen nicht gefunden");

  return buildInvoicePdf({ invoice, items, client, project, settings });
}

function buildInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { invoice, items, client, project, settings } = data;

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 60, left: 72, right: 72 },
      info: {
        Title: `Rechnung ${invoice.invoice_number}`,
        Author: settings.company_name,
        Subject: `Rechnung ${invoice.invoice_number}`,
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = doc.page.width - 72 - 72; // usable width
    const FONT = "Helvetica";
    const FONT_BOLD = "Helvetica-Bold";

    // ── Helpers ──────────────────────────────────────────────────────────────

    const grayHeader = "#e8e8e8";
    const black = "#000000";
    const darkGray = "#555555";

    function _lineY() {
      return doc.y;
    }

    // ── Header Block (top-right) ─────────────────────────────────────────────
    const headerX = PAGE_W - 100; // right-aligned start
    doc.font(FONT_BOLD).fontSize(11).text(settings.company_name, headerX, 40, {
      width: 200,
      align: "right",
    });
    doc
      .font(FONT)
      .fontSize(9)
      .text(settings.address, headerX, doc.y + 2, { width: 200, align: "right" })
      .text(`${settings.postal_code} ${settings.city}`, headerX, doc.y + 1, {
        width: 200,
        align: "right",
      });

    // ── Return address line (small, above recipient) ─────────────────────────
    const returnLine = `${settings.company_name}  ${settings.address}  ${settings.postal_code} ${settings.city}`;
    doc
      .font(FONT)
      .fontSize(7.5)
      .fillColor(darkGray)
      .text(returnLine, 0, doc.y + 12, {
        width: PAGE_W,
        align: "left",
      });

    // ── Recipient block ─────────────────────────────────────────────────────
    let y = doc.y + 14;
    doc.fillColor(black).font(FONT).fontSize(10);
    const lines = [client.name];
    if (client.address) lines.push(client.address);
    const cityLine = [client.postal_code, client.city].filter(Boolean).join(" ");
    if (cityLine) lines.push(cityLine);
    if (client.country && client.country !== "Deutschland") lines.push(client.country);

    lines.forEach((line) => {
      doc.text(line, 0, y, { width: PAGE_W });
      y += 13;
    });

    // ── Invoice title line ───────────────────────────────────────────────────
    y += 20;
    doc.font(FONT_BOLD).fontSize(11);
    doc.text(`Rechnung Nr. ${invoice.invoice_number}`, 0, y, {
      width: PAGE_W - 180,
      continued: false,
    });
    doc
      .font(FONT)
      .fontSize(10)
      .text(`${settings.city} ${fmtDate(invoice.invoice_date)}`, PAGE_W - 180, y, {
        width: 180,
        align: "right",
      });

    // Underline the invoice number
    const titleY = doc.y;
    doc.saveGraphicsState();
    doc
      .moveTo(0, titleY + 2)
      .lineTo(PAGE_W - 180, titleY + 2)
      .stroke();
    doc.restoreGraphicsState();

    // ── Salutation + intro ───────────────────────────────────────────────────
    y = doc.y + 14;
    doc.font(FONT).fontSize(10).text("Sehr geehrte Damen und Herren,", 0, y, {
      width: PAGE_W,
    });

    y += 18;
    const serviceDesc = project.service_description || "Leistung";
    doc.text(
      `hiermit stelle ich meine Leistung "${serviceDesc}" im unten genannten Zeitraum in Rechnung.`,
      0,
      y,
      { width: PAGE_W },
    );

    y += 14;
    doc.text(
      `Leistungs- und Rechnungsempfänger: ${client.name}, ${client.address || ""} ${client.postal_code || ""} ${client.city || ""}`.trim(),
      0,
      y,
      { width: PAGE_W },
    );

    y += 12;
    doc.text(`Projektnummer: ${project.code}`, 0, y, { width: PAGE_W });
    y += 12;
    doc.text(`Kostenart: ${invoice.po_number || "—"}`, 0, y, { width: PAGE_W });
    y += 12;
    doc.text(`Besteller: ${client.contact_person || "—"}`, 0, y, { width: PAGE_W });

    // ── Line items table ─────────────────────────────────────────────────────
    y += 20;

    const colArt = 50;
    const colLeist = colArt + 60;
    const colZeitraum = colLeist + 170;
    const colBetrag = PAGE_W; // right-aligned to page edge

    const tableTop = y;

    // Header row with gray background
    doc.saveGraphicsState();
    doc.rect(0, tableTop, PAGE_W, 20).fill(grayHeader);
    doc.restoreGraphicsState();

    doc
      .font(FONT_BOLD)
      .fontSize(9)
      .fillColor(black)
      .text("ART", colArt, tableTop + 5, { width: colLeist - colArt, align: "left" })
      .text("LEISTUNGEN", colLeist, tableTop + 5, { width: colZeitraum - colLeist, align: "left" })
      .text("ZEITRAUM", colZeitraum, tableTop + 5, {
        width: colBetrag - colZeitraum - 80,
        align: "left",
      })
      .text("BETRAG", colBetrag - 80, tableTop + 5, { width: 80, align: "right" });

    // Header border
    doc
      .saveGraphicsState()
      .moveTo(0, tableTop + 20)
      .lineTo(PAGE_W, tableTop + 20)
      .stroke()
      .restoreGraphicsState();

    y = tableTop + 24;

    for (const item of items) {
      const rowHeight = 16;
      const days = item.days;
      const dailyRate = item.daily_rate;
      const period = `${fmtDate(item.period_start)} - ${fmtDate(item.period_end)}`;

      // Check if we need a new page
      if (y + rowHeight > doc.page.height - 100) {
        doc.addPage();
        y = 60;
      }

      doc
        .font(FONT)
        .fontSize(9)
        .fillColor(black)
        .text("Honorar", colArt, y, { width: colLeist - colArt, align: "left" })
        .text(
          `${serviceDesc} (${days.toFixed(2)} PT x ${fmtEur(dailyRate).replace(" €", "")})`,
          colLeist,
          y,
          { width: colZeitraum - colLeist, align: "left" },
        )
        .text(period, colZeitraum, y, { width: colBetrag - colZeitraum - 80, align: "left" })
        .text(`${item.net_amount.toFixed(2).replace(".", ",")} €`, colBetrag - 80, y, {
          width: 80,
          align: "right",
        });

      y += rowHeight;
    }

    // ── Totals section ───────────────────────────────────────────────────────
    y += 10;

    const labelX = PAGE_W - 220;
    const valX = PAGE_W - 80;

    function rightLine(label: string, value: string, bold = false) {
      doc
        .font(bold ? FONT_BOLD : FONT)
        .fontSize(10)
        .text(label, labelX, y, { width: 140, align: "right" })
        .text(value, valX, y, { width: 80, align: "right" });
      y += 14;
    }

    // Separator above "Summe"
    doc
      .saveGraphicsState()
      .moveTo(labelX - 10, y)
      .lineTo(PAGE_W, y)
      .stroke()
      .restoreGraphicsState();
    y += 6;

    rightLine("Summe:", fmtEur(invoice.net_amount));
    rightLine(
      `zuzüglich USt. (${(settings.vat_rate * 100).toFixed(0)}%):`,
      fmtEur(invoice.vat_amount),
    );

    // Separator above total
    doc
      .saveGraphicsState()
      .moveTo(labelX - 10, y)
      .lineTo(PAGE_W, y)
      .stroke()
      .restoreGraphicsState();
    y += 4;
    rightLine("Rechnungsbetrag:", fmtEur(invoice.gross_amount), true);

    // ── Payment instructions ─────────────────────────────────────────────────
    y += 16;
    doc
      .font(FONT)
      .fontSize(10)
      .text(
        `Bitte überweisen Sie den Betrag bis zum ${fmtDate(invoice.due_date)} auf mein Konto ${settings.iban} bei der Bank ${settings.bank_name}.`,
        0,
        y,
        { width: PAGE_W },
      );

    // ── Closing ──────────────────────────────────────────────────────────────
    y += 24;
    doc.text("Mit freundlichen Grüßen", 0, y, { width: PAGE_W });
    y += 24;
    doc.text(settings.company_name, 0, y, { width: PAGE_W });

    // ── Footer (three columns) ────────────────────────────────────────────────
    // Footer is automatically placed at the bottom via on('pageBoundary') or we draw it now
    // Let's add it at the bottom of the last page
    const footerY = doc.page.height - 60;

    doc
      .saveGraphicsState()
      .moveTo(0, footerY - 8)
      .lineTo(PAGE_W, footerY - 8)
      .stroke("#888888")
      .restoreGraphicsState();

    const colW = PAGE_W / 3;

    // Column 1: ADRESSE
    doc
      .font(FONT_BOLD)
      .fontSize(7.5)
      .fillColor(darkGray)
      .text("ADRESSE", 0, footerY, { width: colW });
    doc
      .font(FONT)
      .fontSize(8)
      .fillColor(black)
      .text(settings.company_name, 0, footerY + 11, { width: colW })
      .text(settings.address, 0, footerY + 22, { width: colW })
      .text(`${settings.postal_code} ${settings.city}`, 0, footerY + 33, { width: colW });

    // Column 2: KONTAKT
    doc
      .font(FONT_BOLD)
      .fontSize(7.5)
      .fillColor(darkGray)
      .text("KONTAKT", colW, footerY, { width: colW });
    doc
      .font(FONT)
      .fontSize(8)
      .fillColor(black)
      .text(settings.email, colW, footerY + 11, { width: colW })
      .text(settings.mobile ? `Mobil ${settings.mobile}` : "", colW, footerY + 22, { width: colW });

    // Column 3: BANKVERBINDUNG
    doc
      .font(FONT_BOLD)
      .fontSize(7.5)
      .fillColor(darkGray)
      .text("BANKVERBINDUNG", colW * 2, footerY, { width: colW });
    doc
      .font(FONT)
      .fontSize(8)
      .fillColor(black)
      .text(settings.bank_name, colW * 2, footerY + 11, { width: colW })
      .text(settings.iban, colW * 2, footerY + 22, { width: colW })
      .text(settings.bic, colW * 2, footerY + 33, { width: colW })
      .text(settings.tax_number ? `St.NR.: ${settings.tax_number}` : "", colW * 2, footerY + 44, {
        width: colW,
      });

    doc.end();
  });
}
