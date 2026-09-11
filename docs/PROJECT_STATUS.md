# Baylio — Project Status Report

**Date:** March 24, 2026  
**Prepared for:** Abdur (CEO, AgencyFlow)  
**Live URL:** [baylio.io](https://baylio.io)  
**Domains:** baylio.io, www.baylio.io, partners.baylio.io, admin.baylio.io

---

## Project Scale

| Metric | Count |
|---|---|
| Total lines of code | 27,143 |
| Server-side files (.ts) | 64 |
| Client pages (.tsx) | 25 |
| Backend services | 16 |
| tRPC routers | 11 |
| Database tables | 17 |
| Test files | 14 |
| Test specs | 147 |
| Documentation files | 13 |

---

## What Has Been Built (Completed)

### Phase 1–2: Foundation and Auth
The full design system is in place with a dark theme, color palette, and typography. The database schema spans 17 tables covering users, shops, agents, calls, subscriptions, partners, integrations, and more. Manus OAuth is wired for login/logout with role-based access (admin vs shop_owner). The landing page at baylio.io is a public, sales-focused page designed for door-to-door sales reps to show shop owners.

### Phase 3: Shop Management
Full CRUD for shops including name, phone, address, hours, location, and service catalog. Multi-location grouping allows one account to manage multiple shops. A dedicated Shop Settings page lets owners configure every detail.

### Phase 4: AI Agent Configuration
Each shop gets its own AI agent config — voice persona, system prompt, upsell rules, confidence thresholds, and language. The prompt compiler takes shop context (hours, services, promos, location) and compiles it into a full ElevenLabs agent system prompt with dynamic variables.

### Phase 5: Call Logs and Analytics
The Call Logs page shows a filterable table (date range, status, search) with call detail dialogs that display transcription, sentiment, intent, and service recommendations. The Analytics page has 8 metric cards: total calls, appointments booked, revenue recovered, missed calls, average duration, sentiment trends, upsell attempts, and upsell acceptance rate — all powered by Recharts.

### Phase 6: Missed Call Audit
A 7-day audit tracking system that classifies missed call intent using LLM analysis, estimates lost revenue, and generates a PDF scorecard. This is the core sales tool — show a shop owner how much money they are losing from missed calls.

### Phase 7: Subscription and Billing
Three subscription tiers (Starter/Pro/Elite) with usage tracking and overage calculation. Full Stripe integration for billing, setup fees, annual prepay, and invoicing. Products and prices are defined in a centralized products.ts file.

### Phase 8: API Integrations
ElevenLabs API integration for creating and updating conversational AI agents per shop. Twilio API integration for phone number search, purchase, configuration, release, and balance checking. The Twilio SDK (v5.13.0) is installed and the provisioning service is fully built.

### Phase 9: Post-Call Pipeline and Notifications
The post-call async pipeline processes every completed call through: transcription analysis (intent extraction, sentiment scoring, QA flags) via LLM, usage metering for billing, notification dispatch for high-value leads, and missed call audit updates. Post-call integrations include Google Calendar (appointment creation), Google Sheets (call data sync), HubSpot (caller contact sync), Shopmonkey (work order creation), and SMS follow-up to callers.

### Phase 10: Testing
14 test files with 147 test specs covering auth, agents, analytics, caller profiles, contacts, ElevenLabs, integrations, partners, security, SMTP, signup flow, Twilio, and webhook validation.

### Phase 11: Prompt Engineering
Claude-powered system prompt templates with shop-specific variable interpolation. Three pre-built persona templates (friendly advisor, professional technician, sales-focused). Upsell rules engine mapped to confidence thresholds (HIGH = offer, MEDIUM = clarify, LOW = book only).

### Phase 12: Security Hardening
Twilio webhook signature validation middleware (HMAC-SHA1) with timing-safe comparison and forensic logging. Feature flag for validation mode (log-only vs enforce). Owner ID columns added to 5 child tables for tenant isolation. Database indexes for tenant filtering. Tenant scope tRPC middleware.

### Phase 13: Core 3-Layer Call Architecture
Layer 1 (Live): Twilio webhook endpoints for voice, status, and recording. ElevenLabs Register Call API bridge. Hot context cache for sub-second webhook response. Prompt compilation layer.
Layer 2 (Post-Call): Async pipeline for transcription analysis, usage metering, notifications, and integrations.
Layer 3 (Background): Missed call audit processing.

### Phase 14: Market Research Features
3-Stage Reasoning Architecture for service recommendations. ROI Calculator on the landing page. Scorecard PDF generation. SMS recap dispatch. Confidence threshold behavior system.

### Phase 15: Documentation and Content
Codebase pushed to GitHub (github.com/asayeed95/baylio). 13 documentation files including DEVELOPER.md, DATA_MODEL.md, API_REFERENCE.md, VOICE_AGENT.md, PORTALS.md, ARCHITECTURE.md, and SUPABASE_MIGRATION.md. YouTube video script and series structure generated.

### Phase 16: Twilio Live Integration
Twilio credentials stored as environment secrets. Full provisioning service built. tRPC procedures for search, purchase, configure, and release numbers. Phone number provisioning UI in Shop Settings.

### Phase 18: Partners Portal
Full partner portal at partners.baylio.io with landing page, referral tracking, earnings dashboard, network view, resources, and settings. Partner database tables (partners, referrals, partner_payouts).

### Phase 19: Voice Agent and Developer Docs
ElevenLabs agent updated with Sam identity, shop context, natural greeting, and 2-second response pause. Mobile hamburger menu fixed. Five comprehensive developer documentation files written.

### Phase 20 (In Progress): Onboarding Wizard
Multi-step onboarding wizard UI built with 4 steps: Shop Details, Phone Setup, AI Agent Config, and Go Live. Backend `completeOnboarding` endpoint created that handles the full setup in one atomic call — creates shop, saves agent config, provisions ElevenLabs agent, and provisions phone number. Supports both call forwarding (shop keeps existing number) and new number provisioning. Auto-redirect for first-time users with no shops.

---

## What Is NOT Working (Known Issues)

| Issue | Status | Impact |
|---|---|---|
| Alex sales number (844-875-2441) not working when called | Unresolved | Cannot demo to shop owners in person |
| Voice agent disconnects after greeting | Unresolved | Calls drop immediately after "Thanks for calling" |
| Application error on baylio.io after publish | Unresolved | Production site may show errors |
| Contact form email notification not sending | Not built | Contact form submissions not reaching hello@baylio.io |
| Contact.tsx and FAQ.tsx dark theme mismatch | Not fixed | Visual inconsistency on those pages |

---

## What Is NOT Built Yet

| Feature | Priority |
|---|---|
| Proper per-account dashboard (at-a-glance stats, recent calls, agent status) | HIGH — next up |
| Onboarding wizard testing and polish | HIGH |
| End-to-end live call test | HIGH |
| TwiML voicemail fallback | MEDIUM |
| Mobile responsiveness audit | MEDIUM |
| Cost analytics admin dashboard | MEDIUM |
| Claude Workbench prompt sync | LOW |
| Full tenant isolation (all queries require ownerId) | MEDIUM |
| README with architecture overview | LOW |

---

## Architecture Summary

The system is a React 19 + Tailwind 4 + Express 4 + tRPC 11 stack with Manus OAuth. The database is TiDB/MySQL with Drizzle ORM. The call flow is: Customer calls shop number → Twilio receives call → Twilio webhook hits Baylio server → Server looks up shop's ElevenLabs agent ID → Connects call to that agent via WebSocket → Agent handles the conversation → Post-call pipeline analyzes transcription and updates all systems.

Each shop gets its own dedicated ElevenLabs conversational agent with a custom system prompt compiled from their specific shop data (name, hours, services, location, upsell rules). Alex is a separate agent that only answers the Baylio sales number (844-875-2441) — he is NOT the same as shop agents.
