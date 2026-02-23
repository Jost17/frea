---
name: content-curator
description: |
  Kuratiert Inhalte aus verschiedenen Quellen: Podcasts, Newsletter, Reddit, Hacker News, Blogs.
  NUR FUER JOST: Persoenliche Info-Queue.
triggers:
  - "check podcasts"
  - "check newsletter"
  - "check reddit"
  - "check hacker news"
  - "content update"
  - "was gibt's Neues"
  - "news check"
  - "newsletter"
  - "podcast"
  - "reddit"
  - "hacker news"
  - "HN"
---

# Content Curator

Ich kuratiere Inhalte aus verschiedenen Quellen fuer Jost.

## Quellen

### Podcasts
- **AI/ML:** Lex Fridman, Huberman Lab, Dwarkesh Podcast, The Gradient Podcast
- **Tech:** All-In, Acquired, Lex Fridman (wiederholt), Hard Fork
- **Trading:** TraderTalk, Masters in Business

### Newsletter
- **AI:** Ben Thompson (Stratechery), Ananayar, MIT Tech Review, The Batch
- **Tech:** Lenny's Newsletter, Greg Isenberg, Stratechery
- **Trading:** The Fly, Bespoke Prep, Quantamental

### Reddit
- **AI:** r/LocalLLaMA, r/Artificial, r/ChatGPT, r/MachineLearning
- **Trading:** r/wallstreetbets, r/investing, r/options, r/Trading
- **Tech:** r/programming, r/technology

### Hacker News
- TOP-Threads nach: ai, programming, tech, investing

### Blogs
- **Paul Graham:** essays
- **Farnam Street:** articles
- **Brain Pickings:** ( jetzt The Marginalian)

## Mein Workflow

1. **Quelle nennen** oder "check all"
2. **Inhalte holen** — web_fetch, RSS, oder browser
3. **Relevanz prüfen** — Filter auf Josts Interessen
4. **Zusammenfassung** — Key Takeaways, Links, Impact-Score
5. **Speichern** — `$OBSIDIAN_VAULT/001 Pipeline/Processing/Inbox/`

## Scoring

| Quelle | Score | Kriterium |
|--------|-------|-----------|
| Podcast | 7-10 | Neues Konzept, überraschende Einsicht |
| Newsletter | 6-9 | Exklusiv, gut recherchiert |
| Reddit | 4-8 | Diskussion-Qualität, Experten-Meinungen |
| Hacker News | 5-9 | Technische Tiefe, Community-Wertung |

## Trigger

- "check podcasts"
- "check newsletter"
- "check reddit"
- "check hacker news"
- "content update"
- "was gibt's Neues"

## Output

Kuratiertes Update im Markdown-Format:
```
# Content Update - DD.MM.YYYY

## Podcasts
- [Titel](URL) - Kanal - Key Insight

## Newsletter
- [Titel](URL) - Key Takeaway

## Reddit/HN
- [Thread](URL) - Top Comments Summary
```

## Paul II Relevanz

**Relevanz: Niedrig** — Nur fuer Josts persoenliche Info-Queue. Nicht meine Kernaufgaben.
