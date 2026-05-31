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
        // Aktivierte Checkbox sendet value="1" (kleinunternehmer) bzw. "on"
        // (billable, ohne value=-Attribut); unchecked → Key fehlt → 0.
        // Allowlist statt Blocklist: unbekannte/Garbage-Werte von API/MCP-Clients
        // defaulten sicher auf 0 statt fälschlich auf 1 (FREA-117). Wichtig, weil
        // kleinunternehmer die USt-Behandlung jeder Rechnung bestimmt — der falsche
        // Default wäre billing-relevant. Nutzt body.get() (erster Wert) → bewusst
        // inkompatibel mit dem hidden+checkbox-Pattern.
        const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
        result[key] = value === "1" || value === "true" || value === "on" ? 1 : 0;
        break;
      }
    }
  }
  return result;
}
