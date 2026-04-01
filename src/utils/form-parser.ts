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
      case "bool":
        result[key] = body.has(key) ? 1 : 0;
        break;
    }
  }
  return result;
}
