# UI-Smoketests & Produktions-Checkliste

## Übersicht

Dieses Dokument enthält:
- **Smoketest-Checklisten** für alle Kernflüsse (Desktop + Mobile)
- **Freigabe-Checkliste** vor Produktions-Tag
- **Release-Marker** für Abnahmestatus pro Version

---

## Kernfluss-Smoketests

### F1: Dashboard

**Zweck:** KPI-Übersicht lädt korrekt, keine leerer State ohne Daten

#### Desktop

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| D1.1 | `/` im Browser öffnen | Dashboard-Seite mit Navigation |
| D1.2 | Alle 5 KPI-Karten sichtbar | "Offene Rechnungen", "Umsatz diesen Monat", "Überfällig", "Aktive Kunden", "Aktive Projekte" |
| D1.3 | KPI-Werte numerisch | Keine "NaN", "undefined" oder leere Felder |
| D1.4 | Nav-Badge "Überfällig" bei offenen Posten | Badge-Zahl stimmt mit Anzahl überfälliger Rechnungen überein |
| D1.5 | Dark/Light-Toggle funktioniert | Theme wechselt, kein FOUC |
| D1.6 | Navigation Links funktionieren | Klicken auf "Kunden" → `/kunden` |

#### Mobile

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| M1.1 | `/` auf Smartphone öffnen | Responsive Layout, Mobile-Menü sichtbar |
| M1.2 | Hamburger-Menü öffnen | Slide-down Nav mit allen 6 Links |
| M1.3 | KPI-Karten scrollbar bei wenig Platz | Horizontales Scrollen oder gestapelte Karten |
| M1.4 | Alle Touch-Targets ≥ 44px | Buttons/Links ausreichend groß |

---

### F2: Kunden (CRUD)

**Zweck:** Kunden anlegen, bearbeiten, löschen ohne Datenverlust

#### Desktop

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| D2.1 | `/kunden` öffnen | Liste der Kunden (oder leere State-Nachricht) |
| D2.2 | "Neuer Kunde"-Button klicken | Formular-Modal oder Inline-Formular |
| D2.3 | Pflichtfelder ausfüllen: Name, E-Mail | Keine Validierungsfehler bei korrekter Eingabe |
| D2.4 | Kunde speichern | Zur Liste zurück, neuer Kunde sichtbar |
| D2.5 | Kunde bearbeiten | Formular mit vorhandenen Daten vorausgefüllt |
| D2.6 | Kunde löschen | Bestätigungsdialog, nach Bestätigung entfernt |
| D2.7 | Kunde mit Projekten löschen | Warnhinweis "Kunde hat X Projekte" |
| D2.8 | Doppelte E-Mail | Validierungsfehler wird angezeigt |

#### Mobile

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| M2.1 | `/kunden` auf Smartphone | Kundenliste scrollbar, FAB sichtbar |
| M2.2 | Neuer Kunde auf Mobile | Vollbild-Formular, Tastatur drückt Content nicht weg |
| M2.3 | Löschen bestätigen | Dialog passt auf Screen, Buttons erreichbar |

---

### F3: Projekte (CRUD)

**Zweck:** Projekte verwalbar, Tagessatz und Budget korrekt

#### Desktop

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| D3.1 | `/projekte` öffnen | Projektliste (oder leerer State) |
| D3.2 | "Neues Projekt" → Kunde auswählen | Dropdown zeigt alle aktiven Kunden |
| D3.3 | Tagessatz eingeben | Numerisch, max. 2 Dezimalstellen |
| D3.4 | Budget (optional) eingeben | Numerisch, ≥ Tagessatz |
| D3.5 | Projekt speichern | In Liste sichtbar, verknüpft mit Kunde |
| D3.6 | Projekt bearbeiten | Formular vorausgefüllt, Tagessatz änderbar |
| D3.7 | Projekt deaktivieren | Verschwindet aus Dropdown bei neuen Projekten, bleibt in History |
| D3.8 | Projekt mit Zeiteinträgen deaktivieren | Warnhinweis |

