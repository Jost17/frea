# FREA-232: Moderne Design-Direction — Weg vom Tabellenkalkulations-Look

**Datum:** 2026-05-18  
**Status:** Design-Konzept (zur Genehmigung)  
**Owner:** UX Designer

---

## 1. Problem-Analyse

### Aktueller Zustand: "Excel-Look"
- **Rechnungsliste:** Standard HTML-Tabelle mit Grid-Struktur, dichte Zeilen, minimale Hierarchie
- **Visueller Eindruck:** Funktional, aber "Tabellenkalkulation" — gleich wie ein Excel-Export aussehen
- **Fehlende Elemente:** Whitespace, visuelle Akzente, Card-Struktur, Typo-Hierarchie

### Board-Anforderung
> "Ich möchte mich davon lösen und moderner werden. Es soll eine Applikation sein, die Spaß macht, in der ich gerne arbeite."

---

## 2. Moderne Design-Direction: Kern-Prinzipien

### 2.1 Layout-Transformation
**Von:** Vollständig tabellarisch (alle Daten sichtbar)  
**Zu:** Hybrid Card/Detail-System

- **Rechnungsliste:** Card-basiert (1 Rechnung = 1 Card) statt Tabellenzelle
- **Jede Card zeigt:** Rechnungsnummer + Kundenname (prominent), Betrag (groß), Status + Fällig-Info (kompakt), Datum (secondary)
- **Interaktion:** Click anywhere → Detail-View. Hoher Kontrast auf Hover
- **Vorteil:** Mehr Whitespace, natürlichere Scanbarkeit, moderner Feel

### 2.2 Typografie-Hierarchie
**Aktuell:** Einförmig (klein, grau, bold nur Labels)  
**Neu:**

- **Rechnungsnummer:** `text-lg font-semibold` (primary) — ist die Haupt-Identität
- **Kundenname:** `text-sm text-secondary` — kontextuelle Info
- **Betrag:** `text-2xl font-bold text-primary` — visuelle Dominanz (das ist die Aktion!)
- **Status:** `text-xs` Badge (semantic color)
- **Datum:** `text-xs text-muted` — least important

### 2.3 Spacing & Whitespace
**Aktuell:** `px-4 py-3` durchgehend, dichte Zellenaufteilung  
**Neu:**

- Cards: `p-6` Padding (großzügiger)
- Gap zwischen Cards: `gap-4` (nicht 0)
- Heading-zu-Body-Abstand: `mt-2 mb-3`
- Faustregel: "Atmen lassen" — nicht jedes Feld auf gleicher Höhe

### 2.4 Farb- & Akzent-System
**Aktuell:** Grautonig, subtil  
**Neu:**

- **Primary (Emerald):** Bei Betrag, CTA-Buttons, Hover-State
- **Status-Farben:** Bereits gut (Draft, Open, Paid, Overdue) — weiterführen
- **Hover/Aktiv:** Card bekommt `shadow-lg` + leichte Hintergrund-Erhöhung
- **Fokusring:** WCAG-konform sichtbar (z.B. `ring-2 ring-primary` bei Click)

### 2.5 Microinteractions & Freude
- **Hover auf Card:** Subtle Scale (`scale-105`) ODER Shadow-Erhöhung (nicht beides)
- **Status-Transition:** Wenn Rechnung von "Sent" zu "Paid" geht → kurze Celebration (Icon-Animation oder Confetti-Trigger)
- **Empty State:** Nicht nur Text, sondern Illustration + Call-to-Action (existiert bereits, kann mit Icons erweitert werden)

---

## 3. Constraints (einhalten)

✅ **HTMX-only** — keine React/Vue/Svelte  
✅ **Tailwind v4 Tokens** — Design-Tokens existieren (`--color-primary`, `--color-bg-surface`, etc.)  
✅ **Self-hosted Fonts** — bereits System Font Stack (kein Google Fonts CDN)  
✅ **WCAG 2.1 AA** — Kontrast, Fokusring, semantisches HTML  
✅ **Immutability & kleine Files** — bei Component-Umbauten Stil wahren

---

## 4. Konkrete Umbauten: 2 Kern-Screens

### 4.1 Screen A: Rechnungsliste (invoice-list.ts + Table Component)

#### Aktuell
```
┌─────────────────────────────────────────────────┐
│ Rechnungsnr  │ Kunde     │ Betrag  │ Status    │
├─────────────────────────────────────────────────┤
│ R-2026-001   │ Acme Inc  │ 2500€   │ ✓ Bezahlt │
│ R-2026-002   │ XYZ Ltd   │ 1800€   │ ○ Offen   │
└─────────────────────────────────────────────────┘
```

#### Neu (Card-basiert)
```
┌─────────────────────────────┐
│ R-2026-001                  │  ← Rechnung-ID (lg, bold, primary-color)
│ Acme Inc • Seit 3 Tagen     │  ← Kunde + Info (sm, secondary)
│                             │
│ 2.500€                      │  ← Betrag (2xl, bold, primary)
│ ✓ Bezahlt • 15.05.2026      │  ← Status + Datum (xs, badge + text-muted)
└─────────────────────────────┘
```

