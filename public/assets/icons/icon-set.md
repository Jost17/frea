# FREA Icon Set

**Status**: Template  
**Style**: Outline, stroke-based, 1.5–2px stroke width  
**Sizes**: 16px, 20px, 24px  
**Format**: SVG (inline or external)  

---

## Icon Checklist (To Design)

### Core Icons (Priority 1)

- [ ] **Checkmark** (`check`) — Success, paid status, completed
- [ ] **Clock** (`clock`) — Pending, due date, time-based actions
- [ ] **Trash** (`trash`) — Delete, remove, destructive action
- [ ] **Eye** (`eye`) — View, open, visibility toggle
- [ ] **EyeOff** (`eye-off`) — Hidden, disabled, visibility off
- [ ] **Settings** (`settings`) — Configuration, preferences
- [ ] **Users** (`users`) — Clients, team, people
- [ ] **FileText** (`file-text`) — Invoice, document, receipt
- [ ] **Calendar** (`calendar`) — Date, due date, time picker
- [ ] **ChevronDown** (`chevron-down`) — Dropdown, expand/collapse
- [ ] **ChevronUp** (`chevron-up`) — Collapse, scroll up
- [ ] **ChevronLeft** (`chevron-left`) — Previous, back
- [ ] **ChevronRight** (`chevron-right`) — Next, forward
- [ ] **Plus** (`plus`) — Add new, create, expand
- [ ] **Minus** (`minus`) — Remove, reduce, collapse
- [ ] **X** (`x`) — Close, dismiss, cancel
- [ ] **Search** (`search`) — Find, lookup
- [ ] **Edit** (`edit`) — Modify, edit, pencil
- [ ] **Copy** (`copy`) — Duplicate, copy to clipboard
- [ ] **Download** (`download`) — Export, save file
- [ ] **Upload** (`upload`) — Import, attach file
- [ ] **Mail** (`mail`) — Email, send, contact
- [ ] **Phone** (`phone`) — Telephone, call
- [ ] **Alert** (`alert`) — Warning, caution, attention

### Secondary Icons (Priority 2)

- [ ] **ExternalLink** (`external-link`) — Open in new tab, external URL
- [ ] **Info** (`info`) — Information, help
- [ ] **HelpCircle** (`help-circle`) — Help, documentation
- [ ] **Lock** (`lock`) — Secure, private, protected
- [ ] **Unlock** (`unlock`) — Unsecured, open
- [ ] **Home** (`home`) — Dashboard, main, home page
- [ ] **BarChart** (`bar-chart`) — Analytics, statistics
- [ ] **PieChart** (`pie-chart`) — Distribution, breakdown
- [ ] **TrendingUp** (`trending-up`) — Growth, increase
- [ ] **TrendingDown** (`trending-down`) — Decline, decrease
- [ ] **DollarSign** (`dollar-sign`) — Money, price, payment
- [ ] **EuroSign** (`euro-sign`) — Currency, Euro
- [ ] **CreditCard** (`credit-card`) — Payment method
- [ ] **Briefcase** (`briefcase`) — Business, work, professional
- [ ] **Building** (`building`) — Company, organization

---

## Icon Specifications

### Design Guidelines

1. **Stroke Weight**: 1.5–2px (consistent across all sizes)
2. **Corners**: Slightly rounded (radius 1–2px) for softness
3. **Viewbox**: 24×24 (scale down to 16px or 20px as needed)
4. **Color**: `currentColor` (inherits text color)
5. **Padding**: 2–3px internal padding to avoid edge clipping

### Example Icon Structure

```svg
<!-- 24px Base Size -->
<svg viewBox="0 0 24 24" width="24" height="24" 
     xmlns="http://www.w3.org/2000/svg" 
     fill="none" stroke="currentColor" stroke-width="2" 
     stroke-linecap="round" stroke-linejoin="round">
  <!-- icon path elements -->
</svg>
```

### Usage in HTML

```html
<!-- Inline SVG -->
<button class="btn-icon">
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m-5-9h10v2H7z"/>
  </svg>
</button>

<!-- External SVG file -->
<button class="btn-icon">
  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <use href="/assets/icons/check.svg#icon"/>
  </svg>
</button>
```

---

## Implementation Notes

1. **No Icon Font**: Use SVG, not icon fonts (better accessibility, faster loading)
2. **Self-Hosted**: All icon files stored locally in `/public/assets/icons/` (ADR-001)
3. **Responsive Sizing**:
   - `w-4 h-4` (16px) — small, labels, badges
   - `w-5 h-5` (20px) — buttons, default
   - `w-6 h-6` (24px) — large, headings
4. **Accessibility**:
   - Decorative icons: `aria-hidden="true"`
   - Meaningful icons: Include `aria-label="description"` on parent
5. **Dark Mode**: Icons inherit color via `currentColor`, automatically adapt

---

## Next Steps

1. Designer creates SVG files for each icon
2. Export as individual files: `/public/assets/icons/check.svg`, `/public/assets/icons/trash.svg`, etc.
3. Test icons in light and dark mode
4. Update component templates to use icons
5. Document icon usage in Storybook

