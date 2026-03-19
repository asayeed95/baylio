# Baylio — Feature & Bug Tracker

## Phase 1: Foundation
- [x] Design system (dark theme, color palette, fonts)
- [x] Database schema (all tables)
- [x] Run migrations
- [x] Core server helpers (db.ts)

## Phase 2: Auth & Landing
- [x] Landing page (public, sales-focused for door-to-door)
- [x] Auth flow (login/logout, role-based: admin vs shop_owner)
- [x] Protected routes

## Phase 3: Shop Management
- [x] Shop profile CRUD (name, phone, hours, location, service catalog)
- [x] Multi-location grouping (one account → multiple shops)
- [x] Shop settings page

## Phase 4: AI Agent Config
- [x] Agent config interface (voice persona, system prompt, upsell rules)
- [x] Shop-specific context editor (service catalog, hours, promos)
- [x] Confidence threshold settings

## Phase 5: Call Logs & Analytics
- [x] Call logs dashboard (filters: date, outcome, caller, duration)
- [x] Analytics dashboard (calls answered, appointments booked, revenue recovered, trends)
- [x] Charts (recharts)

## Phase 6: Missed Call Audit
- [x] 7-day audit tracking system
- [x] Intent classification (LLM)
- [x] Revenue estimation
- [x] PDF scorecard generation

## Phase 7: Subscription & Billing
- [x] Subscription tier management (Starter/Pro/Elite)
- [x] Usage tracking & overage calculation
- [x] Stripe integration (billing, setup fees, annual prepay, invoicing)

## Phase 8: API Integrations
- [x] ElevenLabs API (voice agent provisioning, call handling)
- [x] Twilio API (phone number provisioning, call routing)

## Phase 9: Notifications & Analysis
- [x] Post-call transcription analysis (intent, sentiment, QA flags) [schema + router ready]
- [x] Automated alerts (email/in-app: new calls, high-value leads, issues, weekly summaries) [in-app ready]
- [x] Owner notification system

## Phase 10: Polish & Launch
- [x] End-to-end testing (54 vitest specs passing)
- [ ] Mobile responsiveness
- [ ] Final checkpoint & deploy

## Bugs
- (none yet)

## Phase 11: Claude Prompt Engineering Integration
- [x] Claude-powered system prompt templates with shop-specific variables ({{SHOP_NAME}}, {{SERVICE_CATALOG}}, etc.)
- [x] Pre-built persona templates (friendly advisor, professional technician, sales-focused) [in prompt compiler]
- [x] Upsell rules engine mapped to Claude structured reasoning
- [ ] Agent Config page: prompt preview with variable interpolation
- [ ] Claude Workbench sync: export/import prompt templates

## Phase 12: Security Hardening (APPROVED)
- [x] Twilio webhook signature validation middleware (HMAC-SHA1)
- [x] Timing-safe comparison + forensic logging
- [x] Feature flag for validation (log-only → enforce)
- [x] Add ownerId columns to 5 child tables (agent_configs, call_logs, subscriptions, usage_records, missed_call_audits)
- [x] Add database indexes for tenant filtering
- [x] Tenant scope tRPC middleware (ctx.tenantId)
- [ ] Update all query helpers to require ownerId parameter
- [ ] Update all routers to use tenantProcedure
- [x] Security tests (signature validation + tenant isolation)

## Phase 13: Core Engine — 3-Layer Architecture (APPROVED)
- [x] Twilio webhook endpoints (/api/twilio/voice, /api/twilio/status, /api/twilio/recording)
- [x] ElevenLabs Register Call API bridge
- [x] Hot context cache (in-memory shop config for sub-second webhook response)
- [x] Prompt compilation layer (shop context → compiled system prompt)
- [x] TwiML voicemail fallback (if ElevenLabs fails)
- [x] Post-call async pipeline (webhook → queue → transcription → analysis → DB write)

