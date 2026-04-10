# Baylio — Revenue Status

**Last updated:** 2026-04-10
**Stage:** Pre-revenue. Launch imminent (Autoblitz).

---

## Business Model

| Tier | Price/mo | Minutes Included | Overage |
|------|---------|-----------------|---------|
| Starter | $199 | 300 min | $0.05/min |
| Pro | $349 | 750 min | $0.04/min |
| Elite | $599 | 2,000 min | $0.03/min |

**Setup fee:** $299 one-time (waived for annual prepay)
**Target gross margin:** ~86%
**Target MRR for breakeven:** $10K (~29 shops on Starter, or ~17 on Pro, or fewer on Elite)

---

## Current Revenue

**MRR:** $0 — no paying customers yet.
**Stripe:** Wired and configured. Webhooks deployed. Not yet tested with real card.
**Setup fees:** Not yet charged.

---

## Revenue Path (Next 90 Days)

1. **Autoblitz launch** — first customers from Autoblitz outreach campaign. Target: 5–10 shops in first 30 days.
2. **Stripe live payment test** — required before any customer can pay. One test payment confirms the full Stripe flow (checkout → webhook → subscription activation → dashboard unlock).
3. **Churn protection** — ring-shop-first routing is the key retention feature. Shop owners who see real calls handled by AI will stay.

---

## Revenue Blockers

- **No end-to-end test completed** — the most critical blocker. If the first paying customer hits a bug, churn is immediate.
- **Stripe untested** — payments not verified. Could be a silent failure on first real checkout.
- **No `.env.example`** — new team members or agencies helping with sales can't self-serve setup.

---

## Unit Economics (Projected)

| Cost | Estimate |
|------|---------|
| Twilio per-call (~3min avg) | ~$0.03/call |
| ElevenLabs per-call | ~$0.05/call |
| Claude API per-call | ~$0.01/call |
| Supabase | $0 (free tier to ~500 shops) |
| Vercel | $0 (free tier to ~100k req/mo) |
| **Total COGS per call** | ~$0.09 |

At 300 min/mo (Starter tier): ~100 calls × $0.09 = ~$9 COGS vs $199 revenue = **95% gross margin**
(Inference: these are estimates based on public pricing, not measured actuals.)

---

## Key Revenue Metrics to Track

- [ ] MRR (currently $0)
- [ ] Shops active (currently 0 — Abdur's test shop only)
- [ ] Churn rate (N/A until first customers)
- [ ] Avg calls/shop/month (need real data)
- [ ] Setup fee conversion rate (waived vs. collected)
- [ ] Trial-to-paid conversion (once trial flow is built)

---

## Notes

- **Abdur's shop** (+18624162966) is a test shop — not billed.
- **Sam (844-875-2441)** is the Baylio sales line — routes to an AI that sells Baylio, not a shop agent.
- **Autoblitz** is the launch channel — specifics on Abdur's end, Claude Code doesn't have details.
- **No trial period** is currently implemented — first checkout immediately starts billing.
