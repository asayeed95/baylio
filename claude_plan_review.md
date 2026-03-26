# Claude's Hardening Plan — Manus Review & Additions

**Verdict: The plan is accurate and well-prioritized. I verified every line reference against the actual code. Below is my assessment plus critical additions Claude needs to know.**

---

## Plan Accuracy: Confirmed

I re-read every file Claude references. Here is the verification:

| Step | Claude's Claim | Verified? | Notes |
|------|---------------|-----------|-------|
| 1A. callRouter.ts — 4 procedures missing auth | `updateAudit` (L101), `generateScorecard` (L113), `completeAudit` (L123) have no `ctx` usage. `audits` (L60) leaks data when `shopId` is omitted. | **CONFIRMED** | `list` (L27) and `analytics` (L49) are correctly guarded. The 4 flagged ones are real gaps. |
| 1B. notificationRouter.ts — markRead no user check | `markRead` (L54) takes `input.id` and marks it read without verifying the notification belongs to `ctx.user.id` | **CONFIRMED** | Anyone can mark anyone's notification as read by guessing IDs. |
| 2A. stripeRouter.ts — no try/catch | Lines 51, 109, 162 — all three `stripe.*` calls are unwrapped | **CONFIRMED** | If Stripe is down or key is invalid, the error propagates as an unhandled rejection. |
| 2B. PostHog init — no try/catch | Line 15 in `main.tsx` — `posthog.init()` runs even when `posthogKey` is truthy but invalid | **CONFIRMED** | Browser console shows repeated `PostHog was initialized without a token` errors in dev. The `if (posthogKey)` guard works in production (env var is set), but the init itself should be wrapped. |
| 3A. cookies.ts — domain logic commented out | Lines 27-40 completely commented out | **CONFIRMED** | Cookie is set without a `domain` field, so it only applies to the exact hostname. `baylio.io` cookie is NOT sent to `admin.baylio.io`. This is the root cause of the admin portal login failure. |
| 4A. Twilio call routing | `logOnly: true` on line 59 of `server/_core/index.ts` | **CONFIRMED** | Signature validation is in log-only mode — it logs failures but doesn't block requests. This is intentional for now (reverse proxy strips headers). |
| 4B. ElevenLabs agent disconnect | Needs dashboard investigation | **CONFIRMED** | Cannot verify from code alone — requires checking ElevenLabs conversation logs. |
| 4C. Enable Twilio validation | Change `logOnly: true` to `false` after 4A works | **CONFIRMED** | Correct sequence — don't enable enforcement until the URL is verified. |

---

## What Claude's Plan is Missing — Add These

### Missing Item 1: PostHog Spamming Console Every 6 Seconds

**Severity: Medium (performance + log noise)**

The `VITE_POSTHOG_KEY` env var is NOT set in the Manus dev environment. But `posthog.init()` still runs because the `if (posthogKey)` check passes when the env var is an empty string (which is falsy — so actually this only fires in the browser console when the key is set to something invalid). In the browser console logs, PostHog is firing every 6 seconds with `PostHog was initialized without a token` errors.

**Fix:** Change the guard from `if (posthogKey)` to `if (posthogKey && posthogKey.startsWith('phc_'))` to validate the key format before initializing. Also wrap in try/catch as Claude already plans.

### Missing Item 2: `audits` Query Leaks ALL Audits When shopId is Omitted

**Severity: HIGH (data leak)**

In `callRouter.ts` line 60-67:
```typescript
audits: protectedProcedure
  .input(z.object({ shopId: z.number().optional() }))
  .query(async ({ ctx, input }) => {
    if (input.shopId) {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return [];
    }
    return getMissedCallAudits(input.shopId); // ← No shopId = ALL audits for ALL users
  }),
```

If a user calls `trpc.calls.audits.useQuery({})` without a `shopId`, they get every audit in the system. Claude's plan mentions this procedure but the fix description focuses on adding ownership checks to `updateAudit`, `generateScorecard`, and `completeAudit`. The `audits` query itself needs a fix too: when `shopId` is omitted, it should filter by `ctx.user.id` (get all audits for shops owned by the current user), not return everything.

### Missing Item 3: `createAudit` Has No Shop Ownership Check

**Severity: Medium**

In `callRouter.ts` line 79-85:
```typescript
createAudit: protectedProcedure
  .mutation(async ({ ctx, input }) => {
    const id = await createMissedCallAudit({
      ...input,
      ownerId: ctx.user.id,
    });
    return { id };
  }),
```

It sets `ownerId: ctx.user.id` (good), but if `input.shopId` is provided, it doesn't verify the user owns that shop. A user could create an audit linked to someone else's shop.

### Missing Item 4: Stripe Webhook Handler — Test Event Pattern

**Severity: Low (only matters for Stripe sandbox verification)**

Verify that `server/stripe/stripeRoutes.ts` has the test event detection pattern:
```typescript
if (event.id.startsWith('evt_test_')) {
  return res.json({ verified: true });
}
```

This is required for Stripe webhook verification to pass in test mode. If it's missing, the Stripe sandbox claim will fail.

### Missing Item 5: No Health Check Endpoint for Monitoring

**Severity: Low (operational)**

There is no `/api/health` or `/api/twilio/health` endpoint. Claude's plan mentions "Hit `/api/twilio/health` to confirm server is reachable" in Phase 4A, but this endpoint doesn't exist yet. Claude should create it.

---

## What Keeps Crashing — Tell Claude This

### Crash 1: Phone Calls — (844) 875-2441

**Symptom:** Call rings 3 times, then silence or disconnect.