## Phase 14: Market Research Features
- [x] 3-Stage Reasoning Architecture (symptom extraction → catalog mapping → natural offer)
- [x] ROI Calculator on landing page ($466 avg RO, 40% missed call rate)
- [ ] Forwarding Wizard (auto-provision Twilio capture number for 7-day audit)
- [x] Scorecard PDF generation (revenue ranges, visual dashboard)
- [ ] Peak call analysis (Monday/Tuesday 8-11:30 AM patterns)
- [x] SMS recap dispatch (post-call summary to shop manager)
- [x] Confidence threshold behavior (HIGH → offer, MEDIUM → clarify, LOW → book only)

## Phase 15: Documentation & Content
- [x] Push codebase to GitHub (private repo) — github.com/asayeed95/baylio
- [x] Update Notion workspace with all implementation progress
- [x] Generate YouTube long-form video script using Gemini API
- [x] Generate YouTube series structure and episode topics

## Phase 16: Twilio Live Integration
- [x] Store TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN as environment secrets
- [x] Install Twilio SDK (twilio 5.13.0)
- [x] Create twilioProvisioning.ts service (search, purchase, configure, release numbers)
- [x] Add Twilio provisioning tRPC procedures (searchNumbers, purchaseNumber, releaseNumber, getBalance)
- [x] Add phone number provisioning UI to ShopSettings page
- [x] Write vitest for Twilio credential validation
- [ ] Test live call routing end-to-end

## Phase 17: Git Organization & Code Quality for Claude Code Review
- [ ] Audit all server files for JSDoc comments
- [ ] Audit all client files for component-level comments
- [ ] Add README.md with architecture overview, file map, and setup instructions
- [ ] Add ARCHITECTURE.md with system design documentation
- [ ] Organize imports and remove dead code
- [ ] Push clean commit to GitHub with descriptive message

## Phase 18: Live Call Test Setup
- [ ] Configure Twilio webhook for (844) 875-2441 to point at Baylio server
- [ ] Add assignExistingNumber tRPC procedure (for manually assigning trial numbers)
- [ ] Create test shop with ElevenLabs agent ID wired
- [ ] Add ElevenLabs Agent ID field to Agent Config page
- [ ] Verify end-to-end call routing works

## Bug: Application Error on Call to (844) 875-2441
- [x] Diagnose and fix Twilio "application error" when calling the test number (root cause: no conversation_config_override, now wired)

## Phase 19: Claude Code Audit Fixes (P0/P1)
- [x] P0: Add fetch timeout to ElevenLabs Register Call API (twilioWebhooks.ts)
- [x] P0: Fix stale estimatedRevenue check - use analysis result not DB value (postCallPipeline.ts:252)
- [x] P0: Make usedMinutes increment atomic SQL to prevent race condition (postCallPipeline.ts:227-247)
- [x] P0: Wire processCompletedCall() from /status webhook in twilioWebhooks.ts
- [x] P1: Fix wrong timestamps on call logs (twilioWebhooks.ts:327-328)
- [ ] P1: Eliminate triple DB query on cold cache (twilioWebhooks.ts:150-225) — deferred, low impact
- [x] P1: Sanitize customSystemPrompt to prevent prompt injection (promptCompiler.ts:228)
- [x] Scrub sensitive data (Twilio SID, ElevenLabs agent ID, phone number) from README.md

## Phase 20: Merge baylio-prompts + Sales AI Agent
- [x] Copy 12 persona templates from baylio-prompts into server/services/prompts/
- [x] Create Baylio Sales AI agent prompt (13th persona)
- [x] Wire conversation_config_override into ElevenLabs Register Call API
- [ ] Update promptCompiler.ts to use real persona templates from baylio-prompts
- [ ] Archive baylio-prompts repo after merge

## Phase 21: Documentation & YouTube Content
- [ ] Create ARCHITECTURE.md with full system design, call flow diagrams, and override explanation
- [ ] Create YouTube long-form script: "I Built an AI Sales Agent That Sells Itself"
- [ ] Document conversation_config_override integration pattern
- [ ] Pull Contact/FAQ pages from GitHub PR into Manus codebase

## Bug: Calls disconnect within seconds on (844) 875-2441
- [ ] Diagnose and fix call disconnection — calls drop within seconds of connecting

