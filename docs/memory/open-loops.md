# Baylio — Open Loops

Unresolved questions, stalled work, risky assumptions, pending decisions.
Update when loops close. Add new ones as they surface.

---

## BLOCKING / HIGH RISK

### [LOOP-001] Full User Journey Not Verified End-to-End
- **loop:** No real shop owner has completed the full flow: signup → onboarding → provision Baylio number → call → see call log + transcript in dashboard → pay via Stripe.
- **risk_level:** HIGH
- **blocking:** YES — this is the P0 ship-blocker for Autoblitz launch.
- **note:** Individual pieces are verified (AI voice works, ring-first works, Stripe wired), but no one has run the complete loop. First customer could hit a bug we've never seen.
- **next_action:** Abdur signs up fresh on baylio.io with real shop data, calls +18624162966 from a different phone, verifies ring-first → AI handoff → call log → dashboard.

### [LOOP-002] Stripe Live Payment Untested
- **loop:** Stripe integration is fully wired (webhook handlers for checkout, invoice.paid, subscription.updated, etc.) but no real card has been charged.
- **risk_level:** HIGH
- **blocking:** YES — can't launch without knowing subscriptions actually activate.
- **note:** Stripe webhook secret is configured in Vercel env. Test mode works. Need one live payment to confirm `subscriptions.status = 'active'` and `setupFeePaid = true`.

### [LOOP-003] Declined Ring-First → Voicemail Instead of AI
- **loop:** When the shop owner manually declines (rejects) the ring-first call, Zee goes to voicemail instead of the AI. `DialCallStatus` in this case may be `busy` or `no-answer` depending on carrier, but voicemail pickup causes `DialCallStatus=completed` which signals "human answered."
- **risk_level:** HIGH
- **blocking:** Partially — causes bad customer experience if shop owner has voicemail set up.
- **note:** No known fix yet. Twilio has no way to distinguish "human picked up" from "voicemail picked up" reliably. May need `<Dial answerOnBridge="true">` + AMD (Answering Machine Detection) — expensive, adds ~3s latency.

---

## MEDIUM RISK / NOT BLOCKING

### [LOOP-004] Post-Call Pipeline Not Verified With Real Traffic
- **loop:** `processCompletedCall` runs after each completed call, but no real call has ever gone through the full pipeline (transcription analysis → LLM → call log update → dashboard render).
- **risk_level:** MEDIUM
- **blocking:** NO — but call logs and dashboard will be empty until verified.
- **note:** Likely works — code is tested with mocks — but real calls may surface edge cases (missing fields, timing issues).

### [LOOP-005] Voice Preview (previewVoice) in Production Untested
- **loop:** `previewVoice` tRPC mutation calls ElevenLabs TTS API and returns base64 mp3. Tested locally. Not tested against live prod ElevenLabs key.
- **risk_level:** MEDIUM
- **blocking:** NO
- **note:** `output_format` is passed as query param (not body) — confirmed correct during development. If ElevenLabs API key has TTS permissions restricted, this will fail silently.

### [LOOP-006] drizzle-kit Push Permanently Broken
- **loop:** `pnpm run db:push` fails because `drizzle/0000_high_strong_guy.sql` and `drizzle/0001_cold_morlocks.sql` are MySQL-era files that error on Postgres.
- **risk_level:** MEDIUM
- **blocking:** NO — workaround exists (one-off `.mjs` scripts).
- **note:** Long-term fix: delete stale MySQL files, delete `drizzle/meta/` snapshots, regenerate from current Postgres schema. Don't do during a sprint — it's non-trivial to get right.
- **scripts_so_far:** `scripts/add-ring-columns.mjs`, `scripts/add-personality-columns.mjs`

### [LOOP-007] README.md Is Severely Stale
- **loop:** README.md references MySQL/TiDB, Manus OAuth, JWT_SECRET, 10 tables, `pnpm drizzle-kit generate` — all from pre-Supabase era. Actively misleading for any new developer.
- **risk_level:** MEDIUM
- **blocking:** NO (internal tooling)
- **note:** Needs a full rewrite. Current stack: Supabase PostgreSQL, Supabase Auth, 18 tables. Current auth: cookie-based sessions. See CLAUDE.md for accurate current state.

### [LOOP-008] docs/ Files Are Stale (Pre-Supabase Era)
- **loop:** `docs/ARCHITECTURE.md` still shows "MySQL/TiDB · 13 tables." `docs/PENDING_MIGRATIONS.md` has MySQL ALTER TABLE syntax. Multiple other docs reference old stack.
- **risk_level:** LOW
- **blocking:** NO
- **note:** These are reference docs, not runtime. Low priority. CLAUDE.md is the authoritative source.

---

## LOW RISK / KNOWN LIMITATIONS

### [LOOP-009] Live Human Transfer Not Built
- **loop:** Agent prompts say "let me take your number" when caller insists on human. There is no actual TwiML `<Dial>` transfer mid-conversation. Caller gets callback number collected, call ends.
- **risk_level:** LOW (for MVP)
- **blocking:** NO — documented P2 priority.

### [LOOP-010] Graceful Hang-Up Not Built
- **loop:** No programmatic hang-up mechanism. ElevenLabs ends conversation naturally. No `<Hangup />` TwiML control.
- **risk_level:** LOW
- **blocking:** NO — documented P2 priority.

### [LOOP-011] setImmediate Post-Call Work Is Not Durable
- **loop:** Post-call pipeline runs via `setImmediate` — works because Vercel functions stay warm briefly after response. Not durable. If function terminates before `setImmediate` fires, call data is lost.
- **risk_level:** LOW (current traffic)
- **blocking:** NO — acceptable for MVP. Upgrade path: Vercel Queues or Upstash BullMQ.

### [LOOP-012] In-Memory Rate Limiter Is Per-Instance
- **loop:** Rate limiter is in-memory, per Vercel serverless instance. Not distributed. Only protects within a single function lifetime.
- **risk_level:** LOW
- **blocking:** NO — smoke protection only. Upstash Redis upgrade path documented.

### [LOOP-013] appointmentDateTime Fallback Still 24h
- **loop:** `runPostCallIntegrations` now uses LLM-extracted `appointmentDateTime`, but falls back to 24h if LLM returns null (e.g., caller mentioned "next week" without a specific date).
- **risk_level:** LOW
- **blocking:** NO — better than hardcoded, still imperfect.
- **note:** Proper fix: NLP date extraction or ask the agent to always confirm a specific date+time before ending call.

---

## CLOSED LOOPS (for reference)

- ~~[CLOSED] AI voice not working~~ — Fixed 2026-04-09: gemini→gpt-4o-mini, removed initiation client data, fixed /no-answer query param.
- ~~[CLOSED] Twilio webhook 403 on every call~~ — Fixed 2026-04-06: strip Vercel `?path=` param before HMAC check.
- ~~[CLOSED] Audio format mismatch (complete silence)~~ — Fixed 2026-04-09: `ulaw_8000` for Twilio PSTN.
- ~~[CLOSED] Ring-shop-first not built~~ — Shipped 2026-04-07.
- ~~[CLOSED] serviceCatalog as-any cast~~ — Fixed 2026-04-10.
- ~~[CLOSED] Hardcoded "tomorrow" appointment date~~ — Fixed 2026-04-10: LLM now extracts `appointmentDateTime`.
