import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  CAPABILITIES,
  LEGAL_RESOURCE_CONTENT,
  LEGAL_RESOURCE_URI,
  ONBOARDING_RESOURCE_CONTENT,
  ONBOARDING_RESOURCE_URI,
  PROTOCOL_VERSION,
  SERVER_INFO,
  handleInitialize,
  handleResourcesList,
  handleResourcesRead,
  handleToolsList,
  handleToolsCall,
  jsonRpcError,
  jsonRpcSuccess,
} from "./mcp-tools";

export const mcpRoutes = new Hono();

mcpRoutes.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Accept", "MCP-Session-Id"],
  }),
);

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
    console.error("[mcp] unhandled error in method handler:", err);
    return c.json(
      jsonRpcError(id, -32603, "Internal server error"),
      500,
    );
  }
});
