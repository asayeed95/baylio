# Morning Brief Routine

**Fires:** 07:07 local, daily — **launchd** (`~/Library/LaunchAgents/com.baylio.morning-brief.plist`).
**Runs:** `bash scripts/qa/run-morning-launchd.sh` → pipes the brief prompt through `claude -p`.
**Output:** `logs/brief-YYYY-MM-DD.md` + `logs/launchd-morning.log`.

## What Claude does at 07:07

1. Read `logs/qa-$(date +%Y-%m-%d).md`. If absent (cron missed), read the most recent `logs/qa-*.md`.
2. Extract hard-check failures (❌ typecheck / ❌ tests) — these are non-negotiable fixes for today.
3. Rank model findings into three buckets, each with a one-line reason:
   - **must-fix** — real bug, security issue, or convention violation
   - **should-fix** — valid but not urgent
   - **ignore** — false positive, stylistic, or out of scope
4. Cross-reference `docs/memory/open-loops.md` and `docs/memory/roadmap.md`. Flag any finding already tracked (don't duplicate loops).
5. Output a 4-line plan-of-attack for today.
6. **Do NOT auto-fix.** Wait for Abdur's ✅.

## Manual trigger

```
/morning
```

## Failure modes

- **launchd not loaded** → `launchctl list | grep baylio`. Re-load with `launchctl load ~/Library/LaunchAgents/com.baylio.morning-brief.plist`.
- **Mac asleep at 07:07** → launchd queues the run for next wake.
- **`claude -p` requires a logged-in session** — if auth expires, the brief fails silently. Check `logs/launchd-morning.log` for errors. Refresh with `claude` interactively to re-auth.
- If you skip a day, `/morning` on demand still works and reads the most recent log.
