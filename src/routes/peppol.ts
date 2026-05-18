import { Hono } from "hono";
import { db } from "../db/schema";
import { AppError } from "../middleware/error-handler";
import { getPeppolClient } from "../lib/peppol-client";
import { peppolSendSchema } from "../validation/schemas";

export const peppolRoutes = new Hono();

// POST /peppol/send — Submit UBL invoice to Peppol network
peppolRoutes.post("/send", async (c) => {
  const body = await c.req.json().catch(() => {
    throw new AppError("Ungültiger JSON-Body", 400);
  });

  const parsed = peppolSendSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
      422,
    );
  }

  const { invoice_id, receiver_participant_id } = parsed.data;

  try {
    // Fetch invoice & related data
    const invoice = db
      .query(
        `SELECT id, invoice_number, gross_amount FROM invoices WHERE id = ?`,
      )
      .get(invoice_id) as any;

    if (!invoice) {
      throw new AppError("Rechnung nicht gefunden", 404);
    }

    // Generate UBL XML (stub for now — real implementation in Phase 2)
    // TODO: Call actual UBL generator with invoice data
    const ublXml = generateUblStub(invoice);

    // Submit to Peppol via Recommand
    const client = getPeppolClient();
    const result = await client.sendInvoice(
      ublXml,
      receiver_participant_id,
      invoice.invoice_number,
    );

    // Store submission record
    const peppol_id = `PEPPOL-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    db.run(
      `INSERT INTO peppol_documents
       (invoice_id, peppol_id, receiver_id, status, ubl_xml, submission_timestamp, recommand_response)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_id,
        peppol_id,
        receiver_participant_id,
        result.status,
        ublXml,
        result.timestamp,
        JSON.stringify(result),
      ],
    );

    return c.json({
      success: true,
      data: {
        peppol_id,
        status: result.status,
        timestamp: result.timestamp,
      },
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[peppol/send] Unexpected error:", err);
    throw new AppError("Peppol-Versand fehlgeschlagen", 500);
  }
});

// GET /peppol/status/:peppol_id — Check submission status
peppolRoutes.get("/status/:peppol_id", async (c) => {
  const peppol_id = c.req.param("peppol_id");

  try {
    // Fetch stored record
    const doc = db
      .query(`SELECT id, status, invoice_id FROM peppol_documents WHERE peppol_id = ?`)
      .get(peppol_id) as any;

    if (!doc) {
      throw new AppError("Peppol-Dokument nicht gefunden", 404);
    }

    // Only refresh status from Recommand if not in terminal state
    if (doc.status !== "delivered" && doc.status !== "acknowledged" && doc.status !== "failed") {
      const client = getPeppolClient();
      const remoteStatus = await client.checkStatus(peppol_id);

      // Update local record if status changed
      if (remoteStatus.status !== doc.status) {
        db.run(
          `UPDATE peppol_documents
           SET status = ?, delivery_timestamp = ?, updated_at = datetime('now')
           WHERE id = ?`,
          [
            remoteStatus.status,
            remoteStatus.deliveryTimestamp || null,
            doc.id,
          ],
        );
      }

      return c.json({
        peppol_id,
        status: remoteStatus.status,
        deliveryTimestamp: remoteStatus.deliveryTimestamp,
        acknowledgeTimestamp: remoteStatus.acknowledgeTimestamp,
        errorMessage: remoteStatus.errorMessage,
      });
    }

    // Return cached status for terminal states
    const cached = db
      .query(
        `SELECT status, delivery_timestamp, error_message FROM peppol_documents WHERE peppol_id = ?`,
      )
      .get(peppol_id) as any;

    return c.json({
      peppol_id,
      status: cached.status,
      deliveryTimestamp: cached.delivery_timestamp,
      errorMessage: cached.error_message,
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error("[peppol/status] Unexpected error:", err);
    throw new AppError("Status-Abfrage fehlgeschlagen", 500);
  }
});

// Stub: Generate minimal UBL 2.1 XML from invoice data
// Real implementation will use full XML builder with EN16931 compliance
function generateUblStub(invoice: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>${invoice.invoice_number}</cbc:ID>
  <cbc:IssueDate>${new Date().toISOString().split("T")[0]}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${invoice.invoice_number}</cbc:ID>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
</Invoice>`;
}
