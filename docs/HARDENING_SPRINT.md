# Baylio Hardening Sprint Plan

**Date:** March 24, 2026
**Objective:** Make the core money path undeniably reliable before adding any new features.

---

## Golden Demo Flow

The one flow that must work perfectly before anything else:

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 1 | Shop owner visits baylio.io | GREEN | Landing page loads, all sections render |
| 2 | Shop owner signs up (OAuth) | GREEN | Manus OAuth flow works |
| 3 | First-time user sees onboarding wizard | YELLOW | Wizard UI built, backend endpoint built, not yet tested end-to-end |
| 4 | Owner enters shop details (name, phone, address, hours, services) | YELLOW | Form built in onboarding wizard, needs testing |
| 5 | Owner configures AI agent (name, voice, greeting) | YELLOW | Agent config page works, onboarding wizard version needs testing |
| 6 | Owner sets up phone (forward existing OR get new number) | YELLOW | New number purchase works, forwarding flow built but untested |
| 7 | System provisions ElevenLabs agent with compiled prompt | YELLOW | provisionAgent endpoint works, completeOnboarding endpoint built but untested |
| 8 | Customer calls the shop's number | GREEN | Twilio webhook receives call, routes to ElevenLabs |
| 9 | AI answers with shop-specific greeting and handles conversation | GREEN | Fixed today — agent now has real prompt and greeting |
| 10 | Call result lands in dashboard (call log, transcript, sentiment) | YELLOW | Call logs page exists, post-call pipeline exists, needs live call to verify |
| 11 | SMS/Calendar/Sheet/CRM update occurs | YELLOW | HubSpot integration built, Google Calendar built, SMS built — not verified live |
| 12 | Owner sees value immediately in dashboard | YELLOW | Dashboard exists with stats, needs real data to verify |

---

## Traffic-Light Readiness Table

| Module | Built | Integrated | Production-Ready | Status |
|--------|-------|------------|-------------------|--------|
| Landing page (baylio.io) | Yes | Yes | Yes | GREEN |
| Auth (Manus OAuth) | Yes | Yes | Yes | GREEN |
| Shop CRUD | Yes | Yes | Yes | GREEN |
| Agent config (voice, prompt, upsell) | Yes | Yes | Mostly | GREEN |
| ElevenLabs agent provisioning | Yes | Yes | Needs testing | YELLOW |
| Twilio phone provisioning | Yes | Yes | Needs testing | YELLOW |
| Inbound call routing (Twilio to ElevenLabs) | Yes | Yes | Fixed today | GREEN |
| Sales number (844-875-2441) | Yes | Yes | Fixed today | GREEN |
| Post-call pipeline (LLM analysis) | Yes | Yes | Needs live call | YELLOW |
| Call logs + transcripts | Yes | Yes | Needs live data | YELLOW |
| Analytics dashboard | Yes | Yes | Needs live data | YELLOW |
| Call scorecard (AI analysis) | Yes | Yes | Needs live data | YELLOW |
| Onboarding wizard | Yes | Partially | Needs end-to-end test | YELLOW |
| Subscription/billing (Stripe) | Yes | Yes | Needs live test | YELLOW |
| Contact form | Yes | Partially | DB save works, email broken | YELLOW |
| Email notifications (SMTP) | Yes | No | SMTP connection fails | RED |
| Partner portal | Yes | Yes | Yes | GREEN |
| Blog/SEO | Yes | Yes | Yes | GREEN |
| HubSpot integration | Yes | Yes | Needs live test | YELLOW |
| Google Calendar integration | Yes | Yes | Needs live test | YELLOW |
| SMS follow-up | Yes | Yes | Needs live test | YELLOW |
| Missed call audit/scorecard | Yes | Yes | Needs live test | YELLOW |
| Admin portal | Yes | Yes | Yes | GREEN |

---

## What Baylio Can Sell Today

1. **Missed call audit** — Show a shop owner how many calls they're missing and what it costs them. The revenue calculator on the landing page does this.
2. **Live AI receptionist demo** — Call (844) 875-2441 and hear Sam pitch Baylio. Fixed today.
3. **Pilot AI receptionist for one shop** — If onboarding wizard is tested and working, a shop can sign up and go live in under 10 minutes.
4. **Partner/referral program** — partners.baylio.io is live and functional.

---

## First-Customer Readiness Score (1-5)

| Area | Score | Blocker |
|------|-------|---------|
| Onboarding | 3/5 | Wizard built but untested end-to-end |
| Live call | 4/5 | Fixed today, needs live verification |
| Dashboard | 3/5 | Exists but needs real data to verify |
| Billing | 3/5 | Stripe wired but needs live payment test |
| Integrations | 2/5 | Built but none verified with real accounts |
| Support readiness | 2/5 | No support workflow, no help docs for shop owners |

**Overall: 2.8/5 — Not yet ready for a paying customer without manual hand-holding.**

---

## Critical Fixes Completed Today

| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| Voice agent disconnects after greeting | ElevenLabs agent had literal template variables (`{{baylio_greeting}}`, `{{baylio_system_prompt}}`) instead of compiled text | Updated agent with full 3,494-char sales prompt and real greeting |
| Sales number (844-875-2441) not working | Same root cause — agent had no real instructions | Same fix — agent now has full Baylio sales knowledge |

---

## Remaining Critical Issues

| Issue | Root Cause | Fix Required | Assigned To |
|-------|-----------|-------------|-------------|
| Contact form email not sending | SMTP connection to smtp.office365.com fails ("Connection closed") | Switch to transactional email service (Resend/SendGrid) OR configure MS365 app password | Claude Code |
| Production publish stability | Build succeeds, no errors found — may have been transient | Monitor next publish | Manus (monitor) |
| Onboarding wizard untested | Just built, needs end-to-end testing | Test full flow: create shop to go live | Manus |
| Per-shop agent provisioning untested | Code exists but never run with real shop data | Test with demo shop | Manus |
| Dashboard needs real data | All analytics/call log pages exist but have no live call data | Make a real test call through the system | Abdur + Manus |

---

## Commercial Milestones

| Milestone | Target | Blockers |
|-----------|--------|----------|
| First working pilot | 1 real shop, 1 week of live calls | Onboarding wizard testing, live call verification |
| First 3 shops | 3 shops on Trial/Starter plan | Onboarding polish, billing verification, basic support docs |
| First $1k MRR | ~5-7 shops on Starter/Pro | Stable product, word-of-mouth or partner referrals |
| First $10k MRR | ~30-50 shops | Marketing engine, SEO, content, partner network |

---

## Delegation Plan

See `DELEGATION_PLAN.md` for the full work breakdown across Manus, Claude Code, and Antigravity.
