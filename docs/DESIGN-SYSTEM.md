# FREA Design System v1.0

**Status:** CTO Review Pending  
**Last Updated:** 2026-05-04  
**Author:** UX Designer

---

## 1. Design Tokens Reference

All tokens are defined in `src/styles/input.css` as CSS custom properties. Use these consistently across all templates.

### Primary Accent (FREA Emerald)

- `--color-primary`: Main brand color (Emerald)
- `--color-primary-hover`: Hover state
- `--color-primary-subtle`: Light background tint

**Usage**: Primary CTAs, active navigation, brand moments

### Backgrounds

- `--color-bg-primary`: Page background (very light)
- `--color-bg-surface`: Card/panel background (white in light, darker in dark)
- `--color-bg-surface-raised`: Elevated surface (e.g. hovered cards)

**Tailwind classes**: `bg-bg-primary`, `bg-bg-surface`, `bg-bg-surface-raised`

### Borders

- `--color-border-subtle`: Faint dividers, minimal visual weight
- `--color-border-medium`: Standard borders on cards, inputs

**Tailwind classes**: `border-border-subtle`, `border-border-medium`

### Text

- `--color-text-primary`: Body text (dark)
- `--color-text-secondary`: Secondary labels, descriptions
- `--color-text-muted`: Disabled text, hints

**Tailwind classes**: `text-text-primary`, `text-text-secondary`, `text-text-muted`

### Semantic Accents

- `--color-accent-success`: Green (paid, completion)
- `--color-accent-warning`: Amber (pending, needs attention)
- `--color-accent-danger`: Red (overdue, errors)
- `--color-accent-info`: Blue (informational)

**Tailwind classes**: `text-accent-success`, `bg-accent-danger`, etc.

### Status-Specific Badges

**Light Mode:**
- Draft: `bg-status-draft-bg` / `text-status-draft-text`
- Open: `bg-status-open-bg` / `text-status-open-text`
- Paid: `bg-status-paid-bg` / `text-status-paid-text`
- Overdue: `bg-status-overdue-bg` / `text-status-overdue-text`
- Cancelled: `bg-status-cancelled-bg` / `text-status-cancelled-text`

Dark mode automatically adjusts via `[data-theme="dark"]`.

### Shadows

- `--shadow-card`: Subtle shadow for cards (default)
- `--shadow-card-hover`: Elevated shadow on hover

**Tailwind classes**: `shadow-card`, `shadow-card-hover`

### Motion

- `--duration-slow`: 300ms (standard transition duration)
- `--ease-default`: cubic-bezier(0.4, 0, 0.2, 1)

---

## 2. Component Inventory

### Button

All buttons use semantic token classes. Never use hardcoded colors like `bg-blue-600` or `text-white`.

#### Primary Button
- **Usage**: Main CTAs (Save, Send Invoice, Create)
- **Classes**: `bg-primary hover:bg-primary-hover text-white rounded-md px-3 py-2 text-sm font-medium transition-colors`
- **Icon**: Lucide icon via `data-lucide="icon-name"`, Hono renders it, JS hydrates
- **Loading State**: Add `.htmx-request` parent class to dim; spinner added via Lucide

#### Secondary Button
- **Usage**: Alternative actions, less important CTAs
- **Classes**: `bg-bg-surface-raised hover:bg-border-medium text-text-primary border border-border-subtle rounded-md px-3 py-2 text-sm font-medium`

#### Danger Button
- **Usage**: Delete, Cancel, destructive actions
- **Classes**: `bg-accent-danger hover:opacity-90 text-white rounded-md px-3 py-2 text-sm font-medium`

#### Ghost Button
- **Usage**: Tertiary, minimal visual weight
- **Classes**: `bg-transparent hover:bg-bg-surface text-text-primary rounded-md px-3 py-2 text-sm font-medium`

#### Button with Icon
- **Structure**: Icon + Label (or icon-only)
- **Icon alignment**: `inline-flex items-center gap-1.5` (1.5 = 6px gap)
- **Icon size**: `h-4 w-4` for buttons (small) or `h-5 w-5` for nav
- **Example**: 
```html
<button class="...button-classes... flex items-center gap-1.5">
  <i data-lucide="download" class="h-4 w-4"></i>
  PDF herunterladen
</button>
```

---

### Card

Used for elevated content containers.

**Classes**:
```
bg-bg-surface border border-border-subtle rounded-lg shadow-card
```

**Variants**:
- **Default**: Standard card with subtle border and shadow
- **Hover**: Add `hover:shadow-card-hover hover:border-border-medium` for interactive cards

**Padding**: 
- Content inside card: `p-6` (24px padding)
- Tight spacing: `p-4` (16px)

---

### Badge

Status and categorical indicators.

**Base Classes**: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium`

**Status Badges** (use semantic tokens):
```html
<!-- Draft -->
<span class="bg-status-draft-bg text-status-draft-text rounded-full px-2 py-0.5 text-xs font-medium">Entwurf</span>

<!-- Paid -->
<span class="bg-status-paid-bg text-status-paid-text rounded-full px-2 py-0.5 text-xs font-medium">Bezahlt</span>

