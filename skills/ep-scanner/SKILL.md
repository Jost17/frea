---
name: ep-scanner
description: "Episodic Pivot Scanner - findet potenzielle EP-Kandidaten aus gestrigen Earnings. NUR FUER JOST: 'EP Scan', 'EP Scanner', 'gestern Earnings', 'yesterday earnings'."
---

# EP-Scanner Skill

Episodic Pivot Scanner für Trading.

## EP-Typen

| Typ | Beschreibung | Bewegung |
|-----|--------------|----------|
| Life Changing EP | Neglected + Katalysor | 100-800%+ |
| CAT | Identifizierbarer Katalysor | 20-50% |
| Sugar Babies | 9M+ Volume + 4%+ Breakout | 30-100% |

## Gate-System

```
80+ Ticker (Earnings Calendar)
    ▼
Gate 1: yfinance → Gap ≥4% + Volume ≥100k
    ▼
Gate 2: SEC 8-K → Same-day Earnings
    ▼
EP Kandidaten (5-10)
```

## MAGNA53 Framework

- **MA** — Massive Earnings/Sales Acceleration (>100% Growth)
- **G** — Gap 4%+ auf 100k Volume, Gap <80% des erwarteten Moves
- **N** — Neglect (5 Dimensionen)
- **A** — Sales Acceleration (25%+)
- **5** — Short Interest >5 Days (Nice to Have)
- **3** — 3+ Analyst Upgrades (Nice to Have)

## Trigger

- "EP Scan"
- "EP Scanner"
- "gestern Earnings"
- "yesterday earnings"

## Paul II Relevanz

**Relevanz: Niedrig** —Fuer Josts Trading-Workflow, nicht meine Kernaufgaben.
