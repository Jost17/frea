---
name: interview-mode
description: |
  Systematisches Feature-Interview in 5 Kategorien vor Implementation.
  Output: Strukturierte Spezifikation.
  FUER PAUL II: Qualitaetssicherung vor Implementierung.
triggers:
  - "/interview"
  - "interview mode"
  - "feature interview"
  - "interview mich"
category: productivity-tools
---

# Interview Mode

Systematisches Feature-Interview in 5 Kategorien vor Implementation.

## 5 Interview-Kategorien

| # | Kategorie | Fragen zu |
|---|-----------|-----------|
| 1 | Technical Implementation | Architektur, Stack, Dependencies, Datenmodell |
| 2 | UI & UX | User Journey, Feedback, Responsive, Accessibility |
| 3 | Edge Cases | Fehler, Grenzfaelle, Validation, Concurrent Access |
| 4 | Concerns | Security, Performance, Skalierbarkeit, Monitoring |
| 5 | Tradeoffs | Kompromisse, Tech Debt, MVP vs Full, Alternativen |

## Workflow

1. **Input:** Feature-Beschreibung erfassen
2. **Interview:** 5 Kategorien mit je 2-3 Fragen
3. **Output:** Spec-Datei → `~/.claude/scratchpad/SPEC_{feature-name}.md`

## Key Rules

- Fragen muessen **nicht-trivial** sein
- Tiefgehende, architekturelle Fragen
- Bei unklaren Antworten: Nachfragen statt annehmen
- **Empfehlung:** Neue Session fuer Implementation nach Interview

## Trigger

- "/interview"
- "interview mode"
- "feature interview"
- "interview mich"

## Paul II Relevanz

**Relevanz: Mittel** — Qualitaetssicherung vor Implementierung. Paul II's "Systeme > Ziele" Prinzip.