<!-- Overdue -->
<span class="bg-status-overdue-bg text-status-overdue-text rounded-full px-2 py-0.5 text-xs font-medium">Überfällig</span>
```

**Custom Badges**:
```html
<!-- Info badge -->
<span class="bg-accent-info bg-opacity-10 text-accent-info rounded-full px-2 py-0.5 text-xs font-medium">5 neue Rechnungen</span>
```

---

### Table

Tabular data display (Invoice List, Timesheet, etc.)

**Structure**:
```html
<div class="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
  <table class="min-w-full divide-y divide-border-subtle text-sm">
    <thead class="bg-bg-surface-raised">
      <tr>
        <th class="px-4 py-3 text-left font-semibold text-text-primary">Column</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-border-subtle">
      <tr class="hover:bg-bg-surface-raised transition-colors">
        <td class="px-4 py-3">Cell</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Key Patterns**:
- Header background: `bg-bg-surface-raised` (subtle lift)
- Row dividers: `divide-y divide-border-subtle`
- Hover state: `hover:bg-bg-surface-raised`
- Currency alignment: Use `tabular-nums` class (inherited via `.font-mono` or explicit `class="tabular-nums"`)
- Links in tables: `text-primary hover:underline`

**Never use**: `divide-gray-200`, `bg-gray-50`, `text-gray-600`

---

### Form Field

Inputs, textareas, selects with proper labeling.

**Structure**:
```html
<div class="space-y-1">
  <label for="invoice_date" class="block text-sm font-medium text-text-primary">
    Rechnungsdatum
  </label>
  <input
    type="date"
    id="invoice_date"
    name="invoice_date"
    value="2026-05-04"
    class="w-full rounded-md border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
  />
</div>
```

**Input Base Classes**:
```
w-full rounded-md border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
```

**Disabled State**:
```html
<input ... disabled class="...base-classes... opacity-50 cursor-not-allowed" />
```

**Error State** (add error message below):
```html
<input ... class="...base-classes... border-accent-danger focus:ring-accent-danger" />
<p class="text-xs text-accent-danger mt-1">Ungültige E-Mail Adresse</p>
```

**WCAG 2.1 AA Checklist**:
- ✅ Every `<input>` has associated `<label for="id">`
- ✅ Focus ring visible (ring-2 primary)
- ✅ Error text linked to input via `aria-describedby` (optional but recommended)

---

### Empty State

Placeholder when no data exists.

**Usage**: Invoice list (no invoices), Projects (no projects)

**Structure**:
```html
<div class="rounded-lg border border-border-subtle bg-bg-surface p-12 text-center">
  <svg class="mx-auto h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <!-- Lucide icon SVG -->
  </svg>
  <h3 class="mt-4 text-lg font-semibold text-text-primary">Noch keine Rechnungen</h3>
  <p class="mt-2 text-sm text-text-secondary">Erfasse zuerst Zeiten für ein Projekt, dann kannst du eine Rechnung generieren.</p>
  <a href="/rechnungen/create" class="mt-6 inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white rounded-md px-4 py-2 text-sm font-medium">
    <i data-lucide="plus" class="h-4 w-4"></i>
    Neue Rechnung erstellen
  </a>
</div>
```

---

### Navigation

**Desktop Links** (in layout header):
```html
<a href="/dashboard" class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors bg-primary-subtle text-primary">
  <i data-lucide="layout-dashboard" class="h-4 w-4"></i>
  Dashboard
</a>
```

**Active State**: `bg-primary-subtle text-primary`  
**Inactive State**: `text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary`

---

## 3. Typography Scale

All text sizes use Tailwind's default `text-*` classes with token colors.

| Use Case | Classes | Notes |
|----------|---------|-------|
| **Page Title (h1)** | `text-3xl font-bold text-text-primary` | 30px, bold |
| **Section Title (h2)** | `text-2xl font-semibold text-text-primary` | 24px, semibold |
| **Subsection (h3)** | `text-xl font-semibold text-text-primary` | 20px, semibold |
| **Body/Paragraph** | `text-base text-text-primary` | 16px, default weight |
| **Small Text** | `text-sm text-text-secondary` | 14px, secondary color |
| **Caption/Label** | `text-xs text-text-muted` | 12px, muted color |
| **Code Block** | `font-mono text-sm text-text-primary bg-bg-surface-raised rounded px-2 py-1` | Monospace |

**Never use**: `text-gray-600`, `text-blue-700`, hardcoded colors.

---

## 4. Spacing Scale

Consistent gap and padding values.

| Utility | Value | Usage |
|---------|-------|-------|
| `gap-1.5` | 6px | Icon + text spacing |
| `gap-2` | 8px | Tight button groups |
| `gap-3` | 12px | Form fields, tight sections |
| `gap-4` | 16px | Section spacing |
| `gap-6` | 24px | Major section breaks |
| `p-2` | 8px | Dense containers |
| `p-3` | 12px | Form inputs, tight cards |
| `p-4` | 16px | Standard card/container padding |
| `p-6` | 24px | Spacious card padding |
| `px-3 py-2` | 12px (h) × 8px (v) | Standard button padding |

