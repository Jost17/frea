---
status: pending
priority: p3
issue_id: "010"
tags: [code-review, silent-failure, data-loss]
dependencies: []
---

# 010 — `mobile: ""` in settings.ts hardcodiert — überschreibt DB-Wert bei jedem Save

## Problem Statement

`src/routes/settings.ts` injiziert `mobile: ""` und `country: "Deutschland"` in jeden Settings-Save. Wenn ein User `mobile` via `PUT /api/settings/company` setzt und dann die Web-Einstellungsseite speichert, wird `mobile` auf `""` zurückgesetzt — stiller Datenverlust.

## Findings

**Location:** `src/routes/settings.ts:317`

```typescript
const validated = settingsSchema.parse({ ...data, country: "Deutschland", mobile: "" });
//                                                                           ^^^^^^^^^^^
//                                       Überschreibt immer, egal was in der DB steht
```

`mobile` ist nicht in `SETTINGS_FIELDS` und erscheint nicht im HTML-Formular. Das führt dazu dass jeder Form-Submit `mobile` auf `""` setzt.

## Proposed Solutions

### Option A: `mobile` aus dem settingsSchema-Parse entfernen (empfohlen, 10 min)
Wenn `mobile` nicht im Formular ist und nicht gezeigt wird → aus dem `settingsSchema.parse()` Call streichen. `safeUpdate` filtert dann `mobile` nicht — kein Problem da SETTINGS_COLUMNS Allowlist greift.  
**Effort:** Small | **Risk:** None

### Option B: `mobile` ins Formular aufnehmen
Formular-Feld für `mobile` hinzufügen und `SETTINGS_FIELDS` erweitern.  
**Effort:** Small | **Risk:** None

## Acceptance Criteria

- [ ] `mobile` Wert aus DB wird durch Web-UI-Save nicht überschrieben
- [ ] `country` hardcode-Verhalten ist explizit dokumentiert wenn es intentional ist

## Work Log

- 2026-04-01: Gefunden via TypeScript-Review (PR #10)

## Resources

- PR: https://github.com/Jost17/frea/pull/10
