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
- [ ] TwiML voicemail fallback (if ElevenLabs fails)
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
- [ ] Configure Twilio webhook for (XXX) XXX-XXXX to point at Baylio server
- [ ] Add assignExistingNumber tRPC procedure (for manually assigning trial numbers)
- [ ] Create test shop with ElevenLabs agent ID wired
- [ ] Add ElevenLabs Agent ID field to Agent Config page
- [ ] Verify end-to-end call routing works

## Bug: Application Error on Call to (XXX) XXX-XXXX
- [ ] Diagnose and fix Twilio "application error" when calling the test number

## Phase 19: Voice Agent Fix + Mobile Nav + Developer Documentation
- [x] Fix AI voice agent — update ElevenLabs agent with Sam identity, shop context, natural greeting, 2s response pause
- [x] Add Partners link to mobile hamburger menu on baylio.io landing page
- [x] Write DEVELOPER.md — architecture, tech stack, project structure, setup guide
- [x] Write DATA_MODEL.md — full database schema with relationships and field explanations
- [x] Write API_REFERENCE.md — every tRPC router and procedure with inputs, outputs, auth
- [x] Write VOICE_AGENT.md — ElevenLabs + Twilio integration, prompt compiler, call flow
- [x] Write PORTALS.md — multi-portal architecture, subdomain routing, each portal's pages

## Bug: Voice Agent Disconnects After Greeting
- [ ] Fix voice agent hanging up immediately after saying "Thanks for calling" — diagnose Twilio TwiML, ElevenLabs WebSocket bridge, and agent turn settings
- [x] Design automated voice agent testing strategy using OpenClaw/Claude Code for 24/7 QA
- [ ] Build Cost Analytics admin dashboard (Claude Code task) — real-time COGS per shop, Twilio + ElevenLabs usage, margin tracking
- [x] Write SUPABASE_MIGRATION.md — complete one-day migration runbook from TiDB/MySQL to Supabase/PostgreSQL

## Phase 20: Landing Page Rewrite + Blog System
- [x] Blog data layer (blogData.ts with posts array, types, SEO metadata)
- [x] Blog listing page (Blog.tsx)
- [x] Blog post page (BlogPost.tsx)
- [x] Blog card component (BlogCard.tsx — integrated into Blog.tsx)
- [x] Blog routes in App.tsx (/blog, /blog/:slug)
- [x] Nav/footer Blog link (in Blog.tsx and BlogPost.tsx headers)
- [x] SEO meta tags in index.html (OG, Twitter, description, keywords)
- [ ] Landing page rewrite for clarity, trust, conversion (Claude Code)
