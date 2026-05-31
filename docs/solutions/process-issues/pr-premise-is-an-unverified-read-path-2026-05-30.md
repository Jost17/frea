---
title: A Reported Bug/PR Premise Is Itself an Unverified Read-Path
date: 2026-05-30
last_updated: 2026-05-30
category: process-issues
module: pr-workflow
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - "A bug report, issue, or PR asserts a symptom (X leaks / X is exposed / X breaks at path P) but nobody has grepped the code path that would actually produce it"
  - "About to fix or document a defect whose trigger (a value reaching a render/return path) is assumed rather than verified"
  - "A claim about a leaked/rendered/returned value rests on a template binding like value=\"${x}\" without confirming the producing query selects that column"
  - "A premise has been carried unchanged across issue then PR then code review then docs without a code-level reachability check"
  - "A regression or security test asserts an absence (value not present, field not leaked, empty result)"
related_components:
  - documentation
  - testing_framework
  - database
tags:
  - read-path-verification
  - unverified-premise
  - via-negativa
  - reachability
  - positive-control
  - vacuous-assertion
  - silent-absence
---

# A Reported Bug/PR Premise Is Itself an Unverified Read-Path

## Context

A bug report or PR premise is itself an unverified read-path. On 2026-05-30 in FREA, PR #103 (FREA-312) and issue #63 both asserted a **live** leak of the SMTP password: the settings form rendered `value="${settings.smtp_password || ""}"` into page HTML, and `GET /api/settings/company` returned the full settings object. The claim was plausible at the template/API surface, and it propagated unchecked into the PR title, the first code review, and even a `docs/solutions/` learning doc.

An independent adversarial QA pass found the leak **could never fire**. `getSettings()` (`src/db/queries.ts:96-107`) does not project the `smtp_*` columns into its returned object, and `SETTINGS_COLUMNS` — the `safeUpdate` write-allowlist (`src/db/queries.ts:6-25`) — excludes them. So `settings.smtp_password` was **always `undefined`**: the template rendered `value=""` and the API carried nothing. Worse, the same allowlist meant the entire SMTP-from-DB feature was dead — `updateSettings({smtp_password})` was silently dropped, and `new EmailService(getSettings())` received undefined host/user/from, so email send **always threw**.

Nobody had run the one mechanical check that would have settled it: does `getSettings()` actually `SELECT` the field it is accused of leaking? This is the same failure mode the project already documents under "Read-paths must point at the real source of truth" and "`[]==[]` is the weakest match" — here applied to the *premise of the fix itself*.

## Guidance

Treat every "X leaks / X is exposed / X breaks at path P" claim as a hypothesis to falsify before you fix it. The fix you ship is only correct if the symptom actually reaches the path you are changing.

**1. Verify the symptom reaches the path — mechanically, end to end.**
Before fixing, grep the read path for the field and trace it from the DB projection to the surface that supposedly leaks it:

```bash
grep -n "smtp_password" src/db/queries.ts
```

If `getSettings()` never `SELECT`s `smtp_password`, the value at the template (`value="${settings.smtp_password}"`) is structurally `undefined` and the "live leak" cannot fire. The premise is dead; the real defect is elsewhere (here: a dead feature, not a leak).

**2. An empty/absent observed value is ambiguous — resolve it with a positive control.**
An empty render and a dead path look identical (`value=""` could mean "no password set" *or* "password never reaches the template"). Do not conclude from absence. Seed a known value through the **real production write path** and confirm it appears where the bug claims it leaks. If it doesn't appear, the path is dead, not safe.

**3. Regression tests must seed via the production source-of-truth, never a convenience writer.**
A second instance of the same class bit the first fix attempt: its leak-regression test seeded the canary via `updateSettings()` — which the allowlist silently drops — so the canary never persisted and the "does not leak" assertion passed **vacuously** (`[]==[]`). Seed via the same store the production read path reads, and add a round-trip assert that the canary is actually present *before* asserting it doesn't leak:

```typescript
// Seed the canary via the REAL store, bypassing the filtering writer:
db.run("UPDATE settings SET smtp_password = ? WHERE id = 1", ["CANARY_SECRET"]);

// Round-trip: prove the canary is actually stored, or the test is vacuous:
const raw = db.query("SELECT smtp_password FROM settings WHERE id = 1").get();
expect(raw.smtp_password).toBe("CANARY_SECRET");

// Now the real barrier: getSettings() must NOT project it.
expect(getSettings()).not.toHaveProperty("smtp_password");
```

