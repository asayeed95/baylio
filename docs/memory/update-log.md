# Baylio — Update Log

Chronological record of significant milestones, fixes, and deploys.
Append newest entries at the top. Format: `[DATE] — Title` then bullets.

---

## [2026-04-10] — P1 Cleanup: Auth Audit + appointmentDateTime + Type Fixes

- Commit: `de6e5e8`
- Authorization audit across all 60+ tRPC procedures — confirmed secure. Only flag was `notificationRouter.markRead`, confirmed protected at DB layer via `AND notifications.userId = userId`.
- `setImmediate` error boundaries verified — all 4 callbacks already had `try/catch`.
- `analyzeTranscription` now returns `appointmentDateTime: string | null` extracted by LLM. Removes hardcoded "tomorrow" (24h) fallback for Google Calendar appointments.
- Removed `(shop?.serviceCatalog as any)` cast — Drizzle schema already types it via `$type<>`.
- 19/19 tests, 188 passing, 2 skipped (live-API).

---

## [2026-04-09] — AI Agent Config: Voice Picker, Personality System, Language Guides

- Commit: `2267644`
- Voice Picker: 16-voice curated grid (American/British/Australian/Spanish-Latam) with live TTS preview. `shared/voiceCatalog.ts` — isomorphic, safe for server + client bundle.
- Personality System: 4 presets (Warm Helper, Efficient Closer, Tech Expert, Sales Pro) + 3 sliders (Warmth, Sales Intensity, Technical Depth, 1–5). Compiled into system prompt via `compilePersonalitySection()`.
- Language Guides: 8 languages (EN, ES, AR, PT, HI, BN, IT, TR) with genuinely colloquial per-language instructions. Spanish uses "Órale" not textbook Spanish. Bangla uses native script examples.
- Auto Repair Knowledge: baked into ALL agents — symptom→service map, maintenance intervals, never-diagnose-out-loud rules.
- DB: 4 new columns on `agent_configs` (characterPreset, warmth, salesIntensity, technicalDepth). Migration: `scripts/add-personality-columns.mjs`.
- `previewVoice` tRPC mutation: ElevenLabs TTS → base64 mp3 data URL. `output_format` as query param (not body field — important bug fix during development).
- 19 test files, 188 passing.

---

## [2026-04-09] — Ring-Shop-First Bug Fixes (AI Voice Confirmed Working)

- Commit: `fce910d`
- Root cause 1: `gemini-2.5-flash` silently fails on ElevenLabs starter plan. Switched Zee + Sam to `gpt-4o-mini`.
- Root cause 2: `conversation_initiation_client_data` with undeclared dynamic variables broke WebSocket sessions (audio connected, conversation never started). Removed entirely.
- Root cause 3: `/no-answer` handler was reading `To` field (can be shop's phone) instead of Baylio number. Fixed via `?baylio=` query param embedded in action URL.
- ShopDetail crash on null `startTime` fixed (`new Date(null)` was throwing RangeError).
- **AI voice confirmed working end-to-end.** Zee speaks. GPT-4o-mini confirmed.

---

## [2026-04-09] — ulaw_8000 Audio Format Fix

- Commit: `cbc5279`
- Root cause: ElevenLabs defaults to `pcm_16000` (browser/WebRTC), Twilio PSTN needs `ulaw_8000` (G.711 µ-law 8kHz).
- Symptom: caller hears ring, AI connects, AI is completely silent.
- Fixed: `agent_output_audio_format` and `user_input_audio_format` set to `ulaw_8000` in `createConversationalAgent` and `updateConversationalAgent`.
- Both existing agents patched via ElevenLabs API PATCH.
- Twilio number purchase error (21422) now surfaces proper user-readable error.

---

## [2026-04-07] — Ring-Shop-First Call Routing (Layer 1)

- Commit: `89e5fbf`
- Schema: `shops.ringShopFirstEnabled` (bool, default true), `shops.ringTimeoutSec` (int, default 12).
- `/api/twilio/voice` branches on `ringShopFirstEnabled`: returns `<Dial timeout=N>shop.phone</Dial>` when enabled.
- New `/api/twilio/no-answer` handler: checks `DialCallStatus`, routes to AI if not answered.
- Sales line bypass (844-875-2441 → Sam) preserved.
- ShopSettings "Call Routing" card: toggle + slider (5–30s range).
- 9 new tests in `twilioRingFirst.test.ts`.

---

## [2026-04-06] — Twilio Signature Validation Fix

- Commit: `8d3c54d`
- Root cause: Vercel injects `?path=twilio%2Fvoice` query param; Twilio signs against clean URL → 403 on every call.
- Fix: strip `?path=` param before HMAC check in `twilioValidation.ts`.
- DEPLOY_LOG.md created for cross-machine session continuity.

---

## [Pre-2026-04-06] — Supabase PostgreSQL Migration

- Migrated from MySQL/TiDB to Supabase PostgreSQL.
- Migrated from custom Manus OAuth (JWT) to Supabase Auth (cookie-based sessions via `@supabase/ssr`).
- Schema rewritten from `mysqlTable` → `pgTable`. Now 18 tables (was 10).
- drizzle-kit push broken by stale MySQL migration files — workaround: one-off `.mjs` scripts.
- Auth: Supabase Auth session in cookie, `ctx.user` in every tRPC procedure.
