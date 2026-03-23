# Claude Code — Partners Portal Build Brief
**Project:** Baylio (`github.com/asayeed95/baylio`)  
**Task:** Build the `partners.baylio.io` affiliate/partners portal  
**Date:** March 2026  
**Assigned by:** Abdur (founder)

---

## Context: What Baylio Is

Baylio is an AI-powered call assistant SaaS for auto repair shops. AI agents (Alex for sales, Sam for technical support) answer inbound calls 24/7 via ElevenLabs + Twilio. Shop owners pay $149–$499/mo.

The **Partners Portal** (`partners.baylio.io`) is for affiliate partners who refer shops to Baylio and earn commissions. Think of it as a referral/reseller program — not a traditional MLM, but with multi-level earning potential (partner earns on their direct referrals, and a smaller % on referrals made by partners they recruited).

---

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind 4 + shadcn/ui
- **Backend:** Node.js + Express + tRPC 11
- **Database:** MySQL (via Drizzle ORM)
- **Auth:** Manus OAuth (session cookie, `ctx.user` in tRPC context)
- **Payments:** Stripe (commissions tracked, payouts manual for now)
- **Routing:** Wouter (not React Router)
- **Testing:** Vitest

### Key File Locations
```
client/src/
  App.tsx                    ← Routes — PartnersRouter already wired
  pages/AffiliatePortal.tsx  ← EXISTING: basic affiliate dashboard (needs full rebuild)
  pages/AffiliateAdmin.tsx   ← Admin view of affiliates (already built)
  hooks/useSubdomain.ts      ← Returns "admin" | "partners" | "main"
  components/AdminPortalLayout.tsx ← Reference for dark sidebar layout pattern

server/
  affiliateRouter.ts         ← EXISTING: affiliate tRPC procedures (see below)
  teamRouter.ts              ← Reference for admin-only procedure pattern
  routers.ts                 ← Register new routers here

drizzle/schema.ts            ← Database schema (affiliates, affiliateReferrals, affiliateCommissions tables already exist)
```

---

## What Already Exists

### Database Tables (already migrated — DO NOT recreate)
```typescript
// drizzle/schema.ts

affiliates {
  id, userId, referralCode (unique), tier ("bronze"|"silver"|"gold"|"platinum"),
  status ("pending"|"active"|"suspended"|"rejected"),
  commissionRate (decimal, e.g. 0.20 = 20%),
  parentAffiliateId (for multi-level — who recruited this affiliate),
  totalEarnings, totalPaid, pendingBalance,
  paypalEmail, stripeConnectId,
  approvedAt, createdAt, updatedAt
}

affiliateReferrals {
  id, affiliateId, referredUserId, referredShopId,
  status ("pending"|"trial"|"converted"|"churned"),
  conversionValue (decimal), commissionAmount (decimal),
  convertedAt, createdAt
}

affiliateCommissions {
  id, affiliateId, referralId, amount, currency,
  type ("direct"|"override"), level (1 or 2),
  status ("pending"|"approved"|"paid"|"cancelled"),
  paidAt, createdAt
}

affiliatePayouts {
  id, affiliateId, amount, currency, method, status,
  reference, commissionIds (json), processedAt, createdAt
}
```

### Existing tRPC Procedures (`server/affiliateRouter.ts`)
- `affiliate.signup` — create affiliate account (public, requires auth)
- `affiliate.getMyStats` — dashboard stats (my referrals, earnings, tier)
- `affiliate.getMyReferrals` — list of referred shops
- `affiliate.getMyCommissions` — commission history
- `affiliate.generateReferralLink` — get/create referral link
- `affiliate.admin.list` — admin: list all affiliates
- `affiliate.admin.approve` — admin: approve pending affiliate
- `affiliate.admin.suspend` — admin: suspend affiliate
- `affiliate.admin.getDetail` — admin: full affiliate detail

