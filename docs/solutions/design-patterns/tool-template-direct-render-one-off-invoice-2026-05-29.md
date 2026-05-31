---
title: "Tool-Template direkt rendern für eine Einmal-Ausgabe (ohne Tool-/DB-Änderung) + ZUGFeRD-Verify"
date: 2026-05-29
category: design-patterns
module: freelancer_tool
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - "Einmaliges Artefakt (PDF) im exakten Tool-Layout nötig, mit Abweichungen die der reguläre Flow erzwingt"
  - "Kein Tool-DB-Eintrag gewünscht (keine Rechnungsnummer, kein Audit-Log, kein Status)"
  - "Tool rendert über eigenes Template + exportierte Format-Funktionen (Mustache, ZUGFeRD-Embed)"
  - "Computed Felder (Kalenderwochen-Grenzen, hartkodierte Anrede) weichen für den Einzelfall ab"
related_components:
  - service_object
  - documentation
tags:
  - invoice
  - zugferd
  - mustache-template
  - one-off-render
  - din5008
  - no-db-mutation
  - in-memory-override
  - e-invoice
---

# Tool-Template direkt rendern für eine Einmal-Ausgabe (ohne Tool-/DB-Änderung) + ZUGFeRD-Verify

## Context

In Tools mit automatisiertem Generator (z. B. Rechnungs-PDF aus DB) gibt es Einzelfälle, in denen genau **ein Artefakt** im exakten Layout des Tools gebraucht wird, aber mit Abweichungen, die der reguläre Tool-Flow erzwingt und nicht zulässt: hartkodierte Anrede (`Sehr geehrte Damen und Herren,`), computed Felder (Wochengruppierung via `getWeekBounds()` → Mo–So statt echter Arbeitstage), erzwungene Zeilen (Leistungszeitraum-Block) oder DB-Seiteneffekte (`next_invoice_number`-Increment, Audit-Log).

Konkreter Anlassfall (2026-05-29): Eine echte Kundenrechnung (`stp-2026-0113`, Drive Agile GmbH) sollte im DIN-5008-Layout des `freelancer_tool` erzeugt werden — mit persönlicher Anrede (`Lieber Mirco,`), korrekten Arbeitstagen (26.05.–29.05.) statt der vom Generator berechneten KW-Grenzen (25.–31.05.), und ohne den Leistungszeitraum-Block. Es war **kein** DB-Eintrag gewünscht (keine vergebene Rechnungsnummer, kein Audit-Log) — nur das fertige PDF, optisch 1:1 zur Vorgänger-Rechnung `0112`.

Der naheliegende Reflex (Tool-Code patchen, DB-Row anlegen und nachträglich editieren, oder ein Template forken) ist hier teurer und riskanter als nötig.

> **Tool-Hinweis:** Dieses Pattern bezieht sich auf das **alte `freelancer_tool`** (Mustache-Template `src/templates/invoice-pdf.html`). Das neue **FREA** (`frea_freelancer`) baut das Invoice-HTML **programmatisch** in TypeScript (`src/lib/pdf/invoice-html.ts`), hat also kein `.mustache`-Template — der „String/Regex-in-memory-Replace"-Trick greift dort nicht 1:1, das Prinzip (Tool-Assets/-Funktionen out-of-band wiederverwenden, nur das Delta überschreiben) bleibt aber gültig. Die ZUGFeRD-Pipeline (Ghostscript → PDF/A-3 → Mustang-CLI.jar) ist in beiden Tools identisch.

## Guidance

**Pattern: Template-Direkt-Render mit gezielten in-memory-Overrides.** Lade die tool-eigenen Template- und CSS-Assets in ein Wegwerf-Skript und render selbst — ohne Tool-Code oder DB anzufassen.

1. **Skript im Tool-Verzeichnis ablegen**, damit `node_modules` (`mustache`, `puppeteer`) auflösen. Assets per `readFile` laden:
   ```js
   const template = await readFile("src/templates/invoice-pdf.html", "utf8");
   const baseCss  = await readFile("src/templates/partials/din5008-base.css", "utf8");
   ```

2. **CSS so injizieren wie der echte Generator**, dann hartkodierte Stellen in-memory überschreiben:
   ```js
   let html = template.replace("/* {{BASE_CSS}} */", baseCss);
   html = html.replace("Sehr geehrte Damen und Herren,", "Lieber Mirco,");
   // ganze Zeile/Block via Regex entfernen:
   html = html.replace(
     /<div class="service-period-info">\s*Leistungszeitraum:[\s\S]*?<\/div>/,
     ""
   );
   ```

3. **Alle Template-Felder selbst füllen** (Werte aus der Referenz-Rechnung übernehmen). **Computed Felder NICHT der Live-Berechnung überlassen** — per Hand setzen, wo der Generator anders rechnen würde:
   ```js
   lineItems: [{ /* ... */ periodFormatted: "26.05.2026 - 29.05.2026" }]
   // Generator würde getWeekBounds() nutzen → 25.–31.05. (Mo–So) statt echter Arbeitstage
   ```

