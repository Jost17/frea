# Freelancer Tool (Paperclip Project FREA)

German freelancer invoicing tool — managed by Paperclip agents.

## Stack

- Runtime: Bun
- Server: Hono
- DB: SQLite (no ORM, prepared statements only)
- Frontend: HTMX + Tailwind v4 (no React/SPA)
- Validation: Zod

## Ports

- Frontend/UI: 3114
- Backend API: 4114

## Rules (enforced)

1. Deutsche UI, englischer Code
2. Kein ORM — prepared statements only
3. Zod for all inputs
4. MwSt per line item, then sum — never on total
5. Kaufmaennische Rundung (2 decimal places)
6. Audit log: append-only, trigger-protected
7. HTMX, no JS frameworks
8. Explicit error handling (AppError class)
9. Immutability (spread operator)
10. Files < 400 lines

## EU Compliance (enforced — ADR-001)

11. Europäische Dienstleister only — kein US-Hosting, kein Google Analytics, kein Google Fonts CDN
12. Self-host fonts and static assets — keine externen CDN-Requests
13. WCAG 2.1 AA baseline — alle UI-Komponenten müssen konform sein:
    - Kontrast ≥ 4.5:1 (Text), ≥ 3:1 (UI-Elemente)
    - Sichtbarer Fokusring auf allen interaktiven Elementen
    - Semantisches HTML: `<button>`, `<label>`, `<nav>`, `<main>`, korrekte Heading-Hierarchie
    - Formular-Labels: jedes Input hat ein assoziiertes `<label>`
    - `<html lang="de">` gesetzt
14. Skip-Link im Layout: `<a href="#main-content" class="sr-only focus:not-sr-only">Zum Hauptinhalt</a>`

Full details: `docs/adr/001-eu-compliance.md`

## Git Workflow (enforced — Board decision)

15. **Branch von `main`** — Feature-Branches ausschließlich von `main` abzweigen. Keine Branches von halbfertigen Feature-Branches. Immer: `git checkout main && git pull && git checkout -b feat/...`
16. **PR-Größenlimits** — Soft-Limit 400 LOC, Hard-Limit 1.000 LOC diff.
    - 400–1.000 LOC: Review erfordert explizite Begründung warum kein Split möglich war
    - Über 1.000 LOC: Automatisch abgelehnt — erst splitten, dann einreichen

## Reference

Reference implementation (read-only): `/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/freelancer_tool/`
Full roadmap: See FREA-3 plan document in Paperclip.
