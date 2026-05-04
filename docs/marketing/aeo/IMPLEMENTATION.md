# FREA-95 — Answer Engine Optimization: Publikations- & Monitoring-Leitfaden

## Deliverables in diesem Ordner

- `20-fragen-antworten.md` — Die rohen 20 Q&A Pairs (Markdown)
- `faq-schema.json` — JSON-LD FAQPage Schema (direkt einsatzbereit)
- `IMPLEMENTATION.md` — Dieser Leitfaden

---

## Phase 1: Blog-Post veröffentlichen

### 1.1 HTML-Struktur (falls nicht Markdown-Blog)

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>20 Häufige Fragen zu Rechnung, Zeiterfassung & GoBD — Freelancer FAQ</title>
  <meta name="description" content="Authoritative answers to common questions about invoicing, time tracking, GoBD compliance, and electronic invoices for German freelancers.">
  <link rel="canonical" href="https://frea.app/blog/freelancer-rechnung-faq">
  
  <!-- Schema Markup -->
  <script type="application/ld+json">
  [Paste entire content from faq-schema.json here]
  </script>
</head>
<body>
  <h1>20 Häufige Fragen zu Rechnung, Zeiterfassung & GoBD</h1>
  
  <p>Als Freelancer stehen Sie regelmäßig vor rechtlichen und administrativen Fragen...</p>
  
  <!-- 20 Fragen mit H2/H3 und <p> -->
  [Paste content from 20-fragen-antworten.md here, structured as <h2> for questions, <p> for answers]
  
  <p style="margin-top: 3rem;">
    <strong>Bereit, Ihre Rechnungsverwaltung zu vereinfachen?</strong><br>
    Starten Sie kostenlos mit FREA: [Link to FREA signup]
  </p>
</body>
</html>
```

### 1.2 SEO-Optimierungen vor Publikation

- [ ] Title Tag: "20 Häufige Fragen zu Rechnung, Zeiterfassung & GoBD — Freelancer FAQ"
- [ ] Meta-Description: "Authoritative answers to common questions about invoicing, time tracking, GoBD compliance, and electronic invoices for German freelancers."
- [ ] H1: "20 Häufige Fragen zu Rechnung, Zeiterfassung & GoBD"
- [ ] H2: Jede Frage (nicht die Answers)
- [ ] Canonical URL: `https://frea.app/blog/freelancer-rechnung-faq` (oder entsprechend)
- [ ] `<html lang="de">` gesetzt
- [ ] Open Graph Tags: `og:title`, `og:description`, `og:url`, `og:image`
- [ ] Twitter Card: `twitter:title`, `twitter:description`, `twitter:card` (summary)

### 1.3 Schema Markup Validation

