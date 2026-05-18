import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { Hono } from "hono";
import { html } from "hono/html";
import {
  checkDbIntegrity,
  getClientDsrData,
  pseudonymizeClient,
  walCheckpoint,
} from "../db/backup-queries";
import { getAllActiveClients, getClient } from "../db/queries";
import { DB_PATH } from "../db/schema";
import type { AppEnv } from "../env";
import { AppError, logAndRespond } from "../middleware/error-handler";
import { Layout } from "../templates/layout";

export const datenschutzRoutes = new Hono<AppEnv>();

const RESTORE_PENDING_PATH = DB_PATH.replace(/\.db$/, ".db.restore");

// ─── Übersichtsseite ──────────────────────────────────────────────────────────

datenschutzRoutes.get("/", (c) => {
  const overdueCount = c.get("overdueCount");
  const integrity = checkDbIntegrity();
  const restorePending = existsSync(RESTORE_PENDING_PATH);

  return c.html(
    Layout({
      title: "Datenschutz & Backup",
      activeNav: "datenschutz",
      overdueCount,
      children: html`
        <div class="max-w-2xl space-y-8">
          <div>
            <h1 class="text-2xl font-semibold">Datenschutz &amp; Backup</h1>
            <p class="mt-1 text-sm text-text-secondary">
              Datensicherung, Wiederherstellung und DSGVO-Auskunft/Löschung.
            </p>
          </div>

          ${
            restorePending
              ? html`
                  <div class="rounded-lg border border-amber-200 bg-amber-50 p-4" role="alert">
                    <p class="text-sm font-medium text-amber-900">
                      ⚠ Wiederherstellung ausstehend — starte FREA neu, um das Backup anzuwenden.
                    </p>
                  </div>
                `
              : ""
          }

          <!-- Backup / Restore -->
          <section class="rounded-lg border border-border-subtle bg-bg-surface p-6 space-y-6">
            <div>
              <h2 class="text-lg font-semibold">Datensicherung (Backup)</h2>
              <p class="mt-1 text-sm text-text-secondary">
                Lädt die vollständige SQLite-Datenbank herunter. Sichere diese Datei regelmäßig an einem sicheren Ort.
              </p>
              <p class="mt-1 text-xs text-text-muted">
                Datenbankstatus: <span class="${integrity === "ok" ? "text-green-700 font-medium" : "text-red-700 font-medium"}">${integrity === "ok" ? "✓ Integrität OK" : `⚠ ${integrity}`}</span>
              </p>
            </div>
            <a
              href="/datenschutz/backup"
              class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <i data-lucide="download" class="h-4 w-4"></i>
              Backup herunterladen
            </a>

            <hr class="border-border-subtle" />

            <div>
              <h3 class="text-base font-semibold">Wiederherstellung (Restore)</h3>
              <p class="mt-1 text-sm text-text-secondary">
                Lade eine zuvor gesicherte Datenbank hoch. Die Datei wird auf Integrität geprüft.
                Nach dem Hochladen muss FREA neu gestartet werden.
              </p>
              <div class="mt-1 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <strong>Achtung:</strong> Die aktuelle Datenbank wird dabei überschrieben.
                Erstelle vorher ein Backup.
              </div>
            </div>
            <form
              method="post"
              action="/datenschutz/restore"
              enctype="multipart/form-data"
              class="flex items-end gap-3"
            >
              <div>
                <label for="restore-file" class="block text-sm font-medium text-text-primary mb-1">
                  Backup-Datei (.db)
                </label>
                <input
                  type="file"
                  id="restore-file"
                  name="backup"
                  accept=".db"
                  required
                  class="block text-sm text-text-secondary file:mr-3 file:rounded file:border-0 file:bg-bg-surface-raised file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-primary hover:file:bg-bg-surface-raised"
                />
              </div>
              <button
                type="submit"
                class="rounded-md border border-border-subtle bg-bg-surface-raised px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface"
              >
                Wiederherstellen
              </button>
            </form>
          </section>

          <!-- DSGVO-DSR -->
          <section class="rounded-lg border border-border-subtle bg-bg-surface p-6 space-y-4">
            <div>
              <h2 class="text-lg font-semibold">DSGVO — Betroffenenrechte (Art. 15/17)</h2>
              <p class="mt-1 text-sm text-text-secondary">
                Datenauskunft und Löschung für einzelne Kunden gemäß DSGVO.
              </p>
            </div>

            <a
              href="/datenschutz/dsr"
              class="inline-flex items-center gap-2 rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-raised"
            >
              <i data-lucide="shield" class="h-4 w-4"></i>
              Kunden-Datenverwaltung öffnen
            </a>

            <div class="rounded bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
              <strong>GoBD-Hinweis:</strong> Rechnungen und der Audit-Log unterliegen der
              gesetzlichen Aufbewahrungspflicht (§147 AO, 10 Jahre). Sie können gemäß
              Art. 17 Abs. 3 lit. b DSGVO nicht gelöscht werden. Kundenstammdaten werden
              pseudonymisiert.
            </div>
          </section>
        </div>
      `,
    }),
  );
});