**Principle**: Use increments of 4px (Tailwind base). Avoid arbitrary spacing.

---

## 5. Token Application Rules

### When to Use Each Token

| Context | Token | Reason |
|---------|-------|--------|
| Main CTA button | `bg-primary` | Brand color, highest emphasis |
| Secondary button | `border-border-medium bg-transparent` | Lower emphasis, neutral |
| Card background | `bg-bg-surface` | Elevated, readable contrast |
| Card borders | `border-border-subtle` | Minimal visual noise |
| Body text | `text-text-primary` | Maximum readability |
| Placeholder text | `placeholder:text-text-muted` | De-emphasized hint |
| Paid invoice badge | `bg-status-paid-bg text-status-paid-text` | Status-specific color pair |
| Input focus ring | `focus:ring-primary` | Consistent focus feedback |
| Hover state | `hover:bg-primary-hover` (for primary btn) | Tactile feedback |
| Disabled state | `opacity-50 cursor-not-allowed` | Visual clarity |

### Common Mistakes to Avoid

❌ **WRONG**:
```html
<button class="bg-blue-600 text-white">Send</button>
<a class="text-red-600">Delete</a>
<div class="border border-gray-200 bg-gray-50">
```

✅ **CORRECT**:
```html
<button class="bg-primary text-white">Send</button>
<a class="text-accent-danger">Delete</a>
<div class="border border-border-subtle bg-bg-surface">
```

---

## 6. Dark Mode

Dark mode is automatic via `[data-theme="dark"]` attribute on `<html>`.

**No CSS media queries**: All dark mode uses CSS custom property overrides.

**Token behavior**:
- Same CSS variable names
- Different values in `[data-theme="dark"]` block
- Tailwind utilities (e.g., `bg-primary`) automatically resolve to dark mode colors

**Theme Toggle**:
- Implemented in `src/templates/layout.ts` (button in header)
- Saved to `localStorage` and restored on page load
- Transition class applied to prevent flash: `html.theme-transitioning`

---

## 7. Accessibility (WCAG 2.1 AA)

### Contrast Requirements

All tokens meet WCAG AA standards (4.5:1 for text, 3:1 for UI):

- ✅ `text-text-primary` on `bg-bg-surface`: ~11:1 contrast
- ✅ `text-primary` on `bg-primary-subtle`: ~4.5:1 contrast
- ✅ `text-accent-danger` on `bg-status-overdue-bg`: ~5:1 contrast

### Focus Indicators

- All interactive elements (buttons, links, inputs) have visible focus rings
- Focus ring class: `focus:ring-2 focus:ring-primary focus:ring-offset-2`
- Never use `focus:outline-none` without adding a replacement focus style

### Semantic HTML

- Use `<button>` for buttons, never `<a onclick="">`
- Use `<label>` with `for="id"` for form inputs
- Use heading hierarchy: h1 → h2 → h3 (no skipping levels)
- Use `<nav>` for navigation
- Use `<main>` for primary content

### Skip Link

Included in `layout.ts`:
```html
<a href="#main-content" class="sr-only focus:not-sr-only">Zum Hauptinhalt</a>
```

---

## 8. Implementation Rules

### Required Patterns

1. **Always use token classes**: Never hardcoded color values in templates
2. **Icons via Lucide**: `<i data-lucide="icon-name"></i>` hydrated by `/static/lucide.min.js`
3. **HTMX indicators**: Use `.htmx-indicator` for loading spinners
4. **Semantic HTML**: `<button>`, `<label>`, `<nav>`, heading hierarchy
5. **Proper labeling**: Every `<input>` has a `<label for="id">`

### File Structure

- Design tokens: `src/styles/input.css` (@theme block)
- Components: Defined inline in template functions
- No separate component library (HTMX templates + Tailwind)

### QA Checklist

- [ ] No hardcoded colors (gray-*, blue-*, red-*, etc.) in templates
- [ ] All buttons use semantic tokens (`primary`, `accent-danger`, etc.)
- [ ] All tables use `border-border-subtle` and `divide-border-subtle`
- [ ] All forms have proper `<label>` associations
- [ ] Focus rings visible on all interactive elements
- [ ] Dark mode works (toggle via header button)
- [ ] Contrast meets WCAG AA (4.5:1 text, 3:1 UI)

---

## 9. Reference Mockups

See:
- `docs/mockups/dashboard.html` — Dashboard with key metrics
- `docs/mockups/invoice-list.html` — Invoice table with status badges
- `docs/mockups/invoice-detail.html` — Full invoice detail with CTA buttons
- `docs/mockups/form-example.html` — Form fields and validation states

---

## 10. CTO Review Gate

**Before merging any UI changes:**

1. ✅ Component uses correct token classes
2. ✅ No hardcoded color values (`gray-*`, `blue-*`, `red-*`)
3. ✅ Accessibility: labels, focus rings, contrast
4. ✅ Tested in dark mode
5. ✅ Button icons use Lucide, no inline SVGs

---

**Next Steps**: Frontend Engineer implements components in templates using this spec.
