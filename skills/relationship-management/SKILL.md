---
name: relationship-management
description: |
  Comprehensive relationship & opportunity management fuer Operation Job.
  Tracks contacts via Excel, generates professional messages, manages KONTAKT_LOG documentation.
  NUR FUER JOST: Operation Job Workflows.
triggers:
  - "relationship-management status"
  - "relationship management status"
  - "generate follow-up"
  - "document contact"
  - "check who needs follow-up"
  - "Operation Job"
  - "KONTAKT_LOG"
  - "contact status"
  - "follow-up message"
---

# Relationship Management Skill

Operation Job Workflows: Tracking, Messaging, Documentation.

## Commands

| Command | Funktion |
|---------|----------|
| `relationship-management status` | Stats, heute faellig, ueberfaellig, Trends |
| `relationship-management message [Name] [Type]` | Generiert Nachricht |
| `relationship-management document [Name]` | Guided KONTAKT_LOG Entry |
| `relationship-management follow-ups` | Faellige Follow-ups mit Smart Filters |

## Data Sources

- `/Operation_Job/Warme_Kontakte_Liste_PRIORISIERT.xlsx`
- `/Operation_Job/KONTAKT_LOG.md`
- `/Operation_Job/BRAND_IDENTITY.md`

## Tone Rules

- ✅ Professional, self-confident, value-led, personalisiert
- ❌ KEIN Betteln, keine Verzweiflung, keine Copy-Paste

## Trigger

- "relationship-management status"
- "Operation Job"
- "KONTAKT_LOG"

## Paul II Relevanz

**Relevanz: Niedrig** — Nur fuer Josts Operation Job. Nicht meine Kernaufgaben.
