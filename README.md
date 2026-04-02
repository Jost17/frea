# FREA — Freelancer-Rechnungstool

Deutsches Rechnungstool für Freelancer. Läuft lokal, speichert alle Daten in SQLite und erzeugt Rechnungen gemäß §14 UStG.

## Technologiestack

- **Laufzeit:** Bun
- **Server:** Hono (Port 3114)
- **Datenbank:** SQLite über `bun:sqlite` — kein ORM, nur prepared statements
- **Frontend:** HTMX + Tailwind v4 — kein React, kein SPA
- **Validierung:** Zod

## Funktionsumfang

- **Stammdaten** — Firmenname, Bankverbindung, Steuernummer, MwSt-Satz
- **Kunden** — CRUD mit Kontaktdaten, USt-ID, Käuferreferenz
- **Projekte** — Tagessatz, Budget, Leistungsbeschreibung, Vertragsnummer
- **Zeiterfassung** — Einträge pro Projekt und Tag, abrechenbar/nicht abrechenbar
- **Rechnungen** — Automatische Nummerierung, MwSt pro Position, Status-Verlauf (Entwurf → Versendet → Bezahlt)
- **Dashboard** — KPI-Übersicht, offene Posten, Umsatz

## Compliance

- **§14 UStG** — Alle Pflichtangaben auf Rechnungen
- **MwSt pro Position** — Niemals auf der Gesamtsumme berechnen
- **GoBD** — Append-only Audit-Log, durch Trigger gegen Änderungen geschützt
- **WCAG 2.1 AA** — Barrierefreie Oberfläche, Kontrast ≥ 4.5:1, Fokusringe, semantisches HTML
- **Nur EU-Dienste** — Keine US-CDNs, keine externen Fonts, HTMX self-hosted (ADR-001)

## Schnellstart

```bash
# Abhängigkeiten installieren
bun install

# Datenbank initialisieren
bun run db:setup

# Entwicklungsserver starten (mit CSS-Watch)
bun run dev
```

Die Anwendung läuft auf `http://localhost:3114`.

## Konfiguration

Stammdaten werden über die Oberfläche unter `/einstellungen` gepflegt und in der SQLite-Datenbank gespeichert.

Optionale Umgebungsvariablen (Vorlage: `.env.example`):

```bash
# Datenbankpfad (Standard: ./data/frea.db)
FREA_DB_PATH="/custom/path/frea.db"

# Server-Port (Standard: 3114)
PORT=3114
```

## Skripte

| Befehl | Beschreibung |
|--------|-------------|
| `bun run dev` | Entwicklungsserver mit CSS-Watch |
| `bun run start` | Produktionsstart |
| `bun run db:setup` | Datenbank initialisieren |
| `bun test` | Tests ausführen |
| `bun run typecheck` | TypeScript-Typen prüfen |
| `bun run lint` | Biome-Linter |
| `bun run check` | Biome Lint + Format |

## Datenbankschema

```
settings        — Stammdaten (1 Zeile)
clients         — Kunden
projects        — Projekte (Client → Project 1:n)
time_entries    — Zeiteinträge (Project → Entry 1:n)
invoices        — Rechnungen
invoice_items   — Rechnungspositionen (MwSt pro Position)
audit_log       — GoBD Audit Trail (append-only)
```

## Projektstruktur

```
src/
  db/           — Schema, Queries, Setup
  routes/       — Hono-Routes (dashboard, clients, projects, times, invoices, settings, api)
  templates/    — HTMX-Templates (tagged template literals)
  middleware/   — Error-Handling, Security-Header, Nav-Kontext
  validation/   — Zod-Schemas
public/
  static/       — Self-hosted HTMX, Tailwind CSS
docs/
  adr/          — Architecture Decision Records
```

## Lizenz

Privat — nicht für öffentliche Nutzung freigegeben.
