# FREA-178: UI Redesign Implementation Plan

**Spec:** `docs/adr/078-ui-redesign-spec.md`  
**Status:** Awaiting CTO Approval  
**Target Start:** Upon CTO sign-off  
**Estimated Duration:** 5 phases, ~2-3 weeks

---

## Phase 1: Component Extraction (Priority: HIGH)

**Goal:** Create reusable component templates aligned with spec.

### 1.1 Button Component (`src/templates/components/button.ts`)

**Variants to extract:**
- Primary: `bg-primary hover:bg-primary-hover`
- Secondary: `text-primary bg-primary-subtle hover:bg-primary`
- Danger: `bg-accent-danger hover:bg-accent-danger/90`
- Ghost: `text-text-secondary hover:text-text-primary hover:bg-bg-surface-raised`
- Icon: Primary button with inline SVG (14px)
- Link: `text-primary hover:underline`

**Signature:**
```typescript
export function Button({
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'link',
  children: HtmlEscapedString,
  href?: string,
  type?: 'button' | 'submit' | 'reset',
  disabled?: boolean,
  icon?: string, // lucide icon name (for icon variant)
  onClick?: string, // HTMX attribute
  ...rest
}: ButtonProps): HtmlEscapedString
```

**Files to refactor:**
- `src/templates/invoice-detail.ts` (PDF, email, mark paid buttons)
- `src/templates/invoice-list.ts` (new invoice button)
- `src/templates/onboarding-page.ts` (CTA buttons)
- `src/templates/invoice-create-*.ts` (submit buttons)

**Tests:**
- Variant rendering (all 6 types)
- Disabled state
- Icon + text alignment
- Accessibility (focus ring, aria-label)

---

### 1.2 Table Component (`src/templates/components/table.ts`)

**Signature:**
```typescript
export function Table({
  headers: Array<{ label: string, align?: 'left' | 'right' | 'center' }>,
  rows: Array<Array<HtmlEscapedString>>,
  emptyMessage?: string,
  hoverable?: boolean
}: TableProps): HtmlEscapedString
```

**Files to refactor:**
- `src/templates/invoice-list.ts` (invoice table)
- `src/templates/invoice-detail.ts` (line items table)

**Structure per spec:**
- `<thead class="bg-bg-surface-raised">` with semantic `<th>`
- `<tbody class="divide-y divide-border-subtle">`
- Row hover state: `hover:bg-bg-surface-raised`
- Right-aligned columns: `text-right` on amount columns
- Empty state integration

---

### 1.3 Form-Field Component (`src/templates/components/form-field.ts`)

**Variants:**
- Text input (single-line)
- Textarea (multi-line)
- Select (dropdown)
- Date input
- Number input
- Checkbox
- Radio

**Signature:**
```typescript
export function FormField({
  name: string,
  label: string,
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'checkbox' | 'radio',
  value?: string,
  error?: string,
  disabled?: boolean,
  placeholder?: string,
  required?: boolean,
  helperText?: string,
  options?: Array<{ value: string, label: string }> // for select/radio
}: FormFieldProps): HtmlEscapedString
```

**Files to refactor:**
- `src/templates/invoice-create-*.ts` (invoice form fields)
- `src/templates/settings-layout-fields.ts` (settings form)
- `src/templates/onboarding-page.ts` (onboarding form)

**Error state rendering:**
- `border-accent-danger` on input
- `text-accent-danger` on error message
- ARIA attributes (`aria-invalid`, `aria-describedby`)

---

### 1.4 EmptyState Component (Refactor)

**Current location:** `src/templates/components/empty-state.ts`

**Update to match spec:**
```typescript
export function EmptyState({
  message: string,
  description?: string,
  actionHref?: string,
  actionLabel?: string,
  icon?: string // lucide icon
}: EmptyStateProps): HtmlEscapedString
```

**Apply to:**
- No invoices → Dashboard
- No clients → Clients page
- No projects → Projects page
- No time entries → Time tracking

