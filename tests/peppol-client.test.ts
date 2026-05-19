import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { PeppolClient } from "../src/lib/peppol-client";
import { AppError } from "../src/middleware/error-handler";

interface MockFetchContext {
  responses: Map<string, Response>;
  handler: (input: string | Request) => Promise<Response>;
}

function createMockFetch(): {
  fetch: (input: string | Request) => Promise<Response>;
  context: MockFetchContext;
} {
  const context: MockFetchContext = {
    responses: new Map(),
    handler: async (input: string | Request): Promise<Response> => {
      const url = typeof input === "string" ? input : input.url;

      if (url.includes("/documents/send")) {
        const storedResponse = context.responses.get("send");
        if (storedResponse) return storedResponse.clone();
      }

      if (url.includes("/documents/") && url.includes("/status")) {
        const storedResponse = context.responses.get("status");
        if (storedResponse) return storedResponse.clone();
      }

      throw new Error("Unexpected fetch URL: " + url);
    },
  };

  return { fetch: context.handler, context };
}

describe("PeppolClient", () => {
  let client: PeppolClient;
  let mockContext: MockFetchContext;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    const { fetch, context } = createMockFetch();
    mockContext = context;
    client = new PeppolClient("test-api-key", "https://api.example.com");
    globalThis.fetch = fetch as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("sendInvoice", () => {
    it("should send invoice and return submission response", async () => {
      mockContext.responses.set(
        "send",
        new Response(JSON.stringify({ id: "doc-123", status: "submitted" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const ublXml = '<?xml version="1.0"?><Invoice></Invoice>';
      const result = await client.sendInvoice(
        ublXml,
        "9930:DE123456789",
        "INV-2026-001",
        "9930:DE123456789",
      );

      expect(result.status).toBe("submitted");
      expect(result.documentId).toBe("doc-123");
    });

    it("should throw AppError on HTTP 400", async () => {
      mockContext.responses.set(
        "send",
        new Response(JSON.stringify({ error: "Bad Request" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const ublXml = '<?xml version="1.0"?><Invoice></Invoice>';
      try {
        await client.sendInvoice(ublXml, "9930:DE123456789", "INV-2026-001", "9930:DE123456789");
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(400);
      }
    });

    it("should throw AppError on network error", async () => {
      globalThis.fetch = async () => {
        throw new Error("Network timeout");
      };

      const ublXml = '<?xml version="1.0"?><Invoice></Invoice>';
      try {
        await client.sendInvoice(ublXml, "9930:DE123456789", "INV-2026-001", "9930:DE123456789");
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
      }
    });
  });

  describe("checkStatus", () => {
    it("should normalize 'delivered' status correctly", async () => {
      mockContext.responses.set(
        "status",
        new Response(
          JSON.stringify({
            id: "doc-123",
            status: "delivered",
            deliveredAt: "2026-05-19T10:00:00Z",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

      const result = await client.checkStatus("doc-123");
      expect(result.status).toBe("delivered");
    });

    it("should normalize 'pending' status correctly", async () => {
      mockContext.responses.set(
        "status",
        new Response(
          JSON.stringify({
            id: "doc-123",
            status: "pending",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

      const result = await client.checkStatus("doc-123");
      expect(result.status).toBe("pending");
    });

    it("should normalize unknown status to 'pending'", async () => {
      mockContext.responses.set(
        "status",
        new Response(
          JSON.stringify({
            id: "doc-123",
            status: "unknown_status_value",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

      const result = await client.checkStatus("doc-123");
      expect(result.status).toBe("pending");
    });

    it("should throw AppError on HTTP 400 for status check", async () => {
      mockContext.responses.set(
        "status",
        new Response(JSON.stringify({ error: "Bad Request" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      );

      try {
        await client.checkStatus("invalid-doc-id");
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(400);
      }
    });
  });

  describe("constructor", () => {
    it("should initialize with API key and base URL", () => {
      const c = new PeppolClient("test-key", "https://api.test.com");
      expect(c).toBeDefined();
    });

    it("should throw AppError if API key is missing", () => {
      expect(() => {
        new PeppolClient("", "https://api.example.com");
      }).toThrow();
    });
  });
});
