---
name: kinder-tutor
description: |
  Erstellt Uebungsblaetter fuer Ida (Klasse 2) und Janne (Klasse 4) basierend auf dem Hamburg Bildungsplan 2023.
  PDF-Export und Tracking in Obsidian.
  NUR FUER JOST: Familien-Skill fuer Kinder-Hausaufgaben.
triggers:
  - "Uebungsblatt fuer"
  - "Aufgaben fuer Ida"
  - "Aufgaben fuer Janne"
  - "Schule:"
  - "Hausaufgaben fuer"
  - "Mathe-Aufgaben fuer"
  - "Deutsch-Aufgaben fuer"
  - "Englisch-Aufgaben fuer"
  - "Uebung fuer Ida"
  - "Uebung fuer Janne"
  - "worksheet for Ida"
  - "worksheet for Janne"
category: Familie
auto_trigger: false
---

# Kinder-Tutor

Uebungsblaetter fuer Ida und Janne nach Hamburg Bildungsplan 2023.

## Kinder-Profile

| Name | Klasse | Faechter |
|------|--------|----------|
| **Janne** (9J) | 4 | Deutsch, Mathe, Englisch |
| **Ida** (7J) | 2 | Deutsch, Mathe, Englisch |

## Format-Regeln

- **Max 4 Hauptaufgaben** pro Seite (max 4 Unterau- **Schwierfgaben je)
igkeit:** 2x leicht, 1x mittel, 1x schwer
- **Sprache:** Deutsche Rechtschreibung, kindgerecht

## Workflow

1. **Kind + Thema erkennen** → Fach automatisch
2. **Curriculum laden** → `curriculum/klasse-{n}.md`
3. **Aufgaben generieren** → Prinzipien aus `pedagogy/design-principles.md`
4. **PDF erstellen** → `~/Downloads/Tutor/{Kind}/{Datum}_{Thema}.pdf`
5. **Tracking** → `200 Areas/Familie/Schule/{Kind}/Uebungsblaetter-Uebersicht.md`

## Output

- **Aufgaben-PDF** → `~/Downloads/Tutor/{Kind}/{Datum}_{Thema}.pdf`
- **Loesungs-PDF** → `~/Downloads/Tutor/{Kind}/{Datum}_{Thema}_Loesungen.pdf`

## Trigger

- "Uebungsblatt fuer"
- "Aufgaben fuer Ida/Janne"
- "Schule:"
- "Mathe/Deutsch/Englisch fuer"

## Paul II Relevanz

**Relevanz: Niedrig** — Nur fuer Josts Familie. Nicht meine Kernaufgaben.