#### Mobile

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| M3.1 | `/projekte` auf Mobile | Karten oder Liste scrollbar |
| M3.2 | Projekt-Dropdown auf Mobile | Native Select oder accessible Dropdown |

---

### F4: Zeiterfassung

**Zweck:** Zeiteinträge pro Projekt erfassen, abrechenbar/nicht abrechenbar

#### Desktop

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| D4.1 | `/zeiten` öffnen | Wochenübersicht oder Listenansicht |
| D4.2 | "Neuer Eintrag" → Projekt auswählen | Dropdown mit aktiven Projekten |
| D4.3 | Datum auswählen | Kalender-Widget oder Datumsfeld |
| D4.4 | Stunden eingeben | Numerisch, validiert (0-24) |
| D4.5 | "Abrechenbar" toggle | Checkbox oder Toggle-Switch |
| D4.6 | Eintrag speichern | In Liste/Grid sichtbar |
| D4.7 | Wochenaggregation prüfen | Summe der Stunden pro Woche korrekt |
| D4.8 | Filter: nur abrechenbar | Gefilterte Liste zeigt nur abrechenbare |
| D4.9 | Eintrag bearbeiten | Vorhandene Werte im Formular |
| D4.10 | Eintrag löschen | Aus Liste entfernt, Summen aktualisiert |

#### Mobile

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| M4.1 | `/zeiten` auf Mobile | Wochenansicht horizontal scrollbar |
| M4.2 | Neuer Eintrag auf Mobile | Formularvollbild, Datumsfeld nutzbar |

---

### F5: Rechnungen

**Zweck:** Rechnung erstellen, Vorschau, Status-Verlauf

#### Desktop

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| D5.1 | `/rechnungen` öffnen | Rechnungsliste mit Status-Badges |
| D5.2 | "Neue Rechnung" → Kunde wählen | Kunde + Projekt-Filter |
| D5.3 | Zeiteinträge auswählen | Checkbox-Liste abrechenbarer Einträge |
| D5.4 | Automatische Summenberechnung | Netto, MwSt, Brutto korrekt |
| D5.5 | MwSt pro Position | Keine Gesamt-MwSt-Berechnung |
| D5.6 | Rechnung speichern als Entwurf | Status = "Entwurf" |
| D5.7 | Rechnung-Vorschau öffnen | PDF-Vorschau oder HTML-Preview |
| D5.8 | Rechnung als versendet markieren | Status = "Versendet", Datum gesetzt |
| D5.9 | Rechnung als bezahlt markieren | Status = "Bezahlt", Dashboard aktualisiert |
| D5.10 | Überfällige Markierung | Rechnungen > 30 Tage überfällig automatisch hervorgehoben |
| D5.11 | Rechnungsnummer Format | YYYY-NNN (z.B. 2025-001) |
| D5.12 | PDF-Download | Download startet, Datei ist valides PDF |

#### Mobile

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| M5.1 | `/rechnungen` auf Mobile | Karten-Ansicht, Status sichtbar |
| M5.2 | Neue Rechnung auf Mobile | Step-by-Step Wizard oder Scroll-Formular |
| M5.3 | PDF-Vorschau auf Mobile | Inline oder Fullscreen-View |

---

### F6: Einstellungen

**Zweck:** Firmendaten korrekt gespeichert und auf Rechnungen verwendet

#### Desktop

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| D6.1 | `/einstellungen` öffnen | Formular mit allen Feldern |
| D6.2 | Firmenname eingegeben | Wird in Rechnungs-Preview verwendet |
| D6.3 | IBAN eingegeben | Validierung (DE + 22 Zeichen) |
| D6.4 | BIC eingegeben | Automatisch aus IBAN-ableitbar oder manuell |
| D6.5 | Steuernummer oder USt-IdNr | Eines von beiden Pflicht |
| D6.6 | Standard-MwSt-Satz | Vorausgefüllt (19%), änderbar pro Rechnung |
| D6.7 | Speichern → Erfolg | Toast/Flash-Nachricht "Gespeichert" |
| D6.8 | Rechnungsvorlage aktualisiert | Änderungen in Rechnungs-Preview sichtbar |

