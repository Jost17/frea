---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, security, api]
dependencies: []
---

# 001 — Unauthenticated Write Access on API Endpoints

## Problem Statement

`PUT /api/settings/company` und `PATCH /api/invoices/:id/status` sind ohne jede Zugangskontrolle erreichbar. Die gesamte `/api/`-Prefix wird vom `onboardingGuard` übersprungen. Jeder Prozess mit Netzwerkzugang kann damit IBAN, BIC, Steuernummer und alle Firmendaten überschreiben oder Rechnungsstatus manipulieren — ohne Credentials.

## Findings

**Location:** `src/middleware/onboarding-guard.ts:4`, `src/routes/api.ts`

```typescript
// onboarding-guard.ts
const SKIP_PREFIXES = ["/onboarding", "/api/", "/static/"];
// → /api/ vollständig ungeschützt, inkl. PUT /api/settings/company
```

Das Projekt hat keine Authentifizierungs-Middleware. Die Kombination aus fehlender Auth und vollständigem API-Skip lässt jede netzwerkfähige Anwendung (Browser-Tab, curl, LAN-Nachbar) Kerngeschäftsdaten mutieren.

**Risiko:** DSGVO-relevante Daten (IBAN, Steuernummer) ohne Schutz schreibbar.

## Proposed Solutions

### Option A: Host-Origin-Check (minimal, 30 min)
```typescript
// src/routes/api.ts
apiRoutes.use("*", async (c, next) => {
  const host = c.req.header("host") ?? "";
  if (!host.startsWith("localhost") && !host.startsWith("127.")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  return next();
});
```
**Pros:** Minimal, kein neues Konzept, passt zum Single-User-Local-Tool-Charakter  
**Cons:** Schützt nicht gegen Angriffe vom selben Rechner  
**Effort:** Small | **Risk:** Low

### Option B: API-Key-Header (empfohlen, 1h)
Generiere beim ersten Start ein `API_KEY` (z.B. `crypto.randomUUID()` + persist in `.env`), prüfe `X-API-Key` Header auf allen mutierenden Routen.  
**Pros:** Echte Zugangskontrolle, einfach für CLI-Clients  
**Cons:** Mehr Aufwand, Key-Management nötig  
**Effort:** Small | **Risk:** Low

### Option C: SKIP_PREFIXES einschränken (quick win als Ergänzung)
Nur `/api/health` und `/api/invoices` (read-only) vom Guard ausschließen. `PUT /api/settings/company` und `PATCH /api/invoices/:id/status` in den Guard ziehen.  
**Pros:** Nutzt bestehende Guard-Infrastruktur  
**Cons:** API-Clients müssen dann onboarding-complete sein  
**Effort:** Small | **Risk:** Low

## Acceptance Criteria

- [ ] `PUT /api/settings/company` von externer IP gibt 403 zurück
- [ ] `PATCH /api/invoices/:id/status` von externer IP gibt 403 zurück
- [ ] `GET /api/health` bleibt ohne Restriktion erreichbar
- [ ] Keine bestehenden Tests brechen

## Work Log

- 2026-04-01: Gefunden via Security Review (PR #10)

## Resources

- PR: https://github.com/Jost17/frea/pull/10
- Gefunden von: security-sentinel agent
