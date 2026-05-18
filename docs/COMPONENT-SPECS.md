# FREA Component Specifications

**Version**: 1.0  
**Status**: Reference (implements FREA-DESIGN-SYSTEM.md tokens)  
**Last Updated**: 2026-05-18

---

## Overview

This document specifies component behavior and styling, building on the design tokens and foundations defined in `FREA-DESIGN-SYSTEM.md`. Every component listed here must maintain WCAG 2.1 AA compliance and use CSS custom properties (no hardcoded colors).

---

## 1. Button Components

### Primary Button `.btn-primary`

**Purpose**: Main call-to-action (save, create, submit).

**HTML Structure**:
```html
<button class="btn-primary">
  Label
</button>
```

**CSS Classes**:
```css
.btn-primary {
  @apply px-4 py-2 rounded-md font-medium bg-primary text-white
         hover:bg-primary-hover focus:ring-2 focus:ring-primary focus:outline-none
         disabled:opacity-50 disabled:cursor-not-allowed
         transition-colors duration-200;
  min-height: 44px; /* touch accessibility */
}
```

**States**:
- **Default**: Primary emerald background, white text
- **Hover**: Darker emerald (`--color-primary-hover`)
- **Focus**: 2px primary ring, no outline
- **Disabled**: Opacity 50%, cursor not-allowed
- **Active**: Same as hover (button press)

**Contrast**:
- Light mode: 5.2:1 on white ✅
- Dark mode: 5.8:1 on dark surface ✅

---

### Secondary Button `.btn-secondary`

**Purpose**: Alternative or cancel actions.

**HTML Structure**:
```html
<button class="btn-secondary">
  Label
</button>
```

**CSS Classes**:
```css
.btn-secondary {
  @apply px-4 py-2 rounded-md font-medium border border-border-medium
         bg-transparent text-text-primary hover:bg-bg-surface-raised
         focus:ring-2 focus:ring-primary focus:outline-none
         disabled:opacity-50 disabled:cursor-not-allowed
         transition-all duration-200;
  min-height: 44px;
}
```

**States**:
- **Default**: Transparent background, border, dark text
- **Hover**: Raised surface background
- **Focus**: 2px primary ring
- **Disabled**: Opacity 50%

---

### Danger Button `.btn-danger`

**Purpose**: Destructive actions (delete, cancel, remove).

**HTML Structure**:
```html
<button class="btn-danger" aria-label="Delete invoice">
  Label
</button>
```

**CSS Classes**:
```css
.btn-danger {
  @apply px-4 py-2 rounded-md font-medium bg-accent-danger text-white
         hover:opacity-90 focus:ring-2 focus:ring-accent-danger focus:outline-none
         disabled:opacity-50 disabled:cursor-not-allowed
         transition-all duration-200;
  min-height: 44px;
}
```

**Requirements**:
- Always pair with confirmation modal before executing action
- Aria-label should describe the destructive action
- Contrast: 4.5:1+ ✅

---

### Icon Button `.btn-icon`

**Purpose**: Compact buttons for icons (edit, delete, expand).

**HTML Structure**:
```html
<button class="btn-icon" aria-label="Edit">
  <svg><!-- icon SVG --></svg>
</button>
```

**CSS Classes**:
```css
.btn-icon {
  @apply w-10 h-10 flex items-center justify-center rounded-md
         text-text-primary hover:bg-bg-surface-raised
         focus:ring-2 focus:ring-primary focus:outline-none
         transition-colors duration-200;
}
```

**Requirements**:
- Aria-label required (icon is not sufficient for accessibility)
- Size: 40px × 40px minimum (touch target)
- Icon color: `currentColor` (inherits text color)

---

## 2. Form Components

### Input Field `.form-input`

**Purpose**: Text input, email, number, etc.

**HTML Structure**:
```html
<label for="field-id" class="block text-sm font-medium text-text-primary mb-1">
  Label Text
</label>
<input id="field-id" type="text" 
       class="form-input" 
       placeholder="Optional placeholder" />
```

**CSS Classes**:
```css
.form-input {
  @apply w-full px-3 py-2 rounded-md border border-border-medium
         bg-bg-surface text-text-primary placeholder:text-text-muted
         focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none
         disabled:bg-bg-surface-raised disabled:opacity-50
         disabled:cursor-not-allowed
         transition-all duration-150;
  font-size: 16px; /* prevents iOS zoom */
  min-height: 44px; /* touch accessibility */
}
```

**States**:
- **Default**: Border, white background (light) / dark surface (dark)
- **Focus**: 2px primary ring + primary border
- **Disabled**: Lighter background, reduced opacity
- **Error**: Red border instead of gray (see Error Handling)

