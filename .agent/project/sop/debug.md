# SOP: Debug Session

> Systematic approach for investigating bugs and unexpected behavior.
>
> **Trigger**: When user reports a bug, error, or unexpected behavior,
> or says "debug", "investigate", "something is broken", "why is X failing".

---

## Step 1 — Capture the Symptom

Before touching any code, document:

```
Symptom:   [exact error message or behavior description]
Trigger:   [what action causes it]
Frequency: [always / intermittent / only in certain conditions]
Env:       [OS, runtime version, relevant package versions]
```

---

## Step 2 — Check known-issues.md First

Read `project/known-issues.md`. This bug may already be documented with a known workaround.

---

## Step 3 — Reproduce Minimally

- Create the smallest possible input that reproduces the issue
- Confirm the reproduction is reliable before investigating further
- If you cannot reproduce it, say so explicitly and ask for more context

---

## Step 4 — Gather Evidence

Collect ALL of the following before forming a hypothesis:

- [ ] Full stack trace (not just the last line)
- [ ] Actual output vs expected output
- [ ] Relevant log lines (with timestamps if available)
- [ ] The exact input / request that triggered the issue
- [ ] Any recent changes that may have introduced the regression

**Do NOT skip to "fix" before completing this step.**

---

## Step 5 — Identify Root Cause

Work backwards from the symptom:
1. What is the immediate cause of the error?
2. What is the underlying condition that allows that cause to occur?
3. When was this condition introduced? (check `git log --oneline -20`)

State the root cause explicitly before writing any fix:
> "Root cause: X happens because Y, introduced by commit Z"

---

## Step 6 — Fix and Verify

- Make the minimal change that addresses the root cause
- Do NOT refactor unrelated code in the same change
- Run the reproduction case to confirm the fix works
- Run the full test suite to confirm no regression

---

## Step 7 — Document

After resolving:
- If this reveals a new pitfall pattern: add to `project/known-issues.md`
- Update `project/status.md` with what was found and fixed
- Update `project/session-journal.md` with a brief entry

---

## Common Traps

| Trap | How to avoid |
|------|-------------|
| Fixing symptoms, not root cause | Always complete Step 5 first |
| Guessing without evidence | Complete Step 4 before hypothesizing |
| Breaking other things while fixing | Run full test suite after fix |
| Not documenting the pattern | Add to known-issues.md for recurrences |

---

*Customize this SOP with project-specific test commands and log locations.*
