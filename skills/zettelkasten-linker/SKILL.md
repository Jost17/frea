---
name: zettelkasten-linker
description: |
  Cross-Source Verlinkung von Permanent Notes ueber Quellen-Grenzen hinweg.
  Verbindet neue PNs mit ALLEN existierenden PNs - nicht nur innerhalb einer Quelle.
triggers:
  - "verlinke PNs"
  - "zettelkasten linking"
  - "cross-link notes"
  - "vernetze permanent notes"
  - "link across sources"
  - "link my permanent notes"
  - "link my notes"
  - "connect my notes"
  - "PN verlinken"
---

# Zettelkasten Linker

Cross-Source PN-Vernetzung ueber Quellen-Grenzen hinweg.

## Modi

| Modus | Trigger | Beschreibung |
|-------|---------|-------------|
| Inline | Automatisch nach PN-Erstellung | Top 5 Kandidaten, User waehlt |
| Bulk | "verlinke PNs", "cross-link" | 3-Phasen: Map → Auto-Prompt → Parallel → Spotcheck |

## Inline-Modus (Single PN)

1. Tags extrahieren → Kandidaten mit ≥2 gemeinsamen Tags finden
2. Diversity Penalty (GeAR): `adjusted_score = base_score × exp(-min(count, 3) / 3)`
3. Top 5 praesentieren (Titel + Kerngedanke + Match-Score)
4. Bidirektionale Links: "## Verbindungen" + "## Siehe auch"

## Bulk-Modus (3 Phasen)

1. **Analyse:** Ziel-Notes + Vault scannen → Cross-Source Link-Map
2. **Auto-Prompt + Implementierung:** Ziel-PNs auto-identifizieren → Cluster auto-generieren → Parallele Agenten
3. **Spotcheck:** Stichproben, Bidirektionalitaet, keine Broken Links

## Link-Kriterien

Verlinken bei: Thematische Naehe, Ergaenzung, Kontrast, Kausalitaet, gleiches Prinzip/anderer Kontext.
NICHT bei: Nur gleicher Tag, oberflaechliche Keywords, >7 Links pro Note.

## Trigger

- "verlinke PNs"
- "zettelkasten linking"
- "cross-link notes"
- "vernetze permanent notes"

## Paul II Relevanz

**Relevanz: Niedrig** — Nur fuer Josts Zettelkasten. Nicht meine Kernaufgaben.
