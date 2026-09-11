# Baylio Hardening Sprint — Delegation Plan

**Date:** March 24, 2026
**Sprint Goal:** Make the Golden Demo Flow work end-to-end, reliably, every time.

---

## How to Think About Delegation

| Tool | Best For | Limitations |
|------|----------|-------------|
| **Manus** | Full-stack web app changes (Baylio codebase), database migrations, deployment, API integrations, Twilio/ElevenLabs config, testing in the live sandbox | Cannot run on your local machine directly |
| **Claude Code** | Isolated code tasks, refactoring, writing new modules/services, fixing specific files, writing tests, documentation | Works on your local repo clone; no access to live Manus environment, secrets, or database |
| **Antigravity** | UI/UX design, rapid prototyping, visual polish, landing page iterations, design system work | Best for frontend-heavy visual work; limited backend capability |

**Rule of thumb:** If it touches the live database, secrets, Twilio, ElevenLabs, or deployment — Manus does it. If it's a self-contained code module or refactor — Claude Code. If it's visual design and UI polish — Antigravity.

---

## Work Breakdown

### MANUS (You + Me, Right Now)

These tasks require access to the live environment, secrets, APIs, and database.

| # | Task | Priority | Est. Time |
|---|------|----------|-----------|
| M1 | Test onboarding wizard end-to-end (create shop, configure agent, provision ElevenLabs, assign phone) | P0 | 1-2 hours |
| M2 | Make a real test call through the system and verify call log, transcript, and analytics land correctly | P0 | 30 min |
| M3 | Verify post-call pipeline fires (LLM analysis, sentiment, intent, upsell tracking) | P0 | 30 min |
| M4 | Test Stripe subscription flow (sign up, choose plan, pay, verify access) | P1 | 1 hour |
| M5 | Build proper per-account dashboard (at-a-glance stats, recent calls, agent status, quick actions) | P1 | 2-3 hours |
| M6 | Auto-redirect first-time users to onboarding wizard | P1 | 30 min |
| M7 | Test call forwarding flow (shop forwards existing number to Baylio number) | P1 | 1 hour |
| M8 | Monitor next production publish for errors | P2 | 15 min |

---

### CLAUDE CODE (Run on Your Local Machine)

These are self-contained code tasks that don't need the live environment. Clone the repo from GitHub (Settings > GitHub > Export), work locally, then push changes.

**Prompt template for Claude Code:**

> You are working on Baylio, an AI call assistant for auto repair shops. The codebase is a React 19 + Tailwind 4 + Express 4 + tRPC 11 monorepo. Server code is in `server/`, client code is in `client/src/`, database schema is in `drizzle/schema.ts`.

| # | Task | Priority | Claude Code Prompt |
|---|------|----------|--------------------|
| C1 | **Fix email service — switch from SMTP to Resend API** | P0 | "Replace the nodemailer SMTP transport in `server/services/emailService.ts` with the Resend API (https://resend.com). Install the `resend` npm package. The API key will be in `process.env.RESEND_API_KEY`. Keep the same `sendContactNotification` function signature. Send from `hello@baylio.io` to `hello@baylio.io`. Add error logging. Write a vitest test in `server/emailService.test.ts`." |
| C2 | **Write comprehensive vitest tests for the onboarding flow** | P1 | "Write vitest tests in `server/shopRouter.test.ts` for the `completeOnboarding` tRPC procedure. Test: (1) successful shop creation with all fields, (2) agent config creation, (3) ElevenLabs agent provisioning (mock the API), (4) phone number assignment, (5) validation errors for missing required fields. Mock the database and external APIs. Follow the pattern in `server/auth.logout.test.ts`." |
| C3 | **Add shop owner help docs / knowledge base page** | P1 | "Create a new page at `client/src/pages/Help.tsx` with an FAQ/knowledge base for shop owners. Include sections: Getting Started, Phone Setup (forwarding vs new number), AI Agent Configuration, Understanding Your Dashboard, Call Analytics, Billing & Plans, Troubleshooting. Use shadcn/ui Accordion component. Add route in `client/src/App.tsx` at `/help`. Add link in the DashboardLayout sidebar." |
| C4 | **Code-split the frontend bundle** | P2 | "The production build shows a 2MB JS bundle. Add React.lazy() and Suspense to code-split the routes in `client/src/App.tsx`. Each page component should be lazy-loaded. Add a loading fallback component. This will improve initial load time." |
| C5 | **Add retry logic to ElevenLabs API calls** | P2 | "Add exponential backoff retry logic to `server/services/elevenLabsService.ts`. Wrap all API calls in a `withRetry()` helper that retries up to 3 times with 1s, 2s, 4s delays on 429 or 5xx errors. Log each retry attempt. Write tests." |
| C6 | **Write a demo data seeder script** | P2 | "Create `server/scripts/seed-demo.mjs` that seeds a demo shop with: 10 sample call logs (mix of completed/missed), sample analytics data, a configured agent, and sample caller profiles. This is for demo purposes so the dashboard looks populated. Use the database schema from `drizzle/schema.ts`." |

