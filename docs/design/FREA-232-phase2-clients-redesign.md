# FREA-232 Phase 2: Kunden-List Redesign

**Datum:** 2026-05-19  
**Status:** Scope für Phase 2 (warten auf Board-Approval von Phase 1)  
**Owner:** UX Designer → Frontend Engineer (Implementation)  
**Parent Issue:** FREA-232

---

## 1. Motivation

Phase 1 hat invoice-list und invoice-detail modernisiert. Phase 2 fokussiert auf die **Kunden-Verwaltungs-Liste**, die derzeit ein klassisches HTML-Tabellen-Layout nutzt mit:

- Hardcoded Colors (`blue-600`, `gray-*`)
- Dichte Tabellenstruktur (keine Card-Hierarchie)
- Minimales Whitespace
- Alte Design-Tokens nicht genutzt

**Ziel:** Gleiche Modernisierungs-Prinzipien anwenden (Card/Detail-Layouts, Whitespace, Hierarchie, Farbakzente).

---

## 2. Current State: Kunden-Liste (`src/routes/clients.ts`)

### Layout
```html
<table class="w-full text-sm">
  <thead class="border-b bg-gray-50">
    <tr>
      <th class="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
      <th class="px-4 py-3 text-left font-semibold text-gray-700">Stadt</th>
      <th class="px-4 py-3 text-left font-semibold text-gray-700">E-Mail</th>
      <th class="px-4 py-3 text-center font-semibold text-gray-700">Aktionen</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-t hover:bg-gray-50">
      <td class="px-4 py-3 font-medium text-gray-900">${client.name}</td>
      ...
    </tr>
  </tbody>
</table>
```

### Issues
- ❌ Hardcoded Farben (nicht aus Design-Tokens)
- ❌ Dichte Zellenstruktur
- ❌ Keine visuellen Akzente für Kundenname
- ❌ Hover-Effekt ist subtil (nur bg-color)
- ❌ Layout nicht responsive für Mobile

---

## 3. Target Design: Modern Client Card Grid

### Layout-Prinzipien
1. **Card-basiert** statt Tabelle (semantisch `<article>` statt `<tr>`)
2. **Responsive Grid:** `grid-cols-1` (Mobile), `sm:grid-cols-2` (Tablet), `lg:grid-cols-3` (Desktop)
3. **Pro Card:** Kundenname (prominent), Stadt + Email (sekundär), Action-Link
4. **Hover-Effekt:** Shadow-Erhöhung + leichte Translation (wie invoice-card)
5. **Empty State:** Nutze existierende `EmptyState`-Component

### Mockup
```
┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│ ACME Inc                 │  │ XYZ Ltd                  │  │ Beta Corp                │
│                          │  │                          │  │                          │
│ Berlin, DE               │  │ Hamburg, DE              │  │ München, DE              │
│ info@acme.com            │  │ contact@xyz.de           │  │ hello@beta.de            │
│                          │  │                          │  │                          │
│ [ Bearbeiten ]           │  │ [ Bearbeiten ]           │  │ [ Bearbeiten ]           │
└──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘
   hover: shadow-lg, -translate-y-0.5
```

---

## 4. Implementation Details

### 4.1 New Component: `ClientCard.ts`

```typescript
import { html } from "hono/html";
import type { Client } from "../../validation/schemas";

export interface ClientCardProps {
  client: Client;
}

export function ClientCard({ client }: ClientCardProps) {
  const location = [client.postal_code, client.city]
    .filter(Boolean)
    .join(", ");

  return html`
    <article
      class="rounded-lg border border-border-subtle bg-bg-surface p-6 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer"
      onclick="window.location.href='/kunden/${client.id}'"
    >
      <h3 class="text-lg font-semibold text-primary mb-3">
        ${client.name}
      </h3>

      <div class="mb-4 space-y-1">
        ${location ? html`<p class="text-sm text-text-secondary">${location}</p>` : ""}
        ${client.email ? html`<p class="text-sm text-text-secondary">${client.email}</p>` : ""}
      </div>

      <a
        href="/kunden/${client.id}"
        class="inline-block text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:rounded"
        onclick="event.stopPropagation()"
      >
        Bearbeiten →
      </a>
    </article>
  `;
}
```

### 4.2 Modify `src/routes/clients.ts`

Replace table rendering with card grid:

```typescript
import { ClientCard } from "../templates/components/client-card";

// In clients.get("/") handler:
${
  clients.length === 0
    ? EmptyState({ ... })
    : html`
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${clients.map((client) => ClientCard({ client }))}
        </div>
      `
}
```

### 4.3 CSS-Tokens

Verify these exist in `src/styles/input.css`:
- `border-border-subtle`
- `bg-bg-surface`
- `text-primary`
- `text-text-secondary`
- `shadow-card-hover` (oder `shadow-lg`)
- `transition-all`, `duration-300`

If missing, add to `@theme {}` section.

---

## 5. File Changes

| File | Change | Type |
|------|--------|------|
| `src/templates/components/client-card.ts` | NEW | Component |
| `src/routes/clients.ts` | Modify | Grid + Card import |
| `src/styles/input.css` | Maybe | Token check |

**LOC Impact:** ~50 (new component) + ~20 (route modification) = ~70 LOC total  
**PR Size:** ~70 LOC → Soft-Limit OK ✅

---

## 6. Testing Checklist

- [ ] Responsive: Mobile (1 col), Tablet (2 col), Desktop (3 col)
- [ ] Hover-Effekt sichtbar: Shadow + Translation
- [ ] Focus-Ring sichtbar auf Action-Link (A11y)
- [ ] Click anywhere on card navigates to detail
- [ ] Empty State renders if no clients
- [ ] Dark Mode: Farben kontrastreich (≥4.5:1)
- [ ] Alle Design-Tokens aus `input.css` nutzen (kein Hardcoding)

---

## 7. Acceptance Criteria

- ✅ New `ClientCard.ts` component created
- ✅ `clients.ts` route refactored (Table → Grid)
- ✅ Grid responsive (1/2/3 cols depending on breakpoint)
- ✅ Hover/Focus a11y in place
- ✅ Tokens aus Design-System genutzt (keine hardcoded Farben)
- ✅ PR size <200 LOC

---

## 8. Rollout Plan

1. **Wait:** Board approves Phase 1 (invoice-list + invoice-detail)
2. **Create:** FREA-232-2 (Phase 2: Kunden-List) as child issue
3. **Implement:** Frontend Engineer takes ~1-2 hours
4. **Review:** UX Designer verifies responsive/hover/a11y
5. **Merge:** Once approved
6. **Optional Phase 3:** Projekte, Dashboard, weitere Screens basierend auf Board-Feedback

---

## 9. Design-Kontinuität

Phase 2 nutzt **dieselben Prinzipien** wie Phase 1:
- ✅ Card-basiertes Layout statt Tabelle
- ✅ Whitespace + Hierarchie
- ✅ Hover-Effekt: `shadow-card-hover` + `translate-y`
- ✅ Design-Tokens statt Hardcoding
- ✅ WCAG 2.1 AA Compliance (Fokusring, Kontrast, semantisches HTML)
- ✅ HTMX-only, keine JS-Frameworks
- ✅ EU-Compliance: Keine externen CDNs

---

**Next Step:** Board genehmigt Phase 1 → Phase 2 Issue wird created → Implementierung startet
