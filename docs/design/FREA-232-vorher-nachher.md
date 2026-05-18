# FREA-232: Vorher/Nachher Visualisierung

## Screen 1: Rechnungsliste

### VORHER (Tabellenkalkulation-Look)
```
┏━━━━━━━━━━━━━━┳━━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━━━┳━━━━━━━━┓
┃ Rechnungsnr  ┃ Kunde     ┃ Betrag  ┃ Status  ┃ Rechnung  ┃ Fällig ┃
┡━━━━━━━━━━━━━━╇━━━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━━━╇━━━━━━━━┩
│ R-2026-001   │ Acme Inc  │ 2.500€  │ ✓ Paid  │ 15.05.26  │ 20.05  │
├──────────────┼───────────┼─────────┼─────────┼───────────┼────────┤
│ R-2026-002   │ XYZ Ltd   │ 1.800€  │ ○ Open  │ 14.05.26  │ 21.05  │
├──────────────┼───────────┼─────────┼─────────┼───────────┼────────┤
│ R-2026-003   │ Beta Corp │ 3.200€  │ ○ Open  │ 10.05.26  │ 17.05⚠ │
└──────────────┴───────────┴─────────┴─────────┴───────────┴────────┘
```

**Eigenschaften:**
- ❌ Dicht, "Excel-Eindruck"
- ❌ Alle Daten gleichzeitig sichtbar, keine Hierarchie
- ❌ Graue Typografie, keine visuellen Akzente
- ❌ Scanning-Richtung: links→rechts (unnatürlich für Card-UI)

---

### NACHHER (Card-Grid, Modern)
```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ R-2026-001           │  │ R-2026-002           │  │ R-2026-003           │
│ Acme Inc             │  │ XYZ Ltd              │  │ Beta Corp            │
│                      │  │                      │  │                      │
│ 2.500€               │  │ 1.800€               │  │ 3.200€               │
│ ✓ Paid • 20.05.2026  │  │ ○ Open • 21.05.2026  │  │ ○ Open • 17.05.2026⚠ │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
    (Hover: Shadow ↑)
```

**Eigenschaften:**
- ✅ Whitespace, "App-Gefühl"
- ✅ Visuelle Hierarchie: Rechnung-ID (groß) → Kunde → **Betrag (XL)** → Status
- ✅ Grün + Akzent-Farben verwenden (Bezahlt = grün, Offen = blau)
- ✅ Scanning-Richtung: Top→Bottom (natürlich für Cards)
- ✅ Responsive: 1 Col (Mobile), 2 Col (Tablet), 3 Col (Desktop)
- ✅ Hover/Interaktion: `scale-105` + `shadow-lg` → "Clickable"-Feel

---

## Screen 2: Rechnungs-Detail

### VORHER (Listig, dicht)
```
═══════════════════════════════════════════════════════════════
                      RECHNUNG R-2026-001
  Erstellt: 15.05.2026 │ Fällig: 20.05.2026 │ Status: ✓ Paid
───────────────────────────────────────────────────────────────
KUNDE                              LIEFERADRESSE
Acme Inc                           Acme Inc
info@acme.com                      Musterstr. 1
                                   12345 Berlin
───────────────────────────────────────────────────────────────
┌─────────────────────┬───────┬────────┬──────────┐
│ Beschreibung        │ Menge │ Einheit│ Betrag   │
├─────────────────────┼───────┼────────┼──────────┤
│ Entwicklung         │ 20    │ 150€/h │ 3.000€   │
│ Support             │ 5     │ 100€/h │   500€   │
└─────────────────────┴───────┴────────┴──────────┘
───────────────────────────────────────────────────────────────
Summe netto           3.500€
MwSt (19%)              665€
─────────────────────────────
GESAMT                4.165€
```

**Eigenschaften:**
- ❌ Kompakt, wenig visuellen Raum
- ❌ Alle Infos auf gleicher Hierarchie
- ❌ Keine klare Sektion-Trennung
- ❌ Total nicht wirklich prominent