#### Mobile

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| M6.1 | `/einstellungen` auf Mobile | Alle Felder scrollbar, keine abgeschnittenen Inputs |

---

### F7: Onboarding (Erstinstallation)

**Zweck:** Neue Installation führt durch Grundeinrichtung

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| O1 | Frische DB → `/` öffnen | Redirect zu `/onboarding` oder Einrichtungs-Hinweis |
| O2 | Onboarding abschließen | Nach Speichern → Dashboard |
| O3 | Erster Kunde anlegen | Hinweis auf Dashboard verschwindet |

---

## Cross-Cutting Tests

### Dark/Light Mode

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| C1 | Light → Dark | Kein FOUC, alle Texte lesbar |
| C2 | Dark → Light | Kontraste ausreichend (≥ 4.5:1) |
| C3 | Theme-Persitenz | Nach Reload bleibt Theme |

### HTMX-Interaktionen

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| H1 | Formular absenden | Kein Full-Page-Reload |
| H2 | Erfolgsmeldung | Toast-Notification erscheint |
| H3 | Fehlerbehandlung | Fehlermeldung im Formular, nicht als Alert |
| H4 | Loading-State | Button zeigt "Laden..." oder Spinner |
| H5 | Abbruch/Back | Browser-History funktioniert korrekt |

### Accessibility

| # | Prüfpunkt | Erwartetes Ergebnis |
|---|-----------|---------------------|
| A1 | Tastatur-Navigation | Alle interaktiven Elemente erreichbar via Tab |
| A2 | Fokus-Indikator | Deutlicher Fokus-Ring auf allen Elementen |
| A3 | Screenreader | ARIA-Labels auf Icons und Buttons |
| A4 | Skip-Link | "Zum Hauptinhalt" am Seitenanfang |

---

## Produktions-Freigabe-Checkliste

### Vor jedem Release-Tag ausfüllen

- [ ] Alle Smoketests (`F1`–`F7`) auf **Staging** bestanden
- [ ] Cross-Cutting Tests bestanden
- [ ] Keine `console.error` im Browser-Log
- [ ] `bun run check` → kein Fehler
- [ ] `bun run typecheck` → kein Fehler
- [ ] `bun test` → alle Tests grün
- [ ] README.md Version aktuell
- [ ] CHANGELOG.md Eintrag vorhanden (falls vorhanden)
- [ ] Backup der SQLite-DB erstellt
- [ ] Rollback-Pfad dokumentiert (in Deployment-Log)

### Nach Production-Deployment

- [ ] Smoke-Test auf `/` und `/dashboard` erfolgreich
- [ ] KPI-Werte auf Dashboard plausibel
- [ ] Keine 5xx-Fehler in Logs

---

## Release-Marker

Im Deployment-Log oder GitHub-Release vermerken:

```
## vX.Y.Z — YYYY-MM-DD

**Freigabe-Status:** ✅ Produktiv
**Getestet von:** [Name]
**Smoketest:** Bestanden am [Datum]

Abnahmeprotokoll:
- [ ] F1 Dashboard
- [ ] F2 Kunden
- [ ] F3 Projekte
- [ ] F4 Zeiten
- [ ] F5 Rechnungen
- [ ] F6 Einstellungen
- [ ] F7 Onboarding
```

---

## Fehler-Kategorisierung

| Schwere | Beschreibung | Beispiele |
|---------|-------------|-----------|
| **Kritisch** | Rechnungs-PDF fehlerhaft, Datenverlust | Summe stimmt nicht, PDF leer |
| **Hoch** | Kernfluss unterbrochen | Kunde anlegen funktioniert nicht |
| **Mittel** | UX-Problem, Workaround existiert | Button-Stil inkonsistent |
| **Niedrig** | Kosmetisch | Tippfehler, Padding |

**Regel:** Kritisch/Hoch muss vor Release behoben werden. Mittel/Niedrig darf in Follow-up-Ticket.
