type FieldType = "string" | "int" | "float" | "bool";

export function parseFormFields(
  body: FormData,
  fields: Record<string, FieldType>,
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, type] of Object.entries(fields)) {
    switch (type) {
      case "string":
        result[key] = String(body.get(key) ?? "");
        break;
      case "int":
        result[key] = parseInt(String(body.get(key) ?? "0"), 10);
        break;
      case "float":
        result[key] = parseFloat(String(body.get(key) ?? "0"));
        break;
      case "bool":
        result[key] = body.has(key) ? 1 : 0;
        break;
    }
  }
  return result;
}
