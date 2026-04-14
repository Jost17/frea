# Deployment-Workflow (Lokal, Staging, Produktion)

## Zielbild

FREA nutzt einen einfachen Drei-Stufen-Flow:

1. Lokal: Entwicklung und schnelle Validierung
2. Staging: Integrations- und Freigabetests mit produktionsnaher Konfiguration
3. Produktion: kontrollierte Auslieferung nach Freigabe

Damit bleiben Releases nachvollziehbar, risikoarm und mit klarer Rückrollstrategie.

## Branching und Trigger

- `feature/*`: Entwicklungszweige pro Ticket
- `master`: stabiler Integrationszweig
- Tag `v*` (z. B. `v0.3.0`): Produktions-Release

Deploy-Trigger:

- Push auf `feature/*`: kein Deployment
- Merge in `master`: automatisches Deployment nach Staging
- Release-Tag `v*`: Deployment nach Produktion

## CI/CD-Pipeline (GitHub Actions)

Pipeline-Schritte pro Pull Request nach `master`:

1. `bun install --frozen-lockfile`
2. `bun run check`
3. `bun run typecheck`
4. `bun test`
5. optionaler Build-Check: `bun run start` (Smoke)

Nur bei erfolgreicher Pipeline darf gemerged werden.

## Staging-Umgebung

Anforderungen für Staging:

- Eigene URL (z. B. `staging.frea.example`)
- Eigene SQLite-Datei (`/var/lib/frea/staging/frea.db`)
- Eigene Konfigurationswerte (`PORT`, `FREA_DB_PATH`)
- Seed-Testdaten ohne echte Kundendaten

Deployment auf Staging (automatisch nach Merge auf `master`):

1. Neues Artefakt bereitstellen
2. DB-Backup erstellen
3. App-Prozess neu starten
4. Smoke-Test auf `/` und `/dashboard`
5. Ergebnis im Deployment-Log markieren

## Produktions-Umgebung

Produktions-Deployment erfolgt nur über Versionstags (`v*`).

Ablauf:

1. Freigegebenen Commit taggen
2. Artefakt aus exakt diesem Commit bauen
3. Vor Deployment automatisches DB-Backup
4. Rolling-Neustart (oder kurzer Wartungsmodus)
5. Smoke-Test und KPI-Sichtprüfung (Dashboard lädt, offene Rechnungen sichtbar)

## Rollback-Strategie

Bei Fehlern nach Deployment:

1. Vorheriges Artefakt redeployen
2. Falls nötig: SQLite-Backup zurückspielen
3. Incident-Kommentar im zugehörigen Ticket ergänzen

Wichtig: Kein "Hotfix auf Live" ohne Ticket und Pull Request.

## Verantwortlichkeiten

- CTO: Prozess-Ownership, Freigabe Produktions-Tag
- Backend: Migrations- und DB-Sicherheit
- Frontend: UI-Smoke auf Staging
- QA: Abnahmetest vor Produktions-Tag

## Mindest-Checkliste pro Release

- Alle PR-Checks grün
- Keine offenen kritischen Bugs
- Staging-Smoke erfolgreich
- Backup erfolgreich erstellt
- Rollback-Pfad getestet oder verifiziert