## Bug: Live call quality issues (found during first live test)
- [x] Fix echo/feedback loop — AI hears its own voice and responds to itself (VAD sensitivity) — set turn_eagerness to "patient" via ElevenLabs API
- [x] Fix name mispronunciation — "Baylio" pronounced as "Balio", "Abdur" pronounced as "Abdor" — added phonetic guides to prompt

## Feature: Per-shop voice override
- [x] Add voiceId and voiceLanguage fields to agentConfigs schema (already existed: voiceId + voiceName)
- [x] Update twilioWebhooks to pass tts.voice_id in conversation_config_override
- [x] Create tRPC endpoint to list available ElevenLabs voices (voiceRouter with list, getShopVoice, setShopVoice)
- [x] Build voice picker UI in shop settings (AgentConfig.tsx with VoicePicker component)
- [x] Write vitest tests for voice override logic (all 80 tests passing)

## Feature: Human-like Sales Agent + Full Product Knowledge
- [x] Add complete Baylio product knowledge to sales prompt (pricing, features, onboarding flow, FAQ)
- [x] Add shop owner onboarding guidance (what happens after signup, setup steps, timeline)
- [x] Add human speech patterns — filler words (umm, okie, yeah), natural pauses, conversational tone
- [x] Add expressive voice instructions to prompt (enthusiasm, empathy, warmth)
- [x] Configure ElevenLabs voice stability/similarity settings for more expressive output (stability: 0.35, similarity: 0.7)
- [ ] Test call to verify natural-sounding conversation

## Bug/Feature: Response latency, call disconnect, sales script
- [x] Reduce 2-second response latency — speculative_turn=true, turn_eagerness=normal, TTS stability=0.45, speed=1.05, latency_opt=4, temperature=0.7
- [x] Add call disconnect capability — enabled end_call built-in tool via ElevenLabs API
- [x] Restructure prompt with proven sales script framework (SPIN selling) — 4-phase conversation flow: Situation→Problem→Implication→Need-Payoff
- [x] AI should be able to answer ALL questions about Baylio comprehensively — full product knowledge, pricing, objection handling, onboarding flow in prompt

## Phase 22: Autonomous Sales Pipeline — Zero Human Touch
- [x] Update sales prompt to close deals on phone (not book demos with Abdur)
- [x] Prompt collects: shop name, owner name, email, phone when prospect says yes
- [x] POST /api/onboard endpoint — creates Stripe Checkout Session, sends link via Twilio SMS
- [x] Stripe webhook handler for checkout.session.completed — auto-provisions everything
- [x] Auto-provision: create user account, shop, agentConfig in database
- [x] Auto-provision: assign Twilio phone number to new shop
- [x] Welcome SMS sequence after successful payment (login info, next steps)
- [x] Vitest tests for onboard endpoint and Stripe webhook provisioning

## Phase 23: Multi-Niche Replication Framework
- [x] Extract all niche-specific content into config files (branding, copy, pricing, prompts)
- [x] Create shared/nicheConfig.ts with typed niche configuration interface
- [x] Move landing page copy, colors, pricing tiers into niche config
- [x] Move AI sales prompt industry knowledge into niche config
- [x] Move objection handling scripts into niche config
- [x] Create NICHE_REPLICATION_GUIDE.md — step-by-step guide to clone for new niche
- [x] Document: branding changes (logo, colors, copy, domain)
- [x] Document: AI script changes (system prompt, objection handling, industry knowledge)
- [x] Document: database seed data changes
- [x] Document: Stripe product/pricing setup
- [x] Document: Twilio number provisioning
- [x] Document: ElevenLabs agent config
- [x] Document: landing page content swap
- [x] Document: environment variables needed
- [x] Goal: someone can replicate Baylio for dentists in under 2 hours

## Phase 24: Manus Skill — Baylio Development Workflow
- [x] Read skill-creator SKILL.md for proper skill creation process
- [x] Create baylio-ai-factory skill with SKILL.md
- [x] Include: architecture patterns, call flow, ElevenLabs integration, Twilio provisioning
- [x] Include: autonomous sales pipeline pattern (SPIN → collect info → Stripe SMS → auto-provision)
- [x] Include: niche replication workflow (config swap, not code rewrite)
- [x] Include: prompt engineering patterns for voice AI sales agents
