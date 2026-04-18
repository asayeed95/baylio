#!/usr/bin/env bash
# Nightly QA runner — hard checks + one area of Ollama-driven review.
#
# Usage:
#   bash scripts/qa/nightly-qa.sh              # auto area by day of week
#   bash scripts/qa/nightly-qa.sh security     # force area
#   QA_MODEL=qwen3-coder-next:latest bash scripts/qa/nightly-qa.sh deep
#
# Output: logs/qa-YYYY-MM-DD.md (git-ignored). Appends if file exists.
# Exit 0 if hard checks pass, 1 otherwise. Model failures do not fail the run.
#
# Env:
#   QA_MODEL       (default: qwen2.5-coder:32b)
#   OLLAMA_HOST    (default: http://192.168.0.238:11434 — Windows PC LAN)
#   QA_MAX_WAIT    (default: 1800 — seconds for Ollama response)

set -u

cd "$(dirname "$0")/../.."  # repo root

AREA="${1:-auto}"
MODEL="${QA_MODEL:-qwen2.5-coder:32b}"
OLLAMA_HOST="${OLLAMA_HOST:-http://192.168.0.238:11434}"
MAX_WAIT="${QA_MAX_WAIT:-1800}"
DATE=$(date +%Y-%m-%d)
TS=$(date +%H:%M:%S)
mkdir -p logs
LOG="logs/qa-${DATE}.md"

if [ "$AREA" = "auto" ]; then
  case "$(date +%u)" in
    1) AREA=code ;;
    2) AREA=security ;;
    3) AREA=tests ;;
    4) AREA=deps ;;
    5) AREA=ui ;;
    6) AREA=arch ;;
    *) AREA=code ;;
  esac
fi

# Guard: node_modules must exist or typecheck/test can't run
if [ ! -d "node_modules" ]; then
  echo "❌ node_modules missing — run 'pnpm install' before QA. Aborting." >&2
  exit 2
fi

# Header only on first write of the day
if [ ! -f "$LOG" ]; then
  {
    echo "# Baylio QA Log — $DATE"
    echo ""
    echo "_Hard checks (typecheck + tests) and model commentary are in separate sections per run._"
    echo ""
  } > "$LOG"
fi

{
  echo "---"
  echo ""
  echo "## Run: $TS · area=\`$AREA\` · model=\`$MODEL\`"
  echo ""
} >> "$LOG"

# ========== SECTION 1: HARD CHECKS ==========
{
  echo "### 1. Hard Checks"
  echo ""
  echo "#### \`pnpm run check\`"
  echo ""
  echo '```'
} >> "$LOG"

CHECK_OUT=$(pnpm run check 2>&1)
CHECK_EXIT=$?
echo "$CHECK_OUT" | tail -60 >> "$LOG"
{
  echo '```'
  echo ""
  if [ $CHECK_EXIT -eq 0 ]; then
    echo "✅ typecheck clean"
  else
    echo "❌ typecheck FAILED (exit $CHECK_EXIT)"
  fi
  echo ""
  echo "#### \`pnpm test\`"
  echo ""
  echo '```'
} >> "$LOG"

TEST_OUT=$(pnpm test --run --reporter=dot 2>&1)
TEST_EXIT=$?
echo "$TEST_OUT" | tail -80 >> "$LOG"
{
  echo '```'
  echo ""
  if [ $TEST_EXIT -eq 0 ]; then
    echo "✅ tests pass"
  else
    echo "❌ tests FAILED (exit $TEST_EXIT)"
  fi
  echo ""
} >> "$LOG"

# ========== SECTION 2: MODEL REVIEW ==========
{
  echo "### 2. Model Review — \`$AREA\`"
  echo ""
} >> "$LOG"

CTX=$(mktemp)
PAYLOAD=$(mktemp)
trap 'rm -f "$CTX" "$PAYLOAD"' EXIT

