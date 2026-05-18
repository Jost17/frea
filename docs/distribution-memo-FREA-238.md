# FREA Distribution & Datensicherheit — Tech-Memo

**Issue:** FREA-238 | **Datum:** 2026-05-18 | **Autor:** CTO

---

## 1. Distributions-Optionen

### Option A: Lokales Paket (CLI/Desktop-App)

**Modell:** Nutzer installiert FREA lokal und betreibt es selbst.

| Aspekt | Bewertung |
|--------|-----------|
| Datenschutz | ✅ Maximale Kontrolle — Daten verlassen nie den Rechner |
| DSGVO | ✅ Trivial — kein Auftragsverarbeiter, keine Cloud |
| GoBD | ✅ Nutzer ist selbst verantwortlich für Aufbewahrung |
| Deployment | Einmalig: `bun install && bun start` |
| Updates | Manuell via Git Pull oder GitHub Releases |
| Infrastrukturkosten | ~0 € |
| Skalierung | Single-User by Design |

**Minimal-Aufwand für Marktreife:**
- GitHub Release mit vorgebautem Binary (Bun `bun build --compile`) ← 1 Tag
- Auto-Update-Checker optional (prüft GitHub Releases API)
- Systemd/launchd Service-File für Autostart ← 2h

**Empfehlung für:** Einzelfreelancer, technisch versierte Nutzer.

---

### Option B: Self-Hosted (VPS/Docker)

**Modell:** Nutzer betreibt FREA auf eigenem Server (Hetzner, Netcup, Uberspace).

| Aspekt | Bewertung |
|--------|-----------|
| Datenschutz | ✅ Nutzer kontrolliert Server |
| DSGVO | ✅ Nutzer ist eigener Auftragsverarbeiter |
| GoBD | ✅ Nutzer verantwortet Backup |
| Deployment | Docker Compose + Reverse Proxy |
| Updates | `docker pull` + `docker compose up -d` |
| Infrastrukturkosten | ~5–10 €/Monat (Hetzner CX11) |
| Multi-User | Möglich (mehrere FREA-Instanzen per Container) |

**Minimal-Aufwand für Marktreife:**
- `Dockerfile` + `docker-compose.yml` ← 1 Tag
- Persistentes SQLite-Volume-Mount
- Health-Check-Endpoint (`/api/health` existiert bereits)
- `docs/runbook-self-hosting.md` ← 4h

**Empfehlung für:** DevOps-affine Nutzer, Agenturen mit mehreren Freelancern.

---

### Option C: SaaS / Managed Hosting

**Modell:** FREA läuft auf gemeinsamer Infrastruktur, Nutzer zahlt Abo.

| Aspekt | Bewertung |
|--------|-----------|
| Datenschutz | ⚠ Mandanten-Isolation kritisch |
| DSGVO | ⚠ AVV-Vertrag mit jedem Kunden, EU-Hosting Pflicht |
| GoBD | ⚠ Aufbewahrung muss vertraglich geregelt sein |
| Deployment | Render/Fly.io/Hetzner + Multi-Tenant-DB |
| Infrastrukturkosten | 20–100 €/Monat (skaliert mit Nutzerzahl) |
| Entwicklungsaufwand | Hoch: Auth, Mandanten-Isolation, Billing, Support |
| Update-Kanal | Transparent (Nutzer merkt nichts) |

**Blocker vor Marktreife:**
- Multi-Tenant SQLite → PostgreSQL-Migration nötig (oder separate DB pro Nutzer)
- Auth-System (kein Login vorhanden)
- Stripe/Billing-Integration
- DSGVO-Datenschutzerklärung + AVV-Template
- Backup-SLA definieren

**Aufwand:** 3–6 Wochen Vollzeit.

---

## 2. Empfehlung für Marktreife-Stufe 1

**→ Lokal-Paket (Option A) als MVP, Docker (Option B) als schnelles Second-Tier.**

Begründung:
1. **Zero DSGVO-Overhead** — kein AVV, keine Cloud-Infrastruktur, kein Support-Aufwand
2. **GoBD trivial** — Nutzer ist selbst verantwortlich
3. **Differenzierung** — "Deine Daten, dein Rechner" ist für Freelancer ein Verkaufsargument
4. **Zeit-zu-Markt** — 1–2 Tage statt 3–6 Wochen
5. **Natürlicher Upgrade-Pfad** — Lokale Nutzer → Self-Hosted → SaaS (Entscheidung reversibel)

SaaS (Option C) erst angehen, wenn Produkt-Market-Fit validiert ist. Referenz: FREA-234.

---

## 3. Minimaler Update-Kanal für Lokal-Paket

```bash
# Auto-Update-Checker (in FREA Startup-Log)
const latestRelease = await fetch(
  "https://api.github.com/repos/Jost17/frea/releases/latest"
).then(r => r.json());
if (latestRelease.tag_name !== currentVersion) {
  console.log(`[FREA] Update verfügbar: ${latestRelease.tag_name}`);
}
```

Keine Auto-Downloads — nur Hinweis. Nutzer updaten selbst via `git pull && bun install`.

---

## 4. Datensicherheit — Implementierter Stand (FREA-238)

| Feature | Status |
|---------|--------|
| Backup (DB-Export, WAL-Checkpoint) | ✅ Implementiert — `/datenschutz/backup` |
| Restore (Upload + Integrity-Check) | ✅ Implementiert — `/datenschutz/restore` |
| Startup-Restore-Logik | ✅ Implementiert — `schema.ts` |
| DSGVO Art. 15 — Datenauskunft (JSON-Export) | ✅ Implementiert — `/datenschutz/dsr/:id/export` |
| DSGVO Art. 17 — Pseudonymisierung | ✅ Implementiert — `/datenschutz/dsr/:id/pseudonymize` |
| GoBD-Konformität bei Löschung | ✅ Art. 17 Abs. 3 lit. b DSGVO — Rechnungen + Audit-Log bleiben |
| Distributions-Memo | ✅ Dieses Dokument |

**Offene Empfehlungen (nicht in FREA-238):**
- Backup-Erinnerung (z.B. monatliche In-App-Notification): FREA-XXX
- Automatischer Backup-Export per Cron auf lokales Verzeichnis: FREA-XXX
- Datenschutzerklärung für SaaS-Betrieb: erst bei Option C relevant
