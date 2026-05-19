# C1 Enforcement Analysis: QA-SCORE Requirement for Engineer Issues

## Problem
C1 check (verifier line 67-72) shows 0/20 adoption — no engineer implementer issues have QA-SCORE comments from QA Engineer. Prose convention alone is insufficient.

## Two Proposed Enforcement Mechanisms

### Option A: Paperclip Status-Transition Guard (Recommended)
**Mechanism:** Add a pre-commit validation hook at Paperclip API layer that validates before status transition to `done` on engineer-implementation issues.

**Implementation:**
- When PATCH `/api/issues/{issueId}` with `status: "done"` on an engineer-assigned issue
- Fetch comments for that issue
- Check if at least one comment from QA Engineer (id: `5a940780-6b6b-4b9b-bca7-f3a9d4fae3f7`) contains "QA-SCORE:"
- If absent: return 409 (Conflict) or 422 (Unprocessable Entity) with message "C1 Requirement: QA-SCORE comment from QA Engineer required before closing engineer implementation"
- If present: allow transition

**Pros:**
- Hard guard at the source
- Impossible to bypass
- Self-enforcing — no external runner needed
- Works with existing agent/human workflows

**Cons:**
- Requires Paperclip API modification (backend work)
- Might need CEO approval for API-level enforcement

### Option B: SessionStart Verifier Gate (Alternative)
**Mechanism:** Make the verifier failure a hard SessionStart gate that blocks new work until resolved.

**Implementation:**
- Register `review-chain-verifier.sh` as a SessionStart blocker (no heartbeat continues until this passes)
- Verifier fails if C1 fails → all agent work pauses
- Forces immediate visibility and remediation

**Pros:**
- No API changes needed
- Can be deployed immediately
- Visible to entire company (no silent failures)

**Cons:**
- Reactive not preventive (guard happens after issues reach done)
- Nuclear option — blocks all work, not just engineering
- Requires a "break the glass" approval pattern when C1 is violated

## Recommendation
**Implement Option A** (Paperclip Guard) because:
1. Prevents violations at source (no post-hoc fixes needed)
2. Self-enforcing — matches verifier's atomic claim
3. DRY principle: verifier + guard both check same logic (both should live in one place, likely the API guard)
4. Matches board's intent: "enforce review-chain" implies preventive, not reactive

**Next Steps:**
- CTO or Paperclip maintainer implements guard in API layer
- Test against existing done issues (should allow those that have QA-SCORE)
- Re-run verifier after guard is live — C1 will automatically pass once guard enforces it

**Timeline:** Blocks FREA-104 until guard is live.
