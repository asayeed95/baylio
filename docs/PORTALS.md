# Baylio — Multi-Portal Architecture

> This document describes how Baylio's three distinct portals are structured, routed, and served from a single codebase. Any developer working on the frontend must read this before touching `App.tsx` or any portal-specific page.

---

## Overview

Baylio serves three completely separate user experiences from a single React application. Each portal has its own subdomain, its own navigation structure, its own authentication requirements, and its own page set. They share the same backend API, database, and authentication system.

| Portal | Subdomain | Audience | Auth Required |
|---|---|---|---|
| **Main App** | `baylio.io` | Auto repair shop owners | Yes (Manus OAuth) |
| **Admin Portal** | `admin.baylio.io` | Baylio staff (Abdur + team) | Yes + admin role |
| **Partners Portal** | `partners.baylio.io` | Affiliate partners | Public landing, then OAuth |

---

## How Subdomain Routing Works

The routing logic lives in `client/src/App.tsx` inside the `AppRouter` component. On every page load, it reads `window.location.hostname` and `window.location.search` to determine which portal to render.

```ts
// Simplified routing logic from App.tsx
const hostname = window.location.hostname;
const params = new URLSearchParams(window.location.search);
const portalParam = params.get("portal"); // Dev shortcut: ?portal=admin

if (hostname.startsWith("admin.") || portalParam === "admin") {
  return <AdminPortalRouter />;
}
if (hostname.startsWith("partners.") || portalParam === "partners") {
  return <PartnersRouter />;
}
return <MainAppRouter />;
```

**Dev shortcuts** — because the dev server runs on a single localhost port, you cannot test subdomains locally. Use these URL parameters instead:

| Portal | Dev URL |
|---|---|
| Main App | `http://localhost:3000/` |
| Admin Portal | `http://localhost:3000/?portal=admin` |
| Partners Portal | `http://localhost:3000/?portal=partners` |

---

## Portal 1: Main App (`baylio.io`)

The primary product — the dashboard that auto repair shop owners use to manage their AI call agent.

### Authentication

All routes require authentication. Unauthenticated users are redirected to the Manus OAuth login page via `getLoginUrl()` from `client/src/const.ts`.

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `pages/Dashboard.tsx` | Overview stats, recent calls, quick actions |
| `/shop/:id` | `pages/ShopDetail.tsx` | Shop settings, phone number, business hours |
| `/agent/:shopId` | `pages/AgentConfig.tsx` | Voice agent configuration, persona, upsell rules |
| `/calls` | `pages/CallLogs.tsx` | Full call history with filters and transcripts |
| `/analytics` | `pages/Analytics.tsx` | Call volume, revenue recovered, sentiment trends |
| `/audit` | `pages/MissedCallAudit.tsx` | Missed call recovery workflow |
| `/subscriptions` | `pages/Subscriptions.tsx` | Plan management and billing |
| `/onboarding` | `pages/Onboarding.tsx` | New shop setup wizard |

### Layout

Uses `DashboardLayout` (`client/src/components/DashboardLayout.tsx`) — a persistent sidebar with navigation links, user profile, and logout. The sidebar is always visible on desktop and collapses to a hamburger menu on mobile.

---

## Portal 2: Admin Portal (`admin.baylio.io`)

The internal operations dashboard for Baylio staff. This portal is not linked from any public page and is only accessible by users with `role = 'admin'` in the database.

### Authentication

Requires both authentication AND admin role. The `AdminPortal.tsx` component checks `user.role === 'admin'` and renders an "Access Denied" screen for non-admin users. To promote a user to admin, run this SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `pages/AdminPortal.tsx` | Overview: total shops, MRR, call volume, active agents |
| `/shops` | (planned) | All shops management table |
| `/analytics` | (planned) | Platform-wide analytics |
| `/costs` | (planned) | Cost analytics — Twilio + ElevenLabs COGS per shop |
| `/partners` | (planned) | Partner/affiliate management |
| `/users` | (planned) | User management and role assignment |

### Layout

Uses a custom dark sidebar layout defined within `AdminPortal.tsx`. Does not use `DashboardLayout` — the admin portal has its own distinct visual identity.

---