**Component-Architektur:**
- Neues Component: `InvoiceCard.ts` (statt reines Table)
- Prop: `invoice: InvoiceListItem`
- Return: Styled `<article>` (semantisch besser als `<tr>`)
- Grid-Layout: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` (responsive)

**CSS-Additions (input.css):**
- `.invoice-card`: Base-Stil (border, border-radius, shadow)
- `.invoice-card:hover`: `shadow-lg scale-105 transition-all duration-300`
- `.invoice-amount`: `text-2xl font-bold text-primary`

#### Implementation-Plan
- [ ] `InvoiceCard.ts` Component schreiben
- [ ] `invoice-list.ts` umbauen: `Table` → `InvoiceCard` Grid
- [ ] CSS-Tokens in `input.css` (`.invoice-card` Utilities)
- [ ] Test: Visuelle Parity, Responsive-Verhalten, A11y (Fokusring)
- [ ] PR: Max 250 LOC (reines Umrollen)

---

### 4.2 Screen B: Rechnungs-Detail (invoice-detail.ts)

#### Aktuell
- Listen-artig, dichte Felder-Darstellung
- Wenig Hierarchie zwischen Kopfdaten, Positionen, Summen

#### Neu (Section-basiert mit besserem Spacing)

**Sektion 1: Header**
```
Rechnung R-2026-001
Erstellt: 15.05.2026 | Fällig: 20.05.2026
Status: ✓ Bezahlt (grüner Badge)
```

**Sektion 2: Kundeninfo + Lieferungs-Daten**
```
Kunde
Acme Inc
info@acme.com

Lieferadresse  
[adresse]
```

**Sektion 3: Positionen (Tabelle, aber weniger dicht)**
```
┌──────────────────────────────────────────────┐
│ Beschreibung    │ Menge │ Einheit │ Betrag   │
├──────────────────────────────────────────────┤
│ Entwicklung     │ 20h   │ 150€/h  │ 3000€    │
└──────────────────────────────────────────────┘
```
(Tabelle bleibt hier OK, weil Positionen-Liste intrinsisch tabellarisch ist)

**Sektion 4: Summen**
```
Summe netto       3000€
MwSt (19%)         570€
────────────────────────
GESAMT            3570€  ← Große, bold, primary color
```

**CSS-Strategie:**
- Section-`<div>` mit `mb-8` Spacing
- Heading-Tag (`<h2>`) für jede Sektion
- Sub-Felder in 2er/3er Grids (`grid grid-cols-2 gap-4`)
- Total-Row: `text-2xl font-bold text-primary`

#### Implementation-Plan
- [ ] `invoice-detail.ts` Layout refaktorieren (Sections + Spacing)
- [ ] CSS: Section-Utilities, Total-Styling
- [ ] Test: Scanbarkeit, Leseflusss
- [ ] PR: Max 300 LOC (Struktur-Anpassung)

---

## 5. Farbpalette — Zusätzliche Tokens (optional für Phase 2)

Falls noch nicht vorhanden, erweitern in `input.css`:

```css
@theme {
  /* Card-Interaktion */
  --shadow-card-hover: 0 10px 15px -3px rgb(0 0 0 / 0.15);  /* etwas größer */
  --duration-interaction: 200ms;
  
  /* Typo-Spacing */
  --spacing-card: 1.5rem;  /* padding */
  --gap-card-grid: 1rem;    /* gap zwischen cards */
}
```

---

## 6. Akzeptanzkriterien (Phase 1)

✅ Design-Konzept dokumentiert (dieses Dokument)  
✅ Invoice-List als Card-Grid umgebaut  
✅ Invoice-Detail mit Section-Struktur  
✅ Beide Screens WCAG-konform (Kontrast, Fokusring, semantisches HTML)  
✅ Responsive: Mobile → Tablet → Desktop  
✅ Keine äußeren CDN-Abhängigkeiten (EU-Compliance bleibt intakt)  
✅ PRs jeweils <400 LOC Soft-Limit

---

## 7. Phase 2 (Backlog)

- Kunden-List: Card-Grid-Transformation
- Projekte-Übersicht: Ähnliche Struktur
- Zeiten-Tracking: Könnte Card-basiert oder Inline-Bearbeitung sein
- Dashboard: KPI-Karten (Einnahmen, Anzahl Rechnungen, etc.)
- Microinteractions: Status-Übergänge, Celebration-Animationen
- Dark Mode: Sicherstellen, dass neue Farb-Akzente auch im Dark Mode funktionieren

---

## 8. Next Steps

1. **Board-Genehmigung:** Dieses Dokument reviewen, Feedback zu Direction
2. **Frontend-Implementation:** 2 Screens als separate PRs
3. **User-Test:** Nachdem gemerged, kurze User-Session mit dem Board
4. **Iteration:** Phase 2 basierend auf Feedback

---

**Design-Philosophie:** Whitespace + Hierarchie + Emotion = Applikation, keine Tabellenkalkulation.
