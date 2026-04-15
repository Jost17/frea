---
status: pending
priority: p1
issue_id: "012"
tags: [code-review, performance, security, data-integrity, invoices]
dependencies: []
---

# 012 — Invoice create: N+1 refetch + fehlende Ownership-Checks + silent filter

## Problem Statement

Der `POST /rechnungen/create` Handler hat drei gleichzeitige Probleme bei der Time-Entry-Auswahl, die zusammen billing correctness gefährden: N+1 DB-Query, fehlende Ownership-Prüfung zwischen Project und Client, und silent drops mit irreführender Fehlermeldung.

## Findings

**Location:** `src/routes/invoices.ts:234-243`

```ts
const timeEntries = timeEntryIds
  .map((id) => {
    const entries = getTimeEntriesForProject(parsed.data.project_id);  // ⚠️ N+1
    return entries.find((e) => e.id === id);
  })
  .filter((e): e is NonNullable<typeof e> => e !== undefined);           // ⚠️ silent drop

if (timeEntries.length !== timeEntryIds.length) {
  return c.text("Einige Zeiteinträge wurden zwischenzeitig abgerechnet", 400);  // ⚠️ misleading
}
```

**Problem 1 — N+1:** `getTimeEntriesForProject` läuft einmal pro ausgewähltem Time-Entry. 20 Entries → 20 Full-Query-Scans derselben Daten. Auch DoS-Vektor: Angreifer kann 1000 fake IDs schicken, triggert 1000 Queries.

**Problem 2 — Missing project↔client ownership check:** Nirgendwo wird verifiziert, dass `parsed.data.project_id` tatsächlich zu `parsed.data.client_id` gehört. Ein User (oder UI-Bug) kann einen POST mit `client_id=A`, `project_id=B` (gehört Client C) schicken. Die Rechnung wird dann mit **falscher Client-Adresse** und **falschem Audit-Trail** gespeichert.

**Problem 3 — Missing `invoice_id IS NULL` check:** Keine explizite Prüfung dass Entries nicht schon abgerechnet sind (hängt implizit davon ab dass `getTimeEntriesForProject` das filtert — muss verifiziert werden).

**Problem 4 — Silent drop + misleading error:** Entries aus anderem Project werden leise gefiltert. Die Fehlermeldung behauptet "zwischenzeitig abgerechnet" obwohl der tatsächliche Grund eine Project-Mismatch sein kann. Debugging in Production unmöglich, weil kein Log geschrieben wird.

**Gefunden von:** kieran-ts (P1-3), security (P2-2), architecture (P1-3), silent-failure (P1-3), code-simplicity (P2), code-reviewer (P2-5) — **6 von 7 Reviewern**.

## Proposed Solutions

### Option A: Vollständige Rewrite mit Ownership-Check + Map-Lookup + Logging (empfohlen, 20 min)

```ts
// 1. Ownership check: project gehört zu client
const project = getProject(parsed.data.project_id);
if (!project || project.client_id !== parsed.data.client_id) {
  throw new AppError("Projekt gehört nicht zum ausgewählten Kunden", 400);
}

// 2. Hoist query: einmal statt N-mal
const projectEntries = getTimeEntriesForProject(parsed.data.project_id);
const entryMap = new Map(projectEntries.map((e) => [e.id, e]));

// 3. Explicit missing-list mit Diagnostik
const missing = timeEntryIds.filter((id) => !entryMap.has(id));
if (missing.length > 0) {
  console.error(
    `[invoice create] time entry ids not in project ${parsed.data.project_id}:`,
    missing,
  );
  return c.text(
    `Zeiteinträge nicht auffindbar: ${missing.join(", ")}. Bitte Seite neu laden.`,
    400,
  );
}

const timeEntries = timeEntryIds.map((id) => entryMap.get(id)!);

// 4. Zusätzlich: verify getTimeEntriesForProject filtert invoice_id IS NULL
// (separat zu prüfen in src/db/time-queries.ts)
```

**Effort:** Small | **Risk:** Low | **Perf:** 20× weniger DB-Queries bei 20 Entries

### Option B: Minimal-Fix (nur Hoisting)
Nur das N+1 Problem fixen, Ownership + Logging separat. Nicht empfohlen — halbe Lösung.

## Acceptance Criteria

- [ ] `getTimeEntriesForProject` wird genau einmal pro POST aufgerufen
- [ ] `project.client_id === data.client_id` wird verifiziert, sonst 400
- [ ] `getTimeEntriesForProject` filtert `invoice_id IS NULL` (verifiziert oder ergänzt)
- [ ] Fehlende Entry-IDs werden mit `console.error` geloggt
- [ ] Fehlermeldung benennt konkret welche IDs fehlen, nicht generisch "zwischenzeitig abgerechnet"
- [ ] Manueller Test: Rechnung mit mismatched client_id/project_id → 400
- [ ] Manueller Test: Rechnung mit 10 Time-Entries erstellen → Queries-Count = 1

## Work Log

- 2026-04-15: Gefunden von 6 von 7 Reviewern in PR #20 (N+1 + ownership + silent drop)

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Betroffene Dateien: `src/routes/invoices.ts`, `src/db/time-queries.ts` (filter verify)
- Related: Scaffold Review Learning #2 — JOINs over N+1 (docs/solutions/architecture/scaffold-review-patterns.md)