// ─── Backup Download ──────────────────────────────────────────────────────────

datenschutzRoutes.get("/backup", (c) => {
  try {
    walCheckpoint();

    const file = Bun.file(DB_PATH);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `frea-backup-${date}.db`;

    return new Response(file, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return logAndRespond(c, err, "Backup konnte nicht erstellt werden", 500);
  }
});

// ─── Restore Upload ───────────────────────────────────────────────────────────

datenschutzRoutes.post("/restore", async (c) => {
  try {
    const body = await c.req.formData();
    const file = body.get("backup");

    if (!file || !(file instanceof File)) {
      throw new AppError("Keine Datei hochgeladen", 400);
    }
    if (!file.name.endsWith(".db")) {
      throw new AppError("Ungültiges Dateiformat — nur .db-Dateien erlaubt", 400);
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength < 100) {
      throw new AppError("Datei zu klein — keine gültige SQLite-Datenbank", 400);
    }

    // Write to temp path for validation
    const tmpPath = DB_PATH.replace(/\.db$/, ".db.tmp_upload");
    await Bun.write(tmpPath, buffer);

    let validationError: string | null = null;
    try {
      const tmpDb = new Database(tmpPath, { readonly: true });
      const check = tmpDb.query<{ integrity_check: string }, []>("PRAGMA integrity_check").get();
      tmpDb.close();
      if (check?.integrity_check !== "ok") {
        validationError = `Integritätsprüfung fehlgeschlagen: ${check?.integrity_check ?? "unbekannt"}`;
      }
    } catch (err) {
      validationError = `Datei ist keine gültige SQLite-Datenbank: ${err instanceof Error ? err.message : String(err)}`;
    }

    // Remove temp file regardless
    try {
      const { unlinkSync } = require("node:fs");
      unlinkSync(tmpPath);
    } catch {
      // temp cleanup failure is non-fatal
    }

    if (validationError) {
      throw new AppError(validationError, 422);
    }

    // Save as pending restore
    await Bun.write(RESTORE_PENDING_PATH, buffer);

    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Wiederherstellung vorbereitet",
        activeNav: "datenschutz",
        overdueCount,
        children: html`
          <div class="max-w-lg">
            <div class="rounded-lg border border-green-200 bg-green-50 p-6 space-y-3">
              <h1 class="text-lg font-semibold text-green-900">✓ Backup validiert</h1>
              <p class="text-sm text-green-800">
                Das Backup wurde erfolgreich geprüft und ist bereit zur Wiederherstellung.
              </p>
              <p class="text-sm text-green-800 font-medium">
                Starte FREA jetzt neu — die Datenbank wird beim nächsten Start automatisch
                wiederhergestellt.
              </p>
            </div>
            <a href="/datenschutz" class="mt-4 inline-block text-sm text-primary hover:underline">
              ← Zurück zur Übersicht
            </a>
          </div>
        `,
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Wiederherstellung fehlgeschlagen", 500);
  }
});

// ─── DSR Kundenauswahl ────────────────────────────────────────────────────────

datenschutzRoutes.get("/dsr", (c) => {
  const overdueCount = c.get("overdueCount");
  const clients = getAllActiveClients();

  return c.html(
    Layout({
      title: "DSGVO Betroffenenrechte",
      activeNav: "datenschutz",
      overdueCount,
      children: html`
        <div class="max-w-2xl space-y-6">
          <div>
            <a href="/datenschutz" class="text-sm text-primary hover:underline">← Datenschutz</a>
            <h1 class="mt-2 text-2xl font-semibold">Betroffenenrechte (Art. 15/17 DSGVO)</h1>
            <p class="mt-1 text-sm text-text-secondary">
              Wähle einen Kunden für Datenauskunft oder Pseudonymisierung.
            </p>
          </div>

          ${
            clients.length === 0
              ? html`<p class="text-sm text-text-muted">Keine aktiven Kunden vorhanden.</p>`
              : html`
                  <ul class="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-bg-surface">
                    ${clients.map(
                      (client) => html`
                        <li class="flex items-center justify-between px-4 py-3">
                          <div>
                            <span class="text-sm font-medium text-text-primary">${client.name}</span>
                            ${client.email ? html`<span class="ml-2 text-xs text-text-muted">${client.email}</span>` : ""}
                          </div>
                          <a
                            href="/datenschutz/dsr/${client.id}"
                            class="text-sm text-primary hover:underline"
                          >
                            Verwalten →
                          </a>
                        </li>
                      `,
                    )}
                  </ul>
                `
          }
        </div>
      `,
    }),
  );
});

// ─── DSR Detailseite ──────────────────────────────────────────────────────────

datenschutzRoutes.get("/dsr/:id", (c) => {
  try {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) throw new AppError("Ungültige Kunden-ID", 400);

    const client = getClient(id);
    if (!client) throw new AppError("Kunde nicht gefunden", 404);

    const overdueCount = c.get("overdueCount");

    return c.html(
      Layout({
        title: `DSR: ${client.name}`,
        activeNav: "datenschutz",
        overdueCount,
        children: html`
          <div class="max-w-2xl space-y-6">
            <div>
              <a href="/datenschutz/dsr" class="text-sm text-primary hover:underline">← Kundenauswahl</a>
              <h1 class="mt-2 text-2xl font-semibold">
                DSGVO-Verwaltung: ${client.name}
              </h1>
            </div>

            <!-- Datenauskunft (Art. 15) -->
            <section class="rounded-lg border border-border-subtle bg-bg-surface p-6 space-y-3">
              <h2 class="text-base font-semibold">Datenauskunft (Art. 15 DSGVO)</h2>
              <p class="text-sm text-text-secondary">
                Exportiert alle zu diesem Kunden gespeicherten personenbezogenen Daten
                als maschinenlesbare JSON-Datei.
              </p>
              <form method="post" action="/datenschutz/dsr/${id}/export">
                <button
                  type="submit"
                  class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  <i data-lucide="download" class="h-4 w-4"></i>
                  Daten exportieren (JSON)
                </button>
              </form>
            </section>

            <!-- Löschung / Pseudonymisierung (Art. 17) -->
            <section class="rounded-lg border border-red-200 bg-red-50 p-6 space-y-3">
              <h2 class="text-base font-semibold text-red-900">Löschung (Art. 17 DSGVO)</h2>
              <p class="text-sm text-red-800">
                Pseudonymisiert alle personenbezogenen Daten dieses Kunden. Der Datensatz
                wird archiviert, alle Felder mit personenbezogenen Daten werden überschrieben.
              </p>
              <div class="rounded bg-white border border-red-200 px-3 py-2 text-xs text-red-700">
                <strong>Was bleibt erhalten (GoBD-Pflicht):</strong>
                Rechnungen, Zahlungsbeträge, Steuerdaten und der Audit-Log werden gemäß
                §147 AO für 10 Jahre aufbewahrt. Dies ist nach Art. 17 Abs. 3 lit. b DSGVO
                zulässig.
              </div>
              <form
                method="post"
                action="/datenschutz/dsr/${id}/pseudonymize"
                onsubmit="return confirm('Kundendaten für ${client.name} unwiderruflich pseudonymisieren? Diese Aktion kann nicht rückgängig gemacht werden.')"
              >
                <button
                  type="submit"
                  class="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <i data-lucide="trash-2" class="h-4 w-4"></i>
                  Kundendaten pseudonymisieren
                </button>
              </form>
            </section>
          </div>
        `,
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "DSR-Seite konnte nicht geladen werden", 500);
  }
});

// ─── DSR Export (POST → JSON Download) ───────────────────────────────────────

datenschutzRoutes.post("/dsr/:id/export", (c) => {
  try {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) throw new AppError("Ungültige Kunden-ID", 400);

    const data = getClientDsrData(id);
    if (!data) throw new AppError("Kunde nicht gefunden", 404);

    const clientName = (data.client.name as string).replace(/[^a-z0-9äöüß]/gi, "_").slice(0, 40);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `dsr-export-${clientName}-${date}.json`;

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Datenexport fehlgeschlagen", 500);
  }
});

// ─── DSR Pseudonymisierung ────────────────────────────────────────────────────

datenschutzRoutes.post("/dsr/:id/pseudonymize", (c) => {
  try {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) throw new AppError("Ungültige Kunden-ID", 400);

    const result = pseudonymizeClient(id);
    if (!result.success) {
      throw new AppError(result.reason ?? "Pseudonymisierung fehlgeschlagen", 422);
    }

    const overdueCount = c.get("overdueCount");
    return c.html(
      Layout({
        title: "Pseudonymisierung abgeschlossen",
        activeNav: "datenschutz",
        overdueCount,
        children: html`
          <div class="max-w-lg space-y-4">
            <div class="rounded-lg border border-green-200 bg-green-50 p-6">
              <h1 class="text-lg font-semibold text-green-900">✓ Kundendaten pseudonymisiert</h1>
              <p class="mt-2 text-sm text-green-800">
                Alle personenbezogenen Daten des Kunden wurden gelöscht. Rechnungen und
                Audit-Log-Einträge bleiben gemäß GoBD (§147 AO) aufbewahrt.
              </p>
            </div>
            <a href="/datenschutz/dsr" class="text-sm text-primary hover:underline">
              ← Zurück zur Kundenauswahl
            </a>
          </div>
        `,
      }),
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    return logAndRespond(c, err, "Pseudonymisierung fehlgeschlagen", 500);
  }
});
