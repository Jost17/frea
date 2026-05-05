/**
 * ZUGFeRD XML Embedding in PDF
 * Konvertiert PDF zu PDF/A-3 und bettet XML ein
 */

import { execFile } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, "../../scripts");
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
 * Wirft Error falls Mustang CLI, Ghostscript oder andere Abhängigkeiten fehlen.
 */
export async function embedZUGFeRDInPDF(pdfPath: string, xmlContent: string): Promise<string> {
  const tmpSuffix = `${randomUUID()}-${process.pid}`;
  const xmlTmpPath = pdfPath.replace(/\.pdf$/, `.zugferd.${tmpSuffix}.xml`);
  const pdfA3Path = pdfPath.replace(/\.pdf$/, `.pdfa3.${tmpSuffix}.pdf`);
  const outputTmpPath = pdfPath.replace(/\.pdf$/, `.zugferd-out.${tmpSuffix}.pdf`);

  try {
    // Schritt 1: Zu PDF/A-3 konvertieren
    console.log("  → Konvertiere zu PDF/A-3...");
    try {
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
      ]);
    } catch (error) {
      console.error("Ghostscript Fehler:", error instanceof Error ? error.message : String(error));
      throw new Error("Ghostscript nicht verfügbar oder PDF-Konvertierung zu PDF/A-3 fehlgeschlagen");
    }

    // Schritt 2: ZUGFeRD XML einbetten
    console.log("  → Bette ZUGFeRD XML ein...");
    await writeFile(xmlTmpPath, xmlContent, "utf-8");

    try {
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
        "E",
        "--no-additional-attachments",
      ]);

      if (stderr) {
        console.warn("ZUGFeRD Warnungen:", stderr);
      }
    } catch (error) {
      console.error("Mustang CLI Fehler:", error instanceof Error ? error.message : String(error));
      throw new Error("Mustang CLI nicht verfügbar oder XML-Embedding fehlgeschlagen");
    }

    // Schritt 3: Outputdatei über Original kopieren
    const { rename } = await import("node:fs/promises");
    await rename(outputTmpPath, pdfPath);

    console.log(`✓ ZUGFeRD XML eingebettet: ${pdfPath}`);
    return pdfPath;
  } finally {
    // Cleanup
    await Promise.all([
      unlink(xmlTmpPath).catch(() => {}),
      unlink(pdfA3Path).catch(() => {}),
      unlink(outputTmpPath).catch(() => {}),
    ]);
  }
}
