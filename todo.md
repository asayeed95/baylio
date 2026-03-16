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
- [ ] Intent classification (LLM)
- [ ] Revenue estimation
- [ ] PDF scorecard generation

## Phase 7: Subscription & Billing
- [x] Subscription tier management (Starter/Pro/Elite)
- [x] Usage tracking & overage calculation
- [ ] Stripe integration (billing, setup fees, annual prepay, invoicing)

## Phase 8: API Integrations
- [ ] ElevenLabs API (voice agent provisioning, call handling)
- [ ] Twilio API (phone number provisioning, call routing)

## Phase 9: Notifications & Analysis
- [x] Post-call transcription analysis (intent, sentiment, QA flags) [schema + router ready]
- [x] Automated alerts (email/in-app: new calls, high-value leads, issues, weekly summaries) [in-app ready]
- [x] Owner notification system

## Phase 10: Polish & Launch
- [x] End-to-end testing (34 vitest specs passing)
- [ ] Mobile responsiveness
- [ ] Final checkpoint & deploy

## Bugs
- (none yet)

## Phase 11: Claude Prompt Engineering Integration
- [ ] Claude-powered system prompt templates with shop-specific variables ({{SHOP_NAME}}, {{SERVICE_CATALOG}}, etc.)
- [ ] Pre-built persona templates (friendly advisor, professional technician, sales-focused)
- [ ] Upsell rules engine mapped to Claude structured reasoning
- [ ] Agent Config page: prompt preview with variable interpolation
- [ ] Claude Workbench sync: export/import prompt templates