### Existing Frontend (`client/src/pages/AffiliatePortal.tsx`)
Basic skeleton exists but needs a full professional rebuild. The current file has:
- Signup form
- Basic stats display
- Referral link display

**Rebuild it completely** — don't try to patch the existing one.

---

## What Needs to Be Built

### 1. Partners Portal Layout Component
Create `client/src/components/PartnersPortalLayout.tsx` — similar dark sidebar pattern to `AdminPortalLayout.tsx` but with partners branding.

**Nav items:**
- Dashboard (overview)
- My Referrals
- Earnings & Commissions
- My Network (downline partners)
- Payouts
- Resources (marketing materials, scripts)
- Settings

**Design:** Dark theme matching admin portal (`bg-[#0A0A0F]`, `bg-[#0D0D14]` sidebar, emerald accents). Show partner tier badge (Bronze/Silver/Gold/Platinum) prominently. Show pending balance in sidebar.

### 2. Partners Dashboard Page (`/` on partners.baylio.io)
**Two states:**

**State A — Not yet an affiliate (signup flow):**
- Hero: "Earn 20% recurring commissions referring auto repair shops to Baylio"
- Commission structure table (see below)
- Simple signup form: name, email, PayPal email, how they plan to promote
- Submit → creates affiliate record with status "pending"
- Show "Application submitted — we'll review within 24 hours" confirmation

**State B — Active affiliate (dashboard):**
- Stats cards: Total Earned, This Month, Pending Balance, Active Referrals
- Quick referral link with copy button
- Recent activity feed (last 5 referrals/commissions)
- Tier progress bar (e.g., "Silver: 3 more referrals to Gold")

### 3. My Referrals Page (`/referrals`)
- Table of all referred shops: shop name, status (trial/converted/churned), date, commission amount
- Status badges with colors
- Filter by status
- Empty state: "Share your referral link to start earning"

### 4. Earnings & Commissions Page (`/earnings`)
- Summary: Total earned, Total paid out, Pending balance
- Commission history table: date, shop, type (Direct/Override), amount, status
- Level 1 vs Level 2 commission breakdown
- "Request Payout" button (triggers payout request, minimum $50)

### 5. My Network Page (`/network`)
- Shows partners they recruited (their "downline")
- For each downline partner: name, tier, their referral count, override commission earned from them
- Explains the 2-level structure: "You earn 20% on direct referrals, 5% on referrals made by partners you recruit"
- Recruitment link: separate link to invite other partners

### 6. Resources Page (`/resources`)
Static page with marketing assets:
- Referral email templates (copy-paste)
- SMS script for outreach
- Key selling points (bullet points)
- FAQ for prospects
- Link to baylio.io demo call: `tel:+18448752441`

### 7. Settings Page (`/settings`)
- Update PayPal email for payouts
- Update notification preferences
- View referral code
- Danger zone: deactivate account

---

## Commission Structure (for UI display)

| Tier | Requirement | Direct Commission | Override (L2) |
|------|-------------|-------------------|---------------|
| Bronze | 0–4 referrals | 20% recurring | 5% |
| Silver | 5–14 referrals | 22% recurring | 5% |
| Gold | 15–29 referrals | 25% recurring | 7% |
| Platinum | 30+ referrals | 30% recurring | 10% |

"Recurring" means they earn every month the referred shop stays subscribed.

---

## New tRPC Procedures Needed

Add to `server/affiliateRouter.ts` or create `server/partnersRouter.ts`:

```typescript
// Partners-specific procedures
affiliate.getMyNetwork     // list downline partners (parentAffiliateId = myId)
affiliate.requestPayout    // create payout request (min $50, status: pending)
affiliate.getMyPayouts     // list payout history
affiliate.updateSettings   // update paypalEmail, notification prefs
affiliate.getRecruitLink   // separate link for recruiting other partners
```

---

## Routing (Already Wired in App.tsx)

