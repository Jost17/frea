---
name: youtube-curator
description: |
  Automatische YouTube-Kuratierung fuer Jost.
  Ich hole Transkripte direkt und analysiere auf Insights.
  NUR FUER JOST: Persoenliche Video-Queue.
triggers:
  - "check YouTube"
  - "was gibt's Neues auf YouTube"
  - "YouTube queue"
  - "neue Videos"
  - "analysiere Video"
  - "Video analysieren"
auto_activate:
  - context: morning-check-in
---

# YouTube Curator Skill

Ich hole YouTube-Videos direkt und analysiere sie auf Insights.

## Kanaele (42 in 4 Kategorien)

- **AI/ML** (19): IndyDevDan, Unsupervised Learning, AI Labs, DeepLearning.AI, Karpathy, Kilcher, AI Explained, Matt Williams, Cole Medin, WorldofAI, All About AI, Dave Shap, Berman, Wes Roth, ML Street Talk, Raschka, Sentdex, Ebbelaar, AI Jason
- **Productivity** (7): Rasmic, Forte, Jered Blu, Nick Milo, August Bradley, Vardy, Tina Huang
- **Tech/Business** (8): Greg Isenberg, Every, Stratechery, Knowledge Project, Create and Build, Lenny's, Fireship, NetworkChuck
- **Trading** (8): Stockbee, Qullamaggie, TraderLion, Moglen, Trade Risk, Investors Underground, Bulls, SMB Capital

## Mein Workflow

1. **Video finden** → URL oder Kanal/Thema nennen
2. **Transkript holen** → web_fetch (oft) oder browser (Fallback)
3. **Analysieren** → IDEAS, INSIGHTS, QUOTES, HABITS, FACTS, RECOMMENDATIONS
4. **Bewerten** → Score 1-10 basierend auf Insight-Dichte
5. **Video-Note erstellen** → Output: `$OBSIDIAN_VAULT/001 Pipeline/Processing/Video Notes WIP/`

## Scoring (Transkript-basiert)

| Insight Count | Score | Aktion |
|---------------|-------|--------|
| 4+ | 8-10 | **AUTO** → Video-Note |
| 2-3 | 5-7 | **MEDIUM** → Nachfrage |
| 0-1 | 1-4 | **LOW** → Skip |

## Trigger

- "check YouTube"
- "was gibt's Neues auf YouTube"
- "YouTube queue"
- "analysiere Video [URL]"

## Output

Video-Note Format:
```
# VID_YYYY-MM-DD_Author_Title

## Key Insights
- ...

## Quotes
- ...

## Action Items
- ...

## Notes
...
```

Speicherort: `$OBSIDIAN_VAULT/001 Pipeline/Processing/Video Notes WIP/`

## Paul II Relevanz

**Relevanz: Niedrig** — Nur fuer Josts persoenliche Video-Queue. Nicht meine Kernaufgaben.