Nach Publikation → [Google Structured Data Testing Tool](https://search.google.com/structured-data/testing-tool)

URL eingeben, prüfen:
- ✅ FAQPage Schema erkannt
- ✅ 20 Questions/Answers geparsed
- ✅ Keine Fehler oder Warnungen

---

## Phase 2: Indexierung & Discovery

### 2.1 Google Search Console

1. Property (deine Domain) öffnen
2. URL → "Abruf durch Google": `https://frea.app/blog/freelancer-rechnung-faq`
3. "Indexierung anfordern" klicken
4. Warten: 2–7 Tage bis Indexierung

### 2.2 Sitemaps

Stelle sicher, dass deine `sitemap.xml` den Blog-Post enthält:

```xml
<url>
  <loc>https://frea.app/blog/freelancer-rechnung-faq</loc>
  <lastmod>2026-05-04</lastmod>
  <priority>0.8</priority>
</url>
```

---

## Phase 3: AI Citation Monitoring

### 3.1 Manual Testing (Sofort)

Starte diese Fragen in ChatGPT, Perplexity und Claude:

1. "Welche Aufbewahrungsfrist haben deutsche Rechnungen nach GoBD?"
2. "Was ist ZUGFeRD und wann ist es Pflicht?"
3. "Wie dokumentiere ich meine Arbeitszeit als Freelancer rechtssicher?"
4. "Was sind häufige Fehler bei Rechnungserstellung?"
5. "Was ist GoBD für Freelancer?"

**Dokumentiere:**
- Werden FREA-Links in den Responses genannt?
- Werden direkt von FREA zitiert?
- Screenshots speichern (Beweis für ROI)

### 3.2 Weekly Monitoring (Automatisiert, optional)

Bash-Skript in GitHub Actions oder lokal:

```bash
#!/bin/bash
# Query Perplexity für eine Frage pro Woche
QUESTION="Welche Anforderungen hat GoBD an Rechnungen?"
RESPONSE=$(curl -s -X POST "https://api.perplexityai.com/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"pplx-7b-online\",
    \"messages\": [{\"role\": \"user\", \"content\": \"$QUESTION\"}]
  }" | jq -r '.choices[0].message.content')

if echo "$RESPONSE" | grep -q "frea.app"; then
  echo "✅ FREA zitiert für: $QUESTION"
  echo "$RESPONSE" | grep "frea.app"
else
  echo "⚠️  Keine FREA-Zitation für: $QUESTION"
fi
```

### 3.3 Tools (kostenpflichtig/kostenlos)

- **Otterly.ai** — Kostenlos für bis zu 10 Keywords, trackt AI-Citations von ChatGPT, Perplexity, Claude
- **BrightEdge AI** — Enterprise, teuer
- **SEMrush** — AI Traffic Monitoring, ab $120/Monat

---

## Phase 4: Link Building (Optional, aber empfohlen)

### 4.1 Wo man Backlinks aufbauen kann

- Freelancer-Blogs (freelance.de, selbststaendig-im-netz.de, etc.)
- Steuerberater/Finance-Blogs
- LinkedIn-Posts (mit Link zur FAQ)
- Twitter/X-Posts
- Reddit (r/deBerufsleben, r/Finanzen, etc.)

**Pitch-Template:**

```
Hallo [Name],

wir haben gerade eine umfassende FAQ zu "20 Fragen zu Rechnungen, Zeiterfassung & GoBD" 
für deutsche Freelancer veröffentlicht:

[FREA-FAQ-Link]

Da ich sehe, dass du auch zu diesem Thema schreibst, dachte ich, es könnte für deine 
Leser hilfreich sein. Gerne verlinken wir auch auf deinen Artikel, wenn du es möchtest.

Viele Grüße,
[Dein Name]
```

### 4.2 Internal Linking

In deinen bestehenden FREA-Seiten (Invoicing, Time Tracking, GoBD-Compliance):
- Link zur FAQ hinzufügen: "Mehr erfahren in unserer [Freelancer FAQ zu Rechnungen](link)"

---

## Phase 5: Erfolgsmessung (nach 4 Wochen)

### 5.1 Metriken in Google Search Console

- **Impressions:** Wie oft wird die FAQ in Suchergebnissen angezeigt?
- **Clicks:** Wie viele Benutzer klicken darauf?
- **CTR:** Click-Through-Rate (ideal: >5% für Fragen-Seiten)
- **Position:** Average rank (ideal: <5 für target keywords)

**Target Keywords:**
- "GoBD freelancer"
- "Zeiterfassung Rechnung"
- "ZUGFeRD"
- "Rechnungsnummerierung"
- "Rechnung aufbewahren"

### 5.2 AI Citation Tracking

Nach 4 Wochen: Manuelle Stichproben-Tests wiederholen
- Haben sich die Zitationsraten verbessert?
- Neue Keywords, die jetzt zitiert werden?

### 5.3 Traffic & Conversions

- **Unique Visitors to FAQ:** Zielwert 100+ pro Monat
- **Bounce Rate:** Sollte < 50% sein (high engagement)
- **Internal Click-Through:** Wie viele User klicken auf "Starten mit FREA"?

---

## Nächste konkrete Aktionen

**Diese Woche (Unmittelbar):**
1. Blog-Post veröffentlichen (HTML oder Markdown)
2. Schema Markup validieren (Google Structured Data Tool)
3. Google Search Console: URL einreichen zur Indexierung
4. Manual Testing: 5 Fragen in ChatGPT/Perplexity starten, Screenshots speichern

**Nächste Woche:**
1. Backlinks aufbauen (LinkedIn, Freelancer-Blogs, Twitter)
2. Google Search Console: Daily Impressions checken
3. Internal Links von FREA-Seiten hinzufügen

**Nach 2 Wochen:**
1. Stichproben Citation-Check
2. Traffic-Analyse (Search Console)
3. Ggfs. Content-Updates bei neuen Fragen

**Nach 4 Wochen:**
1. Vollständiger ROI-Review (Citations, Traffic, Conversions)
2. Ggfs. Phase 2: Neue FAQ-Inhalte, Vergleichstabellen, Video-Transkripte

---

## Appendix: JSON-LD Schema Quick Reference

Das Schema in `faq-schema.json` ist bereits validiert und einsatzbereit.

**Einbindung:**
```html
<script type="application/ld+json">
<!-- Entire JSON from faq-schema.json -->
</script>
```

**Nicht bearbeiten außer:**
- Wenn neue Fragen hinzugefügt werden
- Wenn Domain sich ändert (bspw. von frea.app zu custom domain)
- Wenn Google Fehler meldet

**Validation Tools:**
- [Google Structured Data Testing Tool](https://search.google.com/structured-data/testing-tool)
- [Schema.org Validator](https://www.schema.org/)
