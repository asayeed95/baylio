# Baylio — AI Call Assistant for Auto Repair Shops

> **Status:** MVP v2.1 — Live telephony wired. Ready for first paying customer.

Baylio is a multi-tenant SaaS platform that installs an AI receptionist into any auto repair shop. When a customer calls the shop's dedicated Baylio number, an ElevenLabs voice AI answers 24/7, books appointments, captures vehicle details, and intelligently upsells services. Shop owners see every call logged, transcribed, and analyzed in their dashboard.

**Business model:** $199–$599/month per shop. ~86% gross margins. Target: 29 shops = $10K MRR.

---

## Architecture Overview

```
Customer Call
     │
     ▼
Twilio (telephony)
     │  POST /api/twilio/voice
     ▼
Baylio Server (Express + tRPC)
     │
     ├─ Hot Context Cache (in-memory, TTL 5min)
     │   └─ phone → shopId → ShopContext (name, hours, catalog, agent)
     │
     ├─ Prompt Compiler (3-stage reasoning)
     │   └─ symptom extraction → catalog mapping → offer generation
     │
     └─ ElevenLabs Conversational AI (WebSocket stream)
          │  wss://api.elevenlabs.io/v1/convai/conversation
          ▼
     AI Voice Agent (answers call, books appointment, upsells)
          │
          ▼ (call ends)
     Post-Call Pipeline (async)
          ├─ Transcription (Whisper)
          ├─ Intent classification (LLM)
          ├─ Usage metering
          └─ SMS recap → shop owner
```

---

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | React 19 + TypeScript + Vite        |
| API       | tRPC 11 (end-to-end type safety)    |
| Server    | Express 4 + Node.js                 |
| Database  | MySQL/TiDB via Drizzle ORM          |
| Auth      | Manus OAuth (JWT sessions)          |
| Voice AI  | ElevenLabs Conversational AI        |
| Telephony | Twilio (Voice API + SMS)            |
| Billing   | Stripe (subscriptions + setup fees) |
| Styling   | Tailwind CSS 4 + shadcn/ui          |

---

## Repository Structure

```
baylio/
├── client/                     # React frontend
│   └── src/
│       ├── pages/              # 11 page-level components
│       │   ├── Landing.tsx         # Public sales page with ROI calculator
│       │   ├── Dashboard.tsx       # Shop owner main dashboard
│       │   ├── ShopDetail.tsx      # Per-shop overview + metrics
│       │   ├── ShopSettings.tsx    # Shop profile + Twilio provisioning
│       │   ├── AgentConfig.tsx     # AI voice agent configuration
│       │   ├── CallLogs.tsx        # Call history with filters
│       │   ├── Analytics.tsx       # Revenue recovery charts
│       │   ├── MissedCallAudit.tsx # 7-day missed call analysis
│       │   ├── Subscriptions.tsx   # Tier management + billing
│       │   └── Notifications.tsx   # In-app alerts
│       ├── components/
│       │   ├── DashboardLayout.tsx # Sidebar nav wrapper
│       │   └── ui/                 # shadcn/ui component library
│       └── lib/trpc.ts             # tRPC client binding
│
├── server/                     # Express backend
│   ├── _core/                  # Framework plumbing (do not edit)
│   │   ├── index.ts                # Server entry point
│   │   ├── env.ts                  # Environment variable registry
│   │   ├── trpc.ts                 # tRPC context + procedures
│   │   └── llm.ts                  # LLM helper (Claude/GPT)
│   │
│   ├── routers.ts              # Master tRPC router
│   ├── shopRouter.ts           # Shop CRUD + Twilio provisioning
│   ├── callRouter.ts           # Call logs + analytics
│   ├── subscriptionRouter.ts   # Tier management + usage
│   ├── notificationRouter.ts   # In-app alerts
│   ├── organizationRouter.ts   # Multi-location grouping
│   │
│   ├── middleware/
│   │   ├── twilioValidation.ts     # HMAC-SHA1 webhook signature check
│   │   └── tenantScope.ts          # Multi-tenant isolation middleware
│   │
│   ├── services/
│   │   ├── twilioWebhooks.ts       # Inbound call handler (TwiML)
│   │   ├── twilioProvisioning.ts   # Phone number purchase/release
│   │   ├── elevenLabsService.ts    # ElevenLabs agent provisioning
│   │   ├── contextCache.ts         # Hot cache for sub-second webhook response
│   │   ├── promptCompiler.ts       # 3-stage AI prompt generation
│   │   ├── postCallPipeline.ts     # Async transcription + analysis
│   │   ├── smsService.ts           # Post-call SMS recap
│   │   ├── auditService.ts         # Missed call audit engine
│   │   └── scorecardGenerator.ts   # PDF scorecard for sales
│   │
│   ├── stripe/
│   │   ├── stripeRouter.ts         # Checkout + billing portal tRPC
│   │   ├── stripeRoutes.ts         # Stripe webhook handler
│   │   └── products.ts             # Tier definitions ($199/$349/$599)
│   │
│   └── db.ts                   # Drizzle query helpers
│
├── drizzle/
│   ├── schema.ts               # 10-table database schema
│   └── relations.ts            # Drizzle table relations
│
├── shared/
│   ├── types.ts                # Shared TypeScript types
│   └── const.ts                # Shared constants
│
└── server/*.test.ts            # Vitest test files (59 tests)
```

