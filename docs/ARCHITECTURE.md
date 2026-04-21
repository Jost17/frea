# FREA Architecture

System design, data flow, and architectural decisions for the FREA freelancer invoicing tool.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (HTMX + Tailwind)                 │
│                                                               │
│  Routes: /einstellungen, /kunden, /projekte, /zeiten,       │
│           /rechnungen, /dashboard                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Hono Server (Port 3114)                    │
│                                                               │
│  • Routes (HTTP handlers, validation, error handling)        │
│  • Middleware (auth guards, logging)                         │
│  • Template rendering (HTMX responses)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Bun:SQLite
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                             │
│                    (data/frea.db)                             │
│                                                               │
│  Tables: settings, clients, projects, time_entries,          │
│          invoices, invoice_items, audit_log                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
frea/
├── src/
│   ├── index.ts              # Hono app entry point
│   ├── routes/               # HTTP handlers (GET/POST/DELETE)
│   │   ├── invoices.ts       # Invoice CRUD + creation wizard
│   │   ├── projects.ts       # Project CRUD
│   │   ├── clients.ts        # Client CRUD
│   │   ├── times.ts          # Time entry CRUD
│   │   ├── settings.ts       # Onboarding + settings management
│   │   └── health.ts         # Health check endpoint
│   ├── templates/            # Presentation logic (HTML generation)
│   │   ├── invoice-*.ts      # Invoice detail/list rendering
│   │   ├── project-*.ts      # Project list/form rendering
│   │   ├── client-*.ts       # Client list/form rendering
│   │   ├── time-*.ts         # Time entry list/form rendering
│   │   ├── settings-form.ts  # Settings form rendering
│   │   └── layout.ts         # Base HTML layout
│   ├── db/                   # Database layer
│   │   ├── schema.ts         # SQLite schema init + indexes
│   │   ├── queries.ts        # Common queries (clients, projects, time entries)
│   │   └── invoice-queries.ts # Invoice-specific queries
│   ├── validation/           # Input validation (Zod)
│   │   ├── schemas.ts        # Zod schemas for all inputs
│   │   └── validators.ts     # Reusable validator functions
│   └── lib/                  # Utilities
│       ├── errors.ts         # AppError exception class
│       ├── rounding.ts       # Financial rounding (roundToEuro)
│       └── dates.ts          # Date utilities
├── tests/
│   └── routes-integration.test.ts  # Integration tests (17 tests)
├── docs/
│   ├── ARCHITECTURE.md       # This file
│   ├── DATABASE_OPTIMIZATION_ANALYSIS.md
│   ├── CONTRIBUTING.md       # Development guidelines
│   └── deployment-workflow.md
├── package.json              # Dependencies (Hono, Zod, Tailwind, etc.)
└── bun.lock                  # Bun lock file
```

---

## Data Model

### Core Tables

**settings** (1 row, company metadata)
```
id, company_name, address, postal_code, city, country,
email, phone, mobile, bank_name, iban, bic,
tax_number, ust_id, vat_rate, payment_days,
invoice_prefix, next_invoice_number, kleinunternehmer,
onboarding_complete
```

**clients**
```
id, name, address, postal_code, city, country,
email, phone, contact_person, vat_id, buyer_reference,
notes, created_at, archived
```

**projects**
```
id, client_id, code (unique), name, daily_rate,
start_date, end_date, budget_days, service_description,
contract_number, contract_date, notes,
created_at, archived
```

**time_entries**
```
id, project_id, date, duration, description, billable,
invoice_id (nullable), created_at
```

**invoices**
```
id, invoice_number (unique), client_id, project_id,
invoice_date, due_date, period_month, period_year,
net_amount, vat_amount, gross_amount,
status (draft/sent/paid/cancelled), pdf_path, po_number,
service_period_from, service_period_to,
paid_date, reminder_level, created_at
```

**invoice_items** (line items, MwSt per item)
```
id, invoice_id, description, period_start, period_end,
days, daily_rate, net_amount, vat_rate, vat_amount,
gross_amount
```

**audit_log** (append-only, GoBD compliance)
```
id, timestamp, entity_type, entity_id,
action (create/update/delete/status_change),
changes (JSON), source (web/api)
```

### Key Relationships

```
clients ◄──────── projects ◄──────── time_entries
   ▲                                        │
   │                                        ▼
   └────────────── invoices ◄──────── invoice_items
                        │
                        ├─► audit_log (every mutation logged)
                        │
                        └─► Due date calculated from invoice_date + settings.payment_days
