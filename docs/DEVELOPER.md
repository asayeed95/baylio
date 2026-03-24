# Baylio — Developer Guide

> **Baylio** is an AI-powered call assistant platform for auto repair shops. It answers inbound calls 24/7 via a conversational AI agent, books appointments, captures vehicle details, intelligently upsells services, and provides shop owners with a full analytics dashboard. The platform also includes a partner (affiliate) program and a Stripe-powered subscription billing system.

---

## Tech Stack

| Layer            | Technology         | Version              | Purpose                                                       |
| ---------------- | ------------------ | -------------------- | ------------------------------------------------------------- |
| Frontend         | React              | 19                   | UI framework                                                  |
| Routing          | Wouter             | 3.x                  | Lightweight client-side routing                               |
| Styling          | Tailwind CSS       | 4                    | Utility-first CSS                                             |
| UI Components    | shadcn/ui          | latest               | Pre-built accessible components                               |
| State / Data     | tRPC               | 11                   | End-to-end type-safe API layer                                |
| Serialization    | Superjson          | —                    | Preserves `Date`, `BigInt`, etc. across the wire              |
| Backend          | Express            | 4                    | HTTP server + webhook endpoints                               |
| Database         | MySQL (TiDB)       | —                    | Persistent storage via Drizzle ORM                            |
| ORM              | Drizzle ORM        | latest               | Type-safe SQL query builder                                   |
| Auth             | Manus OAuth        | —                    | OAuth 2.0 with session cookies                                |
| Voice AI         | ElevenLabs         | Conversational AI v1 | Real-time voice agent for phone calls                         |
| Telephony        | Twilio             | 5.13                 | Phone number provisioning + call routing                      |
| Payments         | Stripe             | latest               | Subscription billing + checkout sessions                      |
| LLM              | Built-in Forge API | —                    | Post-call analysis, intent classification, prompt compilation |
| SMS              | Twilio             | 5.13                 | Post-call recaps, alerts                                      |
| Testing          | Vitest             | latest               | Unit + integration tests                                      |
| Build            | Vite               | 7.x                  | Dev server + production bundler                               |
| Bundler (server) | esbuild            | —                    | Server-side bundle for production                             |
| Language         | TypeScript         | 5.x                  | Full-stack type safety                                        |

---

## Project Structure

