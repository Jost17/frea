# Runbook: Lokaler Serverbetrieb

Dieses Dokument ist die zentrale Referenz für Start, Prüfung und Neustart des FREA-Servers.

## Server starten

```bash
cd /Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/frea_freelancer
bun run start
```

Danach ist die Anwendung unter `http://127.0.0.1:3114` erreichbar.

## Healthcheck

```bash
curl -sS http://127.0.0.1:3114/api/health
```

Erwartete Antwort:

```json
{"status":"ok","db":"ok"}
```

## Wenn die Seite nicht lädt

1. Prüfen, ob der Port belegt ist:

```bash
lsof -nP -iTCP:3114 -sTCP:LISTEN
```

2. Falls kein Prozess läuft: Server neu starten (`bun run start`).
3. Falls ein falscher Prozess den Port hält: Prozess beenden und erneut starten.

## Entwicklungsmodus

Für aktive UI-Entwicklung mit CSS-Watch:

```bash
bun run dev
```
