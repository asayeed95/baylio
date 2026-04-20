# Baylio Deploy Log

> **Claude Code: READ THIS FILE at the start of every session.**
> **Update it after every `git push` with what changed.**

---

## Latest Deploy

- **Date:** 2026-04-20
- **Branch:** main
- **Commit:** `620065e` (Mnemix + nightly QA + repo cleanup, atop `046c3db` PR #8)
- **Prod URL:** https://baylio.io

### What Changed (2026-04-20, evening)

**Repo cleanup + Mnemix integration + nightly QA pipeline**

Pushed three commits after a repo cleanup — the working tree had drifted behind origin by 17 commits with two nested clones (`baylio/baylio` from VSCode, `baylio/baylio-1` from Antigravity). Nested folders deleted, outer repo rebased onto `origin/main`, three conflicts resolved cleanly (`.gitignore`, `DEPLOY_LOG.md`, `server/services/twilioWebhooks.ts` imports).

**feat: Mnemix pre-call context injection (`b88154d`)**
- `server/services/mnemixService.ts` — new: caller phone lookup against Mnemix API, formats context for dynamic_variables, fails open (empty string on error so Sam still connects)
- `server/services/twilioWebhooks.ts` — pulls Mnemix context pre-call, injects alongside Mem0 memory
- `server/services/elevenLabsWebhookService.ts` — +143 lines of pipeline wiring
- `server/services/mem0Service.ts`, `postCallPipeline.ts` — updates for Mnemix side-channel
- `server/_core/env.ts` — `MNEMIX_API_URL`, `MNEMIX_API_KEY` env vars
- `drizzle/schema.ts` — schema bump

**chore: nightly QA pipeline (`13d5c8b`)**
- `.claude/commands/{backup,morning,qa}.md` + `.claude/routines/{morning-brief,nightly-qa}.md` — Claude Code routines
- `scripts/qa/{backup,nightly-qa,run-morning-launchd,run-nightly-launchd}.sh` — launchd runners
- `scripts/add-sam-leads.mjs` — Sam lead seeding
- `docs/superpowers/specs/pi-monitor.md` — spec doc
- `.gitignore` — `.claude/scheduled_tasks.json` + `.lock` now untracked (runtime state, not config)

**build: api/index.js regenerated (`620065e`)** — +220/-89 lines, now 264.8kb.

**Still pending before first paying customer:**
1. Live E2E: signup → email confirm → /auth/callback → /onboarding → real phone call → ring-shop-first verify → dashboard call log
2. Live Stripe test payment on real card
3. Supabase dashboard SMTP sender confirmed as `hello@baylio.io`

---

### Previous Deploy (2026-04-20, commit `9413333`)

**feat: 14-day trial system + Supabase email auth callback (PR #8)**

Merged `backend/trial-system` → main and force-deployed to prod. Closed stale PR #7 (old admin analytics, superseded).

**Trial system**
- `server/services/emailService.ts` — Day 7/12/13/14 lifecycle emails via Resend from `hello@baylio.io`
- `server/services/trialReminders.ts` — scans shops within 8 days of trial end, picks highest-priority unsent milestone, idempotent via `trialDayXEmailSentAt` cols
- `server/services/cronRouter.ts` — `GET /api/cron/trial-check` auth'd by `Authorization: Bearer $CRON_SECRET`
- `server/services/trialService.ts` — trial state helpers
- `server/services/twilioWebhooks.ts` — gated voicemail when trial expired
- `vercel.json` — daily cron `0 14 * * *`
- `server/subscriptionRouter.ts` — `getAccessStatus` procedure for banner
- `client/src/components/TrialBanner.tsx` — yellow >2 days, red ≤2 or expired
- `client/src/components/DashboardLayout.tsx` — renders banner above main
- `drizzle/schema.ts` + `scripts/add-trial-fields.mjs` — new trial columns

**Auth callback**
- `client/src/pages/AuthCallback.tsx` — handles `?code=` exchange → `/onboarding`
- `client/src/App.tsx` — lazy `/auth/callback` route
- `client/src/contexts/AuthContext.tsx` — signUp sets `emailRedirectTo: ${origin}/auth/callback`

**Env + infra**
- `CRON_SECRET` provisioned in Vercel production (use `printf` not `echo` when piping — `echo` adds `\n` that breaks HTTP headers)
- Force-deployed with `vercel --prod --force` to bypass a stale build cache that had been serving a pre-visual Landing chunk

**Verified live on baylio.io 2026-04-20:**
- `GET /api/cron/trial-check` with correct bearer → `{ok: true, result: {scanned: 0, sent: {...}, skipped: 0, errors: 0}}`
- `GET /api/cron/trial-check` with wrong bearer → `401`
- `GET /auth/callback` → `200`
- `GET /api/health` → `{status: "ok"}`
- Landing bundle contains HeroVisual/CarLineDraw/TreadDivider (77KB chunk, was 47KB stale)

---

### Previous Deploy (2026-04-18, commit `7e4e6a6`)

**feat(mobile): optimize signup flow for mobile webapp**

Full mobile pass on the signup-critical path (Landing → Login → Onboarding). Baylio is now mobile-first-friendly for 375/390/412px viewports.

- **Onboarding (client/src/pages/Onboarding.tsx)**
  - City/State/ZIP grid: `grid-cols-3` → `grid-cols-2 sm:grid-cols-3` (City spans full width on mobile)
  - Business hours row: flex-row → `flex-col sm:flex-row` (time inputs stack below day+checkbox on mobile, no more horizontal overflow)
  - Nav buttons: sticky bottom on mobile so CTA is always reachable (`sticky bottom-0 sm:static`)
  - Phone input: added `type="tel"` + `inputMode="tel"` + `autoComplete="tel"` for mobile keyboard
  - Address fields: added `autoComplete` attributes (street-address, address-level1/2, postal-code)
  - Area code + ZIP: `inputMode="numeric"` for numeric keypad
  - Service price: `inputMode="decimal"`
- **Login (client/src/pages/Login.tsx)**
  - Email: `inputMode="email"` + `autoCapitalize="none"` + `autoCorrect="off"` + `spellCheck={false}` + `autoComplete="email"`
  - Password: `autoComplete="current-password"` for login, `"new-password"` for signup (enables password manager autofill)
  - Name: `autoComplete="name"`
- **Landing (client/src/pages/Landing.tsx)**
  - Hero padding: `py-20 md:py-32` → `py-12 md:py-32`
  - All section padding: `container py-20` → `container py-12 md:py-20` (10 sections)
  - Press/testimonial section: `py-16` → `py-10 md:py-16`
- **.gitignore**: added `.env*.local` (auto-added by `vercel link`)

---

### Previous Deploy (2026-04-17, commit `fdea2f9`)

**chore: Sam fully agentic + infra (Mem0 + SAM_TOOL_SECRET + scripts/setup-sam.mjs fix)**

Environment setup: `MEM0_API_KEY` + `SAM_TOOL_SECRET` added to Vercel production. Sam's ElevenLabs agent patched with 5 tools (capture_lead, send_sms_followup, send_email_followup, start_onboarding_assist, transfer_to_human) + post-call webhook. Fixed ElevenLabs API format in setup-sam.mjs (object headers, descriptions on all fields, eleven_turbo_v2 model for English).

`sam_leads` table confirmed in Supabase (already migrated). `MEM0_API_KEY` → `m0-...`. `SAM_TOOL_SECRET` → 32-byte hex.

Launchd crons running: `com.baylio.qa-nightly` (22:03 daily), `com.baylio.morning-brief` (07:07 daily).

---

### Previous Deploy (2026-04-10, commit `52831ea`)

**feat: Sam goes fully agentic — Mem0 memory, 5 tools, multilingual conversational fix, admin lead dashboard**

Massive upgrade to Sam (Baylio's sales agent at 844-875-2441). Sam is no longer a single-purpose voice bot — he's a multi-persona agent with persistent memory, tool calling, and a CRM dashboard.

**1. Persistent caller memory via Mem0** (`server/services/mem0Service.ts`)
- New `mem0ai@3.0.0` dependency.
- Sam bypass injects prior-call context via `conversation_initiation_client_data.dynamic_variables` on every inbound call.
- Post-call webhook at `/api/elevenlabs/conversation` receives the ElevenLabs transcript and stores it in Mem0 keyed by `sales_<phone>`.

**2. New canonical Sam prompt** (`server/services/samPrompt.md`)
- Multi-persona: salesperson, mechanic-knowledgeable advisor, customer support, onboarding specialist.
- Intent detection block (shop owner / curious tester / car question / existing customer / onboarding / spam / wrong number).
- Deep auto repair knowledge (20+ symptoms, 13 maintenance intervals).
- Full Baylio pricing knowledge baked in (Trial $149, Starter $199, Pro $349, Elite $599 + setup fees + overage + annual + add-ons).
- **Multilingual fix** — explicit conversational examples per language. Bangla section rewritten with hard rules against newspaper/news-anchor tone (the user's #1 complaint), plus GOOD vs BAD examples.

**3. Five ElevenLabs custom tools wired to backend** (`server/services/samToolsRouter.ts`)
- `capture_lead` → `/api/sam/lead` — upserts `sam_leads` + pushes to Baylio HubSpot
- `send_sms_followup` → `/api/sam/sms` — Twilio SMS w/ consent
- `send_email_followup` → `/api/sam/email` — Resend email w/ consent
- `start_onboarding_assist` → `/api/sam/onboard` — flags lead for hands-on onboarding
- `transfer_to_human` → `/api/sam/transfer` — marks lead transferred + returns founder phone (201-321-2235); raw TwiML at `/api/sam-twiml/transfer.twiml`
- All endpoints auth-gated by `x-sam-tool-secret` header.

**4. New `sam_leads` table** with intent enum, marketing consent, sms/email/transfer flags, callCount, hubspotContactId. Idempotent upsert on `callerPhone`.

**5. Admin Sam Leads dashboard** at `/admin/sam-leads` — table with search, intent filter, 4 stat cards, touch-icon column (sms/email/transfer/repeat-caller).

**6. Setup script** (`scripts/setup-sam.mjs`) — re-runnable. Pushes canonical prompt + 5 tools + post-call webhook + multilingual TTS model to Sam's agent.

**7. Env additions:** `MEM0_API_KEY`, `SAM_TOOL_SECRET`, `FOUNDER_PHONE` (defaults to `+12013212235`).

### Verification

- 19/19 test files pass, 188 passing + 2 skipped (live-API)
- `pnpm run check` clean
- `pnpm run build:vercel` clean — `api/index.js` 228.5kb

### Required Post-Push Actions

1. `vercel env add MEM0_API_KEY production` (paste key from mem0.ai)
2. `vercel env add SAM_TOOL_SECRET production` (generate any random ≥32-char string)
3. `vercel env pull .env.local`
4. ~~`pnpm run db:push`~~ — ~~drizzle-kit push is broken (LOOP-006). Use: `node --env-file=.env.local scripts/add-sam-leads.mjs` (idempotent script created 2026-04-17).~~ **DONE 2026-04-17 23:40** — table created, 19 columns verified, unique index `sam_leads_callerPhone_idx` (quoted, case-preserved) on callerPhone.
5. `node scripts/setup-sam.mjs` — pushes prompt + tools to ElevenLabs
6. Test: call 844-875-2441 from a phone, ask Sam in Bangla — confirm conversational tone, not news-anchor.

### Infrastructure Additions (2026-04-17 23:00)

Not a product deploy — local developer automation.

1. **Nightly QA pipeline** — `scripts/qa/nightly-qa.sh` runs `pnpm run check` + `pnpm test` + one area of Ollama review against Windows PC at `192.168.0.238:11434` (qwen2.5-coder:32b default). Area rotates by day-of-week. Logs to `logs/qa-YYYY-MM-DD.md` (git-ignored). Slash command: `/qa [area]`.
2. **Morning brief** — `scripts/qa/run-morning-launchd.sh` pipes a brief prompt through `claude -p`, writes `logs/brief-YYYY-MM-DD.md`. Slash command: `/morning`.
3. **Scheduling via launchd** — `~/Library/LaunchAgents/com.baylio.qa-nightly.plist` (22:03) + `com.baylio.morning-brief.plist` (07:07). Claude Code `CronCreate` with `durable: true` tested and confirmed NOT persistent on current build — the flag is accepted but no `.claude/scheduled_tasks.json` is written. Fell back to launchd for reliability.
4. **sam_leads migration script** — `scripts/add-sam-leads.mjs` (idempotent, matches `add-ring-columns.mjs` pattern). Not yet executed — awaiting `DATABASE_URL` via `vercel env pull .env.local`.
5. **Stale process cleanup** — killed zombie `drizzle-kit studio` (PID 93446) + `esbuild` helper (PID 93458) referencing a deleted path `/Users/agencyflow/baylio/`. The old checkout directory no longer exists; processes were holding refs to deleted inodes. No other processes pointing outside `~/projects/baylio/`.

### Previous Deploy (2026-04-09)

- **Commit:** `de6e5e8`

### What Changed

**fix: P1 cleanup — appointmentDateTime extraction + serviceCatalog types + auth audit**

1. **Authorization audit** — Audited all 60+ tRPC procedures across 11 routers. All procedures verified secure. `notificationRouter.markRead` flagged by audit but confirmed secure at DB layer (`AND notifications.userId = userId` in WHERE clause). No changes needed.

2. **setImmediate error boundaries** — Verified all 4 `setImmediate` callbacks in `twilioWebhooks.ts` already have proper `try/catch` with `console.error`. No changes needed.

3. **appointmentDateTime extracted from LLM** — `analyzeTranscription` now returns `appointmentDateTime: string | null` from the LLM analysis. The JSON schema includes the field with ISO 8601 format hint. `runPostCallIntegrations` uses it for Google Calendar appointment creation, falling back to 24h only if LLM couldn't extract a specific time. Removes the hardcoded "tomorrow" hack.

4. **serviceCatalog `as any` cast removed** — `postCallPipeline.ts` was casting `shop?.serviceCatalog as any`. Drizzle schema already types it correctly via `$type<Array<{ name: string; category: string; price?: number; description?: string }>>()`. Cast removed.

5. **19/19 tests, 188 passing, 2 skipped (live-API)**

### Previous Deploy (2026-04-09 — AI Agent Config)

- **Commit:** `2267644`

**feat: AI Agent Config — Voice Picker, Personality System, Language Guides**

1. **Voice Picker** — Replaced raw ElevenLabs voice ID text field with a curated 16-voice grid grouped by accent (American, British, Australian, Spanish-Latam). Each card has a Play ▶ button for live TTS preview. All voices use `eleven_multilingual_v2`. Voice catalog lives in `shared/voiceCatalog.ts` (safe for both server + client bundle).

2. **Personality System** — 4 character presets (Warm Helper, Efficient Closer, Tech Expert, Sales Pro) + 3 fine-tune sliders (Warmth, Sales Intensity, Technical Depth, each 1–5). Preset clicks snap sliders to preset defaults. These compile into `compilePersonalitySection()` in the system prompt.

3. **Language Guides** — 8 languages (EN, ES, AR, PT, HI, BN, IT, TR) with genuinely colloquial per-language instructions. Spanish uses "Órale, déjame checar" not textbook Spanish. Bangla starts with "কথ্য বাংলায়" (conversational Bangla). Falls back to English for unknown codes.

4. **Auto Repair Knowledge** — Deep car knowledge baked into ALL agents by default: symptom-to-service map, maintenance intervals, "never diagnose out loud" rules. Not configurable per shop.

5. **Database** — 4 new columns on `agent_configs`: `characterPreset varchar(32)`, `warmth integer`, `salesIntensity integer`, `technicalDepth integer` (all NOT NULL with defaults). Migration: `scripts/add-personality-columns.mjs`.

6. **Commits:** `255105f` (schema), `f4f7218` (voice catalog), `237de26` (prompt compiler), `d2f6db9` (ShopContext assembly), `f13053c` (router), `0b057d1` (VoicePicker), `37a8fec` (PersonalityPicker), + AgentConfig + Onboarding rewrites.

### Previous Deploy (2026-04-09 — earlier session)

- **Commit:** `fce910d`

1. **fix: AI voice now confirmed working end-to-end**
   - Root cause 1: `gemini-2.5-flash` silently fails on ElevenLabs starter plan — LLM never called, first_message never played. Switched Zee + Sam to `gpt-4o-mini` via API PATCH.
   - Root cause 2: `conversation_initiation_client_data` with undeclared dynamic variables in Register Call API created broken sessions (WebSocket connected but conversation never started). Removed client data entirely — agent has full prompt baked in.
   - Root cause 3: Tried bypassing Register Call API with direct `?agent_id=` WebSocket URL — drops calls because ElevenLabs' Twilio endpoint requires `conversation_id` pre-registration for the Media Streams protocol. Reverted.
   - `/no-answer` handler now reads `?baylio=` query param (Baylio number embedded in action URL) instead of relying on Twilio's `To` field, which can be the shop's phone number in Dial action callbacks.
   - **Confirmed working:** Test agent (GPT-4o-mini minimal) answered. Zee restored with GPT-4o-mini, needs one more real call confirmation.

2. **fix: ShopDetail crash on null startTime**
   - `new Date(null)` was throwing RangeError when call logs had null startTime. Guard added.

### Previous Deploy (2026-04-08)

## Latest Deploy (PREVIOUS)

- **Date:** 2026-04-08
- **Branch:** main
- **Commit:** `cbc5279`
- **Pushed by:** Claude Code (asec-mac)

### What Changed

1. **fix: use ulaw_8000 audio format for Twilio phone calls (e46af71)**
   - Root cause: ElevenLabs agents default to `pcm_16000` (browser/WebRTC) but Twilio PSTN needs `ulaw_8000` (G.711 µ-law 8kHz)
   - Symptom: caller hears ring-first working (shop phone rings), but after no-answer fallback, AI connects but is completely silent — user speech transcribed, zero agent responses in ElevenLabs conversation log
   - Fixed: `createConversationalAgent` and `updateConversationalAgent` in `elevenLabsService.ts` now set `agent_output_audio_format: "ulaw_8000"` and `user_input_audio_format: "ulaw_8000"`
   - Both existing agents patched directly via API: Zee (agent_0601knpttvyyebcv6cnnkrhv1sh1) + Sam/godmode (agent_8401kkzx0edafhbb0c56a04d1kmb)
   - **Status: deployed, NOT yet verified end-to-end** — user restarting mac before test

2. **fix: surface Twilio 21422 error on number purchase**
   - Root cause: Twilio phone number inventory race condition — number appeared in search results but was purchased by someone else before our buy attempt
   - Previously: unhandled exception → opaque 500 with no user-readable message
   - Now: `purchasePhoneNumber` mutation wraps Twilio call in try/catch; error code 21422 (or any 400) maps to `BAD_REQUEST` with message "no longer available — please search for a new number"
   - UI: clears selected number on this error so user can search again immediately

### Previous Deploy (2026-04-07)

1. **feat: ring shop first then AI — Layer 1 phone routing IMPLEMENTED**
   - Schema: added `shops.ringShopFirstEnabled` (bool, default true) and `shops.ringTimeoutSec` (int, default 12)
   - Migration applied directly via `scripts/add-ring-columns.mjs` (drizzle-kit push is broken — see "Known Issues")
   - `/api/twilio/voice` now branches: if `ringShopFirstEnabled && shop.phone`, returns `<Dial timeout=N>shop.phone</Dial>` with `action="/api/twilio/no-answer"`
   - New `/api/twilio/no-answer` handler: returns empty TwiML if shop answered (`DialCallStatus=completed`/`answered`), otherwise falls back to ElevenLabs Register Call
   - Sales line bypass (844-875-2441 → Sam) preserved unchanged
   - `completeOnboarding` defaults new shops to ring-first ON, 12s timeout
   - `shop.update` invalidates `contextCache` after save so call routing picks up new settings on next call
   - ShopSettings UI: new "Call Routing" Card with toggle + slider (range 5-30s)
   - Tests: new `server/twilioRingFirst.test.ts` (9 tests) — TwiML structure, escaping, timeout range
   - Full suite: 18/18 files, 171 passing, 2 skipped (was 17/162)

2. **Previous (commit `8c174b6`): docs: phone provisioning architecture decision recorded**
   - Decided on layered call routing model (see "Phone Provisioning Design" below)
   - Layer 1 is now BUILT and DEPLOYED (this commit)
   - Layers 2-4 still on roadmap

### Current Production State

- **baylio.io** — live, SPA loads correctly
- **API health** — `GET /api/health` returns `{"status":"ok"}`
- **Twilio webhooks** — signature validation fixed (strips Vercel `?path=` query param). Calls route to ElevenLabs agent
- **Sales line (844-875-2441)** — routes to Sam agent
- **Auth** — Supabase Auth working
- **Stripe** — wired, needs live payment test
- **Phone provisioning** — buy/search/release Twilio numbers works (`server/services/twilioProvisioning.ts` + `shopRouter.ts` lines 159-253). Onboarding wizard has phone setup step. ShopSettings has full TwilioPhoneCard UI.

### Known Issues

- **drizzle-kit push is broken** — old MySQL migration files in `drizzle/0000_high_strong_guy.sql` and `drizzle/0001_cold_morlocks.sql` from the pre-Supabase era. Running `db:push` tries to apply them and fails on Postgres syntax. Workaround: write one-off `.mjs` migration scripts in `scripts/` and run via `node --env-file=.env.test scripts/<file>.mjs`. Long-term fix: delete the stale MySQL files and the `meta/` snapshots, regenerate from current schema.
- Vite build fails locally on asec-mac (missing deps), but `esbuild` bundles serverless function fine — Vercel builds it cleanly on push
- Contact form Resend migration: `emailService.ts` already uses Resend; legacy SMTP code is gone
- Number porting (Layer 2), SIP trunking (Layer 3), carrier forwarding fallback UI (Layer 4) — not yet built (designed, see below)
- Live human transfer mid-conversation — not built (CLAUDE.md P2)
- Programmatic graceful hangup — not built (CLAUDE.md P2)

### In Progress

- **AI voice not yet confirmed working** — ring-first routing works (shop phone rings), ulaw_8000 fix deployed, but end-to-end voice not verified before mac restart. First test: toggle ring-first OFF in ShopSettings, call +18624162966, Zee should answer immediately. If Zee speaks → re-enable ring-first and test full flow.
- **Abdur's shop** — onboarded, phone +18624162966 provisioned, Zee agent (agent_0601knpttvyyebcv6cnnkrhv1sh1), business phone 2013212235, ring-first ON (12s)
- Layers 2-4 of the phone provisioning architecture (post-Autoblitz)

---

## Phone Provisioning Design (Decided 2026-04-07)

**Problem:** Carrier-side call forwarding (AT&T `*61*` codes) is fragile — landlines don't always support timed forwarding, PBX systems block it, non-technical shop owners can't configure it, settings reset, no way to verify it's working.

**Solution:** Flip the model. Baylio owns the number. Twilio rings the shop's existing phone first via `<Dial>` TwiML, falls back to AI agent on no-answer/busy/rejection.

### Layered Architecture

| Layer | Method | When to Use |
|-------|--------|-------------|
| 1 (Primary) | Baylio number + ring shop first via `<Dial>` | Default for new shops — instant setup, no carrier config |
| 2 (Migration) | Number porting (Twilio Porting API) | Shop wants to keep advertised number long-term |
| 3 (Enterprise) | SIP trunking | Shops with existing VoIP/PBX systems |
| 4 (Backup) | Carrier-side forwarding | Fallback if Twilio is down |

### Routing Flow (Layer 1)

```
Customer calls Baylio number
  → Twilio /api/twilio/voice webhook
  → Resolve shop context
  → Return TwiML: <Dial timeout="12">{shop's existing phone}</Dial>
  → Shop answers? Human handles call.
  → No answer / busy / rejected? → /api/twilio/no-answer
  → Register call with ElevenLabs → AI agent picks up
```

### Configurable Settings (per shop)

- Ring timeout before AI takes over (default: 12 sec, range: 5-30)
- Enable/disable "ring shop first" (some shops may want AI to answer immediately)
- After-hours behavior (always go straight to AI)
- Busy/no-answer/rejected → all route to AI

### Failure Cases Handled

| Failure | Behavior |
|---------|----------|
| Shop's phone is off/broken | AI picks up after timeout |
| Shop on another call (busy) | AI picks up immediately |
| Shop rejects call | AI picks up immediately |
| Shop's phone rings but no one picks up | AI picks up after timeout |
| Twilio itself down | Carrier forwarding as Layer 4 backup |
| Customer hangs up during the ring | Logged as missed, no recovery possible |

### What Needs to Be Built

- [ ] TwiML `<Dial>` step in `/api/twilio/voice` handler (with timeout from shop config)
- [ ] `/api/twilio/no-answer` endpoint that registers call with ElevenLabs
- [ ] `shops.ringTimeoutSec` column (default 12)
- [ ] `shops.ringShopFirstEnabled` column (default true)
- [ ] ShopSettings UI: ring timeout slider, toggle for "AI answers immediately"
- [ ] Number porting flow (Twilio Porting API + LOA upload + status tracking)
- [ ] SIP trunk provisioning (Twilio SIP Trunks API)
- [ ] Carrier forwarding instructions UI (per-carrier guides as Layer 4 fallback)
- [ ] End-to-end test of all 4 layers before Autoblitz launch

---

## Previous Deploys

### 2026-04-06

- **Commit:** `8d3c54d` → `1d2dcf7` → `eff9696`
- **Changes:**
  1. fix: Twilio signature validation — Vercel injects `?path=twilio%2Fvoice` query param into rewrites; Twilio signs against the clean URL → 403 on every call. Fix strips the param before signature check. Files: `server/middleware/twilioValidation.ts`, `api/index.js`
  2. docs: push-after-every-change rule added to CLAUDE.md
  3. feat: DEPLOY_LOG.md created for cross-machine session continuity

_(Add older entries above this line)_