```
baylio/
├── client/                          # Frontend (React + Vite)
│   ├── index.html                   # HTML shell (Google Fonts loaded here)
│   ├── public/                      # Static config files only (favicon, robots.txt)
│   └── src/
│       ├── App.tsx                  # Root router — portal detection + route definitions
│       ├── main.tsx                 # React entry — providers (tRPC, Theme, Toaster)
│       ├── index.css                # Global styles, CSS variables, Tailwind theme
│       ├── const.ts                 # getLoginUrl() helper
│       ├── lib/
│       │   ├── trpc.ts              # tRPC client binding
│       │   └── utils.ts             # cn() utility for class merging
│       ├── contexts/
│       │   └── ThemeContext.tsx      # Dark/light theme provider
│       ├── hooks/
│       │   ├── useComposition.ts    # IME composition handling
│       │   ├── useMobile.tsx        # Responsive breakpoint hook
│       │   └── usePersistFn.ts      # Stable callback reference
│       ├── components/
│       │   ├── ui/                  # shadcn/ui primitives (button, card, dialog, etc.)
│       │   ├── DashboardLayout.tsx  # Sidebar layout for authenticated shop owners
│       │   ├── PartnersPortalLayout.tsx  # Sidebar layout for partner portal
│       │   ├── AIChatBox.tsx        # Reusable chat interface component
│       │   ├── Map.tsx              # Google Maps integration
│       │   ├── ErrorBoundary.tsx    # React error boundary
│       │   └── ManusDialog.tsx      # Auth dialog wrapper
│       └── pages/
│           ├── Landing.tsx          # Public marketing page (baylio.io)
│           ├── Dashboard.tsx        # Shop owner dashboard (authenticated)
│           ├── ShopDetail.tsx       # Individual shop overview
│           ├── ShopSettings.tsx     # Shop config + Twilio number provisioning
│           ├── AgentConfig.tsx      # AI agent persona + prompt config
│           ├── CallLogs.tsx         # Call history with filters
│           ├── Analytics.tsx        # Charts + metrics dashboard
│           ├── MissedCallAudit.tsx  # 7-day missed call audit tool
│           ├── Subscriptions.tsx    # Billing + plan management
│           ├── Notifications.tsx    # In-app notification center
│           ├── AdminPortal.tsx      # Admin-only management portal
│           ├── PartnersLanding.tsx  # Public partner landing page
│           ├── PartnersPortal.tsx   # Partner dashboard (authenticated)
│           ├── PartnersReferrals.tsx    # Referral tracking table
│           ├── PartnersEarnings.tsx     # Commission history + payouts
│           ├── PartnersNetwork.tsx      # Downline partner network
│           ├── PartnersResources.tsx    # Marketing templates + demo link
│           ├── PartnersSettings.tsx     # Payout config + referral code
│           └── NotFound.tsx         # 404 page
│
├── server/                          # Backend (Express + tRPC)
│   ├── _core/                       # Framework plumbing (DO NOT EDIT)
│   │   ├── index.ts                 # Express app bootstrap + middleware
│   │   ├── context.ts               # tRPC context builder (injects ctx.user)
│   │   ├── trpc.ts                  # tRPC init, publicProcedure, protectedProcedure, adminProcedure
│   │   ├── oauth.ts                 # Manus OAuth callback handler
│   │   ├── cookies.ts               # JWT session cookie helpers
│   │   ├── env.ts                   # Centralized environment variable access
│   │   ├── llm.ts                   # invokeLLM() — built-in LLM helper
│   │   ├── notification.ts          # notifyOwner() — push alerts to project owner
│   │   ├── voiceTranscription.ts    # transcribeAudio() — Whisper API
│   │   ├── imageGeneration.ts       # generateImage() — AI image generation
│   │   ├── map.ts                   # Google Maps proxy
│   │   ├── sdk.ts                   # Internal Forge SDK client
│   │   ├── dataApi.ts               # Data API helpers
│   │   ├── vite.ts                  # Vite dev middleware bridge
│   │   └── systemRouter.ts          # System-level tRPC procedures
│   │
│   ├── db.ts                        # Database query helpers (30+ functions)
│   ├── routers.ts                   # Root tRPC router — merges all sub-routers
│   ├── storage.ts                   # S3 file storage (storagePut, storageGet)
│   │
│   ├── shopRouter.ts                # Shop CRUD + agent config + Twilio provisioning
│   ├── callRouter.ts                # Call logs, analytics, audits, scorecards
│   ├── subscriptionRouter.ts        # Subscription CRUD + tier config + usage
│   ├── partnerRouter.ts             # Partner enrollment, referrals, earnings, payouts
│   ├── notificationRouter.ts        # Notification list, read/unread, mark-all
│   ├── organizationRouter.ts        # Multi-shop organization grouping
│   │
│   ├── stripe/
│   │   ├── products.ts              # Stripe product/price definitions (Starter/Pro/Elite)
│   │   ├── stripeRouter.ts          # tRPC procedures for checkout + portal sessions
│   │   └── stripeRoutes.ts          # Express webhook endpoint (/api/stripe/webhook)
│   │
│   ├── services/
│   │   ├── elevenLabsService.ts     # ElevenLabs API client (create/update/delete agents)
│   │   ├── promptCompiler.ts        # Shop context → compiled system prompt + greeting
│   │   ├── contextCache.ts          # In-memory hot cache for shop configs (sub-second lookups)
│   │   ├── twilioWebhooks.ts        # Express router for /api/twilio/* (voice, status, recording)
│   │   ├── twilioProvisioning.ts    # Twilio number search, purchase, release, balance
│   │   ├── postCallPipeline.ts      # Async pipeline: transcription → LLM analysis → DB write
│   │   ├── auditService.ts          # 7-day missed call audit scoring + PDF generation
│   │   ├── scorecardGenerator.ts    # HTML scorecard template for audit PDFs
│   │   └── smsService.ts            # Twilio SMS: post-call recaps, alerts, weekly summaries
│   │
│   ├── middleware/
│   │   ├── twilioValidation.ts      # HMAC-SHA1 webhook signature verification
│   │   └── tenantScope.ts           # Multi-tenant isolation middleware (ctx.tenantId)
│   │
│   └── *.test.ts                    # Vitest test files (81 tests across 6 files)
│
├── drizzle/
│   ├── schema.ts                    # All database table definitions (14 tables)
│   ├── relations.ts                 # Drizzle relation definitions
│   └── migrations/                  # Generated SQL migration files
│
├── shared/
│   ├── const.ts                     # Shared constants
│   ├── types.ts                     # Shared TypeScript types
│   └── _core/errors.ts              # Error type definitions
│
├── scripts/
│   └── update-elevenlabs-agent.mjs  # One-off script to update the live ElevenLabs agent config
│
├── docs/                            # Developer documentation (you are here)
├── todo.md                          # Feature & bug tracker
├── package.json                     # Dependencies + scripts
├── vite.config.ts                   # Vite configuration
├── vitest.config.ts                 # Vitest configuration
├── drizzle.config.ts                # Drizzle Kit configuration
└── tsconfig.json                    # TypeScript configuration
```

