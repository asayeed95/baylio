# Nightly QA Routine

**Fires:** 22:03 local, daily — **launchd** (`~/Library/LaunchAgents/com.baylio.qa-nightly.plist`).
Claude Code `CronCreate` with `durable: true` verified non-persistent (writes ignored on 2026-04-17), so we fell back to launchd per Abdur's fallback rule ("reliable beats pure").
**Runs:** `bash scripts/qa/run-nightly-launchd.sh` → invokes `scripts/qa/nightly-qa.sh`.
**Output:** `logs/qa-YYYY-MM-DD.md` (git-ignored) + `logs/launchd-nightly.log` run trail.

## Log structure (sections are labelled so test output is separable from model commentary)

1. **Hard Checks** — `pnpm run check` + `pnpm test` with dot reporter. Each gets ✅/❌ footer.
2. **Model Review** — one area per day, rotated by day-of-week:

   | DoW | Area | Focus |
   |-----|------|-------|
   | Mon | code | Recent diffs in server/ + client/src |
   | Tue | security | publicProcedure misuse, ownership checks, Twilio validation |
   | Wed | tests | Gap analysis on untested money-path code |
   | Thu | deps | Deprecated/vulnerable/outdated npm packages |
   | Fri | ui | client/src recent changes — a11y, loading/error states |
   | Sat | arch | Architecture snapshot + routers.ts emerging issues |
   | Sun | code | Fallback |

## Model

- Default: `qwen2.5-coder:32b` on `http://192.168.0.238:11434` (Windows PC LAN)
- Deep-dive override: `QA_MODEL=qwen3-coder-next:latest bash scripts/qa/nightly-qa.sh deep`
- Runtime cap: 30 min (curl `--max-time 1800`)

## Failure modes

- **Windows PC offline** → curl times out, log shows "No response from Ollama". Hard checks still run.
- **Model response non-JSON** → log captures raw stderr. Run does not abort.
- **launchd not loaded** → check with `launchctl list | grep baylio`. Re-load with `launchctl load ~/Library/LaunchAgents/com.baylio.qa-nightly.plist`.
- **Mac asleep at 22:03** → launchd queues the run for next wake. Acceptable.

## Manual trigger

```
/qa              # auto-area for today
/qa security     # force an area
/qa deep         # 14-day deep dive on qwen3-coder-next (set QA_MODEL first)
```
