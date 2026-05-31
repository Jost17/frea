# FREA Agent Review Chain

## Quality Chain (enforced)

All technical issues follow this mandatory routing:

```
Backend Architect / Frontend Engineer
    ↓  (implementation complete, PR open)
QA Engineer
    ↓  (tests pass, quality-score recorded)
CTO
    ↓  (output review, sign-off)
done
```

## Routing Convention

1. **Implementation agents** (Backend Architect, Frontend Engineer): when your PR is ready and CI is green, reassign the issue to **QA Engineer** with status `in_review`. Add a comment with evidence (CI run URL, PR number).

2. **QA Engineer**: when tests pass, post a quality-score comment (see format below), then reassign to **CTO** with status `in_review`.

3. **CTO**: do a final output review (correctness, architecture, EU compliance, CLAUDE.md rules). Post quality-score comment, then mark `done`.

Never mark an implementation issue `done` without the QA → CTO chain. If you are the implementer, the earliest you can set `done` is never — only QA or CTO closes implementation issues.

## Quality-Score Format

```
QA-SCORE: pass | fail
Note: <one line — what was tested, any caveats>
```

Example passing:
```
QA-SCORE: pass
Note: HTMX flow smoke-tested, bun test 24/24 green, no regressions in invoice list
```

Example failing:
```
QA-SCORE: fail
Note: POST /recurring-invoices returns 500 on missing intervalDays — needs fix before merge
```

## Skills

| Agent | Required Skills |
|-------|----------------|
| QA Engineer | `qa`, `qa-only`, `frea-multi-agent` |
| Backend Architect | `frea-multi-agent` |
| Frontend Engineer | `frea-multi-agent` |
| CTO | `frea-multi-agent` |

## Scope

This chain applies to all issues with `role: engineer` assignee in FREA. Design and CMO issues follow their own review path.