**Validation**:
```html
<input id="email" type="email" class="form-input" aria-describedby="email-error" />
<span id="email-error" role="alert" class="text-accent-danger text-sm mt-1">
  Ungültige E-Mail-Adresse
</span>
```

---

### Textarea `.form-textarea`

**Purpose**: Multi-line text input (notes, descriptions).

**HTML Structure**:
```html
<label for="notes" class="block text-sm font-medium text-text-primary mb-1">
  Notizen
</label>
<textarea id="notes" class="form-textarea" 
          placeholder="Optional placeholder"></textarea>
```

**CSS Classes**:
```css
.form-textarea {
  @apply form-input; /* inherit input styles */
  min-height: 100px;
  resize: vertical;
}
```

---

### Select Dropdown `.form-select`

**Purpose**: Multiple options in a dropdown (countries, payment methods).

**HTML Structure**:
```html
<label for="country" class="block text-sm font-medium text-text-primary mb-1">
  Land
</label>
<select id="country" class="form-select">
  <option value="">-- Auswählen --</option>
  <option value="de">Deutschland</option>
  <option value="at">Österreich</option>
  <option value="ch">Schweiz</option>
</select>
```

**CSS Classes**:
```css
.form-select {
  @apply form-input;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}
```

**Requirements**:
- Use native `<select>` for better mobile accessibility
- Always include placeholder option (e.g., "-- Auswählen --")
- Custom chevron icon (SVG, no CDN)

---

### Checkbox `.form-checkbox`

**Purpose**: Boolean toggle (opt-in, agreement).

**HTML Structure**:
```html
<div class="flex items-center">
  <input id="agree" type="checkbox" class="form-checkbox" />
  <label for="agree" class="ml-2 text-sm text-text-primary">
    Ich akzeptiere die Nutzungsbedingungen
  </label>
</div>
```

**CSS Classes**:
```css
.form-checkbox {
  @apply w-4 h-4 rounded cursor-pointer accent-primary;
}
```

---

### Radio Button `.form-radio`

**Purpose**: Mutually exclusive options (invoice type, payment status).

**HTML Structure**:
```html
<div class="flex items-center">
  <input id="draft" type="radio" name="status" value="draft" class="form-radio" />
  <label for="draft" class="ml-2 text-sm text-text-primary">
    Entwurf
  </label>
</div>
<div class="flex items-center mt-2">
  <input id="sent" type="radio" name="status" value="sent" class="form-radio" />
  <label for="sent" class="ml-2 text-sm text-text-primary">
    Versendet
  </label>
</div>
```

**CSS Classes**:
```css
.form-radio {
  @apply w-4 h-4 cursor-pointer accent-primary;
}
```

---

## 3. Card Components

### Default Card `.card`

**Purpose**: Container for content grouping (invoice summary, client card, settings section).

**HTML Structure**:
```html
<div class="card">
  <h3 class="text-lg font-semibold mb-4">Card Title</h3>
  <!-- content -->
</div>
```

**CSS Classes** (already in `input.css`):
```css
.card {
  @apply bg-bg-surface border border-border-subtle rounded-lg shadow-card p-4;
}
```

**Hover Variant** (for interactive cards):
```html
<div class="card hover:shadow-card-hover cursor-pointer transition-shadow">
  <!-- content -->
</div>
```

---

### Modal Card `.modal`

**Purpose**: Overlay dialog (confirmations, forms).

**HTML Structure**:
```html
<dialog class="modal">
  <div class="modal-content">
    <h2>Bestätigung erforderlich</h2>
    <p>Sind Sie sicher, dass Sie fortfahren möchten?</p>
    <div class="flex gap-2 justify-end">
      <button class="btn-secondary">Abbrechen</button>
      <button class="btn-primary">Bestätigen</button>
    </div>
  </div>
</dialog>
```

**CSS Classes**:
```css
.modal {
  @apply fixed inset-0 z-50 flex items-center justify-center
         backdrop-blur-sm bg-black/50 rounded-none;
  opacity: 0;
  pointer-events: none;
  transition: opacity 300ms ease;
}

.modal[open] {
  @apply opacity-100 pointer-events-auto;
}

.modal-content {
  @apply bg-bg-surface rounded-lg shadow-lg p-6 max-w-md w-full mx-4
         max-h-[90vh] overflow-auto;
  animation: slideUp 300ms ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(2rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

---

## 4. Badge Components

### Status Badge `.badge`

**Purpose**: Visual label for statuses (Draft, Open, Paid, Overdue, Cancelled).

**HTML Structure**:
```html
<span class="badge badge-paid">Bezahlt</span>
<span class="badge badge-overdue">Überfällig</span>
<span class="badge badge-draft">Entwurf</span>
```

**CSS Classes**:
```css
.badge {
  @apply inline-flex items-center px-2 py-0.5 rounded-full
         text-xs font-medium whitespace-nowrap;
}

