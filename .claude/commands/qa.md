---
description: Run nightly QA now — hard checks + Ollama review. Optional area arg.
---

Run the Baylio QA pipeline.

**Steps:**

1. Execute `bash scripts/qa/nightly-qa.sh $ARGUMENTS` from the repo root. `$ARGUMENTS` is optional: `code | security | tests | deps | ui | arch | deep`. Empty = auto by day of week.
2. After it finishes, read `logs/qa-$(date +%Y-%m-%d).md` and report:
   - **Hard checks:** pass/fail for typecheck + tests. If ❌, quote the failing lines.
   - **Top 3 model findings** you judge as actionable (skip filler).
3. **Do NOT auto-fix.** Summarize and wait for instruction.

If `deep` is requested, set `QA_MODEL=qwen3-coder-next:latest` first:

```bash
QA_MODEL=qwen3-coder-next:latest bash scripts/qa/nightly-qa.sh deep
```