---

### NACHHER (Section-basiert, hierarchisch)

```
═══════════════════════════════════════════════════════════════

    R-2026-001
    Erstellt: 15.05.2026 │ Fällig: 20.05.2026
    Status: ✓ Paid (grüner Badge)

───────────────────────────────────────────────────────────────

    KUNDE                          LIEFERADRESSE
    
    Acme Inc                       Acme Inc
    info@acme.com                  Musterstr. 1
                                   12345 Berlin

───────────────────────────────────────────────────────────────

    POSITIONEN

    ┌─────────────────────┬───────┬────────┬──────────┐
    │ Beschreibung        │ Menge │ Einheit│ Betrag   │
    ├─────────────────────┼───────┼────────┼──────────┤
    │ Entwicklung         │ 20    │ 150€/h │ 3.000€   │
    │ Support             │ 5     │ 100€/h │   500€   │
    └─────────────────────┴───────┴────────┴──────────┘

───────────────────────────────────────────────────────────────

    ZUSAMMENFASSUNG

    Summe netto (brutto)        3.500€
    MwSt (19%)                    665€
    
    ╔═════════════════════════════════════╗
    ║     GESAMTBETRAG   4.165€           ║  ← Groß, Bold, Primary-Farbe
    ╚═════════════════════════════════════╝
```

**Eigenschaften:**
- ✅ Großzügiges Spacing (mb-8 zwischen Sektionen)
- ✅ Klare Hierarchie: Header → Partei-Info → Positionen → Total
- ✅ Total ist prominent (2xl, bold, primary color)
- ✅ Scannbar: vertikale Struktur
- ✅ Responsive: Grids werden zu Single-Column auf Mobile

---

## Farb-Scheme (Tokens aus `input.css`)

| Element | Farbe | Token |
|---------|-------|-------|
| Rechnungsnummer / Total | Emerald (Primary) | `--color-primary` |
| Status Paid | Grün | `--color-accent-success` |
| Status Open | Blau | `--color-accent-info` |
| Status Overdue | Rot | `--color-accent-danger` |
| Text Primary | Dunkel-Grau | `--color-text-primary` |
| Text Secondary | Mittel-Grau | `--color-text-secondary` |
| Muted (Datum) | Hell-Grau | `--color-text-muted` |
| Background | Weiß (Light) / Dunkel (Dark) | `--color-bg-surface` |

---

## Motion & Interaktion

### Card Hover
```
Before:  ┌──────────────────────┐
         │ R-2026-001           │
         │ ...                  │
         └──────────────────────┘

After:   ┌──────────────────────┐
         │ R-2026-001           │  ← Leicht nach oben (scale: 105%)
         │ ...                  │  ← Schatten wird größer
         └──────────────────────┘
         
CSS:     .hover:shadow-card-hover .hover:scale-105
         transition-all duration-300
```

### Focus-Ring (A11y)
```
Before:  ┌──────────────────────┐
         │ R-2026-001           │
         └──────────────────────┘

After:   ┌─────────────────────────┐
         │ ╔════════════════════════╗
         │ ║ R-2026-001             ║  ← Ring (2px, primary-color)
         │ ║ ...                    ║
         │ ╚════════════════════════╝
         
CSS:     .focus:ring-2 .focus:ring-primary
```

---

## Implementierungs-Checkliste

- [x] Design-Richtung dokumentieren
- [x] InvoiceCard Component schreiben
- [x] invoice-list.ts umbauen (Table → Grid)
- [x] CSS-Tokens erweitern (shadow-card-hover)
- [ ] CSS-Build lokal testen (nur mit bun run dev möglich)
- [ ] PR #1: Rechnungsliste (invoice-card + invoice-list Umbauten)
- [ ] PR #2: Rechnungs-Detail (Section-Struktur)
- [ ] Board-Review: Visuell gegenprüfen
- [ ] User-Feedback einarbeiten (Phase 2)
