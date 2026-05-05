# Beitragen zu FREA

Diese Regeln sind verbindlich für alle Beiträge im Repository.

## Branching-Workflow

1. Arbeite nie direkt auf `main`.
2. **Branche immer von `main`, niemals von anderen Feature-Branches.** Branch-from-Branch führt zu PRs mit fremden Commits und 4.000+ LOC Diffs (siehe `.github/workflows/branch-from-main.yml`).
3. Korrekter Start eines neuen Branches:

```bash
git checkout main && git pull
git checkout -b feat/<kurze-beschreibung>
```

4. Erlaubte Präfixe: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`.
5. Halte Branches kurzlebig (maximal 1-3 Tage bis zur PR).
6. Synchronisiere deinen Branch regelmäßig:

```bash
git fetch origin
git rebase origin/main
```

Wichtig: Rebase nur auf deinem eigenen Feature-Branch nutzen, niemals auf geteilten Branches.

### Branch-Hygiene-Hooks aktivieren (einmalig pro Clone)

```bash
bun run setup:hooks
```

Aktiviert den Pre-Push-Hook unter `.githooks/pre-push`, der vor Push warnt, wenn:
- Commits des Branches auch auf anderem lokalen Feature-Branch liegen (Branch-from-Branch).
- Der Abzweigpunkt mehr als 50 Commits hinter `origin/main` liegt (stale Branch).

Der Hook **blockiert nicht hart** — die echte Durchsetzung läuft im CI-Workflow `branch-from-main.yml`, der PRs mit Drift > 50 Commits ablehnt.

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
