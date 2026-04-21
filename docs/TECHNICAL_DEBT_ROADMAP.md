# FREA Technical Debt & Improvement Roadmap

**Prepared by:** Backend Architect (a7302727-0069-4263-96e1-1c851e072225)  
**Date:** 2026-04-21  
**Prioritization:** By impact + effort

---

## Current State (as of April 21, 2026)

✅ Route files refactored to template extraction pattern (5 branches ready for merge)  
✅ All tests passing (17/17)  
✅ No files exceed hard limit (400 lines)  
✅ Database Query Optimization Phase 1 complete (3 Priority 1 indexes implemented)

**Status:**
- Main branch: 5 refactoring PRs awaiting code owner review/merge
- Feature branch ready: `feat/add-performance-indexes` (Priority 1 database optimization)
- Next: Merge performance indexes, then proceed with Priority 2 work

---

## Priority 1: High Impact, Low Effort

### 1.1 Database Query Optimization
**Files:** `src/db/queries.ts` (345 lines), `src/db/invoice-queries.ts` (296 lines)

**Status:** ✅ Phase 1 Complete (Priority 1 indexes)

**Completed (Phase 1 — 2026-04-21):**
- ✅ Analyzed all 6 major queries for missing indexes
- ✅ Identified 4 Priority 1 indexes (composite: filtered + sort columns)
- ✅ Implemented 3 indexes in `src/db/schema.ts`:
  - `idx_clients_archived_name` — getAllActiveClients()
  - `idx_projects_client_archived` — getActiveProjectsForClient()
  - `idx_time_entries_project_invoice` — getTimeEntriesForProject()
- ✅ All tests passing (7/7)
- ✅ Feature branch ready: `feat/add-performance-indexes`
- ✅ Implementation report: `docs/DATABASE_INDEXES_IMPLEMENTATION.md`

**Expected Impact:** 20-50% faster filter/list queries, ~10-15% page load improvement  
**Risk:** Very low (indexes only, idempotent)

**Next (Phase 2 — Optional):**
- Profile queries in production to identify additional bottlenecks
- If needed, add Priority 2 optional indexes (invoice reporting, time entry analytics)
- See `docs/DATABASE_OPTIMIZATION_ANALYSIS.md` for details

**Blocker:** Code owner review/merge of `feat/add-performance-indexes`

---

### 1.2 Validation Schema Consolidation
**File:** `src/validation/schemas.ts` (254 lines)

**Current State:**
- Using Zod for all input validation ✅
- Consistent error messages (German) ✅
- Some schemas have complex `.superRefine` blocks (e.g., settingsSchema with cross-field validation)

**Improvements:**
- Extract `.superRefine` logic into standalone validators for reusability
- Add schema comments documenting format rules (especially tax_number: `12/345/67890` or `12345678901`)
- Create shared schema builders for common patterns (email, URL, phone)

**Effort:** 1-2 hours  
**Impact:** Better maintainability + discoverable validation rules  
**Blocker:** None

---

## Priority 2: Medium Impact, Medium Effort

### 2.1 Test Coverage Expansion
**Current State:**
- 17 integration tests (clients CRUD + refactored routes)
- Missing: edge cases, validation failures, concurrent updates

**Missing Test Cases:**
1. **Validation edge cases** — form field boundary conditions
   - Empty strings that should fail
   - Max length violations
   - Invalid email/phone formats
   - Negative numbers where not allowed

2. **Error paths** — HTTP error responses
   - 422 validation errors (check error message display)
   - 404 non-existent resources
   - 500 database errors (graceful handling)

3. **Data integrity** — multi-step workflows
   - Create client → create project → create time entry
   - Verify data consistency across tables
   - Test deletion cascades (if any)

**Effort:** 3-5 hours (write tests + ensure coverage)  
**Impact:** Catches bugs earlier, confidence in refactorings  
**Blocker:** None — can start after current tests merge

---

### 2.2 Documentation Improvements
**Current State:**
- README exists (German)
- No CONTRIBUTING.md
- No architecture guide

**Improvements:**
1. Create `CONTRIBUTING.md` with:
   - Branch naming convention (`feat/FREA-XXX-*`)
   - Template extraction pattern (with before/after example)
   - Test requirements for new routes
   - PR review checklist

2. Create `docs/ARCHITECTURE.md`:
   - System diagram (routes → queries → templates → HTML)
   - Data flow for invoice creation
   - Error handling strategy
   - WCAG compliance approach

3. Update README with:
   - Project structure overview
   - How to add a new feature (with template extraction)
   - Performance considerations (query limits, caching)

**Effort:** 2-3 hours  
**Impact:** Easier onboarding, fewer duplicate mistakes  
**Blocker:** None

---

## Priority 3: Lower Urgency, Higher Effort

### 3.1 Performance Monitoring
**Current State:**
- No explicit query timing
- No database indexing analysis
- No frontend performance metrics

**Possible Improvements:**
1. Add query execution time logging
2. Set up performance thresholds (warn if query > 100ms)
3. Create dashboard showing slowest operations
4. Add request/response timing headers

**Effort:** 4-6 hours  
**Impact:** Proactive performance optimization  
**Blocker:** None — but depends on Priority 1.1

---

### 3.2 Feature Enhancements (If Requested)
- **Bulk import/export** — clients, projects, time entries as CSV
- **Recurring invoices** — template-based invoice automation
- **Payment tracking** — integration with payment status
- **Advanced filtering** — client/project/time entry search

**Note:** These require business stakeholder input — not initiated without request.

---

## Implementation Sequence (Recommended)

1. **Week 1:** Merge current refactoring PRs (5 branches)
2. **Week 1:** Run Priority 1.1 (database optimization analysis)
3. **Week 1-2:** Expand test coverage (Priority 2.1)
4. **Week 2:** Create documentation (Priority 2.2)
5. **Week 3+:** Profile and implement performance optimizations (Priority 3.1)

---

## Non-Blocking Work While Waiting for PR Reviews

While the 5 refactoring branches await review:

✅ **Completed:**
- Created status report (docs/REFACTORING_STATUS.md)
- Identified technical debt
- Prepared improvement roadmap

✅ **Can Start Anytime:**
- Slow query analysis (Priority 1.1)
- Validation schema review (Priority 1.2)
- Documentation writing (Priority 2.2)

❌ **Blocked Until Merges:**
- Expanding test coverage (depends on refactored code being merged)
- Performance monitoring setup (depends on knowing final query patterns)

---

## Risk Mitigation

**If refactoring PRs are rejected:**
- Keep feature branches for later reference
- Fall back to manual refactoring per file
- Document reasons for rejection to improve future approaches

**If refactoring PRs are merged:**
- Verify no regressions in production
- Run full test suite (17/17 + any new tests)
- Monitor error logs for 24 hours
- Then proceed with Technical Debt work

---

## Owner & Status

**Backend Architect:** Ready to implement Priority 1 items immediately  
**Code Owner:** Pending review/merge of refactoring PRs

**Next Sync Point:** After 5 PRs are reviewed (approve/reject/request changes)