**4. Prove the test is load-bearing by breaking the code.**
Point the regression test at the *real* barrier (`getSettings()` must not project `smtp_password`) and confirm it is empirically load-bearing: temporarily widen the `SELECT` to include `smtp_password` and watch the test go **RED**. A test that stays green when you break the protection is testing nothing. (Verified in this case: widening the SELECT turned the test red; reverting turned it green.)

**5. Prefer Via Negativa when the verified premise reveals dead code.**
Once verification showed the DB read/write path was both dead and the supposed leak-vector, the fix was to remove it (SMTP made env-only) rather than "patch the leak" on a path that never carried the secret. Fixing the stated symptom would have added code to a path that did not exist.

## Why This Matters

The cost is doubled when a false premise propagates. The "live leak" framing traveled from issue → PR title → first review → a published learning doc, each consumer trusting the prior one instead of the code. Had the fix shipped as stated ("patch the template/API leak"), it would have: (a) left the *actual* defect — a silently dead SMTP feature where every email send throws — unfixed; (b) added defensive code to a non-existent path, increasing surface for no benefit; and (c) carried a regression test that passes whether or not the protection exists. The second instance shows the failure recurs even after the team knows about it: the first fix's own regression test was vacuously green. Verifying the premise at the code level — and proving the guard load-bearing by breaking it — is the only thing that distinguishes "fixed" from "looks fixed."

## When to Apply

- A bug report, issue, or PR asserts "X leaks / X is exposed / X is sent / X breaks at path P" — verify X reaches P before changing P.
- About to fix a symptom observed only at a surface (template render, API response, log line) without tracing it to its source projection/query.
- A regression or security test observes an *absence* ("value not present", "field not leaked", empty result) — the absence is ambiguous; add a positive control.
- Writing a leak/exposure/negative-assertion test — seed via the production source-of-truth, add a round-trip assert, and break the code to confirm the test goes red.
- A claim has been repeated across artifacts (issue, PR, review, docs) without anyone citing a code-level check — repetition is propagation, not corroboration.

## Examples

**Falsifying the premise (the check nobody ran):**
```bash
$ grep -n "smtp_password" src/db/queries.ts
# (no match inside getSettings()'s SELECT, lines 96-107)
# (no match inside SETTINGS_COLUMNS allowlist, lines 6-25)
```
`getSettings()` never projects `smtp_password` → `settings.smtp_password` is always `undefined` → `value="${settings.smtp_password || ""}"` renders `value=""`. The "live leak" cannot fire. The same grep also proves `updateSettings({smtp_password})` is dropped by the allowlist → the SMTP-from-DB feature is dead.

**Vacuous test (instance two) vs. fixed test:**
```typescript
const canary = makeFixtureCanary(); // synthetic, non-secret test value

// ANTI-PATTERN — seeds via the filtering writer; allowlist drops smtp_password,
// canary never persists, assertion passes against an empty store ([]==[]):
updateSettings({ smtp_password: canary });
expect(apiResponse).not.toContain(canary); // vacuously green

// FIXED — seed via real store + round-trip assert + assert at the real barrier:
db.run("UPDATE settings SET smtp_password = ? WHERE id = 1", [canary]);
expect(db.query("SELECT smtp_password FROM settings WHERE id = 1").get().smtp_password)
  .toBe(canary);                          // canary really stored
expect(getSettings()).not.toHaveProperty("smtp_password"); // real protection
```

## Related

- `verifier-green-is-not-qa-ship-ready-2026-05-30.md` — sibling lesson from the same #103/FREA-312 case: automated gates (CI, verifier, tests) green is necessary but not sufficient; run an independent review. This doc is the complementary angle: the *premise* the review starts from is itself an unverified read-path.
- Global rule family (`~/.claude/CLAUDE.md`): "Read-Pfade müssen auf die echte Source-of-Truth zeigen, Round-trip-Eval ist Pflicht"; "`[]==[]` ist die schwächste Übereinstimmung"; "Issue-/Spec-Body ist Hypothese, kein Fakt — gegen HEAD-Code cross-checken". This case is a concrete instance of all three.
- Issue #133 — FREA-312 follow-up: drop the now-dead `smtp_*` DB columns + Zod fields (the Via Negativa cleanup).
- Issue #134 — Peppol e-invoicing clean re-do (same redo-after-stale-premise theme).
