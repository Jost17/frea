---
status: pending
priority: p1
issue_id: "011"
tags: [code-review, frontend, templates, regression]
dependencies: []
---

# 011 — `statusBadge` returns raw HTML string, rendered as literal text

## Problem Statement

Nach dem Template-Refactor rendern Invoice-Status-Badges in der Liste (`/rechnungen`) und Detail-View (`/rechnungen/:id`) als literaler Text (`<span class="...">Entwurf</span>`) statt als gestyltes Pill-Element. Das ist eine **user-visible Regression**, die sofort beim Öffnen der Seiten auffällt.

## Findings

**Location:** `src/templates/invoice-shared.ts:15-24`

```ts
export function statusBadge(status: string): string {
  // ...
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}">${label}</span>`;
}
```

**Usage sites:**
- `src/templates/invoice-pages.ts:61` — `${statusBadge(inv.status)}` in der Liste
- `src/templates/invoice-detail.ts:32` — in der Detail-View

**Root cause:** Hono's `html\`\`` tagged template escapes alle interpolierten Plain-Strings automatisch (korrektes XSS-Default-Verhalten). `statusBadge` gibt einen plain `string` zurück → wird HTML-escaped → User sieht den Markup-Source.

**Verifikation:** `bun -e 'import {html} from "hono/html"; console.log(String(html\`<td>${"<span class=\"foo\">sent</span>"}</td>\`))'` liefert `<td>&lt;span class=&quot;foo&quot;&gt;sent&lt;/span&gt;</td>` — bestätigt von security-sentinel und kieran-typescript-reviewer.

**Bonus:** Der Fallback-Branch interpoliert `status` unescaped, wenn ein unbekannter Wert ankommt — latente XSS-Oberfläche (aktuell bounded durch State-Machine, aber nach Fix sauberer).

## Proposed Solutions

### Option A: `html\`\`` + HtmlEscapedString (empfohlen, 5 min)
```ts
import { html, type HtmlEscapedString } from "hono/html";

export function statusBadge(status: string): HtmlEscapedString {
  const map: Record<string, { label: string; className: string }> = { /* ... */ };
  const { label, className } = map[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };
  return html`<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}">${label}</span>`;
}
```
**Effort:** Small | **Risk:** Low

### Option B: `raw()` helper aus hono/html
Auch möglich, aber verliert die Escape-Semantik für den Fallback-Branch. Nicht empfohlen.

## Acceptance Criteria

- [ ] `statusBadge` gibt `HtmlEscapedString` zurück
- [ ] `/rechnungen` zeigt gestylte Badges (visuelle Prüfung)
- [ ] `/rechnungen/:id` zeigt gestylte Badges
- [ ] Fallback-Branch escaped `status` korrekt
- [ ] Type-Check läuft durch

## Work Log

- 2026-04-15: Gefunden von kieran-typescript-reviewer, security-sentinel, code-reviewer in PR #20 review

## Resources

- PR: https://github.com/Jost17/frea/pull/20
- Betroffene Dateien: `src/templates/invoice-shared.ts`, `src/templates/invoice-pages.ts`, `src/templates/invoice-detail.ts`
