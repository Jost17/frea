---
name: earnings-schedule
description: "Woechentlicher Earnings-Kalender via @eWhispers X/Twitter. Generiert schedule.json fuer Earnings Cron System. NUR FUER JOST: 'earnings schedule', 'Earnings Kalender', 'Earnings Whispers', 'naechste Woche Earnings'."
---

# Earnings Schedule Skill

Wöchentlicher Earnings-Kalender via @eWhispers.

## Trigger

- "earnings schedule"
- "Earnings Whispers"
- "Earnings Kalender"
- "nächste Woche Earnings"

## Workflow

1. **@eWhispers Post holen** — via Grok
2. **Ticker extrahieren** — aus Post-Text + Bild
3. **schedule.json generieren** — nach Datum + Typ (BMO/AMC)
4. **Schreiben** — nach `earnings-cron/config/schedule.json`

## Output Format

```json
{
  "week_of": "YYYY-MM-DD",
  "earnings": [
    {"date": "YYYY-MM-DD", "type": "BMO", "tickers": ["AAPL", "NVDA"]},
    {"date": "YYYY-MM-DD", "type": "AMC", "tickers": ["AMD"]}
  ]
}
```

## Typen

- **BMO** — Before Market Open
- **AMC** — After Market Close

## Fallback

Falls Grok nicht verfügbar:
1. WebFetch von earningswhispers.com/calendar
2. Oder Jost fragt nach URL/Text

## Paul II Relevanz

**Relevanz: Niedrig** —Fuer Josts Trading-Workflow, nicht meine Kernaufgaben.
