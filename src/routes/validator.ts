import { Hono } from "hono";
import { db } from "../db/schema";
import { validateZugferdPdf, validateZugferdXml } from "../lib/zugferd-validator";
import { AppError } from "../middleware/error-handler";
import { validatorRateLimit } from "../middleware/validator-rate-limit";
import {
  renderValidatorBadgeSvg,
  renderValidatorPage,
  renderValidatorResult,
} from "../templates/validator-page";

export const validatorRoutes = new Hono();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// GET /validator — Upload-Seite
validatorRoutes.get("/", (c) => {
  return c.html(renderValidatorPage());
});

// POST /validator — Datei hochladen + validieren (Rate-Limit: 10/Min/IP)
validatorRoutes.post("/", validatorRateLimit, async (c) => {
  let body: FormData;
  try {
    body = await c.req.formData();
  } catch {
    throw new AppError("Ungültiger Datei-Upload", 400);
  }

  const file = body.get("rechnung");
  if (!file || !(file instanceof File)) {
    throw new AppError("Keine Datei hochgeladen. Bitte wählen Sie eine PDF- oder XML-Datei.", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(
      `Datei zu groß (max. 10 MB). Ihre Datei hat ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
      413,
    );
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (!name.endsWith(".xml") && !name.endsWith(".pdf")) {
    throw new AppError("Nur PDF- (.pdf) oder XML-Dateien (.xml) werden akzeptiert.", 415);
  }

  const report = name.endsWith(".xml")
    ? validateZugferdXml(Buffer.from(buffer).toString("utf-8"))
    : validateZugferdPdf(buffer);

  // Ergebnis in DB speichern (kein PDF, nur Report)
  const id = crypto.randomUUID();
  db.run(
    `INSERT INTO validator_results (id, profile, score, is_valid, issues_json, file_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      report.profile,
      report.score,
      report.isValid ? 1 : 0,
      JSON.stringify(report.issues),
      file.name,
    ],
  );

  // Alte Ergebnisse > 7 Tage löschen (DSGVO: Minimalprinzip)
  db.run(`DELETE FROM validator_results WHERE created_at < datetime('now', '-7 days')`);

  return c.redirect(`/validator/${id}`, 303);
});

// GET /validator/:id — Ergebnis-Permalink
validatorRoutes.get("/:id", (c) => {
  const { id } = c.req.param();
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError("Ungültige Ergebnis-ID", 400);

  const row = db
    .query<
      {
        id: string;
        profile: string;
        score: number;
        is_valid: number;
        issues_json: string;
        file_name: string;
        created_at: string;
      },
      [string]
    >(
      `SELECT id, profile, score, is_valid, issues_json, file_name, created_at
       FROM validator_results WHERE id = ?`,
    )
    .get(id);

  if (!row)
    throw new AppError("Ergebnis nicht gefunden oder abgelaufen (7 Tage Aufbewahrung).", 404);

  const issues = JSON.parse(row.issues_json);
  return c.html(
    renderValidatorResult({
      id: row.id,
      profile: row.profile as never,
      score: row.score,
      isValid: row.is_valid === 1,
      issues,
      fileName: row.file_name,
      createdAt: row.created_at,
    }),
  );
});

// GET /validator/:id/badge.svg — OG/Share-Badge als SVG
validatorRoutes.get("/:id/badge.svg", (c) => {
  const { id } = c.req.param();
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError("Ungültige ID", 400);

  const row = db
    .query<{ score: number; is_valid: number; profile: string }, [string]>(
      `SELECT score, is_valid, profile FROM validator_results WHERE id = ?`,
    )
    .get(id);

  if (!row) throw new AppError("Ergebnis nicht gefunden", 404);

  c.header("Content-Type", "image/svg+xml");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(renderValidatorBadgeSvg(row.score, row.is_valid === 1, row.profile));
});
