---
name: reiseplanung
description: |
  Reiseplanung mit korrekter Entfernungs- und Fahrzeitberechnung.
  Beruecksichtigt Fahrzeugtyp (PKW, Wohnwagen, Wohnmobil) fuer realistische Zeiten.
  Campingplatz-Suche via OSM Overpass + camping.info Anreicherung.
triggers:
  - "plan eine Reise"
  - "plan a trip"
  - "Reiseplanung"
  - "Route berechnen"
  - "Fahrtzeit von"
  - "wie weit ist es"
  - "trip to"
  - "Urlaub nach"
  - "Fahrt nach"
  - "Campingplatz"
  - "Camping bei"
  - "Campingplaetze"
category: "Productivity"
---

# Reiseplanung Skill

Reiseplanung mit korrekten Entfernungen und realistischen Fahrzeiten je nach Fahrzeug.

## Fahrzeugtypen & Geschwindigkeiten

| Fahrzeug | Durchschnitt | Autobahn max |
|----------|-------------|--------------|
| PKW | 110 km/h | 130+ |
| PKW + Wohnwagen | **80 km/h** | 100 |
| Wohnmobil | **90-100 km/h** | 100-120 |

## Profile

```yaml
# familie-thedens.yaml
name: Familie Thedens
personen: 5
fahrzeug:
  typ: PKW mit Wohnwagen
  durchschnitts_kmh: 80
  max_tagesfahrzeit: 5h
```

## Campingplatz-Suche

- **Modus 1:** Suche um Ort (OSM Overpass)
- **Modus 2:** Campingplaetze entlang Route
- **Modus 3:** Preis-Check fuer konkreten Platz

## Trigger

- "plan eine Reise"
- "Route berechnen"
- "Campingplatz suchen"

## Paul II Relevanz

**Relevanz: Niedrig** — Nur fuer Josts persoenliche Reiseplanung. Nicht meine Kernaufgaben.
