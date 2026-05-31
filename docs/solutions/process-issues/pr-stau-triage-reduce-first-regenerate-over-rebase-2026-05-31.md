---
title: PR-Stau Triage — Reduce First, Outcome-Filter, Regenerate over Rebase
date: 2026-05-31
last_updated: 2026-05-31
category: process-issues
module: pr-workflow
problem_type: process_issue
component: development_workflow
severity: high
applies_when:
  - "A repo has accumulated many stale open PRs (agent over-production), most behind main, several with failing CI or hard-limit (>1000 LOC) violations"
  - "PRs were produced in a short burst faster than they could be reviewed/merged, then rotted for days while main moved on"
  - "Deciding whether to rebase-rescue a large, days-old branch vs close it and rebuild the wanted part from current main"
  - "Triaging which of many parked PRs actually move the product's next outcome"
related_components:
  - tooling
  - documentation
  - ci_cd
tags:
  - pr-stau-cleanup
  - reduce-first
  - outcome-filter
  - close-and-regenerate
  - wip-limit
  - deferred-label
  - gary-tan
  - indy-dev-dan
---

# PR-Stau Triage — Reduce First, Outcome-Filter, Regenerate over Rebase

## Context

FREA accumulated **29 open PRs** (~20.700 LOC), nearly all produced in a 2-day burst (18./19.05.) and left stale for ~13 days. Snapshot at cleanup: only **1 PR was `CLEAN`**, ~13 had failing checks, 6 violated the >1000 LOC hard limit. This is not a "review 29 PRs" problem — it is an **agent-overproduction stall**: PRs were generated faster than they could be integrated, with no merge cadence. Heroically rebasing all 29 would be sunk-cost maintenance on artifacts of a broken loop.

## The Pattern (what worked, in order)

The triage that cleared the stau and shipped the real value, framed through two lenses that reinforced each other (Gary Tan: ruthless outcome-prioritization; Indy Dev Dan: closed loops, reduce, fix-the-system):

1. **Reduce before spending review-compute.** Close duplicates and hard-limit violators *first* — they are auto-rejected by policy anyway and only inflate the review surface. Closing 6 >1000-LOC PRs removed ~9.140 LOC of stale burden in one move. **Every close carries a split/follow-up issue** so nothing is lost (close ≠ delete; the branch stays as reference).

2. **Verify the premise of "what's the blocker" against today's code.** The flashy PRs (invoice-screen redesign) were *polish*; a mechanical check showed the real blockers to the target outcome were 3 small, verified code bugs sitting as issues, not PRs. One PR was 90% design-docs masquerading as a feature; one "docs" PR was contaminated with unrelated route code. **Read the diff, not the title** (see `pr-premise-is-an-unverified-read-path`).

3. **Outcome-filter everything.** Pick ONE outcome ("the first valid VAT customer invoice") and rank every PR by "does this move it closer?". Only PRs on that path get review-compute now. This collapsed 29 candidates to 3 must-fix bugs.

4. **Regenerate over rebase for stale heavy branches.** A 13-day-old 2000-LOC branch behind a moved main is a semantic-conflict swamp. Closing it and rebuilding the wanted slice from *today's* main is cheaper and cleaner than rebasing. Capture the cut-lines in a split issue.

5. **Close the loop at merge.** Every shipped PR went through an independent adversarial review pass (gstack `/review`) as the QA gate — which caught real money-path bugs that "tests green" did not (see `verifier-green-is-not-qa-ship-ready`). Single-merge discipline (one PR at a time; siblings go BEHIND after each merge → `update-branch` → wait CI → merge).

6. **Park the rest visibly, don't leave it ambiguous.** The remaining 20 PRs (feature/cosmetic stack, none on the outcome path) got a `deferred` label + a consistent comment: parked-not-rejected, with the reactivation contract (rebuild against today's main, `bun run check`, re-check LOC limits). An ambiguous open PR reads as "maybe ready"; a labeled one reads as "intentionally parked".

7. **Fix the system that produced the stau (highest leverage, separate from cleanup).** The stau is a *symptom* of no WIP-limit / no merge-cadence. Cleaning the PRs without fixing the production rate guarantees recurrence. This is the Indy-Dev-Dan "fix the system that builds the system" step — a CI/process change, tracked separately.

## Anti-Patterns

- **Rebase-rescue every stale branch.** Sunk-cost. For days-old heavy branches, close + regenerate from current main.
- **Review by title / PR description.** Titles lie (a "docs" PR carried 83 LOC of Peppol route code; a 992-LOC "feature" was 898 LOC of markdown). Diff the files.
- **Leave non-blocking PRs simply open.** Ambiguity. Label `deferred` with a reactivation contract.
- **Self-certify the merge.** Even tiny money-path fixes get an independent adversarial pass; it changed the outcome of most PRs it touched.
- **Treat the cleanup as the fix.** Without a WIP-limit/cadence the stau returns. Cleanup is necessary, not sufficient.

## Outcome (one session)

29 → 20 open PRs (all `deferred`-labeled), the target money-path (3 verified bugs) shipped green through the QA gate, every removal backed by a split/follow-up issue. The dependency bumps that were genuinely green were merged; the rest parked with an explicit path back.

## Related

- `verifier-green-is-not-qa-ship-ready-2026-05-30.md` — the QA gate used at step 5; it caught money-path bugs green missed.
- `pr-premise-is-an-unverified-read-path-2026-05-30.md` — step 2's discipline (premise = unverified read-path), incl. the fix-scoping instance from this session.
- `multi-agent-branch-hygiene-guard-2026-05-05.md` — earlier system-fix (the `.claude/`-artifact-leak root cause), sibling to step 7.
- CLAUDE.md rules 15/16 (branch-from-main, LOC limits), 26 (QA sign-off), and the `pr-size-guard.yml` / `repo-hygiene-guard.yml` workflows are the existing guardrails; the open Phase-4 work is a WIP-limit/cadence on top.