```

---

## Data Flow: Invoice Creation

The most complex workflow demonstrates the architecture:

```
User: /rechnungen/create?client_id=1

  ▼

Route Handler (routes/invoices.ts)
  │
  ├─► getActiveProjectsForClient(1)        [queries.ts]
  │   → SELECT projects WHERE client_id=1 AND archived=0
  │
  ├─► getAllUnbilledTimeEntries()          [queries.ts]
  │   → SELECT time_entries WHERE invoice_id IS NULL
  │   → JOINs projects, clients for context
  │
  ├─► computeProjectPreviews()             [queries.ts]
  │   → Batch fetch projects by ID
  │   → Filter unbilled time entries per project
  │   → Calculate: days, net_amount, vat_amount, gross_amount
  │   → Call roundToEuro() for each calculation
  │
  ├─► renderInvoiceForm()                  [templates/invoice-form.ts]
  │   → Display form with:
  │     - Client selection (read-only)
  │     - Line items (one per project)
  │     - Editable due_date, po_number, etc.
  │
  └─► [User submits form]
      ▼
      Validate: invoiceCreateSchema (Zod)
      ▼
      createInvoice()                       [invoice-queries.ts]
        │
        ├─► BEGIN TRANSACTION
        ├─► INSERT invoices (1 row)
        ├─► INSERT invoice_items (N rows, one per project)
        ├─► UPDATE time_entries SET invoice_id (mark as billed)
        ├─► INSERT audit_log (4 records: create, 3 invoice_items)
        └─► COMMIT

      ▼
      Redirect to /rechnungen?invoice_id=X (success)
```

**Key patterns:**
1. **N+1 Prevention:** Use `getActiveProjectsForClient()` (single JOINed query) instead of per-project queries
2. **Per-Line VAT:** Each `invoice_items` row has own `vat_amount` (calculated per item, then summed)
3. **Rounding Consistency:** Every calculation uses `roundToEuro()` — single source of truth for € rounding rules
4. **Transaction Isolation:** All mutations in one transaction (atomicity) + audit log (GoBD compliance)
5. **Soft Deletes:** Historical projects/clients stay visible in past invoices via foreign keys

---

## Architectural Decisions

### 1. No ORM — Prepared Statements Only

**Why:** Direct SQL control, no abstraction leakage, easier to audit for compliance

**Trade-off:** More SQL strings, but all parameterized with `?` placeholders (zero SQL injection risk)

**Example:**
```typescript
const stmt = db.prepare("SELECT * FROM clients WHERE id = ?");
const client = stmt.get(clientId) as Client;
```

### 2. Route → Template Separation

**Why:** Separate HTTP logic from presentation; improve testability; enforce file size limits

**Pattern:**
```typescript
// routes/projects.ts — HTTP only
app.get("/projects", async (c) => {
  const projects = getAllActiveProjects();
  return c.html(renderProjectList(projects));
});

// templates/project-list.ts — Pure HTML generation
export function renderProjectList(projects: Project[]): string {
  return `<table>...</table>`;
}
```

**Benefit:** Routes stay small (<200 lines), templates are testable functions

### 3. Zod Validation at Route Boundary

**Why:** Fail fast with clear error messages; single schema source of truth

**Pattern:**
```typescript
const data = settingsSchema.parse(formData);  // Throws on invalid
// If we reach here, data is validated and typed
```

### 4. Transactions for Multi-Step Operations

**Why:** Atomicity (all-or-nothing), GoBD audit log protection

**Pattern:**
```typescript
db.run("BEGIN TRANSACTION");
try {
  db.run("INSERT INTO invoices ...", [data]);
  db.run("INSERT INTO invoice_items ...", [item1]);
  db.run("UPDATE time_entries SET invoice_id = ...");
  db.run("INSERT INTO audit_log ...");
  db.run("COMMIT");
} catch {
  db.run("ROLLBACK");
  throw;
}
```

### 5. Audit Log via Triggers (GoBD)

**Why:** Append-only record of mutations; trigger-protected (cannot be modified/deleted)

**Trigger:**
```sql
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  BEGIN SELECT RAISE(ABORT, 'GoBD: audit_log records cannot be modified'); END
```

### 6. Soft Deletes via `archived` Column

**Why:** Historical data preservation; invoices can still reference archived projects/clients

**Pattern:**
```typescript
// Query active clients
const clients = db.query("SELECT * FROM clients WHERE archived = 0").all();

