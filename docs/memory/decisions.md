# Baylio — Architecture & Product Decisions

Log of significant decisions with rationale. Add new entries at the top.
Format: `## [DATE] — Decision Title` then Why/Alternatives/Outcome.

---

## [2026-04-09] — Personality System: Sliders Over Free Text

**Decision:** 4 character presets + 3 fine-tune sliders (Warmth, Sales Intensity, Technical Depth 1–5) instead of a free-text "personality instructions" field.

**Why:** Shop owners are not prompt engineers. A free-text field produces either empty input or nonsense instructions that break the agent. Presets + sliders constrain the design space to meaningful options while still giving control.

**Alternatives considered:**
- Free text field — too much rope, produces bad prompts
- Single preset selector with no sliders — not enough control for shops with strong preferences

**Outcome:** Presets snap sliders to defaults. Sliders override individual dimensions. Compiled into `PERSONALITY CALIBRATION` block in system prompt via `compilePersonalitySection()`.

---

## [2026-04-09] — Auto Repair Knowledge Baked Into All Agents

**Decision:** Deep auto repair knowledge (symptom→service map, maintenance intervals, never-diagnose-out-loud rules) compiled into every agent's system prompt by default. Not configurable per shop.

**Why:** Every Baylio customer is an auto repair shop. The knowledge is universal to the vertical. Making it configurable adds complexity without meaningful benefit — no shop wants their AI to NOT know what a brake job is.

**Alternatives considered:**
- Optional toggle — adds UI complexity for zero customer benefit
- Per-shop custom knowledge — scope creep, hard to maintain quality

**Outcome:** `AUTO_REPAIR_KNOWLEDGE` constant in `promptCompiler.ts`, always injected into all agents.

---

## [2026-04-09] — Voice Catalog as Shared Module

**Decision:** `shared/voiceCatalog.ts` — voice catalog imported by both server (for ElevenLabs API calls) and client (for VoicePicker UI). Not duplicated.

**Why:** Avoiding duplicate definitions that can drift out of sync. Voice IDs are load-bearing — a mismatch between UI display and server-side lookup would cause silent errors.

**Alternatives considered:**
- Define in server only, fetch via tRPC — adds network round-trip for what's static data
- Define in client only, send voiceId in form data — server can't validate voiceId

**Outcome:** `VOICE_CATALOG` and `VoiceCatalogEntry` in `shared/voiceCatalog.ts`. `@shared/*` alias configured in both vite.config and tsconfig.

---

## [2026-04-09] — ElevenLabs previewVoice: output_format as Query Param

**Decision:** ElevenLabs TTS API `/v1/text-to-speech/{voiceId}` requires `output_format` as a query param, NOT in the request body.

**Why:** Discovered during development when body-field approach returned audio in default format regardless of specified format. ElevenLabs API docs (and confirmed by testing) show it's a query param.

**Alternatives considered:** Putting in body — works but returns wrong format.

**Outcome:** `params: { output_format: "mp3_44100_128" }` in axios config, not in the POST body. All TTS preview calls must use this pattern.

---

## [2026-04-09] — GPT-4o-mini for ElevenLabs Agent LLM (Not Gemini)

**Decision:** Both Zee (shop agent) and Sam (sales agent) use `gpt-4o-mini` as the LLM powering ElevenLabs Conversational AI.

**Why:** `gemini-2.5-flash` silently fails on ElevenLabs starter plan — LLM call is never made, `first_message` never plays. Root cause unclear (plan restriction? quota?). `gpt-4o-mini` works reliably and is cost-effective.

**Alternatives considered:**
- gemini-2.5-flash — confirmed broken on starter plan, may work on higher plan
- gpt-4o — works but more expensive, not needed for receptionist use case

**Outcome:** Patch applied via ElevenLabs API PATCH. Will revisit Gemini when on a higher ElevenLabs plan if cost becomes a concern.

---

## [2026-04-07] — Ring-Shop-First Architecture (Layer 1)

**Decision:** Baylio owns the phone number. Twilio `<Dial>`s the shop's existing business phone first. AI picks up on no-answer/busy/failed.

**Why:** Carrier-side call forwarding (`*61*` codes) is fragile — landlines often don't support timed forwarding, PBX systems block it, non-technical shop owners misconfigure it, settings reset unexpectedly.

**Alternatives considered:**
- Carrier forwarding only — too unreliable, too much customer setup burden
- AI-first always — shop owners don't trust AI alone; they want to be able to answer themselves
- Number porting — correct long-term for shops that want to keep their number, but complex (Layer 2)

**Outcome:** Layered 4-method architecture. Layer 1 shipped and working. Layers 2-4 on roadmap.

---

## [2026-04-06] — Pre-bundle api/index.js and Commit It

**Decision:** Run esbuild locally, commit the resulting `api/index.js`, let Vercel serve it directly instead of running its own build.

**Why:** Vercel's auto-detected Express bundling had ESM compatibility issues (commits `c094db9`, `75a4a54`). Pre-bundling with esbuild gives a reliable, reproducible output.

**Alternatives considered:**
- Let Vercel build — mystery deploy failures, hard to debug
- Configure Vercel build pipeline explicitly — tried, ESM issues persisted

**Outcome:** Always run `pnpm run build:vercel` before `git push`. Never edit `api/index.js` directly. This is a known trade-off documented in CLAUDE.md.

---

## [2026-04-06] — Strip Vercel ?path= Param Before Twilio HMAC

**Decision:** `twilioValidation.ts` strips the `?path=` query param injected by Vercel before computing HMAC-SHA1 signature.

**Why:** Vercel's routing rewrites inject `?path=twilio%2Fvoice` into the URL. Twilio signs against the clean URL without this param. Without stripping, every webhook returns 403.

**Alternatives considered:**
- Disable Twilio validation — never, this is toll fraud protection
- Use Vercel's raw path header — unreliable across Vercel deployment types

**Outcome:** Load-bearing code in `twilioValidation.ts`. Do NOT remove or modify the stripping logic.

---

## [Pre-2026-04] — Supabase Migration (From MySQL/TiDB + Manus Auth)

**Decision:** Migrate database from MySQL/TiDB to Supabase PostgreSQL. Migrate auth from custom Manus OAuth (JWT) to Supabase Auth.

**Why:** Manus OAuth was a custom implementation with JWT tokens. Supabase Auth provides SSR helpers, session management, cookie-based sessions — saves weeks of auth engineering. Supabase PostgreSQL's free tier is generous and supports native RLS for future tenant isolation.

**Alternatives considered:**
- Keep TiDB + custom auth — high ongoing maintenance burden
- Neon Postgres + Auth.js — less integrated, more configuration

**Outcome:** Migration complete. Auth is now fully Supabase. DB has 18 tables (was 10). drizzle-kit push is broken by old MySQL files (workaround: .mjs scripts). See LOOP-006.
