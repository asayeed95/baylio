# Baylio — Roadmap

**Format:** Checkboxes. Check off when done. Add date + commit when closing.
**North star:** First paying customer completes onboarding and stays for 30 days.

---

## P0 — Ship-Blockers (Autoblitz Launch)

- [ ] **Run full user journey end-to-end** — Abdur signs up fresh, completes onboarding, provisions Baylio number, calls from different phone, verifies ring-first (12s) → AI handoff → call log appears in dashboard → transcript visible.
  - _Why: No real shop has ever run this full path. Bugs here = no launch._

- [ ] **Stripe live payment test** — Charge a real card on a test subscription. Verify `subscriptions.status = 'active'`, `setupFeePaid = true`, shop unlocks dashboard features.
  - _Why: Revenue is the goal. Untested payment = can't charge real customers._

---

## P1 — Production Reliability (Before First 10 Customers)

- [x] ~~Authorization audit — grep all tRPC procedures for missing ownership checks~~ _(done 2026-04-10, all clean)_
- [x] ~~setImmediate error boundaries — verify all callbacks have try/catch~~ _(done 2026-04-10, all covered)_
- [x] ~~Fix hardcoded "tomorrow" appointmentDateTime~~ _(done 2026-04-10, LLM extracts it now)_
- [x] ~~Remove serviceCatalog as-any casts~~ _(done 2026-04-10)_
- [ ] **Investigate declined-call → voicemail bug** — when shop owner manually declines call, `DialCallStatus=completed` and AI never picks up. Consider Answering Machine Detection (AMD) or accept as known limitation.
- [ ] **Verify post-call pipeline with real traffic** — make a real call, let it complete, check `call_logs` table has transcript + analysis, verify dashboard renders it correctly.
- [ ] **Add `.env.example`** — no new developer can onboard without asking for env vars. Create `/.env.example` with all var names + descriptions (no values).

---

## P2 — Customer-Requested Features (Post-Launch, Pre-Scale)

- [ ] **Live call transfer to human** — ElevenLabs tool call → TwiML `<Dial>` to shop owner's cell. Needs agent tool definition + new webhook handler.
  - _Why: Shop owners ask for this. Currently agent just collects callback number._
- [ ] **Graceful hang-up** — ElevenLabs tool call → TwiML `<Hangup />`. Currently ElevenLabs ends conversation naturally with no control.
- [ ] **QuickBooks integration** — OAuth + invoice creation on appointment booking. Requested by Abdur's walk-through with shop owners.
- [ ] **WhatsApp group reminders** — Twilio WhatsApp Business API for shop owner group notifications.
- [ ] **After-hours AI mode** — shop can configure "always go straight to AI" for after-hours (ring-first disabled on schedule).

---

## P3 — Layered Phone Provisioning (Post-Autoblitz)

- [x] ~~Layer 1: Baylio number + ring shop first via `<Dial>`~~ _(shipped 2026-04-07)_
- [ ] **Layer 2: Number porting** — Twilio Porting API + LOA upload + status tracking. Shops that want to keep their advertised number.
- [ ] **Layer 3: SIP trunking** — Twilio SIP Trunks API for shops with existing VoIP/PBX systems.
- [ ] **Layer 4: Carrier forwarding fallback UI** — per-carrier `*61*` instruction cards in ShopSettings.

---

## P4 — Infrastructure Scale (100+ Shops)

- [ ] **Upstash Redis for contextCache** — replace in-memory cache with distributed Redis. Eliminates cold-start DB hit.
- [ ] **Vercel Queues for post-call pipeline** — replace `setImmediate` with durable job queue. Eliminates ~5% job loss on function cold termination.
- [ ] **Upstash Redis for rate limiter** — replace per-instance limiter with distributed rate limiting.
- [ ] **Fix drizzle-kit push** — delete stale MySQL migration files, delete `drizzle/meta/` snapshots, regenerate schema from current Postgres state. Unblocks standard migration workflow.

---

## NEVER (Decided)

- ~~Migrate to Next.js~~ — SPA is intentional. SEO not the bottleneck.
- ~~Redux / Zustand / Jotai~~ — TanStack Query + tRPC is sufficient.
- ~~REST or GraphQL endpoints~~ — tRPC only for new features.
- ~~OpenAI/Gemini voice~~ — ElevenLabs only.
- ~~OpenAI/Gemini for post-call LLM~~ — Claude API only.
- ~~Vonage / Plivo telephony~~ — Twilio only.
- ~~MUI / Chakra / Ant Design~~ — shadcn/ui + Radix only.
- ~~Docker / Kubernetes~~ — Vercel handles hosting.
