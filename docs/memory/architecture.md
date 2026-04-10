# Baylio — Architecture Snapshot

**Last updated:** 2026-04-10
**Source of truth:** `drizzle/schema.ts` (schema), `CLAUDE.md` (conventions), `server/vercel-entry.ts` (prod entry)

---

## Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 24 LTS |
| Language | TypeScript | 5.9.3 (strict) |
| Package manager | pnpm | 10.4.1 |
| Frontend | React + Vite | 19.2 + 7.1 |
| Routing (client) | wouter (patched) | 3.3 |
| Styling | Tailwind CSS 4.1 + shadcn/ui | — |
| Forms | react-hook-form + zod | 7.64 + 4.1 |
| Data fetching | TanStack Query 5.90 + tRPC client 11.6 | — |
| Charts | recharts | 2.15 |
| Backend | Express | 4.21 |
| API layer | tRPC server | 11.6 |
| ORM | Drizzle ORM | 0.44 |
| Database | Supabase PostgreSQL | — |
| Auth | Supabase Auth (@supabase/ssr 0.9) | — |
| Telephony | Twilio | 5.13 |
| Voice AI | ElevenLabs Conversational AI | 1.59 |
| Post-call LLM | Anthropic Claude API | — |
| Billing | Stripe | 20.4 |
| Email | Resend | 6.9 |
| Analytics | PostHog | posthog-node 5.28 |
| Hosting | Vercel (SPA static + serverless function) | — |
| Tests | vitest | 2.1 |

---

## Deployment Model

Two pieces, one Vercel project:

1. **Client SPA** — React app built by Vite → `dist/public/`, served as static files by Vercel CDN.
2. **Serverless API** — Express + tRPC bundled by esbuild into a single `api/index.js` file. Routed to `/api/*`.

**Key quirk:** `api/index.js` is committed to git (pre-bundled). Vercel detects it and skips its own bundling. Always run `pnpm run build:vercel` before `git push`. Never edit `api/index.js` directly.

**Two Express entry points:**
- `server/_core/index.ts` — local dev, imports Vite dev middleware (devDependency)
- `server/vercel-entry.ts` — production, no Vite import, bundled by esbuild

---

## Frontend Structure

```
client/src/
├── main.tsx              # App bootstrap + tRPC client setup
├── App.tsx               # Route table (wouter) + layout switching
├── index.css             # CSS variables (light theme only)
├── pages/                # 27 route pages, one file per route
├── components/
│   ├── ui/               # shadcn/ui primitives (Radix-based, do not edit)
│   ├── DashboardLayout.tsx
│   ├── VoicePicker.tsx   # 16-voice grid with TTS preview
│   └── PersonalityPicker.tsx  # 4 presets + 3 sliders
├── hooks/                # useAuth, tRPC wrappers
├── contexts/             # ThemeContext
└── lib/                  # tRPC client, cn(), utils
```

**Theme:** Light only. CSS variables in `index.css`. No hardcoded dark colors.

---

## Backend Structure

```
server/
├── _core/                # Framework plumbing
│   ├── trpc.ts           # publicProcedure / protectedProcedure / adminProcedure
│   ├── context.ts        # tRPC context: Supabase session → ctx.user
│   ├── env.ts            # Fail-fast env var validation (production)
│   └── llm.ts            # Claude API client (post-call analysis)
├── vercel-entry.ts       # Production entry point
├── routers.ts            # Root tRPC router composition
├── shopRouter.ts         # Shop CRUD + phone provisioning + agent config + previewVoice
├── callRouter.ts         # Call logs, analytics, missed-call audits
├── subscriptionRouter.ts # Stripe tier management
├── notificationRouter.ts # In-app alerts
├── integrationRouter.ts  # Google/HubSpot/Shopmonkey OAuth + settings
├── middleware/
│   ├── twilioValidation.ts  # HMAC-SHA1 + Vercel ?path= strip (LOAD BEARING)
│   └── rateLimiter.ts       # In-memory sliding window
└── services/
    ├── twilioWebhooks.ts    # THE MONEY PATH — /voice, /no-answer, /status handlers
    ├── promptCompiler.ts    # Shop context → system prompt (persona, language, personality)
    ├── contextCache.ts      # In-memory phone→shop→context cache (hot path)
    ├── elevenLabsService.ts # Agent CRUD + retry + voice catalog re-export
    ├── postCallPipeline.ts  # Transcription analysis → LLM → usage → integrations
    └── twilioProvisioning.ts # Phone number buy/search/release
```

---

## Database Structure (18 Tables)

**Database:** Supabase PostgreSQL. Schema in `drizzle/schema.ts`. All tables use camelCase columns (Drizzle maps to snake_case).

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Supabase-backed auth users | id, email, role |
| `organizations` | Multi-location grouping | ownerId, name |
| `shops` | Core tenant entity | ownerId, twilioPhoneNumber, phone, ringShopFirstEnabled, ringTimeoutSec, businessHours, serviceCatalog |
| `agent_configs` | Per-shop voice/persona | shopId, elevenLabsAgentId, voiceId, language, characterPreset, warmth, salesIntensity, technicalDepth |
| `call_logs` | Every inbound call | shopId, twilioCallSid, callerPhone, handledByAI, transcription, analysis fields |
| `caller_profiles` | Deduped caller DB | phone (unique), callerRole, callCount, smsOptOut |
| `subscriptions` | Stripe state | shopId, tier, status, includedMinutes, usedMinutes, setupFeePaid |
| `usage_records` | Per-call metering | shopId, callLogId, durationSeconds |
| `missed_call_audits` | Audit campaigns | ownerId, shopId, status |
| `audit_call_entries` | Per-call audit rows | auditId, callerPhone, callStatus |
| `notifications` | In-app alerts | userId, type, isRead |
| `partners` | Partner program | userId, referralCode, earnings |
| `referrals` | Partner referrals | partnerId, referredUserId |
| `payouts` | Partner payouts | partnerId, amount, status |
| `shop_integrations` | OAuth tokens | shopId, provider, accessToken |
| `integration_sync_logs` | Integration history | shopId, provider, syncStatus |
| `contact_submissions` | Public contact form | email, message |
| `organization_members` | Multi-user shop access | organizationId, userId, role |

