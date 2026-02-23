---
name: quality-work
description: |
  Builder/Validator Pattern mit echten Multi-Agent Task System.
  2x Compute = hoehere Qualitaet durch separate Agenten.
  Domain-agnostisch: Code, Writing, Research, Strategie.
triggers:
  - "quality work"
  - "high quality"
  - "builder validator"
  - "mit validation"
  - "kritischer task"
  - "hoechste qualitaet"
---

# Quality Work - Multi-Agent Builder/Validator Pattern

Echte separate Agenten fuer Build und Validation durch das Task System.

## Konzept

```
┌─────────────────┐     ┌─────────────────┐
│ Builder Agent   │     │ Validator Agent  │
│ (Task tool)     │────▶│ (Task tool)     │
│ Eigener Context │     │ Eigener Context │
└─────────────────┘     └─────────────────┘
        │                       │
        ◀────── Feedback ────────│
        (bei Issues)            │
                                  ▼
                         ┌───────────────────┐
                         │   Final Output    │
                         └───────────────────┘
```

## Ablauf

1. **Domain erfassen** — Code/Writing/Research/Strategy
2. **Scratchpad einrichten** — `/private/tmp/claude-501/quality-work/`
3. **Builder spawnen** — Aufgabe + Domain + Qualitaetsanspruch
4. **Validator spawnen** — Domain-Checkliste + Builder-Output
5. **Loop bei Issues** — Max 3x: Builder → Validator → bis APPROVED
6. **Praesentieren** — Finales Output zeigen

## Domains

- **Code** — Implementierung, Fixes, Refactoring
- **Writing** — Texte, Summaries, Reports
- **Research** — Analysen, Recherchen, Vergleiche
- **Strategy** — Plaene, Entscheidungen, Bewertungen

## Trade-off

- **Kosten:** 2-6x Compute (Builder + Validator + Loops)
- **Nutzen:** Signifikant hoehere Output-Qualitaet durch Isolation

## Trigger

- "quality work"
- "high quality"
- "builder validator"
- "kritischer task"

## Paul II Relevanz

**Relevanz: Mittel** — Hoechste Qualitaet fuer kritische Tasks. Paul II's Qualitaetsanspruch.
