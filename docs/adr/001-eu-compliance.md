# ADR-001: Europäische Compliance-Richtlinien

**Status:** Accepted
**Datum:** 2026-03-29
**Issue:** FREA-24

---

## Kontext

FREA ist ein deutsches Freelancer-Invoicing-Tool. Alle Infrastruktur- und Tooling-Entscheidungen müssen:

1. Auf europäischen Dienstleistern basieren (Datenschutz, DSGVO, kein unkontrollierter US-Datentransfer)
2. WCAG 2.1 AA erfüllen (Barrierefreiheit)

---

## Entscheidung

### Regel 1: Europäische Dienstleister

Alle externen Dienste müssen EU-ansässig sein oder einen rechtskonformen EU-Datenpfad bieten (EU-Standardvertragsklauseln allein reichen **nicht** aus — Schrems II).

#### Dienste-Matrix

| Kategorie        | Nicht erlaubt                                 | Erlaubt                                                       |
|------------------|-----------------------------------------------|---------------------------------------------------------------|
| Hosting/Cloud    | AWS us-*, GCP us-*, Azure us-*                | Hetzner (DE), Fly.io (EU regions), OVH (FR), Scaleway (FR)   |
| CDN              | Cloudflare (US HQ ohne EU-Addendum)           | Bunny.net (SI), Fastly EU, Cloudflare mit DSGVO-Addendum     |
| Analytics        | Google Analytics, Mixpanel, Amplitude (US)    | Plausible (EE/self-hosted), Umami (self-hosted), Matomo (FR) |
| Fehler-Tracking  | Sentry (US region)                            | Sentry EU region (Frankfurt), GlitchTip (self-hosted)         |
| E-Mail           | SendGrid (US), Mailgun (US region)            | Brevo (FR), Mailgun EU region, Postmark EU                   |
| Datenbank/Infra  | Supabase us-*, PlanetScale (US default)       | Supabase eu-central-1, Turso EU, Neon EU                     |
| Font-Hosting     | Google Fonts (US-Anfragen)                    | Self-hosted Fonts (lokal im Repo/public/)                    |
| Maps             | Google Maps                                   | OpenStreetMap, Maptiler EU                                   |

> **Hinweis:** FREA läuft primär lokal (SQLite, localhost:3114). Die Matrix gilt für jede Cloud-Deployment-Entscheidung.

#### Self-Hosting bevorzugen

Wo möglich: Abhängigkeiten lokal mitliefern statt externe Dienste einbinden. Das gilt insbesondere für:
- Schriftarten (kein CDN-Loading)
- Icons (kein Icon-Font-CDN)
- JavaScript-Libraries (im Build gebündelt, nicht per CDN)

---

### Regel 2: WCAG 2.1 AA Baseline

Alle UI-Komponenten (HTMX-Templates, Tailwind-Styles) müssen folgende Mindestanforderungen erfüllen:

#### Wahrnehmbarkeit

- **Kontrast Text:** Mindest-Kontrastverhältnis 4,5:1 (Normaltext), 3:1 (Text ≥ 18pt oder fett ≥ 14pt)
- **Kontrast UI-Komponenten:** Mindest-Kontrastverhältnis 3:1 für interaktive Elemente und Fokusindikatoren
- **Kein Informationsverlust durch Farbe allein:** Fehler, Warnungen etc. immer mit Icon/Text ergänzen
- **HTML-Sprache:** `<html lang="de">` ist gesetzt (bereits in Layout-Template)

#### Bedienbarkeit

- **Tastaturnavigation:** Alle Funktionen per Keyboard erreichbar (Tab-Reihenfolge logisch)
- **Fokus-Sichtbarkeit:** Sichtbarer Fokusring auf allen interaktiven Elementen (nie `outline: none` ohne Alternative)
- **Keine Zeitlimits** ohne Nutzer-Override (nicht relevant für v1, aber im Kopf behalten)
- **Skip-Links:** `<a href="#main-content" class="sr-only focus:not-sr-only">Zum Hauptinhalt</a>` im Layout

#### Verständlichkeit

- **Formular-Labels:** Jedes `<input>`, `<select>`, `<textarea>` hat ein assoziiertes `<label for="...">` oder `aria-label`
- **Fehlermeldungen:** Klar beschriftet, benennen das fehlerhafte Feld, geben Korrekturhinweis
- **Konsistente Navigation:** Menüs und wiederkehrende Elemente an gleicher Position

#### Robustheit

- **Semantisches HTML zuerst:** `<button>` für Aktionen, `<a>` für Links, `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`
- **ARIA nur wenn nötig:** Kein ARIA verwenden, wenn natives HTML-Element existiert
- **Korrekte Heading-Hierarchie:** `<h1>` → `<h2>` → `<h3>` (keine Ebenen überspringen)

#### Tailwind-Hinweise

```html
<!-- Fokusring (nie entfernen ohne Alternative) -->
<button class="focus:ring-2 focus:ring-blue-500 focus:outline-none">...</button>

<!-- Screen-Reader-Only (für Skip-Links etc.) -->
<span class="sr-only">Beschreibender Text für Screenreader</span>

<!-- Ausreichend Kontrast (Tailwind-Farben prüfen) -->
<!-- OK: text-gray-900 auf bg-white (21:1) -->
<!-- OK: text-gray-700 auf bg-white (10:1) -->
<!-- NICHT OK: text-gray-400 auf bg-white (5.7:1 für kleinen Text grenzwertig) -->
```

---

## Konsequenzen

### Positiv
- DSGVO-konform von Anfang an
- Barrierefreie App für alle Nutzer
- Kein nachträgliches Refactoring für EU-Compliance

### Negativ / Trade-offs
- Etwas eingeschränktere Tool-Auswahl (kein Google Analytics, etc.)
- Fonts müssen self-hosted werden (minimaler Mehraufwand)

### Sofortmaßnahmen (für laufende Entwicklung)
1. Tailwind-Styles: Kontrast-Check bei allen Farbentscheidungen
2. Layout-Template: `lang="de"`, semantische Landmark-Elemente, Skip-Link
3. Formular-Templates: Label-Assoziierung konsequent durchführen
4. Fonts: Selbst hosten, kein Google Fonts CDN-Link
