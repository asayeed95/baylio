---
description: Read last night's QA log, classify findings, plan today
---

Morning brief:

1. Read `logs/qa-$(date +%Y-%m-%d).md`. Fall back to the most recent `logs/qa-*.md` if today's is missing.
2. Surface any ❌ hard-check failures verbatim — these are must-fix.
3. Classify model findings into three buckets with one-line reasons each:
   - **must-fix** — real bug / security / convention violation
   - **should-fix** — valid but not urgent
   - **ignore** — false positive, stylistic, out of scope
4. Cross-reference `docs/memory/open-loops.md` + `docs/memory/roadmap.md`. Don't duplicate tracked loops.
5. Output a 4-line plan-of-attack for today.
6. **Do NOT auto-fix.** Wait for Abdur's ✅.
