import { describe, expect, test } from "bun:test";
import { app } from "../src/app";

function mcpPost(body: unknown) {
  return app.fetch(
    new Request("http://localhost/mcp/server", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("MCP Server — GET /mcp/server", () => {
  test("returns server info", async () => {
    const res = await app.fetch(new Request("http://localhost/mcp/server"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { protocolVersion: string; server: { name: string } };
    expect(body.protocolVersion).toBe("2024-11-05");
    expect(body.server.name).toBe("FREA");
  });
});

describe("MCP Server — JSON-RPC POST /mcp/server", () => {
  test("initialize returns capabilities", async () => {
    const res = await mcpPost({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { protocolVersion: string; capabilities: unknown; serverInfo: { name: string } };
    };
    expect(body.result.protocolVersion).toBe("2024-11-05");
    expect(body.result.serverInfo.name).toBe("FREA");
  });

  test("ping returns empty result", async () => {
    const res = await mcpPost({ jsonrpc: "2.0", id: 2, method: "ping" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: Record<string, never> };
    expect(body.result).toEqual({});
  });

  test("resources/list returns 2 resources", async () => {
    const res = await mcpPost({ jsonrpc: "2.0", id: 3, method: "resources/list" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { resources: Array<{ uri: string }> } };
    expect(body.result.resources).toHaveLength(2);
    const uris = body.result.resources.map((r) => r.uri);
    expect(uris).toContain("frea://legal/invoicing-requirements-de");
    expect(uris).toContain("frea://setup/freelancer-onboarding");
  });

  test("resources/read returns legal markdown", async () => {
    const res = await mcpPost({
      jsonrpc: "2.0",
      id: 4,
      method: "resources/read",
      params: { uri: "frea://legal/invoicing-requirements-de" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { contents: Array<{ mimeType: string; text: string }> };
    };
    expect(body.result.contents[0].mimeType).toBe("text/markdown");
    expect(body.result.contents[0].text).toContain("§14 UStG");
  });

  test("resources/read returns onboarding JSON", async () => {
    const res = await mcpPost({
      jsonrpc: "2.0",
      id: 5,
      method: "resources/read",
      params: { uri: "frea://setup/freelancer-onboarding" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { contents: Array<{ mimeType: string; text: string }> };
    };
    expect(body.result.contents[0].mimeType).toBe("application/json");
    const parsed = JSON.parse(body.result.contents[0].text) as { stammdaten: { required: boolean } };
    expect(parsed.stammdaten.required).toBe(true);
  });

  test("tools/list returns validate_invoice tool", async () => {
    const res = await mcpPost({ jsonrpc: "2.0", id: 6, method: "tools/list" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { tools: Array<{ name: string }> } };
    expect(body.result.tools[0].name).toBe("frea:validate_invoice");
  });

  test("tools/call validate_invoice — compliant invoice", async () => {
    const res = await mcpPost({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "frea:validate_invoice",
        arguments: {
          clientName: "Acme GmbH",
          invoiceDate: "2026-05-01",
          dueDate: "2026-05-29",
          items: [{ description: "Beratung (2h à €75)", amount: 150, taxRate: 0.19 }],
        },
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { content: Array<{ text: string }> } };
    const result = JSON.parse(body.result.content[0].text) as {
      isCompliant: boolean;
      calculatedTaxTotal: number;
    };
    expect(result.isCompliant).toBe(true);
    expect(result.calculatedTaxTotal).toBe(28.5);
  });

  test("tools/call validate_invoice — dueDate before invoiceDate is violation", async () => {
    const res = await mcpPost({
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "frea:validate_invoice",
        arguments: {
          clientName: "Acme GmbH",
          invoiceDate: "2026-05-29",
          dueDate: "2026-05-01",
          items: [{ description: "Beratung", amount: 100, taxRate: 0.19 }],
        },
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { content: Array<{ text: string }> } };
    const result = JSON.parse(body.result.content[0].text) as {
      isCompliant: boolean;
      violations: string[];
    };
    expect(result.isCompliant).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  test("tools/call validate_invoice — MwSt calculated per line item", async () => {
    const res = await mcpPost({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: {
        name: "frea:validate_invoice",
        arguments: {
          clientName: "Test GmbH",
          invoiceDate: "2026-05-01",
          dueDate: "2026-05-31",
          items: [
            { description: "Beratung", amount: 150, taxRate: 0.19 },
            { description: "Buch", amount: 80, taxRate: 0.07 },
          ],
        },
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: { content: Array<{ text: string }> } };
    const result = JSON.parse(body.result.content[0].text) as { calculatedTaxTotal: number };
    // 150*0.19=28.50 + 80*0.07=5.60 = 34.10 (per-item, not on total)
    expect(result.calculatedTaxTotal).toBe(34.1);
  });

  test("invalid JSON-RPC returns error", async () => {
    const res = await mcpPost({ id: 1, method: "ping" }); // missing jsonrpc
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: number } };
    expect(body.error.code).toBe(-32600);
  });

  test("unknown method returns -32601", async () => {
    const res = await mcpPost({ jsonrpc: "2.0", id: 10, method: "unknown/method" });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: number } };
    expect(body.error.code).toBe(-32601);
  });
});