4. **Render via `Mustache.render` + Puppeteer** ins Zielverzeichnis:
   ```js
   const out = Mustache.render(html, data);
   const browser = await puppeteer.launch({ headless: "shell" });
   const page = await browser.newPage();
   await page.setContent(out, { waitUntil: "networkidle0" });
   await page.pdf({ path: target, format: "A4", margin: { top: 0, right: 0, bottom: 0, left: 0 } });
   ```

5. **HTML-Whitespace-Kollaps bewusst nutzen**: Mehrfach-Spaces kollabieren — ein leerer Projektname ergibt `"2605 KW 22 ..."` statt `"2605  KW 22 ..."`. Kein Bug, sondern nutzbares Verhalten.

### ZUGFeRD-Gotcha (kritisch — NIE annehmen, das PDF sei valide)

Ein Direkt-Render lässt das ZUGFeRD-XML **weg** → das PDF ist **keine gültige E-Rechnung**.

- **Immer verifizieren** (und gegen die Referenz-PDF gegenchecken):
  ```bash
  grep -a -E "EmbeddedFile|factur-x|CrossIndustryInvoice|pdfaid|urn:cen.eu" datei.pdf
  ```
  Im Anlassfall hatte die Referenz (`0112`) `EmbeddedFile`, der erste `0113`-Render **nicht**.

- **Nachholen via exportierte Tool-Funktionen** (rekonstruieren plain Objekte mit exakt den gelesenen Feldern):
  ```js
  const data = buildZUGFeRDData(invoice, client, project, settings, weekGroups);
  const xml  = generateZUGFeRDXML(data);
  await embedZUGFeRDInPDF(pdfPath, xml);
  ```

- **Abhängigkeiten** für den ZUGFeRD-/PDF/A-3-Pfad:
  - **Java** (Fallback-Pfad im Code `/opt/homebrew/opt/openjdk/bin/java`; `JAVA_HOME` überschreibt)
  - **Ghostscript** `gs` (PDF/A-3-Konvertierung)
  - **`scripts/lib/Mustang-CLI.jar`** (~58 MB)
  - Die PDF/A-3-Konvertierung **rendert das PDF neu** — Layout bleibt erhalten, aber **visuell prüfen**.

## Why This Matters

- **Kein DB-Schaden für ein Wegwerf-Artefakt:** Der reguläre Flow vergibt eine echte `next_invoice_number` und schreibt ins (trigger-geschützte, append-only) Audit-Log. Für eine einmalige PDF willst du beides **nicht** — der Direkt-Render hat null DB-Seiteneffekte.
- **Layout-Treue ohne Fork:** Du nutzt exakt das produktive Template + CSS. Kein paralleles Template, das driftet (Read-Path-/Parallel-Datastore-Falle auf Asset-Ebene).
- **Gezielte Abweichung statt Tool-Verbiegung:** Computed Felder (`getWeekBounds()`, Anrede) sind im Generator hartverdrahtet. Sie für einen Einzelfall im Tool konfigurierbar zu machen wäre Over-Engineering für genau eine Rechnung.
- **ZUGFeRD ist ein stiller Read-Path-Fehler:** Ein PDF, das *aussieht* wie eine E-Rechnung, aber kein `EmbeddedFile` enthält, ist ununterscheidbar von einem validen — bis der Empfänger es ablehnt. `[]==[]`-Invisibilität: „PDF da" ≠ „E-Rechnung valide". Der `grep`-Gegencheck gegen die Referenz ist der Round-trip-Eval.

## When to Apply

**Anwenden, wenn ALLE zutreffen:**
- Das **Artefakt** (PDF/Datei) ist das Ziel — **kein** Tool-DB-Eintrag wird gebraucht (keine Nummer, kein Audit-Log, kein Status).
- Der Tool-Generator **erzwingt computed Felder** (Wochengruppierung, Anrede, Pflicht-Blöcke), die für diesen Einzelfall abweichen müssen.
- Es ist ein **Einzelfall** (one-shot), nicht ein wiederkehrender Bedarf.

**NICHT anwenden, wenn:**
- Ein **DB-Eintrag gebraucht wird** (echte Rechnungsnummer, Audit-Trail, Status-Pipeline) → regulärer Tool-Flow, ggf. Feature ergänzen.
- Der Bedarf **wiederkehrt** → dann ist es ein Feature (Anrede-Override, manueller Leistungszeitraum) im Tool, kein Skript.
- Die Abweichung **rechtlich relevant** ist und persistiert werden muss.

**Trade-off explizit benennen:** Der Direkt-Render umgeht bewusst `next_invoice_number`-Increment und Audit-Log. Das ist der Vorteil (kein Schaden) UND die Grenze (kein Nachweis im Tool) — vor dem Lauf bestätigen, dass kein DB-Zustand gewünscht ist.

## Examples