.badge-draft {
  @apply bg-status-draft-bg text-status-draft-text;
}

.badge-open {
  @apply bg-status-open-bg text-status-open-text;
}

.badge-paid {
  @apply bg-status-paid-bg text-status-paid-text;
}

.badge-overdue {
  @apply bg-status-overdue-bg text-status-overdue-text;
}

.badge-cancelled {
  @apply bg-status-cancelled-bg text-status-cancelled-text;
}
```

**Contrast Check**:
- All status pairs verified for 4.5:1 contrast in light and dark modes ✅

---

## 5. Table Components

### Data Table `.table`

**Purpose**: Display tabular data (invoice list, client list).

**HTML Structure**:
```html
<div class="overflow-x-auto">
  <table class="table">
    <thead>
      <tr>
        <th>Rechnungsnummer</th>
        <th>Kunde</th>
        <th>Betrag</th>
        <th>Status</th>
        <th>Aktionen</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>INV-001</td>
        <td>Acme Corp</td>
        <td>€1,500.00</td>
        <td><span class="badge badge-paid">Bezahlt</span></td>
        <td>
          <button class="btn-icon" aria-label="Edit"><!-- icon --></button>
          <button class="btn-icon" aria-label="Delete"><!-- icon --></button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**CSS Classes**:
```css
.table {
  @apply w-full border-collapse;
}

.table thead tr {
  @apply border-b border-border-medium bg-bg-surface-raised;
}

.table th {
  @apply px-4 py-3 text-left text-sm font-semibold text-text-primary;
}

.table tbody tr {
  @apply border-b border-border-subtle hover:bg-bg-surface-raised
         transition-colors duration-150;
}

.table td {
  @apply px-4 py-3 text-sm text-text-primary;
}

/* Sortable header (if used) */
.table th.sortable {
  @apply cursor-pointer hover:bg-border-subtle select-none;
}
```

**Accessibility**:
- Table headers use `<th scope="col">` or `<th scope="row">`
- Complex tables include `<caption>` with description

---

## 6. Alert & Toast Components

### Alert Box `.alert`

**Purpose**: Persistent messages (warnings, info, errors).

**HTML Structure**:
```html
<div class="alert alert-info">
  <svg class="alert-icon"><!-- icon --></svg>
  <div>
    <p class="alert-title">Information</p>
    <p class="alert-text">Dies ist eine Informationsmeldung.</p>
  </div>
</div>

<div class="alert alert-danger">
  <svg class="alert-icon"><!-- icon --></svg>
  <div>
    <p class="alert-title">Fehler</p>
    <p class="alert-text">Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.</p>
  </div>
</div>
```

**CSS Classes**:
```css
.alert {
  @apply flex gap-3 p-4 rounded-md border;
}

.alert-info {
  @apply bg-accent-info/10 border-accent-info/30 text-accent-info;
}

.alert-warning {
  @apply bg-accent-warning/10 border-accent-warning/30 text-accent-warning;
}

.alert-danger {
  @apply bg-accent-danger/10 border-accent-danger/30 text-accent-danger;
}

.alert-success {
  @apply bg-accent-success/10 border-accent-success/30 text-accent-success;
}

.alert-icon {
  @apply w-5 h-5 flex-shrink-0 mt-0.5;
}

.alert-title {
  @apply font-semibold text-sm mb-1;
}

.alert-text {
  @apply text-sm;
}
```

---

### Toast Notification (Ephemeral)

**Purpose**: Brief confirmation messages that auto-dismiss (file saved, item deleted).

**HTML Structure** (HTMX-injected):
```html
<div class="toast toast-success" role="status" aria-live="polite">
  <svg><!-- checkmark icon --></svg>
  <span>Rechnung erfolgreich gespeichert</span>
</div>
```

**CSS Classes**:
```css
.toast {
  @apply fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3
         rounded-md shadow-lg z-50
         animation: slideInUp 300ms ease-out, slideOutDown 300ms ease-in 2700ms;
  background: var(--color-text-primary);
  color: white;
}

.toast-success {
  @apply bg-accent-success text-white;
}

.toast-error {
  @apply bg-accent-danger text-white;
}

@keyframes slideInUp {
  from {
    transform: translateY(2rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideOutDown {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(2rem);
    opacity: 0;
  }
}
```

---

## 7. Navigation Components

### Main Navigation Bar `.navbar`

**Purpose**: Primary navigation (dashboard, clients, invoices, settings).

