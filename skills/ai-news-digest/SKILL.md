---
name: ai-news-digest
description: "Daily AI News Digest - laedt Stories von HN + RSS, bewertet mit Faktor-System, gibt Top-Stories mit Summaries zurueck. NUR FUER JOST: 'AI News', 'KI News', 'News Digest', 'Top Stories', 'was gibt's Neues in AI'."
---

# AI News Digest

Täglicher AI News Digest mit Faktor-basiertem Rating. Score ≥8 = relevant.

## Workflow

1. **Data Collection:**
   ```
   cd ~/Documents/02_Areas/Claude_Spielwiese/ai-news-generator
   node scripts/fetch-hn.js && node scripts/fetch-rss.js && node scripts/aggregate-and-score.js
   ```

2. **Load:** `./data/scored/{date}-all.json`

3. **Bewerten:** Basis 5 + positive - negative Faktoren

4. **Filter:** Score ≥ 8

5. **Deduplicate:** Letzte 7 Tage in Obsidian pruefen

6. **Save:** `$OBSIDIAN_VAULT/001 Pipeline/Processing/AI News/{date}_AI_News_Digest.md`

## Bewertung

**Basis: 5 Punkte | Max: 12 | Threshold: ≥8**

| Positive Faktoren (+1) | Negative Faktoren (-1) |
|------------------------|----------------------|
| Praktisch anwendbar | Zu technisch |
| Business-relevant | Nur fuer Devs |
| Agentic/LLM | Nische |
| Zugaenglich | Clickbait |
| Aktuell/Trending | Veraltet |
| Authority | |
| Empirisch validiert | |

| Score | Kategorie |
|-------|-----------|
| 10-12 | Top Story |
| 8-9 | Lesenswert |
| 6-7 | Grenzwertig |
| <6 | Ignorieren |

## Data Paths

| Was | Pfad |
|-----|------|
| Project | `~/Documents/02_Areas/Claude_Spielwiese/ai-news-generator/` |
| Input | `./data/scored/{date}-all.json` |
| Output | `$OBSIDIAN_VAULT/001 Pipeline/Processing/AI News/{date}_AI_News_Digest.md` |

## Paul II Relevanz

**Relevanz: Niedrig** —Fuer Josts Wissens-Management, nicht meine Kernaufgaben.
