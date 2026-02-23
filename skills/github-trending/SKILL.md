---
name: github-trending
description: "Monitor GitHub Trending daily to discover new repositories. Use when: (1) User asks what's trending on GitHub, (2) researching new tools/technologies, (3) early detection of emerging projects, (4) competitive analysis for Paul II System."
---

# GitHub Trending Monitor

Früherkennung von Tech-Trends durch regelmäßiges Monitoring der GitHub Trending Page.

## Workflow

### 1. Scrape Trending

Nutze WebFetch auf `https://github.com/trending` mit folgendem Prompt:

```
List the top 10 trending repositories with:
1. Name (owner/repo)
2. Language
3. Stars today (e.g., "+500 today")
4. Brief description of what it does

Format as a compact list.
```

### 2. Analysiere für Paul II-Relevanz

Für jedes Repo bewerten:
- **Was macht es?** (Kurz beschreiben)
- **Paul II-Relevanz:** Hoch / Mittel / Niedrig
- **Warum?** (1-2 Sätze)

### 3. Output Format

```
📊 GitHub Trending (Datum, Zeit)

| # | Repo | ⭐/Tag | Was es tut + Paul II-Relevanz |
|---|------|--------|---------------------------|
| 1 | owner/repo (Sprache) | +2.6k | [Beschreibung + Relevanz-Bewertung] |
...
```

## Paul II Relevanz Bewertung

- **Hoch**: Löst ähnliches Problem wie Paul II Projekte (Trading, Knowledge Management, Automation)
- **Mittel**: Interessante Tech/Architektur, könnte nützlich sein
- **Niedrig**: Nicht relevant für Paul II Scope

## Beispiel

```
📊 GitHub Trending (23.02.2026, 12:00)

| # | Repo | ⭐/Tag | Was es tut + Paul II-Relevanz |
|---|------|--------|---------------------------|
| 1 | somethingsomething/memory (Py) | +2.1k | Session-Memory System für AI Agents. Ähnlich wie Paul II Reflexion Memory. Paul II-Relevanz: Hoch - Architektur vergleichen. |
```

## Tipps

- Star-Countoday nutzen (nicht Gesamtsterne)
- Programming Language beachten
- Neue Projekte (< 1 Monat) besonders kennzeichnen
