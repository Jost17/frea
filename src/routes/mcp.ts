import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  LEGAL_RESOURCE_CONTENT,
  LEGAL_RESOURCE_URI,
  ONBOARDING_RESOURCE_CONTENT,
  ONBOARDING_RESOURCE_URI,
} from "../lib/mcp-content";

export const mcpRoutes = new Hono();

mcpRoutes.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Accept", "MCP-Session-Id"],
  }),
);

// ─── MCP Protocol Constants ───────────────────────────────────────────────────

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

// ─── Tool: validate_invoice ───────────────────────────────────────────────────

const validateInvoiceSchema = z.object({
  clientName: z.string().min(1),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        amount: z.number().min(0),
        taxRate: z.number().refine((r) => [0.0, 0.07, 0.19].includes(r), {
          message: "taxRate muss 0.0, 0.07 oder 0.19 sein",
        }),
      }),
    )
    .min(1, "Mindestens eine Position erforderlich"),
});

type ValidateInvoiceInput = z.infer<typeof validateInvoiceSchema>;

interface ValidationResult {
  isCompliant: boolean;
  violations: string[];
  suggestions: string[];
  calculatedTaxTotal: number | null;
}

function validateInvoice(input: ValidateInvoiceInput): ValidationResult {
  const violations: string[] = [];
  const suggestions: string[] = [];

  if (input.invoiceDate >= input.dueDate) {
    violations.push("Fälligkeitsdatum muss nach dem Rechnungsdatum liegen");
  }

  // MwSt per line item (FREA core rule — never on total)
  let calculatedTaxTotal: number | null = null;
  try {
    calculatedTaxTotal = input.items.reduce((sum, item) => {
      const vatAmount = Math.round(item.amount * item.taxRate * 100) / 100;
      return Math.round((sum + vatAmount) * 100) / 100;
    }, 0);
  } catch {
    violations.push("Fehler bei MwSt-Berechnung");
  }

  // §14 UStG: check for service description quality
  const blankDescriptions = input.items.filter((i) => i.description.trim().length < 3);
  if (blankDescriptions.length > 0) {
    violations.push(
      `${blankDescriptions.length} Position(en) mit unzureichender Leistungsbeschreibung — §14 UStG fordert eindeutige Beschreibung`,
    );
  }

  // Check for zero-amount items without explicit reason
  const zeroItems = input.items.filter((i) => i.amount === 0);
  if (zeroItems.length > 0) {
    suggestions.push(
      `${zeroItems.length} Position(en) mit Betrag 0 — falls gewollt, ggf. als Rabatt kennzeichnen`,
    );
  }

  // Suggestions for completeness
  const allTaxRates = new Set(input.items.map((i) => i.taxRate));
  if (allTaxRates.has(0.0) && allTaxRates.size > 1) {
    suggestions.push(
      "Mischung aus steuerfreien und steuerpflichtigen Positionen — stelle sicher, dass Steuerbefreiungsgrund angegeben ist",
    );
  }

  suggestions.push("Rechnungsnummer auf Lückenlosigkeit prüfen (§14 UStG)");
  suggestions.push("Leistungszeitraum explizit angeben, auch wenn identisch mit Rechnungsdatum");

  if (input.items.some((i) => i.taxRate === 0.07)) {
    suggestions.push(
      "Ermäßigter MwSt-Satz 7% — prüfe ob Leistung tatsächlich dem ermäßigten Satz unterliegt",
    );
  }

  return {
    isCompliant: violations.length === 0,
    violations,
    suggestions,
    calculatedTaxTotal: violations.length === 0 ? calculatedTaxTotal : null,
  };
}

// ─── JSON-RPC Helpers ─────────────────────────────────────────────────────────

function jsonRpcSuccess(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

// ─── MCP Method Handlers ──────────────────────────────────────────────────────

function handleInitialize(id: string | number | null) {
  return jsonRpcSuccess(id, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: CAPABILITIES,
    serverInfo: SERVER_INFO,
  });
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
  if (!p?.uri) {
    return jsonRpcError(id, -32602, "Fehlender Parameter: uri");
  }
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

function handleToolsList(id: string | number | null) {
  return jsonRpcSuccess(id, {
    tools: [
      {
        name: "frea:validate_invoice",
        description:
          "Validates a proposed invoice against German legal requirements (§14 UStG, GoBD, MwSt per line item)",
        inputSchema: {
          type: "object",
          properties: {
            clientName: { type: "string", description: "Name des Rechnungsempfängers" },
            invoiceDate: { type: "string", description: "Rechnungsdatum (YYYY-MM-DD)" },
            dueDate: { type: "string", description: "Fälligkeitsdatum (YYYY-MM-DD)" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  amount: { type: "number", minimum: 0, description: "Nettobetrag in EUR" },
                  taxRate: {
                    type: "number",
                    enum: [0.0, 0.07, 0.19],
                    description: "MwSt-Satz (0% / 7% / 19%)",
                  },
                },
                required: ["description", "amount", "taxRate"],
              },
            },
          },
          required: ["clientName", "invoiceDate", "dueDate", "items"],
        },
      },
    ],
  });
}

function handleToolsCall(id: string | number | null, params: unknown) {
  const p = params as { name?: string; arguments?: unknown } | undefined;
  if (!p?.name) {
    return jsonRpcError(id, -32602, "Fehlender Parameter: name");
  }
  if (p.name !== "frea:validate_invoice") {
    return jsonRpcError(id, -32602, `Unbekanntes Tool: ${p.name}`);
  }

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

  const result = validateInvoice(parsed.data);
  return jsonRpcSuccess(id, {
    content: [{ type: "text", text: JSON.stringify(result) }],
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /mcp/server — discovery endpoint (returns server capabilities)
mcpRoutes.get("/server", (c) => {
  return c.json({
    protocolVersion: PROTOCOL_VERSION,
    capabilities: CAPABILITIES,
    server: SERVER_INFO,
  });
});

// POST /mcp/server — JSON-RPC 2.0 endpoint (MCP Streamable HTTP transport)
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
  const method = req.method;

  try {
    switch (method) {
      case "initialize":
        return c.json(handleInitialize(id));
      case "ping":
        return c.json(jsonRpcSuccess(id, {}));
      case "resources/list":
        return c.json(handleResourcesList(id));
      case "resources/read":
        return c.json(handleResourcesRead(id, req.params));
      case "tools/list":
        return c.json(handleToolsList(id));
      case "tools/call":
        return c.json(handleToolsCall(id, req.params));
      default:
        return c.json(jsonRpcError(id, -32601, `Method not found: ${method}`), 404);
    }
  } catch (err) {
    console.error("[mcp] Unhandled error:", err);
    return c.json(jsonRpcError(id, -32603, "Internal error"), 500);
  }
});
