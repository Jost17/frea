---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, architecture, database, gobd-compliance]
dependencies: []
---

# 007 — `updateInvoiceStatus()` + `appendAuditLog()` nicht transaktional — GoBD-Risiko

## Problem Statement

`updateInvoiceStatus()` führt zuerst das `UPDATE invoices` aus, dann `appendAuditLog()`. Wenn der Audit-Log-INSERT fehlschlägt (fehlende Tabelle, Disk-Full), ist die Statusänderung committed aber der Audit-Trail hat eine Lücke. Das verletzt die GoBD-Anforderung an vollständige, unveränderliche Buchführungsprotokolle.

## Findings

**Location:** `src/db/queries.ts` — `updateInvoiceStatus()` function

Die Funktion enthält (sinngemäß):
```typescript
export function updateInvoiceStatus(id: number, status: string): void {
  // ...state machine check...
  db.query("UPDATE invoices SET status = ? WHERE id = ?").run(newStatus, id);
  // ← Commit passiert hier
  appendAuditLog("invoice", id, "status_change", { from: currentStatus, to: newStatus });
  // ← Wenn das hier wirft: Statusänderung bleibt, Audit fehlt
}
```

**GoBD-Kontext:** Rechnungsstatus-Änderungen (draft→sent, sent→paid) sind steuerrechtlich relevante Buchungshandlungen die protokolliert werden müssen.

## Proposed Solutions

### Option A: db.transaction() (empfohlen, 30 min)
```typescript
export function updateInvoiceStatus(id: number, newStatus: string): void {
  const update = db.transaction(() => {
    db.query("UPDATE invoices SET status = ? WHERE id = ?").run(newStatus, id);
    db.query("INSERT INTO audit_log ...").run(/* ... */);
  });
  update();
}
```
Bun's SQLite unterstützt `db.transaction()` nativ.  
**Effort:** Small | **Risk:** Low

### Option B: Audit-Log separat mit Fehler-Toleranz
Audit-Log-Fehler loggen aber nicht die Hauptoperation rückgängig machen.  
**Cons:** Verletzt GoBD  
**Effort:** Minimal | **Risk:** High (compliance)

## Acceptance Criteria

- [ ] `updateInvoiceStatus()` wrapped in `db.transaction()`
- [ ] Wenn `appendAuditLog()` wirft: Status-Update wird zurückgerollt
- [ ] Test: Simulated Audit-Log-Failure → kein Status-Change committed

## Work Log

- 2026-04-01: Gefunden via Silent-Failure-Hunter (PR #10)

## Resources

- PR: https://github.com/Jost17/frea/pull/10
