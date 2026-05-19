import { AppError } from "../middleware/error-handler";

// Recommand Access Point API configuration
const RECOMMAND_API_BASE = "https://api.recommand.eu/api/v1";
const RECOMMAND_API_KEY = Bun.env.RECOMMAND_API_KEY || "";

export interface PeppolSubmissionResponse {
  documentId: string;
  status: string;
  timestamp: string;
  message?: string;
}

export interface PeppolStatusResponse {
  documentId: string;
  status: "pending" | "submitted" | "delivered" | "acknowledged" | "failed";
  deliveryTimestamp?: string;
  acknowledgeTimestamp?: string;
  errorMessage?: string;
}

export class PeppolClient {
  private apiKey: string;
  private apiBase: string;
  private senderIdentifier: string;

  constructor(
    apiKey: string = RECOMMAND_API_KEY,
    apiBase: string = RECOMMAND_API_BASE,
    senderIdentifier: string = "9930:DE",
  ) {
    if (!apiKey) {
      throw new AppError("RECOMMAND_API_KEY ist nicht gesetzt", 500);
    }
    this.apiKey = apiKey;
    this.apiBase = apiBase;
    this.senderIdentifier = senderIdentifier;
  }

  // Send UBL invoice to Recommand AS4 gateway
  async sendInvoice(
    ublXml: string,
    receiverParticipantId: string,
    invoiceNumber: string,
  ): Promise<PeppolSubmissionResponse> {
    const url = `${this.apiBase}/documents/send`;

    const payload = {
      document: Buffer.from(ublXml).toString("base64"),
      documentType: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      receiver: receiverParticipantId,
      senderIdentifier: this.senderIdentifier,
      processIdentifier: "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0",
      metadata: {
        invoiceNumber,
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[PeppolClient] Recommand send failed (${response.status}):`, error);
        throw new AppError(
          `Peppol-Versand fehlgeschlagen: ${response.statusText}`,
          (response.status as any) || 500,
        );
      }

      const data = (await response.json()) as Record<string, any>;
      return {
        documentId: data.id || data.documentId,
        status: data.status || "submitted",
        timestamp: new Date().toISOString(),
        message: data.message,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.error("[PeppolClient] Network or parsing error:", err);
      throw new AppError("Peppol-Versand fehlgeschlagen (Netzwerkfehler)", 500);
    }
  }

  // Check status of submitted document
  async checkStatus(documentId: string): Promise<PeppolStatusResponse> {
    const url = `${this.apiBase}/documents/${encodeURIComponent(documentId)}/status`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        console.error(`[PeppolClient] Status check failed (${response.status})`);
        throw new AppError(
          `Status-Abfrage fehlgeschlagen: ${response.statusText}`,
          (response.status as any) || 500,
        );
      }

      const data = (await response.json()) as Record<string, any>;
      return {
        documentId: data.id || documentId,
        status: this.normalizeStatus(data.status),
        deliveryTimestamp: data.deliveredAt,
        acknowledgeTimestamp: data.acknowledgedAt,
        errorMessage: data.errorMessage,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.error("[PeppolClient] Network or parsing error:", err);
      throw new AppError("Status-Abfrage fehlgeschlagen (Netzwerkfehler)", 500);
    }
  }

  // Normalize Recommand API status to our internal status values
  normalizeStatus(apiStatus: string): PeppolStatusResponse["status"] {
    const statusMap: Record<string, PeppolStatusResponse["status"]> = {
      pending: "pending",
      submitted: "submitted",
      delivered: "delivered",
      acknowledged: "acknowledged",
      failed: "failed",
    };
    return statusMap[apiStatus] || "pending";
  }
}

// Factory function with optional senderIdentifier override
export function getPeppolClient(senderIdentifier?: string): PeppolClient {
  return new PeppolClient(RECOMMAND_API_KEY, RECOMMAND_API_BASE, senderIdentifier);
}
