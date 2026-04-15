# Beitragen zu FREA

Diese Regeln sind verbindlich für alle Beiträge im Repository.

## Branching-Workflow

1. Arbeite nie direkt auf `main`.
2. Erstelle pro Ticket einen kurzen Feature-Branch:
   - `feat/<kurze-beschreibung>`
   - `fix/<kurze-beschreibung>`
   - `docs/<kurze-beschreibung>`
3. Halte Branches kurzlebig (maximal 1-3 Tage bis zur PR).
4. Synchronisiere deinen Branch regelmäßig:

```bash
git fetch origin
git rebase origin/main
```

Wichtig: Rebase nur auf deinem eigenen Feature-Branch nutzen, niemals auf geteilten Branches.

## Pull-Requests und Merge

1. Öffne für jede Änderung einen Pull-Request.
2. Nutze aussagekräftige Titel und beschreibe kurz den Zweck.
3. Merge auf `main` erfolgt ausschließlich als **Squash Merge**.
4. Nach Merge wird der Feature-Branch gelöscht.

## Qualitäts-Check vor PR

Führe vor jedem PR mindestens diese Checks aus:

```bash
bun test
bun run typecheck
bun run lint
```

## Dependency-Management und Security-Updates

- Dependabot ist aktiviert und erstellt wöchentliche PRs für npm-Abhängigkeiten.
- Sicherheitsupdates haben Vorrang und sollen zeitnah gemerged werden.
- Nicht-kritische Updates werden gesammelt im normalen PR-Flow geprüft.
- Auch Dependabot-PRs laufen durch `bun test`, `bun run typecheck` und `bun run lint`.

## Tech-Standards (Kurzfassung)

- Bun Runtime, Hono Server, SQLite via `bun:sqlite` ohne ORM
- HTMX + Tailwind v4, keine SPA-Frameworks
- Zod für Eingaben
- Deutsche UI-Texte mit echten Umlauten
- Keine still geschluckten Fehler
- Dateien unter 400 Zeilen halten

## Rechnungsregel (kritisch)

MwSt wird pro Rechnungsposition berechnet und anschließend aufsummiert. Niemals als `gesamtNetto * steuersatz`.
