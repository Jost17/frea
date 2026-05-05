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

## CI Workflow (enforced — PR #40)

17. **Lokal `bun run check` VOR jedem Push** — CI nutzt `bunx @biomejs/biome ci .` (no-write, strict). Format/Import-Sort-Drift im Push = roter CI-Run. Pflicht-Schritt vor jedem Push, vor allem nach `git pull`/`gh pr update-branch` weil neue main-Commits Drift einschleppen können. Siehe `.github/workflows/ci.yml`.
18. **PR-Size-Guard ist hart automatisiert** — `.github/workflows/pr-size-guard.yml` blockt >1.000 LOC, warnt ab >400 LOC mit Begründungspflicht im PR-Body. Splitting vor Push, nicht danach. Lockfiles (`bun.lock`/`bun.lockb`/`package-lock.json`) und `public/static/styles.css` sind exkludiert.
19. **CSS-Build läuft in CI** — `bun run css:build` ist eigener CI-Step. Tailwind-Class-Typos failen direkt. Lokal als Smoke-Test vor Push wenn du `src/styles/input.css` oder Templates angefasst hast.
20. **Dependabot Auto-Merge ist aktiv** — patch/minor mit grünem CI mergen sich selbst (squash). Major bleibt manuell. Bei Group-PRs (`npm-non-major`) trotzdem Diff prüfen. Workflow: `.github/workflows/dependabot-auto-merge.yml`.
21. **PR-Body braucht `## Test Plan` mit Evidence** — jedes Item ist entweder `[x]` mit konkretem Beleg (Log-Snippet, CI-Run-ID, Test-PR-Nummer) ODER explizit `deferred — wartet auf X` für Items die organisch passieren müssen (z.B. nächster Dependabot-Run). Unchecked Items ohne Marker = nicht ship-ready. Verifier: `~/.claude/skills/pr-ship-verifier/verify.sh <PR>`.

## Reference

Reference implementation (read-only): `/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/freelancer_tool/`
Full roadmap: See FREA-3 plan document in Paperclip.

## Paul's Learnings (2026-04-22)

**Warteschleife-Falle:** 
Nach vielen Resume-Zyklen mit stagnierenden Fragen ("Ready für X wenn du Y hast?") muss Paul **nicht fragen**, sondern **die nächste konkrete Aufgabe angreifen**. 
- Statt: "Sollen wir TC2000 oder FREA machen?"
- Mache: IBKR Trader Phase 2, Agent Factory, nächstes Projekt
- Biete am Ende an: "Dann zu Projekt Z oder willst du was anderes?" (ggf. ohne Fragezeichen)
- Quelle: Session 2026-04-22 10:40–10:50 — Jost sagte "again" + "nochmal" als Signal nicht mehr warten zu sollen
