---
status: pending
priority: p2
issue_id: "021"
tags: [code-review, consistency, architecture, templates]
dependencies: ["020"]
---

# 021 — `EmptyState` Component nicht in `invoice-pages.ts` genutzt — halbfertiger Refactor

## Problem Statement

Der PR führt die `EmptyState` Component ein und migriert `clients.ts`, `projects.ts`, `times.ts`. **Aber `invoice-pages.ts` enthält drei inline Empty-State Markup-Blöcke, die das exakt gleiche Pattern duplizieren**, ohne die neue Component zu nutzen. Die Abstraktion ist halb-implementiert und die Generalisierungs-Behauptung ungeprüft.

## Findings

**Inline Duplicates in `src/templates/invoice-pages.ts`:**
- Zeile 27 — leere Rechnungsliste
- Zeile 76 — kein aktiver Kunde
- Zeile 126 — keine aktiven Projekte für Kunden

Alle drei sind Variationen des `<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">` Patterns.

**Die neue Component:** `src/templates/components/empty-state.ts:11`

Hat aber ein Problem: Die aktuelle Signatur scheint jeden Empty-State mit CTA anzunehmen. Die Invoice-Wizard Empty-States haben teilweise nur beschreibenden Body-Text ("Für diesen Kunden gibt es keine aktiven Projekte.") ohne Action-Button.

**Gefunden von:** architecture-strategist (P2-2), code-simplicity (P2).

## Proposed Solutions

### Option A: EmptyState verbreitern + alle 3 Invoice Call-Sites migrieren (empfohlen, 20 min)

1. `EmptyState` props erweitern:
```ts
type EmptyStateProps = {
  title: string;
  body: string;
  action?: { href: string; label: string };  // optional
};
```

2. Rendering: wenn `action` nicht gesetzt, nur Title+Body anzeigen

3. Die drei `invoice-pages.ts` Stellen umstellen + ggf. `clients/projects/times` Aufrufer überprüfen (sollte unverändert funktionieren weil sie action setzen)

**Effort:** Medium | **Risk:** Low | **LOC:** -16 netto

### Option B: Inline lassen und Component als "ListEmptyStateWithCTA" umbenennen

Wenn keine CTA-lose Variante gebraucht wird. Nicht empfohlen — Invoice-Cases sind real und der Name wäre irreführend.

### Hinweis zur Dependency

Sollte **zusammen mit Todo 020** gemacht werden: wenn `invoice-pages.ts` in drei Files gesplittet wird, wird die Migration in einem Schritt einfacher.

## Acceptance Criteria

- [ ] `EmptyState` akzeptiert optional `action` prop
- [ ] Alle 3 inline Duplicates in invoice-pages gelöscht
- [ ] CTA-lose Variante rendert ohne Button
- [ ] Existierende Nutzer (`clients`, `projects`, `times`) unverändert
- [ ] Visuelle Verifikation aller 6 Empty-State-Sites (5 list + 1 project-wizard)

## Work Log

- 2026-04-15: Gefunden von architecture-strategist + code-simplicity-reviewer in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Dependency: Todo 020 (split invoice-pages.ts)
- Betroffene Dateien: `src/templates/components/empty-state.ts`, `src/templates/invoice-pages.ts`