case "$AREA" in
  code)
    {
      echo "# Task: Code Review"
      echo ""
      echo "Baylio is a production AI phone receptionist (Vite + Express + tRPC + Drizzle + Supabase + Twilio + ElevenLabs)."
      echo "Conventions: no \`any\` in new code, \`protectedProcedure\` by default, every DB call scoped to shopId/ownerId."
      echo ""
      echo "Review the changes below. Flag ONLY: real bugs, missing error handling, security/tenant-isolation issues, convention violations. Skip style nits. Be terse. Use markdown. If nothing material, say 'No material issues found.'"
      echo ""
      echo "## Recent commits (7 days)"
      git log --since='7 days ago' --oneline 2>/dev/null
      echo ""
      echo "## Diff — server/ + client/src/ (truncated)"
      echo '```diff'
      git diff HEAD~7 -- 'server/**' 'client/src/**' 2>/dev/null | head -4000
      echo '```'
    } > "$CTX"
    ;;
  security)
    {
      echo "# Task: Security / Authorization Audit"
      echo ""
      echo "Look for: \`publicProcedure\` misuse on user-owned data, missing \`shop.ownerId === ctx.user.id\` checks, SQL injection via raw tagged template, secret leaks, missing Twilio signature validation on new webhooks."
      echo ""
      echo "## publicProcedure usages"
      grep -rn "publicProcedure" server/ 2>/dev/null | head -50
      echo ""
      echo "## Router + middleware diffs (14 days)"
      echo '```diff'
      git diff HEAD~14 -- 'server/**Router.ts' 'server/middleware/**' 'server/services/twilioWebhooks.ts' 2>/dev/null | head -4000
      echo '```'
    } > "$CTX"
    ;;
  tests)
    {
      echo "# Task: Test Coverage Gap Analysis"
      echo ""
      echo "Identify the 5 highest-risk UNTESTED paths. Risk = money path (Twilio webhooks, Stripe, onboarding, ElevenLabs register call) + tenant isolation. Terse, max 5 bullets."
      echo ""
      echo "## Existing test files"
      find server client -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) 2>/dev/null | sort
      echo ""
      echo "## Server source files (non-test)"
      find server -type f -name '*.ts' ! -name '*.test.ts' 2>/dev/null | sort
    } > "$CTX"
    ;;
  deps)
    {
      echo "# Task: Dependency Review"
      echo ""
      echo "Flag ONLY: deprecated packages, known security advisories, major versions behind. Skip minor/patch noise. Group by priority."
      echo ""
      echo "## package.json"
      cat package.json
      echo ""
      echo "## pnpm outdated"
      pnpm outdated 2>&1 | head -80 || true
      echo ""
      echo "## pnpm audit --prod"
      pnpm audit --prod 2>&1 | head -80 || true
    } > "$CTX"
    ;;
  ui)
    {
      echo "# Task: UI / Client Review"
      echo ""
      echo "Review recent client/src changes for: missing loading states, unhandled error states, accessibility (labels, alt text, keyboard nav), inconsistent spacing/typography. Baylio uses shadcn/ui + Tailwind + light theme only."
      echo ""
      echo "## Pages"
      ls client/src/pages 2>/dev/null
      echo ""
      echo "## Recent client diffs (7 days)"
      echo '```diff'
      git diff HEAD~7 -- 'client/src/**' 2>/dev/null | head -3500
      echo '```'
    } > "$CTX"
    ;;
  arch)
    {
      echo "# Task: Architectural Review"
      echo ""
      echo "Given the architecture snapshot and router composition below, flag emerging issues: duplication, tight coupling, missing abstractions, scale concerns not yet addressed. Max 5 points."
      echo ""
      cat docs/memory/architecture.md 2>/dev/null
      echo ""
      echo "## routers.ts"
      echo '```ts'
      cat server/routers.ts 2>/dev/null
      echo '```'
    } > "$CTX"
    ;;
  deep)
    {
      echo "# Task: Deep Dive"
      echo ""
      echo "Full 14-day pass. Flag top 10 issues by impact × likelihood. Use headers."
      echo ""
      git log --since='14 days ago' --oneline 2>/dev/null
      echo ""
      echo '```diff'
      git diff HEAD~14 -- 'server/**' 'client/src/**' 2>/dev/null | head -6000
      echo '```'
    } > "$CTX"
    ;;
  *)
    echo "❌ Unknown area: $AREA" >> "$LOG"
    exit 1
    ;;
esac

jq -n --arg model "$MODEL" --rawfile prompt "$CTX" \
  '{model: $model, prompt: $prompt, stream: false, options: {num_ctx: 32768, temperature: 0.2}}' \
  > "$PAYLOAD"

START=$(date +%s)
RAW=$(curl -sS --max-time "$MAX_WAIT" "$OLLAMA_HOST/api/generate" \
  -H "Content-Type: application/json" \
  --data-binary @"$PAYLOAD" 2>&1) || RAW='{"error":"curl failed: '"$?"'"}'
END=$(date +%s)
ELAPSED=$((END - START))

TEXT=$(echo "$RAW" | jq -r '.response // .error // "No response from Ollama"' 2>/dev/null || echo "Non-JSON from Ollama")
TOKENS=$(echo "$RAW" | jq -r '.eval_count // 0' 2>/dev/null || echo 0)

{
  echo "$TEXT"
  echo ""
  echo "---"
  echo "_Ollama \`$MODEL\` · ${ELAPSED}s · ${TOKENS} tokens · host=\`$OLLAMA_HOST\`_"
  echo ""
} >> "$LOG"

echo "QA log → $LOG"

# Exit reflects hard checks only; model failures should not mask a passing build.
if [ $CHECK_EXIT -ne 0 ] || [ $TEST_EXIT -ne 0 ]; then
  exit 1
fi
exit 0