---

## Database Schema (10 Tables)

| Table                | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `users`              | Shop owners (OAuth, role: admin/user)     |
| `organizations`      | Multi-location grouping                   |
| `shops`              | Individual shop profiles + Twilio numbers |
| `agent_configs`      | Per-shop AI voice agent settings          |
| `call_logs`          | Every inbound call record                 |
| `transcripts`        | Call transcriptions                       |
| `customers`          | Caller profiles (auto-built from calls)   |
| `subscriptions`      | Stripe subscription state per shop        |
| `usage_records`      | Per-call metering for overage billing     |
| `missed_call_audits` | 7-day audit data for sales demos          |

All tables include `ownerId` for multi-tenant row-level isolation.

---

## Environment Variables

| Variable                    | Required | Description                                                       |
| --------------------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`              | Yes      | MySQL/TiDB connection string                                      |
| `JWT_SECRET`                | Yes      | Session cookie signing key                                        |
| `TWILIO_ACCOUNT_SID`        | Yes      | Twilio Account SID (ACxxxxxxxx)                                   |
| `TWILIO_AUTH_TOKEN`         | Yes      | Twilio Auth Token (32-char hex)                                   |
| `ELEVENLABS_API_KEY`        | Yes      | ElevenLabs API key                                                |
| `STRIPE_SECRET_KEY`         | Yes      | Stripe secret key                                                 |
| `STRIPE_WEBHOOK_SECRET`     | Yes      | Stripe webhook signing secret                                     |
| `TWILIO_VALIDATION_ENABLED` | No       | Set to `false` to disable webhook signature validation (dev only) |

---

## Key Design Decisions

### 1. No DB Writes During Live Calls

The `/api/twilio/voice` webhook must respond in under 2 seconds or Twilio drops the call. All database writes happen asynchronously after the call ends via the post-call pipeline.

### 2. Hot Context Cache

Shop configuration (name, hours, service catalog, agent ID) is cached in memory with a 5-minute TTL. This eliminates DB queries during live webhook handling.

### 3. Tenant Isolation via ownerId

MySQL/TiDB has no native row-level security. Every child table includes an `ownerId` column that is always filtered in queries. The `tenantScope` middleware injects `ctx.tenantId` into every tRPC procedure.

### 4. Twilio Webhook Validation

All `/api/twilio/*` routes are protected by HMAC-SHA1 signature validation. In development, this runs in `logOnly` mode. In production, invalid signatures return 403 (toll fraud prevention).

### 5. 3-Stage Prompt Compilation

Rather than a static system prompt, Baylio compiles a fresh prompt per call:

1. **Symptom extraction** — what is the customer describing?
2. **Catalog mapping** — which services in the shop's catalog match?
3. **Offer generation** — what upsell makes sense at this confidence level?

---

## Running Locally

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Generate DB migration
pnpm drizzle-kit generate

# Push schema to DB
pnpm drizzle-kit push
```

---

## Subscription Tiers

| Tier    | Price   | Minutes Included | Overage   |
| ------- | ------- | ---------------- | --------- |
| Starter | $199/mo | 300 min          | $0.05/min |
| Pro     | $349/mo | 750 min          | $0.04/min |
| Elite   | $599/mo | 2,000 min        | $0.03/min |

Setup fee: $299 one-time (waived for annual prepay).

---

## Live Infrastructure

| Service     | Account                                     |
| ----------- | ------------------------------------------- |
| Twilio      | REDACTED_TWILIO_SID (Pay-as-you-go)         |
| ElevenLabs  | REDACTED_ELEVENLABS_AGENT_ID (Baylio agent) |
| Test number | (XXX) XXX-XXXX / +1REDACTED                 |
| GitHub      | github.com/asayeed95/baylio (private)       |

---

## Migration Path to Supabase + Vercel (Future)

When revenue justifies the migration (target: 100+ shops), the following changes are needed:

1. **Schema:** Replace `mysqlTable` with `pgTable` in `drizzle/schema.ts`. Update all `int` → `serial` for auto-increment PKs.
2. **Connection:** Update `DATABASE_URL` to Supabase PostgreSQL connection string.
3. **RLS:** Implement native Supabase Row Level Security policies to replace application-level `ownerId` filtering.
4. **Hosting:** Configure Vercel project, set all env vars, connect GitHub repo for auto-deploy.
5. **Estimated effort:** 4-6 hours with Claude Code assistance.

See `MIGRATION.md` for the detailed step-by-step guide.