```typescript
// App.tsx — PartnersRouter already exists:
function PartnersRouter() {
  return (
    <Switch>
      <Route path="/" component={AffiliatePortal} />
      <Route path="/dashboard" component={AffiliatePortal} />
      <Route component={AffiliatePortal} />
    </Switch>
  );
}
```

**Expand this** to add routes for each new page:
```typescript
<Route path="/referrals" component={PartnersReferrals} />
<Route path="/earnings" component={PartnersEarnings} />
<Route path="/network" component={PartnersNetwork} />
<Route path="/resources" component={PartnersResources} />
<Route path="/settings" component={PartnersSettings} />
```

---

## Auth Pattern

Use the existing `useAuth()` hook:
```typescript
import { useAuth } from "@/_core/hooks/useAuth";
const { user, loading } = useAuth();
```

If user is not logged in, redirect to Manus OAuth login. The affiliate status check (do they have an `affiliates` record?) should be a tRPC query.

---

## Design Reference

Look at `AdminPortalLayout.tsx` for the exact sidebar/layout pattern. Use the same:
- Color palette: `#0A0A0F` page bg, `#0D0D14` sidebar, `border-white/5` borders
- Emerald green accents: `text-emerald-400`, `bg-emerald-500/10`
- Slate text hierarchy: `text-white` headings, `text-slate-400` body, `text-slate-500` muted

For the Partners portal, add a **gold accent** (`text-amber-400`, `bg-amber-500/10`) for tier badges and earnings highlights to differentiate it from the admin portal.

---

## Testing Requirements

Write Vitest tests in `server/affiliateRouter.test.ts` (already exists — add to it):
- `affiliate.getMyNetwork` returns only direct downline
- `affiliate.requestPayout` rejects if balance < $50
- `affiliate.requestPayout` rejects if pending payout already exists
- Commission tier calculation logic (Bronze/Silver/Gold/Platinum thresholds)

Run `pnpm test` to verify all existing 353+ tests still pass after your changes.

---

## Constraints

1. **Do NOT modify** `server/_core/` files — framework only
2. **Do NOT modify** `drizzle/schema.ts` without also running `pnpm drizzle-kit generate` and applying the migration SQL
3. **Do NOT use** React Router — use Wouter (`import { Route, Switch, Link } from "wouter"`)
4. **Do NOT use** Axios — use tRPC hooks (`trpc.*.useQuery/useMutation`)
5. Keep TypeScript strict — no `any` types, no `@ts-ignore`
6. All new pages go in `client/src/pages/Partners*.tsx`
7. New layout goes in `client/src/components/PartnersPortalLayout.tsx`

---

## Definition of Done

- [ ] `PartnersPortalLayout.tsx` with dark sidebar, tier badge, pending balance
- [ ] `AffiliatePortal.tsx` rebuilt — signup flow + active dashboard
- [ ] `PartnersReferrals.tsx` — referrals table with filters
- [ ] `PartnersEarnings.tsx` — commission history + payout request
- [ ] `PartnersNetwork.tsx` — downline partners view
- [ ] `PartnersResources.tsx` — marketing materials
- [ ] `PartnersSettings.tsx` — PayPal email, referral code
- [ ] New tRPC procedures: `getMyNetwork`, `requestPayout`, `getMyPayouts`, `updateSettings`
- [ ] App.tsx PartnersRouter expanded with all routes
- [ ] Vitest tests for new procedures
- [ ] `pnpm test` passes (all existing tests green)
- [ ] TypeScript compiles clean (only pre-existing 3 framework warnings allowed)

---

## How to Run Locally

```bash
git clone https://github.com/asayeed95/baylio.git
cd baylio
pnpm install
# Copy .env from Manus secrets (ask Abdur for values)
pnpm dev
```

To preview the partners portal locally, append `?portal=partners` to the URL:
```
http://localhost:3000/?portal=partners
```

---

## Questions? Reach Abdur

If anything is unclear about the commission structure, design direction, or existing code — ask before building. The goal is a polished, professional portal that makes partners feel like they're part of an elite program, not a generic affiliate dashboard.
