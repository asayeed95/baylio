# BAYLIO — Claude Code Project Brief

> Claude Code reads this file automatically. Keep it updated as the single source of truth.

---

## MISSION

Baylio is an AI-powered phone receptionist for auto repair shops. It answers inbound calls, books appointments, upsells services, and handles customer inquiries — so shop owners never miss a call while they're under a car.

**Current phase: UI/UX polish sprint + production hardening.**

We are past the "make it work" phase. The core product is built, deployed, and functional. Now we're making it look and feel like a $10M SaaS product while hardening the remaining yellow-light systems.

Every decision should answer: "Does this get us closer to a shop owner paying $199/month and thinking this is a premium product?"

---

## CURRENT STATUS (as of March 31, 2026)

- **Repo:** github.com/asayeed95/baylio (private)
- **Domain:** baylio.io (live, DNS via Cloudflare, hosted on Vercel)
- **Database:** Supabase (PostgreSQL + Drizzle ORM) — fully migrated from TiDB/Manus
- **Auth:** Supabase Auth — fully migrated from Manus OAuth
- **Payments:** Stripe (59+ passing tests, 3 subscription tiers configured)
- **Voice AI:** ElevenLabs Conversational AI + Twilio + Claude reasoning engine
- **Frontend:** React 19 + Vite + Tailwind 4 + shadcn/ui — **LIGHT THEME** (recently switched from dark)
- **Backend:** Express 4 + tRPC 11
- **Deployment:** Vercel (SPA + serverless function at `/api/`)
- **Tests:** 14 test files, 147+ test specs, all passing
- **Codebase:** ~27,000+ lines across 64 server files, 27 client pages, 16 backend services

### What's GREEN (Working)

- baylio.io loads and serves the SPA correctly
- Supabase Auth (signup/login) works
- Landing page with ROI calculator
- Shop CRUD (create, read, update, delete)
- Agent config (voice, persona, greeting, upsell rules)
- Inbound call routing (Twilio to ElevenLabs) — fixed, agent has real compiled prompts
- Sales number (844-875-2441) — Sam agent answers with full Baylio sales knowledge
- Onboarding wizard UI (4 steps: Shop Details, Phone Setup, AI Agent, Go Live) — recently upgraded with category-based service picker, search, editable prices (22 services across 5 categories)
- Stripe billing integration (checkout sessions, webhooks, customer portal)
- Partner portal at partners.baylio.io
- Post-call pipeline architecture (LLM analysis, integrations, notifications)
- Admin portal
- 161+ passing tests

### What's YELLOW (Built but needs live verification)

- End-to-end onboarding flow (wizard built, needs real-world testing)
- Per-shop ElevenLabs agent provisioning (code exists, needs live test)
- Post-call pipeline (needs a real call to verify data flows to dashboard)
- Call logs + transcripts in dashboard (need real call data)
- Stripe subscription flow (wired but needs live payment test)
- SMS follow-up after calls
- Google Calendar / Sheets / HubSpot integrations (built, not verified with real accounts)

### What's RED (Known broken)

- Contact form email notifications (SMTP fails — needs switch to Resend or similar)

---

## DUAL-AGENT WORKFLOW

Baylio is built by two AI agents working in parallel. **Do not step on each other's work.**

| Agent | Tool | Scope | Brief File |
|---|---|---|---|
| **Claude Code** | Terminal CLI (primary builder) | Backend, deployment, architecture, core logic, database, API routes, testing, CLAUDE.md updates | `CLAUDE.md` (this file) |
| **Antigravity** | IDE (Gemini-powered) | UI/UX polish, visual design, light theme fixes, component styling, mobile responsiveness, empty/loading states | `ANTIGRAVITY_UIUX_SPRINT.md` |

### Coordination Rules

1. **Claude Code owns:** `server/`, `api/`, `drizzle/`, `shared/`, `vercel.json`, `package.json`, build scripts, deployment config, environment variables, and any backend logic.
2. **Antigravity owns:** `client/src/pages/`, `client/src/components/`, `client/src/index.css` (utility classes only, not theme vars), and visual presentation of all UI components.
3. **Shared territory (coordinate):** `client/src/App.tsx` (routes), `client/src/hooks/`, `client/src/lib/`, anything that touches both data flow and presentation.
4. **If Antigravity needs a new API endpoint or data shape**, it goes through Claude Code.
5. **If Claude Code needs a UI change**, describe it and let Antigravity handle the visual implementation.
6. **Both agents build and push to `main`.** Vercel auto-deploys on push. Run `pnpm run build:vercel` before pushing to ensure no build errors.

