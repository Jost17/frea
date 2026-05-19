import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  LEGAL_RESOURCE_CONTENT,
  LEGAL_RESOURCE_URI,
  ONBOARDING_RESOURCE_CONTENT,
  ONBOARDING_RESOURCE_URI,
} from "../lib/mcp-content";
import { TOOLS_DEFINITIONS, validateInvoice, validateInvoiceSchema } from "../lib/mcp-tools";
import { McpConnectPage } from "../templates/mcp-connect";

export const mcpRoutes = new Hono();

mcpRoutes.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Accept", "MCP-Session-Id"],
  }),
);

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = {
  name: "FREA",
  version: "1.0.0",
  description: "German invoicing compliance framework — real-time validation for freelancers",
};
const CAPABILITIES = {
  resources: { subscribe: false, listChanged: false },
  tools: { listChanged: false },
};

function jsonRpcSuccess(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

function handleResourcesList(id: string | number | null) {
  return jsonRpcSuccess(id, {
    resources: [
      {
        uri: LEGAL_RESOURCE_URI,
        name: "German Invoicing Legal Requirements",
        description: "§14 UStG compliance, GoBD audit rules, MwSt calculation rules",
        mimeType: "text/markdown",
      },
      {
        uri: ONBOARDING_RESOURCE_URI,
        name: "Freelancer Onboarding Checklist",
        description: "Step-by-step setup guide for FREA (Stammdaten, Client, Invoice, Audit-Log)",
        mimeType: "application/json",
      },
    ],
  });
}

function handleResourcesRead(id: string | number | null, params: unknown) {
  const p = params as { uri?: string } | undefined;
  if (!p?.uri) return jsonRpcError(id, -32602, "Fehlender Parameter: uri");
  if (p.uri === LEGAL_RESOURCE_URI) {
    return jsonRpcSuccess(id, {
      contents: [
        { uri: LEGAL_RESOURCE_URI, mimeType: "text/markdown", text: LEGAL_RESOURCE_CONTENT },
      ],
    });
  }
  if (p.uri === ONBOARDING_RESOURCE_URI) {
    return jsonRpcSuccess(id, {
      contents: [
        {
          uri: ONBOARDING_RESOURCE_URI,
          mimeType: "application/json",
          text: JSON.stringify(ONBOARDING_RESOURCE_CONTENT, null, 2),
        },
      ],
    });
  }
  return jsonRpcError(id, -32602, `Unbekannte Ressource: ${p.uri}`);
}

function handleToolsCall(id: string | number | null, params: unknown) {
  const p = params as { name?: string; arguments?: unknown } | undefined;
  if (!p?.name) return jsonRpcError(id, -32602, "Fehlender Parameter: name");
  if (p.name !== "frea:validate_invoice")
    return jsonRpcError(id, -32602, `Unbekanntes Tool: ${p.name}`);

  const parsed = validateInvoiceSchema.safeParse(p.arguments);
  if (!parsed.success) {
    return jsonRpcSuccess(id, {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            isCompliant: false,
            violations: parsed.error.issues.map((i) => i.message),
            suggestions: [],
            calculatedTaxTotal: null,
          }),
        },
      ],
    });
  }
  return jsonRpcSuccess(id, {
    content: [{ type: "text", text: JSON.stringify(validateInvoice(parsed.data)) }],
  });
}

mcpRoutes.get("/", (c) => c.html(McpConnectPage()));

mcpRoutes.get("/server", (c) =>
  c.json({ protocolVersion: PROTOCOL_VERSION, capabilities: CAPABILITIES, server: SERVER_INFO }),
);

mcpRoutes.post("/server", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(jsonRpcError(null, -32700, "Parse error: invalid JSON"), 400);
  }

  const req = body as {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: unknown;
  };
  if (req.jsonrpc !== "2.0" || !req.method) {
    return c.json(jsonRpcError(req.id ?? null, -32600, "Invalid Request"), 400);
  }

  const id = req.id ?? null;
  try {
    switch (req.method) {
      case "initialize":
        return c.json(
          jsonRpcSuccess(id, {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: CAPABILITIES,
            serverInfo: SERVER_INFO,
          }),
        );
      case "ping":
        return c.json(jsonRpcSuccess(id, {}));
      case "resources/list":
        return c.json(handleResourcesList(id));
      case "resources/read":
        return c.json(handleResourcesRead(id, req.params));
      case "tools/list":
        return c.json(jsonRpcSuccess(id, { tools: TOOLS_DEFINITIONS }));
      case "tools/call":
        return c.json(handleToolsCall(id, req.params));
      default:
        return c.json(jsonRpcError(id, -32601, `Method not found: ${req.method}`), 404);
    }
  } catch (err) {
    console.error("[mcp] Unhandled error:", err);
    return c.json(jsonRpcError(id, -32603, "Internal error"), 500);
  }
});