**What we know from code:**
- `server/services/twilioWebhooks.ts` handles `POST /api/twilio/voice`
- It looks up the shop by `To` number, builds a prompt, registers with ElevenLabs, returns TwiML
- `logOnly: true` means Twilio signature validation is NOT blocking requests
- The webhook URL in Twilio Console must point to `https://baylio.io/api/twilio/voice`
- `WEBHOOK_BASE_URL` env var is set to `https://baylio.io`

**What Claude CANNOT diagnose from code alone:**
1. Is the Twilio Console webhook URL correct? (Requires Twilio Console access)
2. Is the ElevenLabs agent responding? (Requires ElevenLabs dashboard → Conversation Logs)
3. Is the WebSocket connection between Twilio and ElevenLabs staying alive? (Requires ElevenLabs logs)

**What to tell Claude:**
> "For the phone call bug, I need you to add comprehensive logging to `twilioWebhooks.ts` so we can trace exactly where the call flow breaks. Add `console.log` at every step: (1) webhook received, (2) shop found, (3) prompt compiled, (4) ElevenLabs register-call request sent, (5) ElevenLabs response received, (6) TwiML returned. Also create a `/api/twilio/health` endpoint that returns server status + env var presence checks."

### Crash 2: admin.baylio.io Login

**Symptom:** Login redirects to Manus OAuth, completes, but user is not authenticated on admin.baylio.io.

**Root cause (confirmed):** `server/_core/cookies.ts` lines 27-40 are commented out. The session cookie is set without a `domain` field, so it's scoped to `baylio.io` only. `admin.baylio.io` never receives the cookie.

**Fix (Claude can do this immediately):**
Uncomment lines 27-40 and ensure the domain is set to `.baylio.io` for production hostnames. This allows the cookie to be shared across all subdomains.

### Crash 3: PostHog Console Spam

**Symptom:** Browser console flooded with `PostHog was initialized without a token` errors every 6 seconds.

**Root cause (confirmed):** `VITE_POSTHOG_KEY` is not set in the dev environment. PostHog SDK logs errors when initialized without a valid key.

**Fix:** Wrap in try/catch + validate key format before init.

---

## Recommended Execution Order for Claude

Claude's 7-step order is correct. Here is my refined version with the additions:

| # | Task | Type | Time Est. |
|---|------|------|-----------|
| 1 | callRouter.ts — Fix all 5 procedures (updateAudit, generateScorecard, completeAudit, audits query, createAudit) | Code fix | 15 min |
| 2 | notificationRouter.ts — Add user verification to markRead | Code fix | 5 min |
| 3 | stripeRouter.ts — Wrap 3 Stripe calls in try/catch + TRPCError | Code fix | 10 min |
| 4 | main.tsx — PostHog try/catch + key format validation | Code fix | 5 min |
| 5 | cookies.ts — Uncomment domain logic, set `.baylio.io` | Code fix | 10 min |
| 6 | twilioWebhooks.ts — Add comprehensive step-by-step logging | Code fix | 15 min |
| 7 | Create `/api/twilio/health` endpoint | Code fix | 5 min |
| 8 | Run `pnpm test` — all 161 must stay green | Verification | 2 min |
| 9 | Write new tests for auth fixes (unauthorized access should fail) | Tests | 20 min |
| 10 | Twilio Console — verify webhook URL | Investigation | Needs your access |
| 11 | ElevenLabs — check conversation logs for disconnect reason | Investigation | Needs your access |
| 12 | Enable Twilio signature validation (`logOnly: false`) | Config | After #10 verified |

**Total code work: ~85 minutes for Claude. Steps 10-12 need your Twilio/ElevenLabs dashboard access.**

---

## Prompt to Give Claude Code

Copy-paste this into Claude Code after it reads the repo:

```
Read CLAUDE_HANDOFF.md first for full context.

HARDENING SPRINT — Execute in this exact order:

PHASE 1: Auth Fixes (callRouter.ts)
- updateAudit (L101): Add ctx, look up audit → get shopId → verify shop.ownerId === ctx.user.id
- generateScorecard (L113): Same pattern
- completeAudit (L123): Same pattern  
- audits query (L60): When shopId is omitted, filter by ctx.user.id's shops instead of returning all
- createAudit (L79): If input.shopId provided, verify ctx.user owns that shop
- Pattern to reuse from list (L27-28): const shop = await getShopById(input.shopId); if (!shop || shop.ownerId !== ctx.user.id) throw FORBIDDEN

PHASE 1B: notificationRouter.ts
- markRead (L54): Query the notification first, verify notification.userId === ctx.user.id before marking

PHASE 2: Error Handling
- stripeRouter.ts: Wrap lines 51, 109, 162 in try/catch. Throw TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment service error" }). Log original Stripe error.
- main.tsx: Change PostHog guard to: if (posthogKey && posthogKey.startsWith('phc_')) { try { posthog.init(...) } catch(e) { console.warn('PostHog init failed', e) } }

PHASE 3: Admin Portal Login
- server/_core/cookies.ts: Uncomment lines 27-40. For production hostnames ending in baylio.io, set cookie domain to .baylio.io

PHASE 4: Call Debugging
- twilioWebhooks.ts: Add console.log at every step of handleVoiceWebhook (webhook received, shop found, prompt compiled, ElevenLabs request, ElevenLabs response, TwiML returned)
- Create GET /api/twilio/health endpoint returning { status: "ok", env: { TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID, ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY, WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL } }

After each phase: run pnpm test (161 tests must stay green)
After all phases: write new test cases for each auth fix (unauthorized access should return FORBIDDEN)
```
