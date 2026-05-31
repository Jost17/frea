type FieldType = "string" | "int" | "float" | "bool";

export function parseFormFields(
  body: FormData,
  fields: Record<string, FieldType>,
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, type] of Object.entries(fields)) {
    const raw = body.get(key);
    switch (type) {
      case "string":
        result[key] = typeof raw === "string" ? raw : "";
        break;
      case "int": {
        const parsed = parseInt(typeof raw === "string" ? raw : "", 10);
        result[key] = Number.isNaN(parsed) ? 0 : parsed;
        break;
      }
      case "float": {
        const parsed = parseFloat(typeof raw === "string" ? raw : "");
        result[key] = Number.isNaN(parsed) ? 0 : parsed;
        break;
      }
      case "bool": {
        // Checkboxen senden nur bei Aktivierung (value="1"); fehlt der Key → 0.
        // API/MCP-Clients können den Key aber explizit mit "0"/"false"/"" senden —
        // body.has() allein würde das fälschlich als true werten (FREA-117-Footgun).
        if (!body.has(key)) {
          result[key] = 0;
          break;
        }
        const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
        result[key] = value === "0" || value === "false" || value === "" ? 0 : 1;
        break;
      }
    }
  }
  return result;
}
