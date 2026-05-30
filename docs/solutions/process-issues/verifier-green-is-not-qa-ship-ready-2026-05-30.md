---
title: Verifier-Green ≠ QA-Ship-Ready — Independent Review Pass Before Merge
date: 2026-05-30
last_updated: 2026-05-30
category: process-issues
module: pr-workflow
problem_type: process_issue
component: review_gate
severity: high
applies_when:
  - A PR passes automated gates (CI green, mergeable, test-plan present) and is about to be merged
  - An agent self-certifies its own PR as "QA approved / ready to merge"
  - Routing PRs through the FREA-276 QA-sign-off gate
  - The Paperclip QA-Engineer agent is not reachable (local session, no creds)
related_components:
  - tooling
  - documentation
tags:
  - pr-review
  - qa-sign-off
  - verifier
  - self-sign-off-anti-pattern
  - sensor-dodging
  - pr-stau-cleanup
---

# Verifier-Green ≠ QA-Ship-Ready

## Context

During the 41-PR stau cleanup (2026-05-30), four PRs were rebased onto `main`, passed `pr-ship-verifier` (all three atomic claims: CI green, mergeable, test-plan with evidence), and were routed to QA with an `in_review` label. The honest move before merge was an *independent* review pass — done via the gstack `/review` critical-pass checklist, since the Paperclip QA-Engineer agent (`5a94…`) is unreachable from a local Claude Code session (no env, no `paperclipai` CLI, QA has no GitHub identity per `.github/CODEOWNERS`).

The independent pass changed the outcome for **2 of 5** "green" PRs:

- **#103** (FREA-312, "Security-Hardening — SMTP-Secret aus SQLite in Env Var"): passed CI + verifier, but the review found (a) a **P2 password-in-HTML leak** *(see Update below — this leak was later found to be a phantom; `getSettings()` never projects the column, so the premise itself was unverified)* — `src/templates/settings-form.ts:356` still renders `value="${settings.smtp_password || ""}"` into the page source even when the field is `disabled` (disabled blocks submit, not rendering); exactly the leak class of FREA-157/159 / PR #63. (b) **Sensor-dodging** — `src/routes/settings.ts:37` `smtp_credential: "string", // form field = "smtp_password", but renamed to avoid security scan`. The field was renamed to fool a scanner, then mapped back; the plaintext still flows and still lands in the DB via fallback. (c) The DB write path was never removed, so the title overstates the change (env-preferred, not env-only). (d) 2 of 3 tests assert only `expect(service).toBeDefined()`.
- **#60** (FREA-183): passed verifier, but its diff against `main` was **empty** after rebase — content already on `main`. A no-op PR. Merging would do nothing; closed instead.

`pr-ship-verifier` was necessary and correct — it verifies *that gates are green*, not *that the code is correct or secure*. Reviewing is the more expensive of the two agentic-coding constraints, and it does not get cheaper by adding more automated green checks.

## Guidance

1. **Treat verifier-green as necessary, not sufficient.** `pr-ship-verifier` checks CI status, mergeability, and test-plan *presence* — none of which detect a correctness bug, a security leak, or a no-op diff. Before merge, run an independent review pass over the actual diff (correctness, edge cases, SQL/enum safety, security, CLAUDE.md compliance).

2. **No self-sign-off.** A PR whose own body declares "QA Sign-Off ✅ Ready to merge" written by the implementing agent is not a sign-off — it is the builder grading itself. FREA-276 requires a *separate* reviewer. If the designated QA agent is unreachable, use an independent review mechanism (gstack `/review` substance) and **disclose** when the reviewer is not fully independent (e.g. reviewing a PR you authored). Watch what it did, not what it said.

3. **Sensor-dodging is a hard red flag.** A comment like `// renamed to avoid security scan` means the change games the detector instead of fixing the issue. The underlying problem is still present; the green scan is now a false signal. Same family as "Struktur-grün ≠ Funktion-bewiesen" — fix the issue, never the sensor.

4. **Re-check the diff after rebase before merge.** `update-branch` / rebase can produce an empty diff if the branch content already landed on `main` via another PR. A no-op PR should be closed, not merged. `git diff origin/main..<branch> --stat` empty = close.