## Portal 3: Partners Portal (`partners.baylio.io`)

The affiliate partner program portal. Public visitors see a marketing landing page with commission details and an earnings calculator. Authenticated partners see their dashboard.

### Authentication Flow

This portal has a **split authentication model** — the most complex of the three:

1. Unauthenticated visitor → `PartnersLanding.tsx` (public, no login required)
2. Visitor clicks "Become a Partner" → Manus OAuth login
3. After login → `PartnersPortal.tsx` (authenticated dashboard)

The split is handled in `App.tsx` by the `PartnersLandingOrDashboard` component:

```ts
function PartnersLandingOrDashboard() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PartnersLanding />; // Show landing during auth check
  if (!isAuthenticated) return <PartnersLanding />;
  return <PartnersPortal />;
}
```

**Critical rule:** Auth logic for the Partners portal lives ONLY in `App.tsx`. `PartnersPortalLayout.tsx` must NOT contain any auth checks — this was the root cause of the login wall bug that was fixed in checkpoint `36bc8a57`.

### Pages

| Route | File | Description |
|---|---|---|
| `/` | `pages/PartnersLanding.tsx` | Public landing — commissions, calculator, CTA |
| `/partners/dashboard` | `pages/PartnersPortal.tsx` | Partner dashboard — stats, referral link |
| `/partners/referrals` | `pages/PartnersReferrals.tsx` | Referral table with status and commissions |
| `/partners/earnings` | `pages/PartnersEarnings.tsx` | Commission history and payout requests |
| `/partners/network` | `pages/PartnersNetwork.tsx` | Downline partners and override earnings |
| `/partners/resources` | `pages/PartnersResources.tsx` | Email/SMS templates, demo links, assets |
| `/partners/settings` | `pages/PartnersSettings.tsx` | PayPal email, referral code, notifications |

### Commission Structure

| Tier | Monthly Referrals | Commission Rate |
|---|---|---|
| Bronze | 1–4 active shops | 20% |
| Silver | 5–9 active shops | 25% |
| Gold | 10–19 active shops | 28% |
| Platinum | 20+ active shops | 30% |

---

## Shared Infrastructure

All three portals share the following:

**Authentication** — Manus OAuth via `/api/oauth/callback`. Session cookie is set server-side and read by all portals. The `useAuth()` hook (`client/src/_core/hooks/useAuth.ts`) provides `{ user, isAuthenticated, loading }` to any component.

**tRPC API** — All backend calls go through `/api/trpc`. The router is defined in `server/routers.ts` and split into feature routers in `server/routers/`. Protected procedures require a valid session cookie.

**Database** — Single MySQL/TiDB database shared across all portals. Row-level access control is enforced in tRPC procedures using `ctx.user.id` and `ctx.user.role`.

**Styling** — Single Tailwind CSS configuration and `index.css` with shared design tokens. Each portal has its own color accent but shares typography, spacing, and component library (shadcn/ui).

---

## Adding a New Portal

To add a fourth portal (e.g., `shop.baylio.io` for a white-labeled shop owner experience):

1. Add a subdomain detection condition in `AppRouter` in `client/src/App.tsx`
2. Create a `NewPortalRouter` component that defines the portal's routes
3. Create page files under `client/src/pages/NewPortal*.tsx`
4. Create a layout component under `client/src/components/NewPortalLayout.tsx` — do NOT add auth checks inside the layout
5. Handle auth at the routing layer in `App.tsx`, not inside layout or page components
6. Add the subdomain to the Manus Settings → Domains panel
7. Add a DNS CNAME record pointing `shop.baylio.io` to the Manus publish target

---

## Known Issues and History

**Login wall bug (fixed in `36bc8a57`)** — `PartnersPortalLayout.tsx` had a hardcoded `if (!user) → show login wall` check. This fired independently of the routing layer, meaning all visitors saw the login wall regardless of auth state. The fix was to remove the auth check from the layout entirely and handle it exclusively in `App.tsx`.

**Stale Vite cache** — The dev server occasionally serves a cached version of `App.tsx` with a wrong import path. Running `webdev_restart_server` clears the cache. TypeScript (`tsc`) reports 0 errors even when Vite's HMR cache is stale — always restart the server after import path changes.
