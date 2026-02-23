---
name: evals
description: |
  Systematisches Evaluations-Framework zur Messung von Skill-Qualitaet, Regression-Detektion und Validierung von Verbesserungen.
  Basiert auf Anthropic's "Demystifying Evals for AI Agents".
  FUER PAUL II: Testen und Validieren meiner eigenen Faehigkeiten.
triggers:
  - "run evals"
  - "test skill"
  - "eval suite"
  - "regression test"
  - "quality check"
  - "validate skill"
---

# Evals Framework

Systematische Skill-Evaluation - Messen, Validieren, Verbessern.

## Core Concepts

| Konzept | Beschreibung |
|---------|--------------|
| **Grader Types** | Code-based (schnell, kostenlos, deterministisch) vs Model-based (flexibel, kostenpflichtig) |
| **pass@k** | Wahrscheinlichkeit von >= 1 Erfolg in k Versuchen: `1 - (1-p)^k` |
| **pass^k** | Wahrscheinlichkeit von k/k Erfolgen: `p^k` |
| **Capability Tests** | ~70% Pass-Ziel, Stretch Goals |
| **Regression Tests** | ~99% Pass-Ziel, Quality Gates |

## Grader-Typen

| Type | Use Case |
|------|----------|
| `string_match` | Exact/Fuzzy String Matching |
| `regex_match` | Pattern Matching |
| `binary_tests` | Command Exit Code Pass/Fail |
| `file_check` | File Existence, Content, Structure |
| `llm_rubric` | Quality Rubric via LLM (haiku) |
| `natural_language_assert` | Boolean Assertion via LLM |

## Quick Start

```bash
bun ~/.claude/skills/evals/Tools/TrialRunner.ts --suite my-skill
bun ~/.claude/skills/evals/Tools/SuiteManager.ts --list
bun ~/.claude/skills/evals/Tools/SuiteManager.ts --create my-skill
bun ~/.claude/skills/evals/Tools/FailureToTask.ts --suite my-skill
```

## Best Practices

1. Starte mit Regression Tests (99%+ Pass Rate)
2. Fuege Capability Tests schrittweise hinzu (70% Ziel)
3. Nutze Code-Based Grader zuerst (schneller, guenstiger)
4. Kalibriere Model-Based Grader mit menschlichen Stichproben
5. Verfolge Metriken ueber Zeit in `Results/`

## Trigger

- "run evals"
- "test skill"
- "eval suite"
- "regression test"
- "quality check"
- "validate skill"

## Paul II Relevanz

**Relevanz: Mittel** — Evaluiert und verbessert meine eigenen Faehigkeiten. Quality Assurance fuer Paul II System.