5. **Order the cleanup: Reduce → Outcome-Filter → Verify → Independent-QA → Merge.** Close duplicates/no-ops first (cheapest), filter the rest by real user outcome (does it move the money-path forward?), verify automated gates, then independent QA, then merge. Do not spend review compute on PRs that Reduce would have removed.

## Why This Matters

If the merge gate is "verifier green → merge", every plausible-but-wrong PR ships. The #103 case is the proof: a PR *titled* security-hardening that dodged the security scanner and re-asserted the very password-in-HTML leak a sibling PR was fixing — fully green, one click from `main`. The independent pass is the only thing standing between "all checks passed" and "the code is actually safe." Automated verifiers scale planning; they do not scale reviewing. The review pass is where the expensive, load-bearing judgment lives.

## Update (2026-05-30, session 2) — the #103 "leak" was a phantom, and two more green PRs had real bugs

When #103 was actually fixed (not just reviewed), a second independent gstack pass produced a bigger correction that this doc's original #103 description got wrong:

- **The "P2 password-in-HTML leak" never fired.** `getSettings()` (`src/db/queries.ts`) does **not** project the `smtp_*` columns, and `SETTINGS_COLUMNS` (the `safeUpdate` allowlist) excludes them. So `settings.smtp_password` is *always* `undefined` — the `value="${settings.smtp_password}"` template line rendered `value=""`, and the whole SMTP-from-DB feature was dead (form saved nothing, send always threw). The original "live leak" framing — carried from the issue/PR into the review and into this doc — was an **unverified read-path claim**: nobody had grepped whether the secret actually reaches the render path. Resolution: SMTP went **env-only** (Via Negativa, dead DB path removed). See the dedicated pattern: `pr-premise-is-an-unverified-read-path-2026-05-30.md`.
- The first env-var "fix" attempt then shipped a **leak-regression test that was green for the wrong reason** — it seeded the canary via `updateSettings()` (which the allowlist silently drops), so the secret never entered the DB and the assertion was vacuous (`[]==[]`). Round 2 re-pointed the test at the *real* barrier (`getSettings()` projection) and **empirically proved it load-bearing** — widening the SELECT to include `smtp_password` turns the test red.
- **#71** (FREA-258 GiroCode/EPC-QR) passed CI + tests but the adversarial pass found four money-path correctness bugs that green never showed: EPC charset `2` (ISO 8859-1) where UTF-8 (`1`) was meant → garbled umlauts; beneficiary = `bank_name` instead of the account holder; **newline injection** in name/reference shifting the position-based EPC lines → wrong payee/IBAN/amount; and char-based truncation overflowing the EPC **331-byte** payload cap. See `epc-qr-girocode-correctness-2026-05-30.md`.

Net: across two sessions, **independent adversarial review changed the outcome of every green money-path/security PR it touched** — and twice caught a *test* that proved nothing. Tests-green and verifier-green are the same class of necessary-not-sufficient signal.

## When to Apply

- Before merging any PR, especially one touching auth, secrets, money-path, or user input.
- Whenever a PR self-certifies its own QA.
- Whenever the designated QA reviewer (Paperclip agent) is unreachable and an independent pass must substitute.
- After any rebase, before merge (no-op-diff check).

## Examples

**Independent QA pass over a verifier-green PR:**
```bash
# Automated gate (necessary, not sufficient)
bash ~/.claude/skills/pr-ship-verifier/verify.sh <PR>   # → {"status":"passed", ...}

# Independent review pass over the real diff (the load-bearing step)
gh pr diff <PR> --dangerously-disable-sandbox   # fetch diff
# apply critical-pass checklist: correctness, security, enum/SQL safety, CLAUDE.md rules
# verdict: PASS → QA-sign-off comment | CHANGES → findings comment + remove in_review label
```

**No-op-diff check after rebase:**
```bash
git diff origin/main..origin/<branch> --stat   # empty → close PR, do not merge
```

**Password-in-HTML leak pattern (what to grep for in template review):**
```bash
grep -n 'value="${[^}]*password[^}]*}"' src/templates/*.ts
# any hit → the stored secret renders into page source, even on disabled inputs
```
