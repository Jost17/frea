---
name: youtube-curator
description: |
  Automatische YouTube-Kuratierung fuer 42 abonnierte Kanaele.
  AI/ML (19), Productivity (7), Tech/Business (8), Trading (8).
  NUR FUER JOST: Persoenliche Video-Queue.
triggers:
  - "check YouTube"
  - "was gibt's Neues auf YouTube"
  - "YouTube queue"
  - "neue Videos"
auto_activate:
  - context: morning-check-in
---

# YouTube Curator Skill

Automatische YouTube-Kuratierung fuer Jost.

## Kanaele (42 in 4 Kategorien)

- **AI/ML** (19): IndyDevDan, Unsupervised Learning, AI Labs, DeepLearning.AI, Karpathy, Kilcher, AI Explained, Matt Williams, Cole Medin, WorldofAI, All About AI, Dave Shap, Berman, Wes Roth, ML Street Talk, Raschka, Sentdex, Ebbelaar, AI Jason
- **Productivity** (7): Rasmic, Forte, Jered Blu, Nick Milo, August Bradley, Vardy, Tina Huang
- **Tech/Business** (8): Greg Isenberg, Every, Stratechery, Knowledge Project, Create and Build, Lenny's, Fireship, NetworkChuck
- **Trading** (8): Stockbee, Qullamaggie, TraderLion, Moglen, Trade Risk, Investors Underground, Bulls, SMB Capital

## Quick Commands

```bash
python3 ~/.claude/skills/youtube-curator/youtube_curator.py fetch
python3 ~/.claude/skills/youtube-curator/youtube_curator.py queue
```

## Scoring (V2 - Transkript-basiert)

| Insight Count | Score | Aktion |
|---------------|-------|--------|
| 4+ | 8-10 | **AUTO** → Video-Note |
| 2-3 | 5-7 | **MEDIUM** → Manuell |
| 0-1 | 1-4 | **LOW** → Skip |

## Trigger

- "check YouTube"
- "was gibt's Neues auf YouTube"
- "YouTube queue"

## Paul II Relevanz

**Relevanz: Niedrig** — Nur fuer Josts persoenliche Video-Queue. Nicht meine Kernaufgaben.