**Migration strategy:** drizzle-kit push is broken (stale MySQL files). Use one-off `.mjs` scripts in `scripts/` run via `node --env-file=.env.test scripts/<file>.mjs`.

---

## Auth Model

- **Supabase Auth** — cookie-based sessions via `@supabase/ssr`
- Session cookie set on login, verified server-side in every `protectedProcedure`
- `ctx.user` available in all protected procedures (contains `id`, `email`, `role`)
- Admin role required for `/admin` routes (`adminProcedure`)
- No JWT_SECRET — session tokens are managed by Supabase, not custom code

---

## Live Call Flow (The Money Path)

```
Customer calls Baylio number
  → Twilio → POST /api/twilio/voice
  → twilioValidation middleware (HMAC-SHA1, strips Vercel ?path= param)
  → twilioWebhooks.ts /voice handler:
      1. lookupCallerProfile(From) — fire-and-forget profile upsert
      2. Sales line bypass: if To === 844-875-2441 → route to Sam (agent_8401kkzx0edafhbb0c56a04d1kmb)
      3. resolveShopContext(To) — contextCache lookup (phone → shopId → ShopContext)
      4. Cache miss → DB join (shops + agent_configs)
      5. getShopRingConfig(shopId) — ring-first settings
      6. IF ringShopFirstEnabled AND shop.phone:
            → Return <Dial timeout=N>shop.phone</Dial> action="/api/twilio/no-answer"
         ELSE:
            → respondWithElevenLabsAgent() — direct to AI
  → /api/twilio/no-answer (if ring-first):
      → DialCallStatus=completed/answered → empty TwiML (human handled)
      → DialCallStatus=no-answer/busy/failed → respondWithElevenLabsAgent()
  → respondWithElevenLabsAgent:
      → registerElevenLabsCall() → get TwiML with authenticated WSS URL
      → Return TwiML to Twilio (<2s target)
  → Twilio bridges audio to ElevenLabs WebSocket
  → AI agent converses live
  → Call ends → Twilio POST /api/twilio/status
  → setImmediate → processCompletedCall():
      → Insert/update call_log row
      → analyzeTranscription() → LLM analysis (intent, sentiment, appointmentDateTime, revenue)
      → Usage metering
      → Owner notifications (high-value leads)
      → Integrations (Google Calendar, Sheets, HubSpot, SMS follow-up)
```

---

## External Services

| Service | Purpose | Key IDs |
|---------|---------|---------|
| Twilio | Telephony, phone provisioning, SMS | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER |
| ElevenLabs | Voice AI agent, TTS preview | ELEVENLABS_API_KEY; Zee: agent_0601knpttvyyebcv6cnnkrhv1sh1; Sam: agent_8401kkzx0edafhbb0c56a04d1kmb |
| Anthropic | Post-call LLM analysis | ANTHROPIC_API_KEY |
| Stripe | Subscriptions ($199/$349/$599) | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |
| Supabase | PostgreSQL + Auth | DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
| Resend | Transactional email | RESEND_API_KEY |
| PostHog | Analytics + feature flags | POSTHOG_API_KEY |
| Google APIs | Calendar/Sheets OAuth | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| HubSpot | CRM sync | HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET |

---

## Key Architectural Decisions

1. **Vite SPA + Express serverless, not Next.js** — dashboard app for authenticated users, SEO irrelevant. Migration cost high, benefit near-zero.
2. **tRPC not REST/GraphQL** — zero client-side type maintenance, zod validation built-in.
3. **Drizzle not Prisma** — smaller bundle, closer-to-SQL, no Prisma engine binary cold-start penalty.
4. **Supabase not custom Postgres + auth** — free tier generous, Auth UI saves weeks, realtime available.
5. **ElevenLabs not OpenAI/Gemini voice** — most human-sounding, Register Call API keeps key server-side.
6. **Claude API for post-call analysis** — best structured output reliability with strict JSON schema.
7. **api/index.js committed** — Vercel ESM compatibility issues; esbuild pre-bundle bypasses Vercel heuristics.
8. **setImmediate for async post-call work** — acceptable for MVP traffic; Vercel Queues upgrade path documented.
9. **In-memory contextCache** — first call after cold start hits DB, subsequent cached. Upstash Redis when 100+ QPS.
10. **Light theme only** — target audience (45+ auto shop owners) associates dark themes with "gaming software."

---

## Known Architectural Weaknesses

- `setImmediate` post-call work is not durable (see LOOP-011)
- In-memory rate limiter and contextCache are per-instance, not distributed (see LOOP-012)
- drizzle-kit push permanently broken until MySQL migration files are deleted (see LOOP-006)
- No `.env.example` file — new developers must ask for env var list
- Two Express entry points must stay in sync manually (no automated check)
- wouter patched via `patches/wouter@3.7.1.patch` — upgrade requires re-patching
