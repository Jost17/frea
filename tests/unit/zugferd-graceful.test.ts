import { describe, expect, test } from "bun:test";
import { tryEmbedZugferd } from "../../src/lib/pdf/invoice-pdf";

describe("FREA-115 — ZUGFeRD-Embedding degradiert graceful", () => {
  test("tryEmbedZugferd wirft NICHT, sondern gibt false zurück, wenn das Embedding scheitert", async () => {
    // Ungültiger Pfad → die Embedding-Pipeline (Ghostscript, dann Mustang)
    // scheitert in jeder Umgebung, unabhängig davon ob das Tooling installiert
    // ist. Der getestete Kontrakt ist genau das, worauf der Aufrufer baut:
    // JEDER Embedding-Fehler endet in `false` ohne Throw — sonst bräche der
    // Aufrufer die ganze Rechnung mit 500 ab statt das valide reine PDF zu liefern.
    const result = await tryEmbedZugferd(
      "/nonexistent/frea-115-does-not-exist.pdf",
      "<xml>irrelevant</xml>",
    );
    expect(result).toBe(false);
  });
});
