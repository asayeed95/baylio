# BAYLIO — Claude Code Project Brief

> Drop this file in the root of your Baylio repo. Claude Code will read it automatically.

---

## MISSION

Baylio is an AI-powered phone receptionist for auto repair shops. It answers inbound calls, books appointments, upsells services, and handles customer inquiries — so shop owners never miss a call while they're under a car.

**We are in a 2-day sprint to get Baylio production-ready and close our first paying customer (Autoblitz).**

Every decision you make should answer: "Does this get us closer to a shop owner paying $199/month?"

If the answer is no, don't do it.

---

## CURRENT STATUS

- **Repo:** github.com/asayeed95/baylio (private)
- **Domain:** baylio.io (live, DNS via Cloudflare, hosted on Vercel)
- **Database:** Supabase (PostgreSQL + Drizzle ORM) — migrated from TiDB/Manus
- **Auth:** Supabase Auth
- **Payments:** Stripe (59 passing tests)
- **Voice AI:** ElevenLabs + Twilio + Claude reasoning engine
- **Frontend:** React dashboard
- **Backend:** Express + tRPC
- **Deployment:** Vercel (needs serverless function config for Express backend)

---

## TECH STACK RULES

| Layer | Use This | NOT This |
|---|---|---|
| Database | Supabase PostgreSQL | TiDB, MySQL, Manus sandbox, SQLite |
| ORM | Drizzle | Prisma, raw SQL |
| Auth | Supabase Auth | Custom auth, Firebase, Clerk |
| Hosting | Vercel | Railway, AWS, Heroku, Manus |
| Payments | Stripe | PayPal, custom billing |
| Voice | ElevenLabs | OpenAI TTS, Google TTS |
| Telephony | Twilio | Vonage, Plivo |
| AI Brain | Claude API (Anthropic) | OpenAI, Gemini |
| Frontend | React + Vite | Next.js (we're not migrating) |
| API | tRPC + Express | REST, GraphQL |

**Do NOT introduce new dependencies or frameworks without explicit approval.** Keep the stack tight.

---

## DEPLOYMENT ARCHITECTURE (Vercel)

Baylio has two parts that need different Vercel treatment:

1. **Client SPA** — React app built to `dist/public/`. Serve as static files.
2. **Express + tRPC Server** — Must be wrapped as a Vercel serverless function at `/api/` routes. NOT a standalone Node process.

### vercel.json must:
- Set `outputDirectory` to the client build folder
- Route `/api/*` to the serverless function wrapping Express
- Serve everything else as the SPA (client-side routing)

### Environment variables required on Vercel:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ELEVENLABS_API_KEY`
- `ANTHROPIC_API_KEY`
- `DATABASE_URL` (Supabase PostgreSQL connection string)
- `SESSION_SECRET`

---

## PRICING TIERS

| Tier | Price | What They Get |
|---|---|---|
| **Starter** | $199/mo | AI receptionist, 500 calls/mo, basic dashboard |
| **Professional** | $349/mo | 2,000 calls/mo, appointment booking, SMS follow-ups |
| **Enterprise** | $599/mo | Unlimited calls, multi-location, custom voice, priority support |

Stripe must be configured with these three subscription tiers. Free trial = 14 days, no credit card required.

---

## WHAT MUST WORK BEFORE WE PITCH AUTOBLITZ

This is the minimum viable checklist. Nothing else matters until these work:

### Critical Path (Must Have)
- [ ] baylio.io loads the dashboard (not raw JS/source code)
- [ ] User can sign up / log in via Supabase Auth
- [ ] Onboarding wizard completes without errors
- [ ] Shop owner can configure their business info (name, hours, services)
- [ ] Inbound Twilio call connects to ElevenLabs voice agent
- [ ] Voice agent answers with shop-specific greeting
- [ ] Voice agent can book an appointment
- [ ] Call logs appear in the dashboard
- [ ] Stripe checkout works for all 3 tiers
- [ ] No console errors, no broken pages, no dead links

### Nice to Have (Do NOT prioritize over critical path)
- [ ] Analytics charts on dashboard
- [ ] SMS follow-up after calls
- [ ] Email notifications
- [ ] Custom voice selection
- [ ] Multi-location support

---

## SCALABILITY PRINCIPLES

Build for 1 shop today, but don't paint yourself into a corner for 1,000 shops.

1. **Multi-tenancy from day one** — Every database query must be scoped to a `shop_id` or `organization_id`. No global queries without tenant isolation.

2. **Stateless API** — No in-memory state on the server. Everything in Supabase or Redis. Vercel serverless functions are ephemeral.

3. **Twilio per-shop** — Each shop gets their own Twilio phone number. The voice agent context (greeting, services, hours) is loaded per-call based on the incoming number.

4. **Stripe per-shop** — Each shop has a Stripe customer ID. Subscription status gates feature access.

5. **Voice agent config is data, not code** — Shop name, services offered, business hours, greeting script = database rows, not hardcoded. Adding a new shop should require zero code changes.

6. **Cost tracking** — Track per-call costs (Twilio minutes + ElevenLabs characters + Claude tokens) per shop. This is critical for margin analysis as we scale.

---

## CODE QUALITY RULES

1. **No `any` types in TypeScript.** Use proper types or `unknown` with type guards.
2. **No `console.log` in production code.** Use a proper logger or remove before commit.
3. **Error handling on every API call.** Twilio, ElevenLabs, Claude, Stripe — all external calls need try/catch with meaningful error messages.
4. **No hardcoded secrets.** Everything via environment variables.
5. **Database migrations via Drizzle.** No manual SQL in production.
6. **Test before deploy.** Run `npm test` and fix failures before pushing.

---

## FILE STRUCTURE EXPECTATIONS

```
baylio/
├── api/                    # Vercel serverless function entry point
│   └── index.ts            # Express app wrapped for serverless
├── src/
│   ├── client/             # React frontend
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Client utilities
│   ├── server/             # Backend logic
│   │   ├── routes/         # tRPC routers
│   │   ├── services/       # Business logic (voice, billing, etc.)
│   │   ├── db/             # Drizzle schema + migrations
│   │   └── lib/            # Server utilities
│   └── shared/             # Shared types and constants
├── dist/                   # Build output
├── drizzle/                # Migration files
├── vercel.json             # Vercel deployment config
├── package.json
├── tsconfig.json
├── CLAUDE.md               # THIS FILE — you are reading it
└── .env.example            # Template for required env vars
```

---

## DECISION FRAMEWORK

When you're unsure about an approach, use this priority order:

1. **Does it work?** Ship working code over perfect code.
2. **Is it simple?** Fewer moving parts = fewer things to break.
3. **Is it scoped to a shop?** Multi-tenancy is non-negotiable.
4. **Can it scale without rewriting?** Good patterns now save rewrites later.
5. **Does the user see it?** User-facing bugs > internal code quality issues.

---

## WHAT NOT TO DO

- **Do NOT refactor the entire codebase.** Fix what's broken, ship what's needed.
- **Do NOT add new features beyond the critical path checklist.**
- **Do NOT switch frameworks, ORMs, or hosting providers.**
- **Do NOT spend time on CI/CD, Docker, or DevOps tooling right now.**
- **Do NOT optimize performance prematurely.** We need 1 customer, not 10,000.
- **Do NOT build admin panels, analytics engines, or reporting dashboards.** The basic dashboard showing call logs is enough.

---

## VOICE AGENT BEHAVIOR

When a customer calls a Baylio-powered shop:

1. **Greeting:** "Hi, thanks for calling [Shop Name]! How can I help you today?"
2. **Intent Detection:** Appointment booking, service inquiry, pricing question, emergency/tow, or general question
3. **Information Gathering:** Collect name, phone, vehicle info, service needed, preferred time
4. **Booking:** Check available slots, confirm appointment
5. **Upsell (subtle):** "While we're doing your oil change, would you also like us to check your brakes? A lot of customers bundle those together."
6. **Closing:** Confirm details, thank them, end call

The agent should sound natural, not robotic. It should handle interruptions, unclear responses, and "I don't know" gracefully.

---

## IMMEDIATE PRIORITY (RIGHT NOW)

1. Fix Vercel deployment — Express must run as serverless function, SPA must serve correctly
2. Verify Supabase connection works in production (not just local)
3. Test the full signup → onboarding → call flow end-to-end
4. Fix any dashboard bugs that block the demo
5. Prepare for Autoblitz pitch tomorrow

**The only metric that matters: Can a shop owner sign up on baylio.io and receive their first AI-answered call within 10 minutes?**

If yes, we're ready. If no, fix whatever's blocking that.

---

*Last updated: March 28, 2026*
*Owner: Abdur (asayeed95)*
*Goal: First paying customer by March 30, 2026*
