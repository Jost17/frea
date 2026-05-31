import { describe, expect, test } from "bun:test";
import { tryEmbedZugferd } from "../../src/lib/pdf/invoice-pdf";

describe("FREA-115 — ZUGFeRD-Embedding degradiert graceful", () => {
  test("tryEmbedZugferd wirft NICHT, sondern gibt false zurück, wenn das Embedding scheitert", async () => {
    // Nicht-existierende Eingabedatei → Ghostscript/Mustang scheitern in jeder
    // Umgebung. Entscheidend: kein Throw (sonst würde der Aufrufer die ganze
    // Rechnung mit 500 abbrechen statt das valide reine PDF zu liefern).
    const result = await tryEmbedZugferd(
      "/nonexistent/frea-115-does-not-exist.pdf",
      "<xml>irrelevant</xml>",
    );
    expect(result).toBe(false);
  });
});