---

## Multi-Portal Architecture

Baylio serves three distinct user groups through a single codebase using **subdomain-based portal routing**:

| Portal   | Subdomain                     | Query Param (dev)  | Target Audience               |
| -------- | ----------------------------- | ------------------ | ----------------------------- |
| Main     | `baylio.io` / `www.baylio.io` | (default)          | Shop owners + public visitors |
| Partners | `partners.baylio.io`          | `?portal=partners` | Affiliate partners            |
| Admin    | `admin.baylio.io`             | `?portal=admin`    | Platform administrators       |

The portal is detected in `App.tsx` via `__MANUS_PORTAL__` (production) or the `?portal=` query parameter (development). Each portal renders its own router with dedicated pages and layout.

---

## Authentication

Authentication uses **Manus OAuth 2.0**. There are no passwords stored in the database.

The flow works as follows: the user clicks "Sign In" on the frontend, which redirects to the Manus OAuth portal. After authentication, the callback at `/api/oauth/callback` creates or updates the user record in the database and sets a signed JWT session cookie. Every subsequent request to `/api/trpc` extracts the user from the cookie via `server/_core/context.ts` and injects it as `ctx.user`.

There are three procedure levels in tRPC:

- **`publicProcedure`** — no auth required (e.g., `auth.me`)
- **`protectedProcedure`** — requires a valid session (`ctx.user` must exist)
- **`adminProcedure`** — requires `ctx.user.role === 'admin'`

The `users` table has a `role` field (enum: `admin` | `user`). To promote a user to admin, update the role directly in the database.

---

## Database

The database is **MySQL (TiDB-compatible)** accessed via **Drizzle ORM**. The connection string is provided via the `DATABASE_URL` environment variable.

All schema definitions live in `drizzle/schema.ts`. There are **14 tables** — see `DATA_MODEL.md` for the complete schema reference.

The schema-first workflow is as follows:

1. Edit `drizzle/schema.ts`
2. Run `pnpm drizzle-kit generate` to produce migration SQL
3. Apply the migration via `webdev_execute_sql` (or the Database panel in the Management UI)
4. Add query helpers in `server/db.ts`
5. Create tRPC procedures in the appropriate router file

---

## Key Integrations

### ElevenLabs (Voice AI)

ElevenLabs provides the conversational AI agent that answers phone calls. The integration has three layers:

1. **Agent Management** (`server/services/elevenLabsService.ts`) — CRUD operations for ElevenLabs agents via their REST API. Each shop can have its own agent with a unique voice, persona, and system prompt.

2. **Prompt Compilation** (`server/services/promptCompiler.ts`) — Takes shop-specific context (name, hours, services, promos) and compiles it into a system prompt using template variables like `{{SHOP_NAME}}`, `{{SERVICE_CATALOG}}`, `{{SHOP_HOURS}}`.

3. **Call Registration** (`server/services/twilioWebhooks.ts`) — When Twilio routes an inbound call, the webhook handler looks up the shop config from the context cache, compiles the prompt, and registers the call with ElevenLabs using `conversation_initiation_client_data`.

See `VOICE_AGENT.md` for the complete call flow documentation.

### Twilio (Telephony)

Twilio handles phone number provisioning and call routing. Key endpoints:

- `POST /api/twilio/voice` — Inbound call webhook (generates TwiML to bridge to ElevenLabs)
- `POST /api/twilio/status` — Call status callback (triggers post-call pipeline)
- `POST /api/twilio/recording` — Recording callback

Webhook signatures are verified via HMAC-SHA1 in `server/middleware/twilioValidation.ts`.

### Stripe (Payments)

Stripe handles subscription billing with three tiers (Starter $99/mo, Pro $199/mo, Elite $399/mo). The integration includes:

- Checkout session creation via `stripe.checkout.sessions.create()`
- Customer portal for self-service billing management
- Webhook endpoint at `/api/stripe/webhook` for event processing
- Product/price definitions in `server/stripe/products.ts`

---

## Environment Variables

All environment variables are managed through the Manus platform. **Never hardcode secrets or commit `.env` files.**

| Variable                                                      | Purpose                           |
| ------------------------------------------------------------- | --------------------------------- |
| `DATABASE_URL`                                                | MySQL/TiDB connection string      |
| `JWT_SECRET`                                                  | Session cookie signing secret     |
| `VITE_APP_ID`                                                 | Manus OAuth application ID        |
| `OAUTH_SERVER_URL`                                            | Manus OAuth backend URL           |
| `VITE_OAUTH_PORTAL_URL`                                       | Manus login portal URL (frontend) |
| `OWNER_OPEN_ID` / `OWNER_NAME`                                | Platform owner info               |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY`           | LLM, storage, notification APIs   |
| `VITE_FRONTEND_FORGE_API_URL` / `VITE_FRONTEND_FORGE_API_KEY` | Frontend Forge access             |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`                    | Twilio credentials                |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_AGENT_ID`                  | ElevenLabs credentials            |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`                 | Stripe credentials                |
| `VITE_STRIPE_PUBLISHABLE_KEY`                                 | Stripe public key (frontend)      |

---

## Development Commands

```bash
pnpm dev          # Start dev server (Vite + Express, hot reload)
pnpm build        # Production build (Vite frontend + esbuild server)
pnpm start        # Run production build
pnpm test         # Run all Vitest tests
pnpm check        # TypeScript type checking (no emit)
pnpm format       # Prettier formatting
pnpm db:push      # Generate + apply Drizzle migrations
```

---

## Testing

Tests are written with **Vitest** and live alongside the server code in `server/*.test.ts`. The current test suite has **81 tests across 6 files**:

| Test File             | Coverage                                               |
| --------------------- | ------------------------------------------------------ |
| `auth.logout.test.ts` | Authentication + logout flow                           |
| `baylio.test.ts`      | Core shop, call, subscription, notification procedures |
| `partner.test.ts`     | Partner enrollment, referrals, earnings, payouts       |
| `security.test.ts`    | Twilio signature validation + tenant isolation         |
| `elevenlabs.test.ts`  | ElevenLabs agent CRUD                                  |
| `twilio.test.ts`      | Twilio credential validation                           |

Run tests with `pnpm test` (single run) or `pnpm vitest` (watch mode).

---

## Coding Conventions

- **Router files** should stay under ~150 lines. When they grow, split into `server/routers/<feature>.ts`.
- **Database helpers** in `server/db.ts` return raw Drizzle rows. Business logic belongs in router procedures.
- **Frontend pages** follow the pattern: `trpc.*.useQuery()` for reads, `trpc.*.useMutation()` for writes, with optimistic updates for list operations.
- **Auth state** is accessed via `useAuth()` hook from `DashboardLayout` or `PartnersPortalLayout`. Never manipulate cookies directly.
- **Timestamps** are stored as UTC in the database. Frontend converts to local timezone for display using `new Date(utcTimestamp).toLocaleString()`.
- **File storage** uses S3 via `storagePut()` / `storageGet()`. Never store file bytes in the database.
- **Images and media** must be uploaded to CDN via `manus-upload-file --webdev`. Never store in `client/public/`.

---

## Related Documentation

- `DATA_MODEL.md` — Complete database schema with all 14 tables, fields, types, and relationships
- `API_REFERENCE.md` — Every tRPC procedure with inputs, outputs, and auth requirements
- `VOICE_AGENT.md` — ElevenLabs + Twilio integration, prompt compiler, and end-to-end call flow
- `PORTALS.md` — Multi-portal architecture, subdomain routing, and page inventory for each portal