---

### ANTIGRAVITY (UI/UX Polish)

These are visual/design tasks that improve the product's look and feel.

| # | Task | Priority | Description |
|---|------|----------|-------------|
| A1 | **Polish the onboarding wizard UI** | P1 | The 4-step wizard (Shop Details, Phone Setup, AI Agent, Go Live) needs visual polish — progress indicator, smooth transitions between steps, mobile responsiveness, success celebration animation on Go Live |
| A2 | **Redesign the shop dashboard** | P1 | The per-shop dashboard needs a professional layout: stat cards at top, recent calls feed, agent status indicator, quick action buttons. Think Stripe Dashboard meets auto shop aesthetic |
| A3 | **Mobile-responsive audit** | P2 | Test all pages on mobile viewports and fix layout issues. Priority pages: landing page, onboarding wizard, dashboard, call logs |
| A4 | **Empty state designs** | P2 | Design empty states for: no calls yet, no shops yet, no analytics data. These are what new users see first — they need to be encouraging, not blank |
| A5 | **Loading state improvements** | P2 | Replace generic spinners with skeleton loaders on dashboard, call logs, and analytics pages |

---

## Execution Order

**Phase 1 — Core reliability (TODAY/TOMORROW)**

| Who | Task |
|-----|------|
| Manus | M1: Test onboarding wizard end-to-end |
| Manus | M2: Make a real test call |
| Manus | M3: Verify post-call pipeline |
| Claude Code | C1: Fix email service (switch to Resend) |
| Claude Code | C2: Write onboarding tests |

**Phase 2 — Demo readiness (THIS WEEK)**

| Who | Task |
|-----|------|
| Manus | M4: Test Stripe subscription flow |
| Manus | M5: Build per-account dashboard |
| Manus | M6: Auto-redirect to onboarding |
| Claude Code | C3: Help docs page |
| Claude Code | C6: Demo data seeder |
| Antigravity | A1: Polish onboarding wizard |

**Phase 3 — Polish and scale (NEXT WEEK)**

| Who | Task |
|-----|------|
| Manus | M7: Test call forwarding |
| Claude Code | C4: Code-split bundle |
| Claude Code | C5: ElevenLabs retry logic |
| Antigravity | A2: Redesign dashboard |
| Antigravity | A3: Mobile audit |
| Antigravity | A4-A5: Empty states and loading |

---

## What You (Abdur) Do

1. **Right now:** Call (844) 875-2441 and verify Sam answers correctly. Report back.
2. **Today:** Export the Baylio repo to GitHub (Settings > GitHub in Management UI) so Claude Code can work on it.
3. **Today:** Sign up for Resend (resend.com) — free tier is 100 emails/day, plenty for now. Get the API key for Claude Code task C1.
4. **This week:** Test the full onboarding flow yourself as a shop owner. Report any issues.
5. **This week:** Record a video walkthrough of the Golden Demo Flow for YouTube content.
6. **This week:** Reach out to 1-2 shop owners for a pilot. Use the missed call audit angle.

---

## Success Criteria for This Sprint

The sprint is done when:

1. A new user can sign up, complete onboarding, and have a working AI agent answering their phone — without any manual intervention
2. Call (844) 875-2441 works reliably every time for sales demos
3. A completed call shows up in the dashboard with transcript and AI analysis
4. Contact form submissions send email notifications
5. One demo account exists with populated data for sales meetings