**HTML Structure**:
```html
<nav class="navbar" aria-label="Main navigation">
  <div class="navbar-brand">
    <img src="/assets/branding/frea-logo-badge.svg" alt="FREA" class="w-8 h-8" />
  </div>
  <ul class="navbar-menu">
    <li><a href="/dashboard" class="navbar-link navbar-link-active">Dashboard</a></li>
    <li><a href="/clients" class="navbar-link">Kunden</a></li>
    <li><a href="/invoices" class="navbar-link">Rechnungen</a></li>
    <li><a href="/settings" class="navbar-link">Einstellungen</a></li>
  </ul>
</nav>
```

**CSS Classes**:
```css
.navbar {
  @apply flex items-center justify-between px-6 py-4 bg-bg-surface
         border-b border-border-subtle sticky top-0 z-40;
}

.navbar-brand {
  @apply text-lg font-bold text-text-primary;
}

.navbar-menu {
  @apply flex gap-6 list-none;
}

.navbar-link {
  @apply text-text-secondary hover:text-text-primary
         focus:ring-2 focus:ring-primary focus:outline-none
         transition-colors duration-200;
  border-bottom: 2px solid transparent;
}

.navbar-link-active {
  @apply text-primary font-semibold border-b-primary;
}
```

---

## 8. Empty State Component

**Purpose**: When no data to display (no invoices, no clients).

**HTML Structure**:
```html
<div class="empty-state">
  <svg class="empty-state-icon"><!-- empty folder or similar --></svg>
  <h3 class="empty-state-title">Keine Rechnungen vorhanden</h3>
  <p class="empty-state-text">Erstellen Sie Ihre erste Rechnung, um zu beginnen.</p>
  <button class="btn-primary">Rechnung erstellen</button>
</div>
```

**CSS Classes**:
```css
.empty-state {
  @apply flex flex-col items-center justify-center py-12 px-4
         text-center rounded-lg bg-bg-surface-raised;
}

.empty-state-icon {
  @apply w-16 h-16 text-border-medium mb-4;
}

.empty-state-title {
  @apply text-lg font-semibold text-text-primary mb-2;
}

.empty-state-text {
  @apply text-text-secondary mb-6 max-w-xs;
}
```

---

## 9. Loading State

**Purpose**: Feedback while content loads (HTMX requests, page transitions).

**HTML Structure**:
```html
<!-- HTMX-driven: show while request is pending -->
<div class="htmx-request">
  <div class="loading-spinner"></div>
</div>

<!-- Or inline skeleton -->
<div class="skeleton-card"></div>
```

**CSS Classes**:
```css
.loading-spinner {
  @apply inline-block w-6 h-6 rounded-full border-2
         border-border-medium border-t-primary
         animate-spin;
}

.skeleton-card {
  @apply bg-border-subtle rounded-md p-4
         animate-pulse;
}

.skeleton-card::before {
  content: '';
  @apply block h-4 bg-border-medium rounded w-3/4 mb-3;
  animation: pulse 2s ease-in-out infinite;
}
```

---

## 10. Responsive Behavior

### Mobile First Approach

All components are designed mobile-first, with desktop enhancements via breakpoints:

```css
/* Mobile (default) */
.card { @apply p-3; }

/* Tablet and up (768px) */
@media (min-width: 768px) {
  .card { @apply p-4; }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .card { @apply p-6; }
}
```

### Touch Targets

All interactive elements (buttons, links, inputs) must have minimum 44×44px touch target:

```css
.btn-primary,
.btn-secondary,
.btn-icon,
.form-input,
.form-select,
a[role="button"] {
  min-height: 44px;
}
```

---

## 11. Dark Mode Overrides

All components automatically adapt to dark mode via CSS custom properties. Example:

```html
<!-- Light mode (default) -->
<button class="btn-primary">Save</button>
<!-- Renders with primary emerald on white text -->

<!-- Dark mode: add data-theme="dark" to <html> -->
<html data-theme="dark">
  <button class="btn-primary">Save</button>
  <!-- Renders with bright emerald on dark surface -->
</html>
```

No additional component classes needed — token overrides handle it.

---

## 12. Implementation Checklist

When building a new component:

- [ ] Use CSS custom properties (no hardcoded colors)
- [ ] Test in light AND dark mode
- [ ] Verify focus ring visible (2px primary ring)
- [ ] Check keyboard navigation (Tab, Enter, Esc)
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify 4.5:1 contrast on text, 3:1 on UI elements
- [ ] Mobile: min 44px touch targets
- [ ] Test on actual mobile device (not just browser devtools)
- [ ] Add to this spec before merging to main

---

## 13. Component Library (Storybook)

To be created: `storybook/` directory with `.stories.ts` files for each component, enabling:
- Isolated component testing
- Interactive token/prop exploration
- Dark mode preview
- Accessibility testing in Storybook

---

**Next**: Frontend engineer implements these specs using Tailwind + HTMX.

