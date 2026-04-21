# Contributing to FREA

Thank you for contributing to FREA\! This guide explains our development workflow, code patterns, and how to submit changes.

---

## Git Workflow

### Branch Naming Convention

All work happens on feature branches, never directly on `main`.

```bash
# Feature (new functionality)
git checkout -b feat/description-of-feature

# Bug fix
git checkout -b fix/description-of-bug

# Refactoring
git checkout -b refactor/description-of-refactor

# Documentation
git checkout -b docs/description-of-docs

# Performance
git checkout -b perf/description-of-improvement
```

### Creating a Pull Request

1. **Create feature branch from main:**
   ```bash
   git checkout main
   git pull
   git checkout -b feat/your-feature
   ```

2. **Make changes and commit:**
   ```bash
   git add <files>
   git commit -m "feat: Clear, specific description"
   ```

3. **Push and create PR:**
   ```bash
   git push -u origin feat/your-feature
   # Then create PR via GitHub UI
   ```

### PR Size Limits

- **Soft limit:** 400 LOC diff
- **Hard limit:** 1,000 LOC diff
  - 400–1,000 LOC: Justify why no split was possible
  - Over 1,000 LOC: Rejected — split into smaller PRs first

### Commit Message Style

```
feat(domain): Brief description (imperative, no period)

Longer explanation if needed. Explain the "why", not just the "what".
Related issue/context if applicable.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

---

## Code Patterns

### Template Extraction Pattern

Large route files (>250 lines) should extract presentation logic into dedicated template files.

**Before:**
```typescript
// routes/projects.ts (381 lines)
app.get("/projects", async (c) => {
  const projects = db.query(...).all();
  
  return c.html(`
    <table>
      ${projects.map(p => `
        <tr>
          <td>${p.name}</td>
          <td><a href="/projects/${p.id}/edit">Edit</a></td>
        </tr>
      `).join("")}
    </table>
  `);
});
```

**After:**
```typescript
// routes/projects.ts (142 lines)
import { renderProjectList } from "../templates/project-list";

app.get("/projects", async (c) => {
  const projects = db.query(...).all();
  return c.html(renderProjectList(projects));
});

// templates/project-list.ts (pure presentation)
export function renderProjectList(projects: Project[]): string {
  return `
    <table>
      ${projects.map(p => `
        <tr>
          <td>${p.name}</td>
          <td><a href="/projects/${p.id}/edit">Edit</a></td>
        </tr>
      `).join("")}
    </table>
  `;
}
```

**When to extract:**
- Route file exceeds ~250 lines
- HTML templates take up >50% of the file
- Same component rendered in multiple routes

**Template file checklist:**
- ✅ Pure functions (no side effects)
- ✅ Clear parameter types
- ✅ Return HTML string
- ✅ No database calls
- ✅ No HTTP logic

---

## Testing Requirements

### For New Routes

Every new route (GET/POST/DELETE) must have:

1. **Happy path test** — successful request → correct response
2. **Error case test** — invalid input → 422 validation error
3. **Not found test** — non-existent resource → 404
4. **Edge case test** — boundary conditions (empty strings, max length, etc.)

**Example:**
```typescript
test("POST /projects with missing client_id returns 422", async () => {
  const res = await postForm("/projects", {
    code: "PROJ-001",
    name: "Project Name",
    // client_id: missing
    daily_rate: "100",
  });
  
  expect(res.status).toBe(422);
  expect(res.text).toContain("client_id");
});
```

### Running Tests

```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode (if supported)
npm test -- --coverage     # Coverage report (if configured)
```

---

## Code Style

### TypeScript/JavaScript

- **Immutability:** Use spread operator (`{ ...obj, field: newValue }`)
- **Error handling:** Every `catch` block must log or re-throw
- **No `any` types:** Use `unknown` and narrow safely
- **Input validation:** Validate all user input with Zod schemas
- **File size:** Max 400 lines (400–800 lines requires justification)

### Database Queries

- **Parameterized statements only:** All queries use `?` placeholders
- **No N+1 queries:** Use JOINs or batch fetches
- **Soft deletes:** Use `archived` column, never hard DELETE
- **Transactions:** Wrap multi-step operations in transactions

### Forms & Validation

- **Zod schemas:** All input validated before processing
- **German error messages:** User-facing errors in Deutsch
- **Per-line VAT:** MwSt calculated per line item, then summed
- **Rounding:** Use `roundToEuro()` for all financial calculations

---

## Adding a New Feature

### Step 1: Plan

- [ ] Is this a new route or modifying existing?
- [ ] How much new code? (estimate LOC)
- [ ] Will route file exceed 250 lines? (plan template extraction)
- [ ] What validation rules?

### Step 2: Implement

- [ ] Create route in `src/routes/*.ts`
- [ ] Create/update schema in `src/validation/schemas.ts`
- [ ] Create/update query in `src/db/*-queries.ts`
- [ ] If >250 lines: extract to `src/templates/*.ts`

### Step 3: Test

- [ ] Happy path test (success)
- [ ] Validation error test (422)
- [ ] Not found test (404)
- [ ] Edge case test (boundaries)

### Step 4: Review Checklist

- [ ] File size < 400 lines (or justified)
- [ ] No `console.log` in production code
- [ ] All tests passing
- [ ] No SQL injection risk (parameterized)
- [ ] No unhandled errors (try-catch logged)
- [ ] Types added to exports
- [ ] German UI strings only
- [ ] WCAG compliance (form labels, focus rings)

---

## Common Tasks

### Updating a Query

1. Modify query in `src/db/*-queries.ts`
2. Update types in `src/validation/schemas.ts`
3. Test in route using new type

### Modifying Validation Rules

1. Update schema in `src/validation/schemas.ts`
2. Refer to validator function in `src/validation/validators.ts`
3. Update error messages if needed
4. Add test case for new rule

### Adding an Index for Performance

1. See `docs/DATABASE_OPTIMIZATION_ANALYSIS.md` for analysis
2. Add `CREATE INDEX IF NOT EXISTS` to `src/db/schema.ts`
3. Verify tests still pass
4. Document in PR

---

## Compliance Reminders

### EU Data Protection (ADR-001)

- ✅ Self-hosted fonts (no Google Fonts CDN)
- ✅ No external analytics (no Google Analytics)
- ✅ No external scripts
- ✅ WCAG 2.1 AA baseline

### Tax & Legal (§14 UStG)

- ✅ MwSt per line item (never on total)
- ✅ Rounding to 2 decimals
- ✅ GoBD audit log (append-only)
- ✅ All required invoice fields

---

## Code Review Checklist (for reviewers)

- [ ] Branch naming follows convention
- [ ] Commit messages are clear
- [ ] Code follows project style (immutability, error handling)
- [ ] All tests passing
- [ ] File size acceptable (< 400 lines or justified)
- [ ] No breaking API changes
- [ ] Validation rules documented
- [ ] WCAG compliance (if UI change)

---

## Questions?

- Architecture: See `docs/ARCHITECTURE.md`
- Database: See `docs/DATABASE_OPTIMIZATION_ANALYSIS.md`
- Deployment: See `docs/deployment-workflow.md`
- Troubleshooting: See `docs/runbook-local-server.md`