---

## Phase 2: Token Cleanup (Priority: HIGH)

**Goal:** Replace all hardcoded Tailwind colors with design tokens.

### 2.1 Color Token Refactoring

**Search & replace patterns:**

| Find | Replace | Files |
|------|---------|-------|
| `bg-blue-600` | `bg-primary` | All templates |
| `hover:bg-blue-700` | `hover:bg-primary-hover` | All templates |
| `text-blue-600` | `text-primary` | All templates |
| `bg-green-600` | `bg-primary` (or new success variant) | invoice-detail, forms |
| `hover:bg-green-700` | `hover:bg-primary-hover` | invoice-detail, forms |
| `text-red-600` | `text-accent-danger` | invoice-list, forms |
| `bg-gray-100 text-gray-700` | `bg-status-draft-bg text-status-draft-text` | invoice-shared.ts |
| `bg-gray-50` | `bg-bg-surface-raised` | Tables, modals |
| `bg-white` | `bg-bg-surface` | Cards, inputs |
| `text-gray-900` | `text-text-primary` | All text |
| `text-gray-600` | `text-text-secondary` | Secondary text |
| `text-gray-500` | `text-text-muted` | Muted text |
| `border-gray-200` | `border-border-subtle` | All borders |

### 2.2 Status Badge Token Mapping

**Current:** `src/templates/invoice-shared.ts` (line 17–22)

**Before:**
```typescript
const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Entwurf", className: "bg-gray-100 text-gray-700" },
  sent: { label: "Versendet", className: "bg-blue-100 text-blue-700" },
  paid: { label: "Bezahlt", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Storniert", className: "bg-red-100 text-red-700" },
};
```

**After:**
```typescript
const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Entwurf", className: "bg-status-draft-bg text-status-draft-text" },
  sent: { label: "Versendet", className: "bg-status-open-bg text-status-open-text" },
  paid: { label: "Bezahlt", className: "bg-status-paid-bg text-status-paid-text" },
  overdue: { label: "Überfällig", className: "bg-status-overdue-bg text-status-overdue-text" },
  cancelled: { label: "Storniert", className: "bg-status-cancelled-bg text-status-cancelled-text" },
};
```

### 2.3 Verification

After cleanup:
1. Run: `grep -r "bg-blue-\|bg-green-\|bg-red-\|text-gray-\|text-red-" src/templates --include="*.ts" | wc -l` → Should return 0
2. Run: `grep -r "var(--color-\|bg-primary\|text-accent-" src/templates --include="*.ts"` → Should show token usage
3. Visual test: Load app in browser, verify all colors render correctly in light & dark modes

---

## Phase 3: New Features (Priority: MEDIUM)

**Goal:** Add form validation UI and interactive components.

### 3.1 Form Validation Error States

**Files affected:**
- Invoice form (create/edit)
- Settings form
- Onboarding form

**Implementation:**
- Show error message below input (red, smaller text)
- Red border on invalid input
- ARIA attributes (`aria-invalid`, `aria-describedby`)
- Clear error on input change (via HTMX)

### 3.2 Loading Spinner Component

**Current:** HTMX handles this with `.htmx-request` dimming (opacity: 0.6)

**Enhancement:**
- Add inline spinner icon during request
- Show "saving..." text on buttons
- Disable form during submission

### 3.3 Dialog/Modal Component

**For destructive actions:**
- Cancel invoice → "Sind Sie sicher?"
- Delete client → "Alle Rechnungen bleiben"

**Signature:**
```typescript
export function Dialog({
  title: string,
  message: string,
  confirmLabel: string,
  confirmColor: 'danger' | 'primary',
  onConfirm: string // HTMX attribute
}: DialogProps): HtmlEscapedString
```

### 3.4 Pagination Component

**For long invoice lists:**
- Previous / Next buttons
- Page number display
- Jump-to-page input

---

## Phase 4: Refinements (Priority: LOW)

