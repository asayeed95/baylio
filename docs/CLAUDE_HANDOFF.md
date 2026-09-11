# CLAUDE HANDOFF — Baylio Lead Developer Briefing

> **Read this file first.** It contains everything you need to take over as lead developer on Baylio. This is your single source of truth for architecture, current state, known bugs, audit findings, and prioritized work.

**Last updated:** March 25, 2026
**Prepared by:** Manus AI (COO) for Abdur (Founder)
**Project:** Baylio — AI Call Assistant for Auto Repair Shops
**Production URL:** https://baylio.io
**Domains:** baylio.io, www.baylio.io, admin.baylio.io, partners.baylio.io
**GitHub:** github.com/asayeed95/baylio

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture Deep Dive](#4-architecture-deep-dive)
5. [Database Schema](#5-database-schema)
6. [Environment Variables](#6-environment-variables)
7. [Authentication System](#7-authentication-system)
8. [Call Handling Pipeline](#8-call-handling-pipeline)
9. [Stripe Billing System](#9-stripe-billing-system)
10. [Known Bugs — CRITICAL](#10-known-bugs--critical)
11. [Audit Findings](#11-audit-findings)
12. [Prioritized Fix List](#12-prioritized-fix-list)
13. [Golden Demo Flow](#13-golden-demo-flow)
14. [File-by-File Reference](#14-file-by-file-reference)

---

## 1. Product Overview

Baylio is a B2B SaaS product that provides AI-powered phone receptionists to auto repair shops. When a customer calls a shop, Baylio's AI agent (powered by ElevenLabs Conversational AI) answers the phone, identifies the customer's needs, recommends services from the shop's catalog, attempts intelligent upsells, and books appointments — all in real-time voice conversation.

**Revenue model:**
- Trial: $149/mo (150 min)
- Starter: $199/mo (300 min)
- Pro: $349/mo (750 min)
- Elite: $599/mo (1,500 min)
- Setup fees: $500–$2,000 per location
- Overage: $0.15/min beyond included

**Key value proposition:** Auto repair shops miss 40% of inbound calls. Each missed call = $466 average repair order lost. Baylio answers every call 24/7.

**Multi-portal architecture:**
- `baylio.io` — Public marketing site + shop owner dashboard (after login)
- `admin.baylio.io` — Internal admin portal
- `partners.baylio.io` — Affiliate/referral partner portal

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19 + TypeScript | Vite bundler, Tailwind CSS 4 |
| UI Components | shadcn/ui | Dark theme ("Industrial Minimal") |
| State/Data | tRPC 11 + TanStack Query | End-to-end type safety, superjson |
| Backend | Express 4 + tRPC | Node.js 22, TypeScript |
| Database | TiDB (MySQL-compatible) | Drizzle ORM, hosted cloud |
| Auth | Manus OAuth | Cookie-based sessions, JWT |
| Voice AI | ElevenLabs Conversational AI | Register Call API → Twilio WebSocket bridge |
| Telephony | Twilio | Programmable Voice, number provisioning |
| Payments | Stripe | Checkout Sessions, Webhooks, Customer Portal |
| SMS | Twilio SMS | Post-call follow-ups |
| CRM | HubSpot API | Caller sync (optional integration) |
| Analytics | PostHog | Event tracking, user identification |
| Email | Nodemailer (SMTP) | Contact form notifications |
| Hosting | Manus Platform | Auto-deploy from checkpoints |

---

## 3. Project Structure

```
baylio/
├── client/                          # Frontend (React + Vite)
│   ├── index.html                   # HTML entry point (Google Fonts loaded here)
│   └── src/
│       ├── main.tsx                 # App bootstrap, tRPC client, PostHog init
│       ├── App.tsx                  # Route definitions, layout switching
│       ├── const.ts                 # getLoginUrl() helper
│       ├── index.css                # Global theme (CSS variables, Tailwind)
│       ├── components/
│       │   ├── DashboardLayout.tsx   # Sidebar layout for logged-in users
│       │   ├── OnboardingWizard.tsx  # Multi-step shop setup wizard
│       │   ├── PartnersPortalLayout.tsx # Partner portal sidebar
│       │   └── ErrorBoundary.tsx     # React error boundary
│       ├── pages/
│       │   ├── Landing.tsx           # Public marketing page (baylio.io)
│       │   ├── Dashboard.tsx         # Main dashboard (post-login)
│       │   ├── Onboarding.tsx        # New user onboarding flow
│       │   ├── ShopDetail.tsx        # Individual shop management
│       │   ├── ShopSettings.tsx      # Shop config (phone, hours, services)
│       │   ├── AgentConfig.tsx       # AI agent voice/persona settings
│       │   ├── CallLogs.tsx          # Call history with filters
│       │   ├── CallScorecard.tsx     # Individual call quality analysis
│       │   ├── MissedCallAudit.tsx   # 7-day missed call audit tool
│       │   ├── Analytics.tsx         # Call analytics dashboard
│       │   ├── CostAnalytics.tsx     # COGS tracking (admin)
│       │   ├── Subscriptions.tsx     # Billing & plan management
│       │   ├── Notifications.tsx     # In-app notification center
│       │   ├── Integrations.tsx      # Third-party integration settings
│       │   ├── AdminPortal.tsx       # Admin-only management portal
│       │   ├── Contact.tsx           # Contact form
│       │   ├── FAQ.tsx               # FAQ page
│       │   ├── Help.tsx              # Help/support page
│       │   ├── PartnersLanding.tsx   # Partner program marketing
│       │   ├── PartnersPortal.tsx    # Partner dashboard
│       │   ├── PartnersReferrals.tsx # Partner referral tracking
│       │   ├── PartnersEarnings.tsx  # Partner earnings/payouts
│       │   ├── PartnersNetwork.tsx   # Partner network view
│       │   ├── PartnersResources.tsx # Partner marketing materials
│       │   └── PartnersSettings.tsx  # Partner account settings
│       ├── contexts/
│       │   └── ThemeContext.tsx       # Dark/light theme provider
│       ├── hooks/
│       │   ├── useMobile.tsx         # Mobile breakpoint detection
│       │   ├── useComposition.ts     # Input composition handling
│       │   └── usePersistFn.ts       # Stable function reference
│       └── lib/
│           ├── trpc.ts              # tRPC client binding
│           └── utils.ts             # cn() utility for Tailwind
├── server/                          # Backend (Express + tRPC)
│   ├── _core/                       # Framework plumbing (DO NOT EDIT)
│   │   ├── index.ts                 # Server entry point, Express setup
│   │   ├── env.ts                   # Environment variable mapping
│   │   ├── context.ts               # tRPC context builder (injects user)
│   │   ├── trpc.ts                  # tRPC instance, publicProcedure, protectedProcedure
│   │   ├── oauth.ts                 # Manus OAuth callback handler
│   │   ├── cookies.ts               # Session cookie configuration
│   │   ├── llm.ts                   # invokeLLM() helper
│   │   ├── notification.ts          # notifyOwner() helper
│   │   ├── systemRouter.ts          # Health check routes
│   │   └── vite.ts                  # Vite dev server integration
│   ├── routers.ts                   # Root tRPC router (merges all sub-routers)
│   ├── db.ts                        # Database query helpers (398 lines)
│   ├── storage.ts                   # S3 file storage helpers
│   ├── shopRouter.ts                # Shop CRUD, agent provisioning, onboarding (586 lines)
│   ├── callRouter.ts                # Call log queries, scorecard generation
│   ├── subscriptionRouter.ts        # Subscription management
│   ├── notificationRouter.ts        # Notification CRUD
│   ├── organizationRouter.ts        # Multi-location org management
│   ├── analyticsRouter.ts           # Analytics data queries
│   ├── contactRouter.ts             # Contact form submission
│   ├── integrationRouter.ts         # Third-party integration management
│   ├── partnerRouter.ts             # Partner/affiliate program
│   ├── middleware/
│   │   ├── twilioValidation.ts      # Twilio webhook signature validation
│   │   └── tenantScope.ts           # Multi-tenant data isolation
│   ├── services/
│   │   ├── twilioWebhooks.ts        # Twilio voice webhook handler (579 lines) — THE CORE
│   │   ├── elevenLabsService.ts     # ElevenLabs agent CRUD + voice catalog
│   │   ├── promptCompiler.ts        # Shop context → AI system prompt
│   │   ├── contextCache.ts          # In-memory shop context cache
│   │   ├── postCallPipeline.ts      # Post-call LLM analysis pipeline
│   │   ├── scorecardGenerator.ts    # Call quality scorecard generation
│   │   ├── auditService.ts          # Missed call audit processing
│   │   ├── twilioProvisioning.ts    # Twilio number search/purchase/configure
│   │   ├── smsService.ts            # Twilio SMS sending
│   │   ├── calendarService.ts       # Google Calendar integration
│   │   ├── sheetsService.ts         # Google Sheets sync
│   │   ├── hubspotService.ts        # HubSpot CRM sync
│   │   ├── shopmonkeyService.ts     # Shopmonkey work order creation
│   │   ├── googleAuth.ts            # Google OAuth for integrations
│   │   ├── emailService.ts          # Email sending via SMTP
│   │   └── demoService.ts           # Demo shop seeding
│   └── stripe/
│       ├── products.ts              # Tier definitions and pricing
│       ├── stripeRouter.ts          # Stripe tRPC procedures (checkout, portal)
│       └── stripeRoutes.ts          # Stripe webhook handler (Express raw body)
├── drizzle/
│   ├── schema.ts                    # Database schema (472 lines, 16 tables)
│   └── relations.ts                 # Drizzle relation definitions
├── shared/
│   ├── const.ts                     # Shared constants (cookie name, error messages)
│   └── types.ts                     # Shared TypeScript types
├── server/*.test.ts                 # Vitest test files (161 tests, all passing)
├── tests.setup.ts                   # Test setup/mocks
├── vite.config.ts                   # Vite configuration
├── vitest.config.ts                 # Vitest configuration
├── drizzle.config.ts                # Drizzle Kit configuration
├── package.json                     # Dependencies and scripts
└── todo.md                          # Feature tracking (read this for full history)
```

---

## 4. Architecture Deep Dive

### 4.1 Request Flow

```
Browser → Vite Dev Server (port 3000)
  ├── /api/trpc/* → tRPC middleware → routers.ts → db.ts → TiDB
  ├── /api/oauth/* → Manus OAuth callback
  ├── /api/twilio/* → Twilio validation middleware → twilioWebhooks.ts
  ├── /api/stripe → Stripe webhook handler (raw body)
  ├── /api/integrations/google → Google OAuth
  └── /* → React SPA (client-side routing)
```

### 4.2 Live Call Flow (The Critical Path)

This is the most important flow in the entire application. When a customer calls a shop's Twilio number:

```
1. Twilio receives inbound call
2. Twilio POSTs to /api/twilio/voice with {To, From, CallSid}
3. twilioWebhooks.ts resolves shop context:
   a. Check contextCache for phone → shopId mapping
   b. If miss: query DB for shop by twilioPhoneNumber
   c. Check contextCache for shopId → ShopContext
   d. If miss: query DB for shop + agentConfig, build context
4. Look up caller profile (name, role) from callerProfiles table
5. Compile system prompt via promptCompiler.ts:
   - 3-Stage Reasoning: Symptom Extraction → Catalog Mapping → Natural Offer
   - Injects: shop name, services, hours, upsell rules, caller info
6. Call ElevenLabs Register Call API:
   POST https://api.elevenlabs.io/v1/convai/twilio/register-call
   Headers: xi-api-key: ELEVENLABS_API_KEY
   Body: { agent_id, from_number, to_number, direction: "inbound",
           conversation_initiation_client_data: { dynamic_variables: {
             baylio_system_prompt, baylio_greeting, caller_number, caller_name
           }}}
7. ElevenLabs returns TwiML with authenticated WebSocket URL
8. Return TwiML to Twilio (must be <2 seconds total)
9. Twilio connects call audio to ElevenLabs WebSocket
10. AI agent converses with caller in real-time
```

**Fallback:** If ElevenLabs fails or no agent is configured, return voicemail TwiML.

**Post-call (async, Layer 2):**
```
11. Twilio POSTs to /api/twilio/status with {CallSid, CallStatus, CallDuration}
12. setImmediate fires async processing:
    a. Insert/update call_logs record
    b. If completed: run postCallPipeline.ts
       - Fetch transcription
       - LLM analysis (intent, sentiment, quality, revenue estimate)
       - Update call_logs with analysis results
       - Record usage for billing
       - Fire integrations (Calendar, Sheets, HubSpot, Shopmonkey, SMS)
       - Send notifications for high-value leads
```

### 4.3 Onboarding Flow

The `completeOnboarding` mutation in `shopRouter.ts` handles the full setup:

```
1. Create shop record (name, address, hours, services)
2. Save agent config (voice, persona, greeting)
3. Provision ElevenLabs agent (create via API, save agent_id)
4. Provision Twilio phone number:
   - "new" option: purchase selected number
   - "forward" option: auto-provision hidden Baylio number in shop's area code
5. Configure Twilio webhook URLs on the purchased number
6. Return { shopId, agentId, twilioNumber, isLive }
```

### 4.4 Stripe Billing Flow

```
1. User selects tier on Subscriptions page
2. Frontend calls trpc.stripe.createSubscriptionCheckout
3. Server creates Stripe Checkout Session with metadata
4. User redirected to Stripe-hosted checkout
5. On success: Stripe fires webhook to /api/stripe/webhook
6. handleCheckoutCompleted() creates/updates subscription in DB
7. invoice.paid webhook resets usage minutes each billing cycle
8. invoice.payment_failed sets subscription to past_due
```

---

## 5. Database Schema

16 tables in TiDB (MySQL-compatible). Schema defined in `drizzle/schema.ts`.

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts (Manus OAuth) | id, openId, name, email, role (admin/user) |
| `organizations` | Multi-location grouping | id, ownerId, name |
| `shops` | Auto repair shop profiles | id, ownerId, name, phone, address, timezone, businessHours (JSON), serviceCatalog (JSON), twilioPhoneNumber, twilioPhoneSid |
| `agent_configs` | AI agent settings per shop | shopId, voiceId, agentName, systemPrompt, greeting, upsellRules (JSON), confidenceThreshold, elevenLabsAgentId |
| `call_logs` | Every call record | shopId, twilioCallSid, callerPhone, status, duration, transcription, summary, customerIntent, sentimentScore, qualityScore, estimatedRevenue, scorecardData (JSON) |
| `missed_call_audits` | 7-day missed call audit campaigns | shopId, prospectName, status, totalMissedCalls, estimatedLostRevenue, scorecardData (JSON) |
| `audit_call_entries` | Individual calls within an audit | auditId, callerPhone, dayPart, urgencyLevel |
| `subscriptions` | Billing subscriptions | shopId, tier, status, stripeCustomerId, stripeSubscriptionId, includedMinutes, usedMinutes, overageRate |
| `usage_records` | Per-call usage metering | subscriptionId, callLogId, minutesUsed, isOverage, overageCharge |
| `notifications` | In-app notifications | userId, type, title, message, isRead |
| `partners` | Affiliate partners | userId, referralCode, commissionRate, tier, totalEarnings |
| `referrals` | Partner referral tracking | partnerId, referredUserId, status, commissionEarned |
| `partner_payouts` | Partner payout records | partnerId, amount, status, payoutMethod |
| `caller_profiles` | Known caller database | phone (unique), name, callerRole, callCount, smsOptOut |
| `contact_submissions` | Contact form entries | name, email, phone, message |
| `shop_integrations` | Third-party integration tokens | shopId, provider, accessToken, refreshToken |
| `integration_sync_logs` | Integration sync history | shopId, provider, action, status |

---

## 6. Environment Variables

### Server-side (in `server/_core/env.ts`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | TiDB/MySQL connection string |
| `JWT_SECRET` | Session cookie signing |
| `VITE_APP_ID` | Manus OAuth app ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL |
| `OWNER_OPEN_ID` | Owner's Manus user ID |
| `BUILT_IN_FORGE_API_URL` | Manus built-in API (LLM, storage) |
| `BUILT_IN_FORGE_API_KEY` | Manus API auth token |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio auth secret |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `HUBSPOT_API_KEY` | HubSpot CRM API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |
| `WEBHOOK_BASE_URL` | Base URL for Twilio webhook configuration |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Email SMTP config |

### Client-side (VITE_ prefix)

| Variable | Purpose |
|----------|---------|
| `VITE_APP_ID` | Manus OAuth app ID |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `VITE_POSTHOG_KEY` | PostHog analytics token |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus API key (frontend) |
| `VITE_FRONTEND_FORGE_API_URL` | Manus API URL (frontend) |

---

## 7. Authentication System

Baylio uses **Manus OAuth** (cookie-based sessions):

1. `client/src/const.ts` → `getLoginUrl()` constructs the OAuth URL with `window.location.origin`
2. User authenticates on Manus portal
3. Callback hits `/api/oauth/callback` → `server/_core/oauth.ts`
4. Server creates/updates user in DB, sets JWT session cookie
5. `server/_core/context.ts` reads cookie on every request, injects `ctx.user`
6. `protectedProcedure` requires `ctx.user` (throws UNAUTHED if missing)
7. Frontend reads auth state via `trpc.auth.me.useQuery()`

**Role-based access:** Users have `role` field (`admin` | `user`). Admin checks use `ctx.user.role === 'admin'`.

---

## 8. Call Handling Pipeline

### Critical Files (in order of execution during a call)

1. **`server/middleware/twilioValidation.ts`** — Validates Twilio webhook signatures. Currently in `logOnly: true` mode because reverse proxy rewrites URLs.

2. **`server/services/twilioWebhooks.ts`** (579 lines) — The core webhook handler. Routes: `/voice`, `/status`, `/recording-complete`, `/transcription-complete`, `/health`.

3. **`server/services/contextCache.ts`** — In-memory cache for shop contexts. Avoids DB queries during live calls.

4. **`server/services/promptCompiler.ts`** — Compiles shop-specific system prompts using the 3-Stage Reasoning Architecture.

5. **`server/services/elevenLabsService.ts`** — ElevenLabs API client with retry logic. Handles agent CRUD and voice catalog.

6. **`server/services/postCallPipeline.ts`** — Async post-call processing: LLM analysis, usage metering, integrations, notifications.

7. **`server/services/smsService.ts`** — Twilio SMS for post-call follow-ups.

### ElevenLabs Integration Pattern

The Register Call API is the correct integration pattern (not WebSocket direct):
```
Server → POST /v1/convai/twilio/register-call
  Headers: xi-api-key: ELEVENLABS_API_KEY
  Body: { agent_id, from_number, to_number, direction, conversation_initiation_client_data }
  Response: TwiML with authenticated WebSocket URL
Server → Return TwiML to Twilio
Twilio → Connects call audio to ElevenLabs WebSocket
```

Dynamic variables passed to ElevenLabs agent:
- `baylio_system_prompt` — Full compiled system prompt
- `baylio_greeting` — First message the agent speaks
- `caller_number` — Caller's phone number
- `caller_name` — Known caller name (from callerProfiles)

---

## 9. Stripe Billing System

### Files
- `server/stripe/products.ts` — Tier definitions (trial/starter/pro/elite)
- `server/stripe/stripeRouter.ts` — tRPC procedures (checkout, portal, tiers)
- `server/stripe/stripeRoutes.ts` — Express webhook handler (raw body for signature verification)

### Webhook Events Handled
- `checkout.session.completed` → Create/update subscription
- `invoice.paid` → Reset usage minutes, update billing period
- `invoice.payment_failed` → Set subscription to past_due
- `customer.subscription.updated` → Sync status
- `customer.subscription.deleted` → Mark canceled

### Important: Stripe webhook is registered BEFORE `express.json()` in `server/_core/index.ts` to preserve raw body for signature verification.

---

## 10. Known Bugs — CRITICAL

These are the bugs that must be fixed before any sales demo:

### BUG 1: Phone Calls Not Connecting (REVENUE BLOCKER)
- **Symptom:** Calling (844) 875-2441 rings 3 times then nothing
- **Likely cause:** Twilio signature validation blocking real calls. The middleware is in `logOnly: true` but may still be interfering, OR the webhook URL configured in Twilio is pointing to a stale/dead endpoint
- **Files:** `server/middleware/twilioValidation.ts`, `server/services/twilioWebhooks.ts`
- **Fix approach:** Verify Twilio webhook URL in Twilio console points to live production URL. Check server logs for incoming webhook requests. Test with Twilio's test tools.

### BUG 2: Voice Agent Disconnects After Greeting
- **Symptom:** AI agent says "Thanks for calling" then immediately hangs up
- **Likely cause:** ElevenLabs agent turn settings, WebSocket connection dropping, or TwiML response format issue
- **Files:** `server/services/twilioWebhooks.ts` (registerElevenLabsCall), ElevenLabs agent dashboard
- **Fix approach:** Check ElevenLabs conversation logs, verify WebSocket URL in returned TwiML, check agent turn/silence settings

### BUG 3: Admin Portal Login Not Working
- **Symptom:** admin.baylio.io login doesn't work
- **Likely cause:** OAuth redirect URL mismatch — the OAuth callback uses `window.location.origin` which would be `admin.baylio.io` but the callback route may not be configured for that subdomain
- **Files:** `client/src/const.ts`, `server/_core/oauth.ts`

### BUG 4: PostHog Initialization Error (Non-blocking)
- **Symptom:** Console error "PostHog was initialized without a token"
- **Cause:** `VITE_POSTHOG_KEY` env var is empty/missing
- **Files:** `client/src/main.tsx` (lines 13-19)
- **Fix:** The code already guards with `if (posthogKey)` but PostHog SDK still logs error. Either set the key or conditionally import PostHog.

### BUG 5: URIError in Dev Server
- **Symptom:** `URIError: Failed to decode param '/%VITE_POSTHOG_HOST%/static/array.js'`
- **Cause:** PostHog trying to load from unresolved env var
- **Fix:** Ensure PostHog host is set or remove PostHog script tag if using JS SDK only

---

## 11. Audit Findings

A comprehensive audit of 26 critical files was performed. Here are the aggregate results:

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 101 |
| HIGH | 63 |
| MEDIUM | 47 |
| LOW | 27 |

**Average Security Score: 23/100**
**Average Reliability Score: 28/100**

> **Important context:** Many "SQL injection" findings are **false positives** because the codebase uses Drizzle ORM with parameterized queries throughout. The audit tool flagged these because it couldn't trace the ORM abstraction. However, the authorization and error handling findings are real.

### Real Critical Issues (Not False Positives)

1. **Missing authorization checks in several routers** — Some procedures don't verify `ctx.user.id` matches the resource owner. Files: `contactRouter.ts`, `subscriptionRouter.ts`, `callRouter.ts`

2. **Missing error handling in async operations** — Several `setImmediate` callbacks in `twilioWebhooks.ts` have async functions without proper error boundaries. Unhandled rejections could crash the server.

3. **Missing `await` on promises** — Some async calls are fire-and-forget without await, which means errors are silently swallowed

4. **Twilio signature validation disabled** — `logOnly: true` means webhook endpoints accept unsigned requests. This is a security risk in production.

5. **No rate limiting** — Public endpoints (contact form, webhook endpoints) have no rate limiting

6. **Access tokens stored in plaintext** — `shop_integrations.accessToken` and `refreshToken` are stored as plain text in the database

### Files with Most Issues

| File | Critical | High | Medium |
|------|----------|------|--------|
| `server/stripe/products.ts` | 3 | 2 | 1 |
| `server/services/twilioWebhooks.ts` | 1 | 2 | 2 |
| `server/services/calendarService.ts` | 2 | 1 | 1 |
| `server/services/auditService.ts` | 2 | 1 | 1 |
| `server/services/scorecardGenerator.ts` | 2 | 1 | 1 |
| `server/stripe/stripeRoutes.ts` | 2 | 1 | 1 |
| `server/shopRouter.ts` | 2 | 1 | 0 |
| `server/subscriptionRouter.ts` | 2 | 1 | 0 |
| `server/middleware/tenantScope.ts` | 1 | 1 | 1 |
| `client/src/pages/Dashboard.tsx` | 1 | 1 | 1 |

---

## 12. Prioritized Fix List

### Tier 1: Revenue Blockers (Fix These First)

1. **Fix phone call routing** — Diagnose why calls to (844) 875-2441 don't connect. Check Twilio webhook URL, server logs, signature validation.
2. **Fix voice agent disconnect** — Agent hangs up after greeting. Check ElevenLabs agent settings, WebSocket bridge, TwiML response.
3. **Fix admin portal login** — OAuth redirect mismatch for admin.baylio.io subdomain.

### Tier 2: Security Hardening (Before Any Real Customers)

4. **Add authorization checks** to all tRPC procedures — verify `ctx.user.id` owns the resource
5. **Enable Twilio signature validation** — Fix URL reconstruction for reverse proxy, then set `logOnly: false`
6. **Add rate limiting** to public endpoints (contact form, webhooks)
7. **Encrypt integration tokens** at rest in the database

### Tier 3: Reliability Improvements

8. **Add proper error boundaries** around all `setImmediate` async callbacks
9. **Add health monitoring** — Structured logging, error alerting
10. **Replace `setImmediate` job queue** with proper Bull/BullMQ for post-call processing
11. **Add database connection pooling** and retry logic
12. **Fix PostHog initialization** — Either configure the key or remove PostHog cleanly

### Tier 4: Feature Completion

13. **Build Cost Analytics dashboard** — Real-time COGS per shop (Twilio + ElevenLabs usage)
14. **Complete forwarding wizard** — Auto-provision Twilio capture number for 7-day audit
15. **Peak call analysis** — Monday/Tuesday 8-11:30 AM pattern detection
16. **End-to-end test suite** — Automated voice agent testing

---

## 13. Golden Demo Flow

This is the flow that must work perfectly for sales demos:

```
1. Visit baylio.io → See landing page with ROI calculator
2. Click "Get Started" → Manus OAuth login
3. Land on /onboarding → OnboardingWizard:
   a. Enter shop name, address, phone
   b. Set business hours
   c. Add services to catalog
   d. Choose AI voice (ElevenLabs voice preview)
   e. Choose phone option (forward existing or new number)
   f. Click "Launch" → completeOnboarding mutation fires
4. Redirect to Dashboard → See shop card with "Live" status
5. Call the provisioned number → AI agent answers
6. Agent greets caller, identifies needs, recommends services
7. After call: see call log appear in real-time
8. Click call → see scorecard with sentiment, quality, revenue estimate
9. Visit /subscriptions → see usage, upgrade to paid tier
10. Stripe checkout → subscription active
```

**Every step above must work without errors.** Currently steps 5-6 are broken (call routing/disconnect issues).

---

## 14. File-by-File Reference

### Server Routers (tRPC)

| Router | File | Procedures |
|--------|------|------------|
| `auth` | `routers.ts` | `me` (query), `logout` (mutation) |
| `shop` | `shopRouter.ts` | `list`, `getById`, `create`, `update`, `delete`, `getAgentConfig`, `saveAgentConfig`, `provisionAgent`, `getAgentStatus`, `completeOnboarding`, `createDemo`, `searchNumbers`, `purchaseNumber`, `releaseNumber`, `getBalance` |
| `calls` | `callRouter.ts` | Call log queries, scorecard generation |
| `subscription` | `subscriptionRouter.ts` | Subscription CRUD, usage tracking |
| `notification` | `notificationRouter.ts` | List, mark read, mark all read |
| `organization` | `organizationRouter.ts` | Org CRUD for multi-location |
| `stripe` | `stripeRouter.ts` | `createSubscriptionCheckout`, `createSetupFeeCheckout`, `createPortalSession`, `getTiers` |
| `partner` | `partnerRouter.ts` | Partner program CRUD |
| `analytics` | `analyticsRouter.ts` | Analytics data queries |
| `contact` | `contactRouter.ts` | Contact form submission |
| `integration` | `integrationRouter.ts` | Integration management |

### Express Routes (Non-tRPC)

| Route | File | Purpose |
|-------|------|---------|
| `/api/twilio/voice` | `twilioWebhooks.ts` | Inbound call webhook |
| `/api/twilio/status` | `twilioWebhooks.ts` | Call status callback |
| `/api/twilio/recording-complete` | `twilioWebhooks.ts` | Voicemail recording |
| `/api/twilio/transcription-complete` | `twilioWebhooks.ts` | Voicemail transcription |
| `/api/twilio/health` | `twilioWebhooks.ts` | Health check |
| `/api/stripe/webhook` | `stripeRoutes.ts` | Stripe webhook |
| `/api/integrations/google/*` | `googleAuth.ts` | Google OAuth |
| `/api/oauth/callback` | `oauth.ts` | Manus OAuth callback |

### Test Files (161 tests, all passing)

| File | Tests |
|------|-------|
| `server/auth.logout.test.ts` | Auth logout |
| `server/baylio.test.ts` | Core business logic |
| `server/shopRouter.test.ts` | Shop CRUD |
| `server/agents.test.ts` | Agent provisioning |
| `server/analytics.test.ts` | Analytics queries |
| `server/callerProfiles.test.ts` | Caller profile CRUD |
| `server/contactRouter.test.ts` | Contact form |
| `server/elevenLabsRetry.test.ts` | Retry logic |
| `server/elevenlabs.test.ts` | ElevenLabs integration |
| `server/emailService.test.ts` | Email sending |
| `server/integrations.test.ts` | Integration management |
| `server/partner.test.ts` | Partner program |
| `server/security.test.ts` | Security checks |
| `server/signupFlow.test.ts` | Signup flow |
| `server/smtp.test.ts` | SMTP config |
| `server/twilio.test.ts` | Twilio integration |
| `server/twilioValidation.test.ts` | Webhook validation |

---

## Commands

```bash
# Development
pnpm dev                    # Start dev server (port 3000)
pnpm test                   # Run all vitest tests
pnpm drizzle-kit generate   # Generate migration SQL from schema changes

# Key scripts
pnpm build                  # Production build
pnpm start                  # Start production server
```

---

## Final Notes for Claude

1. **The codebase is functional but fragile.** 161 tests pass, but the live call path has real bugs that block revenue.

2. **Drizzle ORM is used everywhere** — all DB queries are parameterized. Ignore "SQL injection" audit findings that reference Drizzle queries.

3. **The `_core/` directory is framework plumbing** — avoid editing unless absolutely necessary. It handles OAuth, tRPC setup, Vite integration, and LLM helpers.

4. **Every change should have a vitest test.** The test infrastructure is solid — use it.

5. **The most important file is `server/services/twilioWebhooks.ts`** — this is the money-making machine. Every bug here directly costs revenue.

6. **PostHog analytics is partially broken** — either fix it or remove it cleanly. Don't leave it in a half-configured state.

7. **The partner portal is feature-complete but untested with real partners.** Low priority vs. fixing the core call flow.

8. **Abdur's goal:** Eliminate $100k debt. Every fix should be evaluated through the lens of "does this help close the next customer?"

---

*This document was compiled from a comprehensive 50-file parallel audit, manual code review, server log analysis, and browser console inspection. It represents the complete state of the Baylio codebase as of March 25, 2026.*
