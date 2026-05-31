import { describe, expect, test } from "bun:test";
import { parseFormFields } from "../../src/utils/form-parser";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

describe("parseFormFields — bool (FREA-117)", () => {
  test("Checkbox aktiviert (value=1) → 1", () => {
    const result = parseFormFields(form({ kleinunternehmer: "1" }), {
      kleinunternehmer: "bool",
    });
    expect(result.kleinunternehmer).toBe(1);
  });

  test("Checkbox fehlt (unchecked) → 0", () => {
    const result = parseFormFields(form({}), { kleinunternehmer: "bool" });
    expect(result.kleinunternehmer).toBe(0);
  });

  test("explizites feld=0 (API/MCP) → 0, nicht 1 (Footgun-Regression)", () => {
    const result = parseFormFields(form({ kleinunternehmer: "0" }), {
      kleinunternehmer: "bool",
    });
    expect(result.kleinunternehmer).toBe(0);
  });

  test("explizites feld=false → 0", () => {
    const result = parseFormFields(form({ billable: "false" }), { billable: "bool" });
    expect(result.billable).toBe(0);
  });

  test("leerer String → 0", () => {
    const result = parseFormFields(form({ billable: "" }), { billable: "bool" });
    expect(result.billable).toBe(0);
  });

  test("Checkbox ohne value= sendet 'on' → 1 (billable)", () => {
    const result = parseFormFields(form({ billable: "on" }), { billable: "bool" });
    expect(result.billable).toBe(1);
  });

  test("'true' → 1", () => {
    const result = parseFormFields(form({ billable: "true" }), { billable: "bool" });
    expect(result.billable).toBe(1);
  });

  test("Garbage-Wert (no/off/2/null) → sicherer 0-Default, nicht 1", () => {
    for (const garbage of ["no", "nein", "off", "2", "null"]) {
      const result = parseFormFields(form({ kleinunternehmer: garbage }), {
        kleinunternehmer: "bool",
      });
      expect(result.kleinunternehmer).toBe(0);
    }
  });
});

describe("parseFormFields — string/int/float bleiben unverändert", () => {
  test("string nimmt rohen Wert", () => {
    expect(parseFormFields(form({ name: "Acme" }), { name: "string" }).name).toBe("Acme");
  });

  test("int parst, NaN → 0", () => {
    expect(parseFormFields(form({ n: "42" }), { n: "int" }).n).toBe(42);
    expect(parseFormFields(form({ n: "x" }), { n: "int" }).n).toBe(0);
  });

  test("float parst, NaN → 0", () => {
    expect(parseFormFields(form({ x: "3.5" }), { x: "float" }).x).toBe(3.5);
    expect(parseFormFields(form({ x: "" }), { x: "float" }).x).toBe(0);
  });
});