**Anlassfall (Rechnung 0113, „Lieber Mirco"):**

| Aspekt | Tool-Default (Generator) | Override im Direkt-Render |
|---|---|---|
| Anrede | `Sehr geehrte Damen und Herren,` | `Lieber Mirco,` (string-replace) |
| Leistungszeitraum | `<div class="service-period-info">…</div>` | entfernt (Regex-replace) |
| `periodFormatted` | `getWeekBounds()` → 25.–31.05. (Mo–So) | `"26.05.2026 - 29.05.2026"` (echte Arbeitstage) |
| Projektname | DB-Wert | leer → `"2605 KW 22 …"` (Whitespace-Kollaps) |
| `next_invoice_number` | inkrementiert | **kein** Increment |
| Audit-Log | Append-Row | **kein** Eintrag |
| ZUGFeRD-XML | eingebettet | **fehlt initial** → nachgeholt (siehe unten) |

**ZUGFeRD-Verify + Nachhol-Sequenz:**
```bash
# 1. Verify (Referenz vs. neuer Render)
grep -a -E "EmbeddedFile|factur-x|CrossIndustryInvoice|pdfaid|urn:cen.eu" 0112.pdf   # → EmbeddedFile ✓
grep -a -E "EmbeddedFile|factur-x|CrossIndustryInvoice|pdfaid|urn:cen.eu" 0113.pdf   # → leer ✗  → nachholen
```
```js
// 2. Nachholen mit exportierten Tool-Funktionen
const data = buildZUGFeRDData(invoice, client, project, settings, weekGroups);
const xml  = generateZUGFeRDXML(data);
await embedZUGFeRDInPDF("0113.pdf", xml);
```
```bash
# 3. Re-Verify + visuelle Layout-Prüfung (PDF/A-3-Konvertierung hat neu gerendert)
grep -a -E "EmbeddedFile|factur-x|CrossIndustryInvoice" 0113.pdf   # → EmbeddedFile ✓
```

## Related

**Nebenbefunde aus derselben Session (FREA als Test, GitHub-Issues `Jost17/frea`):**
- **#115** — PDF/ZUGFeRD-Export schlägt für USt-Rechnungen fehl, `Mustang-CLI.jar` fehlt in FREA (`src/scripts/lib/` existiert nicht) → HTTP 500; Kleinunternehmer-Rechnungen rendern (überspringen Embedding).
- **#116** — USt-Behandlung wird beim PDF-Render **live aus Settings** gelesen statt auf der Rechnung eingefroren → inkonsistentes PDF (MwSt 0,00 + USt-inklusiver Brutto + §19-Notiz). Direkt verwandt mit dem „nie computed Felder live neu ableiten"-Prinzip dieses Patterns.
- **#117** — `parseFormFields` bool über `body.has(key)` → `feld=0` wird `true` (nur Weglassen = false). API-Footgun (`src/utils/form-parser.ts`).

**Bestehende FREA-Docs / Issues (angrenzend):**
- `docs/solutions/security-issues/multi-agent-review-host-spoofing-iban-validation.md` — teilt die Dateien `src/utils/form-parser.ts`, `src/db/invoice-queries.ts`, CSRF; anderes Thema (Host-Spoofing/IBAN).
- `docs/solutions/architecture/scaffold-review-patterns.md` — Render-/Template-Layer + `hono/csrf`; Review-Patterns, kein ZUGFeRD.
- **#48 / FREA-155** — ZUGFeRD-Schema-Validierung gegen Mustangproject vor erster Live-Rechnung (Companion zur „Verify"-Hälfte). PR **#37 / FREA-154** = bestehende ZUGFeRD-2.1-Implementierungs-Baseline.

**CLAUDE.md-Prinzipien, die hier instanziiert sind:**
- *Read-Pfade müssen auf die echte Source-of-Truth zeigen:* Der ZUGFeRD-`grep`-Gegencheck ist der Round-trip-Eval auf Artefakt-Ebene — „PDF existiert" ist eine Diagnose-Metrik, kein Beweis der Validität.
- *Ceremony an Komplexität anpassen / Via Negativa:* Einzelfall-Artefakt → Wegwerf-Skript statt Tool-Feature/DB-Migration; produktive Assets wiederverwenden, nur das Delta überschreiben.

**Programmatischer FREA-API-Zugriff (Gotchas beim Anlegen via curl/Skript):**
- `csrf()`-Middleware verlangt passenden `Origin`-Header bei POSTs (sonst 500).
- `parseFormFields` bool = `body.has(key)` → `feld=0` wird true (siehe #117).
- `settings.smtp_port` hat `min(1)`; fehlendes int wird zu 0 → 422 (alle SMTP-Felder gültig mitsenden oder Feld weglassen).

**Tool-Internals (altes Tool):** `src/templates/invoice-pdf.html`, `src/templates/partials/din5008-base.css`, exportierte Funktionen `buildZUGFeRDData` / `generateZUGFeRDXML` / `embedZUGFeRDInPDF`, `scripts/lib/Mustang-CLI.jar`. **FREA-Pendant:** `src/lib/pdf/invoice-html.ts` (programmatisch), `src/lib/pdf/zugferd-embed.ts`, `src/lib/zugferd-generator.ts`.