---

## TECH STACK (Final — Do NOT Change)

| Layer | Use This | NOT This |
|---|---|---|
| Database | Supabase PostgreSQL | TiDB, MySQL, Manus sandbox, SQLite |
| ORM | Drizzle | Prisma, raw SQL |
| Auth | Supabase Auth | Manus OAuth, custom auth, Firebase, Clerk |
| Hosting | Vercel | Railway, AWS, Heroku, Manus |
| Payments | Stripe | PayPal, custom billing |
| Voice | ElevenLabs Conversational AI | OpenAI TTS, Google TTS |
| Telephony | Twilio | Vonage, Plivo |
| AI Brain | Claude API (Anthropic) | OpenAI, Gemini |
| Frontend | React 19 + Vite + Tailwind 4 | Next.js (we're not migrating) |
| UI Components | shadcn/ui | MUI, Ant Design, Chakra |
| API | tRPC 11 + Express 4 | REST, GraphQL |
| Fonts | Inter (body) + JetBrains Mono (data/numbers) | — |

**Do NOT introduce new dependencies or frameworks without explicit approval.** Keep the stack tight.

---

## DESIGN SYSTEM (Active — Light Theme)

The app recently switched from dark to light theme. **All new code must use light theme.**

- **Theme:** Light (`defaultTheme="light"` in ThemeContext)
- **Primary color:** Teal/green (oklch 0.45 0.18 162) — use sparingly for CTAs, active states, key metrics
- **Cards:** White background, light border (`border-border`), `shadow-sm` at most
- **Typography:** Page titles = `text-2xl font-semibold tracking-tight`. Section labels = `text-sm font-medium`. Data = `font-mono tabular-nums`. Body = `text-sm`.
- **Buttons:** Primary = filled teal. Secondary = `variant="outline"`. Destructive = red outline. Ghost for subtle actions.
- **Icons:** Lucide icons. `h-4 w-4` inline, `h-5 w-5` standalone.
- **Spacing:** Generous white space. Don't cram elements together.
- **CSS vars:** Defined in `client/src/index.css`. Utility classes: `.stat-number`, `.stat-label`, `.panel`, `.badge-live`.

If you see hardcoded dark colors (bg-gray-900, text-white on dark cards, etc.) in any component, fix them.

---

## DEPLOYMENT ARCHITECTURE (Vercel)

Two parts with different Vercel treatment:

1. **Client SPA** — React app built by Vite to `dist/public/`. Served as static files.
2. **Express + tRPC Server** — Wrapped as a Vercel serverless function at `api/index.js`. Entry point: `server/vercel-entry.ts`.

### Build Commands

```bash
pnpm run build:client    # Build SPA only
pnpm run build:vercel    # Build SPA + bundle serverless function to api/index.js
pnpm run dev             # Local dev server (port 3000)
pnpm test                # Run all vitest tests
pnpm run db:push         # Generate + run Drizzle migrations
```

### vercel.json must:
- Route `/api/*` to the serverless function wrapping Express
- Serve everything else as the SPA (client-side routing)

### Environment Variables (Vercel)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Supabase PostgreSQL connection string)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ELEVENLABS_API_KEY`
- `ANTHROPIC_API_KEY`
- `SESSION_SECRET`
- `WEBHOOK_BASE_URL` (base URL for Twilio webhook configuration)

---

## PRICING TIERS

| Tier | Price | Included | What They Get |
|---|---|---|---|
| **Starter** | $199/mo | 500 calls/mo | AI receptionist, basic dashboard |
| **Professional** | $349/mo | 2,000 calls/mo | Appointment booking, SMS follow-ups |
| **Enterprise** | $599/mo | Unlimited calls | Multi-location, custom voice, priority support |

Free trial = 14 days, no credit card required. Overage = $0.15/min beyond included.

---

## FILE STRUCTURE

```
baylio/
├── api/
│   └── index.js                # Pre-bundled Vercel serverless function (generated)
├── client/
│   ├── index.html              # HTML entry (Google Fonts loaded here)
│   └── src/
│       ├── main.tsx            # App bootstrap, tRPC client
│       ├── App.tsx             # Route definitions, layout switching
│       ├── index.css           # Global theme (CSS variables, Tailwind)
│       ├── components/         # UI components (shadcn/ui + custom)
│       │   ├── DashboardLayout.tsx
│       │   ├── PartnersPortalLayout.tsx
│       │   └── ui/             # shadcn/ui primitives
│       ├── pages/              # 27 route pages
│       │   ├── Landing.tsx     # Public marketing page
│       │   ├── Login.tsx       # Supabase Auth login/signup
│       │   ├── Onboarding.tsx  # 4-step setup wizard
│       │   ├── Dashboard.tsx   # Main dashboard (post-login)
│       │   ├── ShopDetail.tsx  # Individual shop view
│       │   ├── CallLogs.tsx    # Call history with filters
│       │   ├── Analytics.tsx   # Call analytics (Recharts)
│       │   ├── Subscriptions.tsx # Billing & plans
│       │   └── ...             # + 19 more pages
│       ├── hooks/              # Custom React hooks
│       ├── contexts/           # ThemeContext
│       └── lib/                # tRPC client, utils
├── server/
│   ├── _core/                  # Framework plumbing (avoid editing)
│   ├── routers.ts              # Root tRPC router
│   ├── shopRouter.ts           # Shop CRUD + onboarding (586 lines)
│   ├── callRouter.ts           # Call log queries
│   ├── services/
│   │   ├── twilioWebhooks.ts   # THE CORE — inbound call handling (579 lines)
│   │   ├── elevenLabsService.ts # ElevenLabs agent CRUD
│   │   ├── promptCompiler.ts   # Shop context to AI prompt
│   │   ├── postCallPipeline.ts # Post-call LLM analysis
│   │   └── ...                 # + 11 more services
│   ├── middleware/
│   │   ├── twilioValidation.ts # Webhook signature validation
│   │   └── tenantScope.ts      # Multi-tenant data isolation
│   ├── stripe/                 # Stripe billing (products, router, webhooks)
│   └── *.test.ts               # 14 test files (147+ specs)
├── drizzle/
│   ├── schema.ts               # Database schema (17 tables)
│   └── relations.ts            # Drizzle relations
├── shared/                     # Shared types and constants
├── vercel.json                 # Vercel deployment config
├── package.json
├── CLAUDE.md                   # THIS FILE
├── ANTIGRAVITY_UIUX_SPRINT.md  # Antigravity's UI/UX brief
└── CLAUDE_HANDOFF.md           # Full architecture deep dive
```

---

## CORE ARCHITECTURE

### Live Call Flow (The Money Path)

```
Customer calls shop number
  → Twilio receives call, POSTs to /api/twilio/voice
  → twilioWebhooks.ts resolves shop context (contextCache → DB fallback)
  → promptCompiler.ts compiles shop-specific system prompt
  → ElevenLabs Register Call API returns TwiML with WebSocket URL
  → Twilio connects call audio to ElevenLabs WebSocket
  → AI agent converses with caller in real-time
  → Post-call: LLM analysis, usage metering, integrations, notifications
```

### Database (17 tables in Supabase PostgreSQL)

Key tables: `users`, `shops`, `agent_configs`, `call_logs`, `subscriptions`, `usage_records`, `missed_call_audits`, `caller_profiles`, `partners`, `referrals`, `shop_integrations`, `contact_submissions`, `notifications`, `organizations`.

Full schema in `drizzle/schema.ts`. Relations in `drizzle/relations.ts`.

### Authentication

Supabase Auth with cookie-based sessions. `protectedProcedure` in tRPC requires authenticated user. Role-based access: `admin` | `user`.

---

## SCALABILITY PRINCIPLES

Build for 1 shop today, don't paint yourself into a corner for 1,000.

1. **Multi-tenancy from day one** — Every query scoped to `shop_id` or `owner_id`. No global queries without tenant isolation.
2. **Stateless API** — No in-memory state on the server. Everything in Supabase. Vercel serverless functions are ephemeral.
3. **Twilio per-shop** — Each shop gets their own phone number. Voice agent context loaded per-call.
4. **Stripe per-shop** — Each shop has a Stripe customer ID. Subscription status gates feature access.
5. **Voice agent config is data, not code** — Shop name, services, hours, greeting = database rows. Zero code changes to add a new shop.
6. **Cost tracking** — Track per-call costs (Twilio + ElevenLabs + Claude) per shop for margin analysis.

---

## CODE QUALITY RULES

1. **No `any` types in TypeScript.** Use proper types or `unknown` with type guards.
2. **No `console.log` in production code.** Use a proper logger or remove before commit.
3. **Error handling on every external API call.** Twilio, ElevenLabs, Claude, Stripe — all need try/catch with meaningful error messages.
4. **No hardcoded secrets.** Everything via environment variables.
5. **Database migrations via Drizzle.** No manual SQL in production.
6. **Test before deploy.** Run `pnpm test` and fix failures before pushing.
7. **Light theme only.** No hardcoded dark colors in new components. Use CSS variables and shadcn/ui tokens.

---

## WHAT CLAUDE CODE SHOULD FOCUS ON NOW

### Priority 1: Production Hardening

- Verify end-to-end onboarding flow works with real data
- Test a real inbound call through the full pipeline (call → log → transcript → dashboard)
- Verify Stripe subscription flow with a live test payment
- Fix contact form email (switch from SMTP to Resend API)

### Priority 2: Backend Reliability

- Add proper error boundaries around async `setImmediate` callbacks in `twilioWebhooks.ts`
- Enable Twilio webhook signature validation (currently `logOnly: true`)
- Add authorization checks to all tRPC procedures (verify user owns the resource)
- Add rate limiting to public endpoints

### Priority 3: Support Antigravity's UI/UX Sprint

- If Antigravity needs new API endpoints or data shapes, build them
- If backend changes affect what the frontend renders, coordinate
- Keep `api/index.js` up to date — run `pnpm run build:vercel` and commit after backend changes

### What NOT to Do

- **Do NOT refactor the entire codebase.** Fix what's broken, ship what's needed.
- **Do NOT add new features beyond what's listed above.**
- **Do NOT switch frameworks, ORMs, or hosting providers.**
- **Do NOT spend time on CI/CD, Docker, or DevOps tooling.**
- **Do NOT touch UI components unless it's a backend-related fix.** That's Antigravity's territory.
- **Do NOT remove functionality.** If something works, keep it working.

---

## VOICE AGENT BEHAVIOR

When a customer calls a Baylio-powered shop:

1. **Greeting:** "Hi, thanks for calling [Shop Name]! How can I help you today?"
2. **Intent Detection:** Appointment booking, service inquiry, pricing question, emergency/tow, general question
3. **Information Gathering:** Collect name, phone, vehicle info, service needed, preferred time
4. **Booking:** Check available slots, confirm appointment
5. **Upsell (subtle):** "While we're doing your oil change, would you also like us to check your brakes? A lot of customers bundle those together."
6. **Closing:** Confirm details, thank them, end call

The agent uses a 3-Stage Reasoning Architecture: Symptom Extraction → Catalog Mapping → Natural Offer. Confidence thresholds: HIGH = offer upsell, MEDIUM = clarify first, LOW = just book.

---

## DECISION FRAMEWORK

When unsure about an approach:

1. **Does it work?** Ship working code over perfect code.
2. **Is it simple?** Fewer moving parts = fewer things to break.
3. **Is it scoped to a shop?** Multi-tenancy is non-negotiable.
4. **Can it scale without rewriting?** Good patterns now save rewrites later.
5. **Does the user see it?** User-facing bugs > internal code quality issues.

---

## KEY REFERENCE FILES

| File | Why It Matters |
|---|---|
| `server/services/twilioWebhooks.ts` | The money-making machine. Every bug here costs revenue. |
| `server/shopRouter.ts` | Shop CRUD + `completeOnboarding` — the core onboarding endpoint. |
| `server/services/promptCompiler.ts` | Compiles shop context into AI system prompts. |
| `server/services/elevenLabsService.ts` | ElevenLabs agent CRUD + voice catalog. |
| `server/stripe/products.ts` | Tier definitions and pricing. |
| `drizzle/schema.ts` | Full database schema (17 tables). |
| `CLAUDE_HANDOFF.md` | Deep architecture reference with file-by-file breakdown. |
| `ANTIGRAVITY_UIUX_SPRINT.md` | Antigravity's UI/UX brief — read to understand what they're working on. |

---

## THE METRIC THAT MATTERS

**Can a shop owner sign up on baylio.io, complete onboarding, and receive their first AI-answered call within 10 minutes — and think "this is worth $199/month"?**

If yes, we're ready. If no, fix whatever's blocking that.

---

*Last updated: March 31, 2026*
*Owner: Abdur (asayeed95 / One Asec LLC)*
*Agents: Claude Code (backend/infra) + Antigravity (UI/UX)*
