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

## Phase 25: Claude Code Skill — Autonomous Niche Replication
- [x] Create CLAUDE.md — instructions for Claude Code and Claude Desktop
- [x] Create niche-config.json — template for niche input data
- [x] Create REPLICATION_PROMPT.md — mega-prompt for Claude Code (full architecture + workflow)
- [x] Create setup-niche.sh — shell script to configure Stripe, Twilio, ElevenLabs
- [ ] Test Claude Code with interactive mode (ask Claude to replicate for dental)
- [ ] Test Claude Code with auto-generate mode (provide niche JSON, verify output)
- [ ] Document example niche configs (dental, real estate, restaurant)

## Phase 26: Claude Code QA Mega-Script + GitHub Merge
- [x] Create CLAUDE_QA_SCRIPT.md — exhaustive 12-phase QA mega-prompt for Claude Code
- [x] Merge Claude Code's Contact/FAQ changes into Manus codebase (Contact.tsx, FAQ.tsx, contactRouter.ts, contact.test.ts, schema, db, routes, Landing nav)
- [x] Run contactSubmissions migration
- [x] All 111 tests passing after merge

## Phase 13: Trust & Reliability (PRIORITY — Expert Feedback)
### Feature 1: Fallback Ladder — State Machine for Call Handling
- [x] Build call state machine with 5 states: normal_flow, structured_questions, collect_message_callback, route_to_human_emergency, send_sms_intake_link
- [x] Separate business logic from AI conversation (rules engine, not prompts)
- [x] Use hard rules (not AI) for: business hours routing, escalation triggers, state transitions
- [x] State machine service: server/services/callStateMachine.ts

### Feature 2: Appointment Verification — Requested, NOT Confirmed
- [x] AI NEVER says "confirmed" — only "requested" / "submitted"
- [x] Standard wording: "I have submitted your appointment request for [date] at [time]. You will receive a confirmation text shortly."
- [x] Send SMS to shop owner/manager with appointment details for manual verification
- [x] Shop confirms via SMS reply → customer gets confirmation text

### Feature 3: Knowledge Lock — Structured Data Fields
- [x] Add structured fields to agentConfig: servicesOffered, makesModelsAccepted, businessHours, towingPolicy, diagnosticFees, warrantyWording, financingPolicy, languagesSupported
- [x] Schema migration for new agentConfig fields (in knowledgeLock.ts — config stored as JSON in agentConfig)
- [x] Hard rules the AI CANNOT override or hallucinate — injected as system-level constraints
- [ ] UI for editing Knowledge Lock fields in Agent Config page (deferred to UI polish phase)

### Feature 4: Human Handoff — Live Transfer + Priority Tagging
- [x] Transfer to live person when AI cannot handle the call
- [x] Callback priority levels: urgent, normal, low
- [x] Alert staff by SMS for high-priority calls (urgent = immediate SMS)
- [x] Make handoff a product feature, not an apology ("Let me connect you with a specialist")
- [x] Add handoff phone number field to shop config (transferTo in HandoffRequest)

### Feature 5: Reputation Protection — De-escalation Protocol
- [x] Detect angry/frustrated callers (keyword pattern rules engine — hostile/angry/frustrated levels)
- [x] Protocol: acknowledge frustration, capture context, escalate fast (4-step: Acknowledge → Capture → Validate → Escalate)
- [x] AI NEVER argues, NEVER improvises compensation or policy promises (forbidden phrases list in prompt)
- [x] Auto-escalate to human handoff with full context summary
- [x] Log reputation-risk calls with special flag for owner review (incident report + owner notification)

### Feature 6: Pilot Pricing Tier — $149/mo Entry Point
- [x] Add Pilot tier: $149/month, 150 minutes, 1 location, 1 phone line, after-hours only
- [x] 30-day no-commitment trial (cancel anytime)
- [x] Update Stripe products.ts with Pilot tier
- [ ] Update landing page pricing section with Pilot tier (deferred to UI phase)
- [x] Update sales prompt to offer Pilot as low-friction entry point
- [x] Update onboard service to support Pilot tier checkout

### Tests
- [x] Vitest: Fallback Ladder state transitions (all 5 states + edge cases)
- [x] Vitest: Appointment verification wording + SMS dispatch
- [x] Vitest: Knowledge Lock field validation + prompt injection prevention
- [x] Vitest: Human handoff priority tagging + SMS alerts
- [x] Vitest: Reputation protection trigger detection + escalation
- [x] Vitest: Pilot tier pricing + Stripe checkout

### Prompt Compiler v2 Integration
- [x] Rewrite promptCompiler.ts to inject Knowledge Lock, Appointment Verification, Handoff, and Reputation Protection into shop agent prompt
- [x] All 199 tests passing after integration
- [x] TypeScript clean (zero errors)

## Phase 27: Website Credibility & Polish
- [x] Change 1: Replace fake testimonials with credibility section ("Built for Shop Owners, by Operators Who Get It" — 3 cards: Enterprise-Grade Voice, 2-Second Answer, First 50 Shops + green CTA)
- [x] Change 2: Expand FAQ from 6 to 14 questions (add: answer speed, robot sound, Spanish, booking, receptionist, after-hours, downtime, data security)
- [x] Change 3: Dark hero section (bg #1A1A2E, white headline, green accent #10B981, light gray subheadline #D1D5DB)

## Phase 28: Landing Page Copy Overhaul
- [x] Change 1: Hero rewrite — "$28,000+" headline, new subheadline with full value prop
- [x] Change 2: CTA buttons — "Get My Free Missed Call Audit" + "Hear a Live Demo Call" + bottom CTA rewrite
- [x] Change 3: Feature cards — 6 cards rewritten with revenue-focused copy

## Phase 29: GitHub QA Merge + TypeScript Cleanup
- [x] Add baylio.io to Vite allowedHosts (from Claude Code fix)
- [x] Fix all TypeScript errors from QA merge (unused imports, type casts)
- [x] Copy new test files from GitHub QA audit
- [x] Add Pilot tier ($149/mo) to landing page pricing cards
- [ ] Build lead capture form for "Get My Free Missed Call Audit" CTA

## Phase 30: CRITICAL — baylio.io Domain Not Loading
- [x] Diagnose DNS resolution for baylio.io (Namecheap URL forwarding causing redirect loop)
- [ ] Verify Manus deployment is published and accessible
- [ ] Fix domain configuration or guide user through Manus Settings > Domains
- [ ] Confirm baylio.io loads correctly
