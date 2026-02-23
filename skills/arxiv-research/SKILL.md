---
name: arxiv-research
description: "Daily arXiv paper discovery mit AI-basiertem Rating fuer AI/CS, AI Security und Quantitative Finance. NUR FUER JOST: 'arxiv', 'arXiv papers', 'latest papers', 'research papers', 'AI papers'."
---

# arXiv Research Skill

Tägliches arXiv Paper Discovery mit strukturiertem Scoring.

## Quick Reference

### Workflow
```
1. fetch_papers.py (last 48h)
2. Keyword Triage (Score >= 9)
3. Paul Relevance Filter (Stage 2-4)
4. Generate Markdown Report
5. Validate + Fix
```

### Target Categories
| Domain | Categories |
|--------|------------|
| AI/CS | cs.AI, cs.LG, cs.CL, cs.CV, cs.MA, stat.ML |
| AI Security | cs.CR |
| Quant Finance | q-fin.PM, q-fin.TR, q-fin.ST, q-fin.RM |

### Rating System
| Typ | Max Score | Threshold |
|-----|-----------|-----------|
| AI/CS | 13 | >=9 |
| Quant | 14 | >=9 |
| Security | 10+ | >=8 |

**Basis: 5** + positive Faktoren - negative Faktoren

## Paul Filter (4-Stage)

1. **Stage 1:** Keyword Triage (Score >= 9)
2. **Stage 2:** Paul Relevance Check
3. **Stage 3:** Brutal Honesty Gate
4. **Stage 4:** Delta-Analyse

### Paul Components
- skills_system
- multi_agent
- memory_context
- tools_mcp
- agent_security

## Data Paths

| Was | Pfad |
|-----|------|
| Project | `~/Documents/02_Areas/Claude_Spielwiese/ai-news-generator/` |
| Output | `$OBSIDIAN_VAULT/001 Pipeline/Processing/arXiv Papers/` |

## Paul II Relevanz

**Relevanz: Niedrig** —Fuer Josts Wissens-Management, nicht meine Kernaufgaben.
