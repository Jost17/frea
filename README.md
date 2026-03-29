# FREA — Freelancer Invoicing Tool

German freelancer invoicing tool. Runs locally, stores everything in SQLite, generates §14 UStG-compliant invoices.

## Stack

- **Runtime:** Bun
- **Server:** Hono (Port 3114)
- **DB:** SQLite via `bun:sqlite` — kein ORM, prepared statements
- **Frontend:** HTMX + Tailwind v4 — kein React, kein SPA
- **Validation:** Zod

## Features

- **Stammdaten** — Unternehmensname, Bankverbindung, Steuernummer, MwSt-Satz
- **Kunden** — CRUD mit Kontaktdaten, USt-ID, Käuferreferenz
- **Projekte** — Tagessatz, Budget, Leistungsbeschreibung, Vertragsnummer
- **Zeiterfassung** — Einträge pro Projekt und Tag, abrechenbar/nicht abrechenbar
- **Rechnungen** — Automatische Nummerierung, MwSt pro Position, Status-Tracking (Entwurf → Versendet → Bezahlt)
- **Dashboard** — KPI-Übersicht, offene Posten, Umsatz

## Compliance

- **§14 UStG** — Alle Pflichtangaben auf Rechnungen
- **MwSt per Position** — Niemals auf Gesamtsumme berechnen
- **GoBD** — Append-only Audit Log, trigger-geschützt gegen Änderungen
- **WCAG 2.1 AA** — Barrierefreie UI, Kontrast ≥ 4.5:1, Fokusringe, semantisches HTML
- **EU-only** — Keine US-CDNs, keine externen Fonts, HTMX self-hosted (ADR-001)

## Quickstart

```bash
# Dependencies installieren
bun install

# Datenbank initialisieren
bun run db:setup

# Entwicklungsserver starten (mit CSS-Watch)
bun run dev
```

App läuft auf `http://localhost:3114`.

## Konfiguration

Stammdaten werden über die UI unter `/einstellungen` gepflegt und in der SQLite-Datenbank gespeichert.

Optionale Umgebungsvariablen (Vorlage: `.env.example`):

```bash
# DB-Pfad (Standard: ./data/frea.db)
FREA_DB_PATH="/custom/path/frea.db"

# Server-Port (Standard: 3114)
PORT=3114
```

## Scripts

| Befehl | Beschreibung |
|--------|-------------|
| `bun run dev` | Entwicklungsserver mit CSS-Watch |
| `bun run start` | Produktionsstart |
| `bun run db:setup` | Datenbank initialisieren |
| `bun test` | Tests ausführen |
| `bun run typecheck` | TypeScript-Typen prüfen |
| `bun run lint` | Biome Linter |
| `bun run check` | Biome Lint + Format |

## DB-Schema

```
settings        — Stammdaten (1 Zeile)
clients         — Kunden
projects        — Projekte (Client → Project 1:n)
time_entries    — Zeiteinträge (Project → Entry 1:n)
invoices        — Rechnungen
invoice_items   — Rechnungspositionen (MwSt pro Position)
audit_log       — GoBD Audit Trail (append-only)
```

## Entwicklung

```
src/
  db/           — Schema, Queries, Setup
  routes/       — Hono-Routes (dashboard, clients, projects, times, invoices, settings, api)
  templates/    — HTMX-Templates (tagged template literals)
  middleware/   — Error handling, Security headers, Nav context
  validation/   — Zod-Schemas
public/
  static/       — Self-hosted HTMX, Tailwind CSS
docs/
  adr/          — Architecture Decision Records
```

## License

Private — nicht für öffentliche Nutzung freigegeben.