// Include archived in historical invoices
const project = db.query("SELECT * FROM projects WHERE id = ?").get(id);
// project.archived may be 1, but invoice still links to it
```

---

## Error Handling

### AppError Pattern

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public fieldErrors?: Record<string, string>
  ) {
    super(message);
  }
}

// routes/projects.ts
try {
  const data = projectSchema.parse(formData);
  // ...
} catch (err: unknown) {
  if (err instanceof z.ZodError) {
    const fieldErrors = Object.fromEntries(
      err.errors.map((e) => [e.path.join("."), e.message])
    );
    throw new AppError(422, "Validierungsfehler", fieldErrors);
  }
  console.error("Unexpected error:", err);
  throw new AppError(500, "Interner Fehler");
}
```

### HTTP Response Format

**Success (200):**
```html
<\!-- Hono c.html(renderProjectList(...)) -->
```

**Validation Error (422):**
```html
<div class="error">Validierungsfehler</div>
<input name="code" aria-invalid="true" />
<span class="error">Projektcode erforderlich</span>
```

**Not Found (404):**
```html
<div class="error">Projekt nicht gefunden</div>
```

---

## Performance Optimizations

### Indexed Queries (Priority 1)

Added composite indexes for common filter patterns:
- `idx_clients_archived_name` — `getAllActiveClients()` (WHERE archived, ORDER BY name)
- `idx_projects_client_archived` — `getActiveProjectsForClient()` (WHERE client_id AND archived)
- `idx_time_entries_project_invoice` — `getTimeEntriesForProject()` (WHERE project_id AND invoice_id)

**Expected impact:** 20-50% faster filter/list queries

See `docs/DATABASE_OPTIMIZATION_ANALYSIS.md` for full analysis.

### Application-Level Grouping

```typescript
// getAllUnbilledTimeEntries() returns all unbilled entries
// Group in JavaScript (acceptable for <5000 entries)
const entriesByClient = Map.groupBy(entries, (e) => e.client_id);
```

**Future optimization:** If >10K entries, move grouping to SQL GROUP BY

---

## WCAG Compliance (ADR-001)

### Form Elements
```html
<label for="project_code">Projektcode *</label>
<input id="project_code" name="code" required aria-invalid="false" />
```

### Color Contrast
- Text: ≥ 4.5:1 (normal), ≥ 3:1 (large)
- UI elements: ≥ 3:1

### Focus Visibility
```css
:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

### Semantic HTML
```html
<nav>...</nav>
<main id="main-content">...</main>
<button>Action</button>  <\!-- not <div onclick> -->
```

### Skip Link
```html
<a href="#main-content" class="sr-only focus:not-sr-only">
  Zum Hauptinhalt
</a>
```

---

## Deployment

### Local Development
```bash
bun run dev  # Starts Hono server on 3114, watches CSS
```

### Production Build
```bash
bun build  # Optimized build (if configured)
bun start  # Production server
```

See `docs/deployment-workflow.md` for full deployment steps (local/staging/prod).

---

## Testing Strategy

### Integration Tests (17 total)

Tests cover:
- **CRUD operations:** Clients (7 tests)
- **Refactored routes:** Projects, Settings, Times (10 tests)
  - Empty state rendering
  - Form validation
  - POST redirects
  - 404 not found cases

**Coverage gaps (acceptable for integration tests):**
- Individual form field interactions (unit tests)
- CSS/styling validation (visual regression tests)
- Accessibility (WCAG compliance tests)

Run tests: `npm test`

---

## Future Enhancements

### Optional Priority 2 Indexes
- `idx_invoices_due_date_status` — Dashboard queries
- `idx_invoices_invoice_date DESC` — Reporting
- `idx_time_entries_date DESC` — Monthly reports

### Optional: Query Optimization
- If time_entries >10K: Move `getAllUnbilledTimeEntries()` grouping to SQL
- If dashboard slow: Add caching layer for KPI queries

### Optional: Real-Time Features
- WebSocket for multi-user updates (if concurrent editors needed)
- Server-Sent Events for background job notifications

---

## Dependencies & Constraints

- **Runtime:** Bun (fast, TypeScript-native)
- **Framework:** Hono (lightweight, composable)
- **Database:** SQLite (single file, portable, no server)
- **Validation:** Zod (type-safe schemas)
- **Styling:** Tailwind v4 (utility-first CSS)
- **Frontend:** HTMX (server-side HTML, no SPA)
- **Compliance:** EU services only (no US hosting, no Google CDNs)

---

## References

- **Database:** `docs/DATABASE_OPTIMIZATION_ANALYSIS.md`
- **Contributing:** `CONTRIBUTING.md`
- **Deployment:** `docs/deployment-workflow.md`
- **Local Server:** `docs/runbook-local-server.md`
