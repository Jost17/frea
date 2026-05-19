import { beforeEach, describe, expect, it, mock } from "bun:test";
import { PeppolClient } from "../src/lib/peppol-client";
import { AppError } from "../src/middleware/error-handler";

describe("PeppolClient", () => {
  let client: PeppolClient;

  beforeEach(() => {
    // Tests will set up their own fetch mocks
  });

  describe("constructor", () => {
    it("should initialize with API key, base URL, and default sender identifier", () => {
      client = new PeppolClient("test-key", "https://api.test.com");
      expect(client).toBeDefined();
    });

    it("should initialize with custom sender identifier", () => {
      client = new PeppolClient("test-key", "https://api.test.com", "9930:DE123456789");
      expect(client).toBeDefined();
    });

    it("should throw AppError if API key is missing", () => {
      expect(() => {
        new PeppolClient("", "https://api.example.com");
      }).toThrow(AppError);
    });
  });

  describe("sendInvoice", () => {
    beforeEach(() => {
      client = new PeppolClient("test-api-key", "https://api.test.com", "9930:DEXYZ");
    });

    it("should submit UBL XML with correct BIS 3.0 process identifier", async () => {
      const mockResponse = {
        id: "doc-12345",
        status: "submitted",
        message: "Document queued for processing",
      };

      global.fetch = mock((url: string, options: RequestInit) => {
        expect(url).toBe("https://api.test.com/documents/send");
        expect(options.method).toBe("POST");

        const body = JSON.parse(options.body as string);
        expect(body.processIdentifier).toBe("urn:fdc:peppol.eu:2017:poacc:billing:01:1.0");
        expect(body.documentType).toBe("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2");
        expect(body.senderIdentifier).toBe("9930:DEXYZ");
        expect(body.receiver).toBe("9930:DETestReceiver");

        return Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }));
      }) as any;

      const ublXml = `<?xml version="1.0"?><Invoice></Invoice>`;
      const result = await client.sendInvoice(ublXml, "9930:DETestReceiver", "RE-2026-0001");

      expect(result.documentId).toBe("doc-12345");
      expect(result.status).toBe("submitted");
      expect(result.message).toBe("Document queued for processing");
    });

    it("should throw AppError on non-OK response", async () => {
      global.fetch = mock(() => {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
        );
      }) as any;

      const ublXml = `<?xml version="1.0"?><Invoice></Invoice>`;

      try {
        await client.sendInvoice(ublXml, "9930:DETestReceiver", "RE-2026-0001");
        throw new Error("Should have thrown AppError");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
      }
    });

    it("should handle network errors gracefully", async () => {
      global.fetch = mock(() => {
        return Promise.reject(new Error("Network unreachable"));
      }) as any;

      const ublXml = `<?xml version="1.0"?><Invoice></Invoice>`;

      try {
        await client.sendInvoice(ublXml, "9930:DETestReceiver", "RE-2026-0001");
        throw new Error("Should have thrown AppError");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).message).toContain("Netzwerkfehler");
      }
    });
  });

  describe("checkStatus", () => {
    beforeEach(() => {
      client = new PeppolClient("test-api-key", "https://api.test.com");
    });

    it("should fetch and normalize status from Recommand API", async () => {
      const mockResponse = {
        id: "doc-12345",
        status: "delivered",
        deliveredAt: "2026-05-19T12:00:00Z",
        acknowledgedAt: null,
        errorMessage: null,
      };

      global.fetch = mock((url: string, options: RequestInit) => {
        expect(url).toBe("https://api.test.com/documents/doc-12345/status");
        expect(options.method).toBe("GET");
        return Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }));
      }) as any;

      const result = await client.checkStatus("doc-12345");

      expect(result.documentId).toBe("doc-12345");
      expect(result.status).toBe("delivered");
      expect(result.deliveryTimestamp).toBe("2026-05-19T12:00:00Z");
    });

    it("should normalize unknown status values to pending", async () => {
      const mockResponse = {
        id: "doc-12345",
        status: "unknown-status-code",
      };

      global.fetch = mock(() => {
        return Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200 }));
      }) as any;

      const result = await client.checkStatus("doc-12345");

      expect(result.status).toBe("pending");
    });

    it("should throw AppError on non-OK status check response", async () => {
      global.fetch = mock(() => {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Not found" }), { status: 404 }),
        );
      }) as any;

      try {
        await client.checkStatus("nonexistent-doc");
        throw new Error("Should have thrown AppError");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
      }
    });
  });

  describe("normalizeStatus()", () => {
    beforeEach(() => {
      client = new PeppolClient("test-key", "https://api.test.com");
    });

    it('maps "pending" to pending', () => {
      expect(client.normalizeStatus("pending")).toBe("pending");
    });

    it('maps "submitted" to submitted', () => {
      expect(client.normalizeStatus("submitted")).toBe("submitted");
    });

    it('maps "delivered" to delivered', () => {
      expect(client.normalizeStatus("delivered")).toBe("delivered");
    });

    it('maps "acknowledged" to acknowledged', () => {
      expect(client.normalizeStatus("acknowledged")).toBe("acknowledged");
    });

    it('maps "failed" to failed', () => {
      expect(client.normalizeStatus("failed")).toBe("failed");
    });

    it("maps unknown status to pending", () => {
      expect(client.normalizeStatus("unknown-value")).toBe("pending");
    });
  });
});
