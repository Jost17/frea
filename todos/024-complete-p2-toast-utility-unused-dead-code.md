---
status: pending
priority: p2
issue_id: "024"
tags: [code-review, simplification, yagni, dead-code]
dependencies: []
---

# 024 — `src/utils/toast.ts` komplett ungenutzt — dead code

## Problem Statement

Der PR fügt `src/utils/toast.ts` mit `getToastMessage` und `withToastQuery` hinzu. Grep über `src/` findet **null Caller außerhalb der Datei selbst**. Das ist textbook YAGNI — Utility für hypothetische Zukunft ohne aktuellen Use Case.

## Findings

**Location:** `src/utils/toast.ts` (16 Zeilen)

```ts
export function getToastMessage(query: string): string { ... }
export function withToastQuery(path: string, type: ToastType, message: string): string { ... }
```

**Usage search (Grep across src/):** 0 caller. Die Exports werden nirgendwo importiert.

**Bonus-Smell:** `withToastQuery` baut `new URL(path, "http://localhost")` nur um `URLSearchParams` indirekt zu nutzen. Wenn `path` mal eine absolute URL enthält, würde das silently den Host überschreiben. Aber egal — es ist dead code.

**Regel-Violation (CLAUDE.md):**
> "Don't add features, refactor, or introduce abstractions beyond what the task requires. A bug fix doesn't need surrounding cleanup; a one-shot operation doesn't need a helper. Don't design for hypothetical future requirements."

**Gefunden von:** code-simplicity-reviewer (P1 in ihrem Report, hier P2 in Synthese weil nicht merge-blocking).

## Proposed Solutions

### Option A: Komplett löschen (empfohlen, 2 min)

```bash
rm src/utils/toast.ts
```

Wenn Toast-System später wirklich gebraucht wird → dann bauen, mit realen Callern und realen Requirements.

**Effort:** Trivial | **Risk:** None | **LOC:** -16

### Option B: Dokumentieren als "Phase 2" und committen

Nicht empfohlen — TODO-Kommentare und halb-implementierte Features rotten.

## Acceptance Criteria

- [ ] `src/utils/toast.ts` gelöscht
- [ ] Kein dangling import/reference mehr
- [ ] Type-Check läuft durch
- [ ] Falls Toast wirklich in Phase 2 geplant ist: Issue dafür anlegen (nicht File behalten)

## Work Log

- 2026-04-15: Gefunden von code-simplicity-reviewer in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Betroffene Datei: `src/utils/toast.ts`
