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

## Phase 31: Affiliate Portal MVP
- [x] Pull Claude Code's security fixes (timing-safe bug, validateEnv, type safety)
- [x] Design affiliate database schema (affiliates, referrals, commissions tables)
- [x] Run database migrations for affiliate tables
- [x] Build affiliate tRPC procedures (signup, get stats, get referral link, list referrals)
- [ ] Build referral tracking middleware (capture ref code from URL, tag on shop signup)
- [ ] Build commission calculation logic (20% recurring monthly)
- [x] Build affiliate signup/dashboard page (public signup + authenticated dashboard)
- [x] Build affiliate stats display (clicks, signups, active shops, earnings)
- [x] Build admin affiliate management view (list affiliates, approve payouts, view performance)
- [x] Write vitest tests for affiliate features (19 tests passing)
- [x] Save checkpoint

## Phase 32: Landing Page Improvements
- [x] CHANGE 1: Add Human Handoff Trust Section (between Features and Pricing)
- [x] CHANGE 2: Add After-Hours / Bilingual Section (after trust section)
- [x] CHANGE 3: Add pricing microcopy (subtitles for each tier + setup line)
- [x] CHANGE 4: Add stat block source citation below the 4 stats
- [x] AI FEATURE: Automatic language detection (Spanish/English instant switch)
- [x] AI FEATURE: Spanglish/code-switching support (mirror caller's language ratio)
- [x] AI FEATURE: Accent and speaking style mirroring (casual/formal/slang matching)
- [x] AI FEATURE: Never-ask-to-switch rule (just do it, don't ask)
- [x] Update promptCompiler.ts with full language matching rules section
- [x] Update bilingualAgent.ts with enhanced Spanglish + colloquial auto terms
- [x] Update baylioSalesAgent.ts with language matching + bilingual pitch
- [x] Update ElevenLabs conversation config for multilingual support (language: 'multi')
- [x] Write 13 new tests for language matching (366 total passing)

## Phase 33: HubSpot CRM Integration
- [x] Build HubSpot service layer (hubspotService.ts) with contact/deal/note creation
- [x] Wire HubSpot contact creation into shop signup flow (shopRouter.ts create procedure)
- [x] Wire HubSpot deal creation into shop signup (lifecycle: customer, stage: appointmentscheduled)
- [ ] Wire HubSpot contact creation into lead capture form (when built) — lifecycle: baylio_audit_lead
- [ ] Wire HubSpot notes into call logs (post-call summaries attached to contacts)
- [ ] Build lead capture form component (Dialog modal: name, phone, shop name, email)
- [ ] Test HubSpot sync end-to-end (shop signup → contact + deal appears in HubSpot)

## Phase 34: Domain Configuration & DNS
- [ ] Fix baylio.io domain loading (remove Namecheap URL forwarding)
- [ ] Add CNAME records for baylio.io to point to Manus deployment
- [ ] Update Twilio webhooks to use baylio.io instead of sandbox URL
- [ ] Verify domain loads correctly and SSL certificate works
- [ ] Save checkpoint after domain is live

## Priority Backlog
- [ ] Build lead capture form (shadcn Dialog modal)
- [ ] Build shop service menu feature (pricing/promotions in AI prompt)
- [ ] Test live bilingual call end-to-end
- [ ] Mobile responsiveness audit
- [ ] Final checkpoint & deploy

## Phase 35: HubSpot Email Marketing Integration
- [x] Add email consent checkbox to shop creation form (Dashboard.tsx)
- [x] Add emailMarketingConsent field to shopInput schema (shopRouter.ts)
- [x] Update hubspotService.ts with enrollContactInEmailSubscriptions function
- [x] Update hubspotService.ts with unsubscribeContactFromEmails function
- [x] Wire email consent into createOrUpdateContact (auto-enrolls on signup)
- [ ] Add communication_preferences.read_write scope to HubSpot Private App token
- [ ] Create "Product Updates" and "Promotional" subscription types in HubSpot
- [ ] Test email subscription enrollment end-to-end
- [ ] Set up SPF/DKIM/DMARC records for hello@baylio.io (primary inbox delivery)

## Phase 34: Domain Fixed
- [x] Diagnose baylio.io DNS issue (URL301 redirect record blocking A records)
- [x] Guide user to delete URL301 record in Namecheap
- [x] Verify baylio.io resolves correctly (HTTP 200, SSL working)
- [x] Update Twilio webhooks to https://baylio.io (permanent domain)

## Phase 36: Mobile Navigation
- [x] Add hamburger menu button to Landing.tsx navbar (visible on mobile only)
- [x] Build slide-out/dropdown mobile menu with all nav links (Features, Pricing, How It Works, FAQ, Contact)
- [x] Close menu on link click and outside click
- [x] Ensure Sign In and Get Started buttons are accessible on mobile

## Phase 37: Caller Memory System (Sales AI)
- [ ] Create caller_profiles table (phone, name, role, shop_name, notes, call_count, last_called_at)
- [ ] Create caller_memory_facts table (caller_id, fact_type, fact_value, extracted_at)
- [ ] Add getCallerProfile and upsertCallerProfile helpers to db.ts
- [ ] Wire caller lookup into sales AI webhook (inject memory into system prompt before call)
- [ ] Build post-call memory extraction pipeline (LLM extracts name/role/shop from transcript)
- [ ] Add special handling for founder/tester role (Abdur = founder, skip sales pitch)
- [ ] Add Caller Memory admin page in dashboard to view/edit caller profiles

## Phase 38: Notion Documentation Workspace
- [ ] Create Baylio master Notion page with sub-pages
- [ ] Technical Build Log page (architecture decisions, stack, how features were built)
- [ ] Content Creation Pipeline page (YouTube long-form, short-form ideas, hooks)
- [ ] Short-Form Content Ideas database (TikTok/Reels/Shorts with status tracking)
- [ ] Migration Reference page (how to migrate Baylio to another stack/AI)
- [ ] Caller Memory System documentation page

## Phase 39: Affiliate Partner Portal (partners.baylio.io)
- [ ] Design 3-tier affiliate structure: Partner → Senior Partner → Elite Partner
- [ ] Add affiliate_tiers, affiliates, affiliate_referrals, affiliate_commissions, affiliate_payouts tables to schema
- [ ] Build affiliate registration flow (separate from main app signup)
- [ ] Build affiliate dashboard: earnings, referral link, downline tree, payout history
- [ ] Build multi-level commission tracking (Tier 1: 20%, Tier 2: 5%, Tier 3: 2%)
- [ ] Wire referral tracking to shop signups (UTM + referral code)
- [ ] Add /partners route with its own branded layout (separate from main nav)
- [ ] Add DNS CNAME record for partners.baylio.io → baylio.io
- [ ] Admin view: all affiliates, commissions owed, payout management

## Phase 40: AI Persona Names — Alex (Sales) & Sam (Support)
- [ ] Rename sales AI from unnamed to "Alex" in baylioSalesAgent.ts prompt
- [ ] Update Alex's first message and all self-references to use "Alex"
- [ ] Add Alex's Spanish bilingual rules (already partially there, make explicit)
- [ ] Create samSupportAgent.ts — bilingual IT/support persona for existing shop owners
- [ ] Sam handles: setup help, call forwarding, dashboard questions, billing, troubleshooting
- [ ] Sam speaks English and Spanish seamlessly (auto-detect, no announcement)
- [ ] Wire Sam to a support phone line or dashboard chat widget

## Phase 41: Alex→Sam Warm Handoff & Shared Caller Memory
- [ ] Add transfer_to_sam ElevenLabs client tool to Alex's agent config
- [ ] Update Alex prompt with handoff trigger rules (when to transfer to Sam)
- [ ] Build /api/twilio/transfer-to-sam endpoint that re-registers call with Sam's prompt
- [ ] Sam receives full caller context from shared caller_profiles table on transfer
- [ ] Sam's opening on transfer: "Hey [name], Alex just filled me in — you need help with [topic], right?"
- [ ] Both Alex and Sam write to same caller_profiles and caller_memory_facts tables
- [ ] Memory includes: phone number, name, shop name, past issues, past interests, call count
- [ ] Sam remembers specific shop config details (plan tier, setup status, known issues)

## Phase 42: Cold Lead Intelligence & Personalized Outreach
- [ ] Remove duplicate affiliate tables appended to schema.ts (lines 349+)
- [ ] Add prospects table: shop_name, owner_name, phone, address, city, state, zip, status, source
- [ ] Add prospect_notes table: prospect_id, note, created_by (human or AI), created_at
- [ ] Wire prospect lookup into Alex's caller memory: when a known prospect calls, inject their shop/owner data
- [ ] Alex greets known prospects by name: "Hey Zabir! This is Alex from Baylio — calling about Autoblitz..."
- [ ] Add prospect import UI in admin dashboard (CSV upload + manual add)
- [ ] Add Zabir / Autoblitz as first test prospect in DB
- [ ] Track outreach status per prospect: not_contacted, called, voicemail, interested, signed_up, not_interested

## Phase 43: AgencyFlow→Baylio Lead Intelligence Integration

- [ ] Design AgencyFlow→Baylio API integration (REST endpoint with API key auth for cold lead ingestion)
- [ ] Build POST /api/agencyflow/leads endpoint (batch upsert cold leads from AgencyFlow)
- [ ] Build GET /api/agencyflow/leads endpoint (AgencyFlow can read back status/conversion data)
- [ ] Apply pending DB migration (affiliate_payouts, prospects, prospect_notes tables)
- [ ] Build admin Leads Portal page (/admin/leads) with Cold Leads and Warm Leads tabs
- [ ] Cold leads tab: show prospects from AgencyFlow with outreach status, owner name, shop, phone, address
- [ ] Warm leads tab: show contacts who visited site and signed up for marketing emails
- [ ] HubSpot sync status column in both tabs (synced / not synced)
- [ ] Bulk actions: mark as contacted, update status, sync to HubSpot
- [ ] CSV export for both lead types
- [ ] Sync all leads to HubSpot with correct lifecycle stage (cold=lead, warm=marketingqualifiedlead)
- [ ] Document AgencyFlow MCP integration spec for future AgencyFlow developers
