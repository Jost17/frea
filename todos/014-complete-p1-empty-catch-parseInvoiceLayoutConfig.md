---
status: pending
priority: p1
issue_id: "014"
tags: [code-review, error-handling, silent-failure, rules-violation]
dependencies: []
---

# 014 — Leerer catch-Block in `parseInvoiceLayoutConfig` verstößt gegen Projekt-Regel

## Problem Statement

`parseInvoiceLayoutConfig` fängt alle Parse-/Schema-Fehler in einem leeren catch-Block und gibt still ein Default-Config zurück. Das ist ein direkter Verstoß gegen die explizite CLAUDE.md-Regel "NIEMALS leere catch-Blöcke". Kritischer: Data-Corruption-Events (kaputte JSON im DB, Schema-Drift nach Migration) werden versteckt, und User sehen über Monate "alles OK" während Invoices falsch gerendert werden.

## Findings

**Location:** `src/templates/invoice-shared.ts:26-34`

```ts
export function parseInvoiceLayoutConfig(settings: Settings): InvoiceLayoutConfig {
  const raw = settings.invoice_layout_config || "{}";
  try {
    const parsed = JSON.parse(raw) as unknown;
    return invoiceLayoutConfigSchema.parse(parsed);
  } catch {
    return invoiceLayoutConfigSchema.parse({});
  }
}
```

**Gelöschte Signale durch den bare catch:**
- `JSON.parse` SyntaxError aus korrupten DB-Daten
- `ZodError` aus Schema-Mismatch nach einer Settings-Migration
- `TypeError`/`RangeError` aus unrelated bugs
- Neue Schema-Regressionen werden monatelang unentdeckt bleiben

**Warum User-visible:** Jede gerenderte Rechnung wird falsch aussehen, aber "korrekt" wirken — PDF / ZUGFeRD Output kann vom tatsächlich gespeicherten Config divergieren ohne Warnung.

**Regel-Violation (CLAUDE.md, user-global):**
> "NIEMALS leere catch-Blöcke — auch nicht mit Kommentar wie `// silently fail` oder `// ignore`. Jeder catch-Block MUSS mindestens einen `console.error`, `console.warn`, `logger.warning`, oder projektspezifischen Error-Handler aufrufen."

**Gefunden von:** silent-failure-hunter (P1-1), kieran-typescript-reviewer (P3-4).

## Proposed Solutions

### Option A: Warn-Log + narrow error discrimination (empfohlen, 5 min)

```ts
export function parseInvoiceLayoutConfig(settings: Settings): InvoiceLayoutConfig {
  const raw = settings.invoice_layout_config || "{}";
  try {
    const parsed = JSON.parse(raw) as unknown;
    return invoiceLayoutConfigSchema.parse(parsed);
  } catch (err) {
    console.warn(
      "[invoice-shared] Invalid invoice_layout_config, falling back to defaults:",
      err,
    );
    return invoiceLayoutConfigSchema.parse({});
  }
}
```

**Effort:** Small | **Risk:** Low

### Option B: Narrow + rethrow (strenger)

```ts
} catch (err) {
  if (err instanceof SyntaxError) {
    console.warn("[invoice-shared] Corrupt JSON in invoice_layout_config:", err);
    return invoiceLayoutConfigSchema.parse({});
  }
  // ZodError = Schema-Drift, sollte laut werden → rethrow
  throw err;
}
```

**Pro:** Zod-Errors propagieren als echte Alerts → Dev merkt sofort bei Schema-Änderungen
**Con:** Kann laufende Invoices 500-en wenn ein User korrupten State hat
**Effort:** Small | **Risk:** Medium

**Empfehlung:** Option A, mit Follow-up Ticket für Option B wenn Monitoring steht.

## Acceptance Criteria

- [ ] catch-Block loggt mindestens via `console.warn` mit error object
- [ ] Log-Präfix matched Projekt-Convention (`[module-name]`)
- [ ] Fallback-Verhalten unverändert (default config)
- [ ] Manueller Test: Korruptes JSON in DB einfügen → Warn-Log sichtbar, Rendering OK

## Work Log

- 2026-04-15: Gefunden von silent-failure-hunter + kieran-typescript-reviewer in PR #20

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Regel: CLAUDE.md (user-global) — "NIEMALS leere catch-Blöcke"
- Betroffene Datei: `src/templates/invoice-shared.ts:26-34`