**Goal:** Polish animations, accessibility, responsive design.

### 4.1 Micro-Animations
- Button hover transition (faster, 0.2s)
- Card hover shadow (0.3s smooth)
- Form input focus ring (smooth expansion)
- Row deletion fade-out (HTMX: 0.3s)
- New content fade-in (HTMX: 0.3s)

### 4.2 Enhanced Accessibility
- Keyboard navigation (Tab through form fields)
- Focus visible rings (all interactive elements)
- ARIA labels (buttons, form fields)
- Color contrast verification (all token pairs ≥ 4.5:1)
- Screen reader testing (empty states, status badges)

### 4.3 Mobile Responsive Polish
- Mobile nav drawer layout
- Touch-friendly button sizes (min 44×44px)
- Responsive table (stack on mobile or horizontal scroll)
- Mobile form layout (single column)

### 4.4 Dark Mode Visual QA
- All token colors verify in dark mode
- Status badges readable in dark theme
- Focus rings visible in dark theme
- Text contrast ≥ 4.5:1 in both themes

---

## Critical Dependencies

| Phase | Blocks | Unblock Criteria |
|-------|--------|-----------------|
| Phase 2 | Phase 3, 4 | All hardcodes replaced, visual tests pass |
| Phase 3 | Phase 4 | Form validation works, no errors logged |
| Phase 4 | Release | Mobile QA complete, WCAG AA verified |

---

## Git Workflow

**All phases follow this pattern:**
1. `git checkout main && git pull`
2. `git checkout -b feat/FREA-178-{phase-name}` (e.g., `feat/FREA-178-button-component`)
3. Implement, test, commit
4. Create PR with clear description
5. Get code review before merge to main
6. Delete branch after merge

**Commit messages:**
- `feat(FREA-178): Extract Button component with all variants`
- `refactor(FREA-178): Replace bg-blue-600 → bg-primary in invoice-detail`
- `feat(FREA-178): Add form validation error states`

---

## Testing Checklist

### Per Phase

**Phase 1 (Components):**
- [ ] All button variants render correctly
- [ ] Table header/rows semantic structure
- [ ] Form fields with labels, helpers, errors
- [ ] EmptyState displays when data is empty

**Phase 2 (Token Cleanup):**
- [ ] Light mode visual test (all colors correct)
- [ ] Dark mode visual test (all colors correct)
- [ ] Contrast ratios verified (WCAG AA)
- [ ] No hardcoded colors remain in templates

**Phase 3 (Features):**
- [ ] Form validation shows errors below inputs
- [ ] Loading spinner animates during HTMX request
- [ ] Dialog confirmation flow works
- [ ] Pagination navigates between pages

**Phase 4 (Refinements):**
- [ ] Button hover transitions are smooth (0.2s)
- [ ] Focus rings visible on all interactive elements
- [ ] Mobile nav drawer opens/closes
- [ ] Responsive tables readable on mobile

---

## Success Criteria (Final)

- [x] Spec approved by CTO
- [ ] Phase 1: All 4 components extracted and in use
- [ ] Phase 2: Zero hardcoded Tailwind colors in templates
- [ ] Phase 3: Form validation, loading, dialogs working
- [ ] Phase 4: WCAG AA AA-verified, mobile QA complete
- [ ] Visual parity with spec mockups (Dashboard, Lists, Detail views)
- [ ] Dark mode fully functional
- [ ] All tests passing

---

## Estimated Timeline

| Phase | Effort | Timeline |
|-------|--------|----------|
| 1: Components | 3-4 hours | Day 1-2 |
| 2: Token Cleanup | 2-3 hours | Day 2-3 |
| 3: New Features | 3-4 hours | Day 3-4 |
| 4: Refinements | 2 hours | Day 4-5 |
| **Total** | **10-13 hours** | **~1 week (full-time)** |

---

**Created:** 2026-05-04  
**Status:** Pending CTO Approval of Spec  
**Next Action:** Await FREA-178 spec review feedback
