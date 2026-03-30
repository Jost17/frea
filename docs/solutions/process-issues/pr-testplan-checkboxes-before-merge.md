---
title: "PR Testplan-Checkboxen vor Merge abhaken"
category: process-issues
date: 2026-03-30
tags:
  - pr-workflow
  - code-review
  - testplan
  - github
modules:
  - github-pr-workflow
severity: low
confidence: verified
---

## Problem

Nach dem Code Review und der Chrome-Verifikation aller Testplan-Punkte wurde der PR gemerged, ohne die Testplan-Checkboxen in der PR-Description zu aktualisieren. Die Checkboxen blieben alle unchecked, obwohl jeder Punkt verifiziert war.

## Root Cause

Fehlender Workflow-Schritt: Nach der Verifikation wurde direkt `gh pr merge` aufgerufen, ohne vorher `gh pr edit --body` zum Abhaken der Checkboxen zu nutzen. Der Testplan existierte nur als mentale Checkliste, nicht als aktualisiertes PR-Artefakt.

## Solution

Vor jedem `gh pr merge` die PR-Description mit abgehakten Testplan-Checkboxen aktualisieren:

```bash
# Testplan-Checkboxen abhaken (Beispiel)
gh pr edit <PR_NUMBER> --body "$(gh pr view <PR_NUMBER> --json body -q .body | sed 's/- \[ \]/- [x]/g')"

# Oder selektiv einzelne Punkte abhaken
gh pr view <PR_NUMBER> --json body -q .body  # Aktuellen Body lesen
# Body mit abgehakten Checkboxen via --body setzen
```

**Wichtig:** Wenn ein Testplan-Punkt sich geaendert hat (z.B. Endpoint entfernt), den Punkt nicht einfach abhaken sondern den Text anpassen und eine Notiz hinzufuegen:

```markdown
- [x] Dashboard laedt ohne Fehler
- [x] KPI-Karten zeigen echte Werte (oder `0` bei leerer DB)
- [x] ~~`/api/dashboard-stats` antwortet mit JSON~~ Endpoint entfernt (YAGNI, siehe Review)
- [x] MwSt-Regel: Kein `total_net * vat_rate` in den Queries
```

## Prevention

**Workflow-Regel:** Der Merge-Schritt in `/ce:review` und im allgemeinen PR-Workflow sollte immer diese Reihenfolge haben:

1. Fixes implementieren und pushen
2. Testplan in Chrome/Terminal verifizieren
3. **PR-Description updaten** (`gh pr edit --body`) mit abgehakten Checkboxen
4. Erst dann `gh pr merge`

Dies gilt besonders wenn ein AI-Agent den Review + Merge durchfuehrt, da der Agent den Testplan sonst nur im Kontext abarbeitet aber das PR-Artefakt nicht aktualisiert.
