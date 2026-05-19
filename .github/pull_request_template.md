## Änderung

<!-- Beschreibe kurz, was sich geändert hat und warum. -->

## Betroffene Bereiche

- [ ] Backend (Hono/SQLite)
- [ ] Frontend (HTMX/Tailwind)
- [ ] Rechnungen/MwSt-Logik
- [ ] Sicherheit/Validierung
- [ ] Dokumentation

## Checks

- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun test`
- [ ] Keine still geschluckten Fehler
- [ ] Dateien bleiben unter 400 Zeilen

## Fachliche Checks

- [ ] Deutsche UI-Texte mit echten Umlauten (ä, ö, ü, ß)
- [ ] MwSt wird pro Position berechnet und aufsummiert (nicht `total_net * vat_rate`)
- [ ] Änderungen an Rechnungslogik mit Beispielwerten geprüft

## Rollout & Risiko

<!-- Was ist das Risiko? Gibt es manuelle Nacharbeiten oder Migrationen? -->

## QA-Review-Gate (Board-Direktive FREA-276)

- [ ] PR-Status in Paperclip auf `in_review` gesetzt, Assignee = QA Engineer
- [ ] QA-Engineer-Sign-off erhalten (Paperclip-Kommentar oder Approved-Status)

> Kein Merge ohne QA-Sign-off. CTO ist Eskalationspfad bei Disput — kein Default-Reviewer.

