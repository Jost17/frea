/**
 * ZUGFeRD XML Embedding in PDF
 * Konvertiert PDF zu PDF/A-3 und bettet XML ein
 */

import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, "../../../scripts");
const MUSTANG_JAR = join(SCRIPTS_DIR, "lib/Mustang-CLI.jar");

const JAVA_BIN = process.env.JAVA_HOME
  ? join(process.env.JAVA_HOME, "bin/java")
  : "/opt/homebrew/opt/openjdk/bin/java";

/**
 * Bettet ZUGFeRD XML in ein PDF ein.
 * Pipeline:
 * 1. PDF zu PDF/A-3 konvertieren (Ghostscript)
 * 2. XML via Mustang CLI einbetten
 * 3. Ergebnis über Original-Datei schreiben
 *
 * Wirft Error bei Fehler — kein Silent Fallback (Compliance-Anforderung).
 */
export async function embedZUGFeRDInPDF(pdfPath: string, xmlContent: string): Promise<void> {
  if (!existsSync(MUSTANG_JAR)) {
    throw new Error(
      `Mustang-CLI.jar nicht gefunden unter ${MUSTANG_JAR}. ` +
        "Bitte scripts/lib/Mustang-CLI.jar vendoren (Download: https://www.mustangproject.org/).",
    );
  }

  const suffix = randomUUID();
  const xmlTmpPath = `${pdfPath}.${suffix}.zugferd.xml`;
  const pdfA3Path = `${pdfPath}.${suffix}.pdfa3.pdf`;
  const outputTmpPath = `${pdfPath}.${suffix}.zugferd-out.pdf`;

  try {
    console.log("  → Konvertiere zu PDF/A-3...");
    await execFileAsync("gs", [
      "-dPDFA=3",
      "-dBATCH",
      "-dNOPAUSE",
      "-dNOOUTERSAVE",
      "-sColorConversionStrategy=UseDeviceIndependentColor",
      "-sDEVICE=pdfwrite",
      "-dPDFACompatibilityPolicy=1",
      `-sOutputFile=${pdfA3Path}`,
      pdfPath,
    ]).catch((error) => {
      throw new Error(
        `Ghostscript fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    console.log("  → Bette ZUGFeRD XML ein...");
    await writeFile(xmlTmpPath, xmlContent, "utf-8");

    const { stderr } = await execFileAsync(JAVA_BIN, [
      "-jar",
      MUSTANG_JAR,
      "--action",
      "combine",
      "--source",
      pdfA3Path,
      "--source-xml",
      xmlTmpPath,
      "--out",
      outputTmpPath,
      "--format",
      "zf",
      "--version",
      "2",
      "--profile",
      "EN16931",
      "--no-additional-attachments",
    ]).catch((error) => {
      throw new Error(
        `Mustang CLI fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    if (stderr) {
      console.warn("[zugferd-embed] Warnungen:", stderr);
    }

    const { rename } = await import("node:fs/promises");
    await rename(outputTmpPath, pdfPath);

    console.log(`✓ ZUGFeRD XML eingebettet: ${pdfPath}`);
  } finally {
    await Promise.all([
      unlink(xmlTmpPath).catch(() => {}),
      unlink(pdfA3Path).catch(() => {}),
      unlink(outputTmpPath).catch(() => {}),
    ]);
  }
}
