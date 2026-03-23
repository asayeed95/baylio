# Partner Portal

## Overview

The Partner Portal is a separate dark-themed experience for Baylio affiliates/resellers.
Partners refer auto repair shops to Baylio and earn 20% recurring commission on subscriptions.

## Access

- **Production:** `partners.baylio.io` (subdomain routing)
- **Development:** `?portal=partners` query parameter
- **From main app:** "Partners" link in DashboardLayout sidebar

## Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/partners` | PartnersPortal.tsx | Dashboard — stats, tier progress, referral link |
| `/partners/referrals` | PartnersReferrals.tsx | Referral table with status filter + pagination |
| `/partners/earnings` | PartnersEarnings.tsx | Earnings breakdown, payout request dialog |
| `/partners/network` | PartnersNetwork.tsx | Referred shops with MRR |
| `/partners/resources` | PartnersResources.tsx | Sales materials, email templates |
| `/partners/settings` | PartnersSettings.tsx | Payout method, notifications, profile |

Unauthenticated visitors see `PartnersLanding.tsx` (public sales page).

## Data Model

### partners
One row per partner. `userId` is unique (one profile per user).

| Field | Purpose |
|-------|---------|
| `referralCode` | 10-char unique code (nanoid) |
| `commissionRate` | Default 20% (0.2000) |
| `tier` | bronze → silver → gold → platinum (by active referral count) |
| `totalEarnings` | Lifetime sum |
| `pendingEarnings` | Available for payout |

### referrals
One row per referred shop. Tracks lifecycle: pending → signed_up → subscribed → churned.

### partner_payouts
Payout request history. Minimum $50. Statuses: pending → processing → completed/failed.

## tRPC Procedures

All under `trpc.partner.*`:

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `getProfile` | query | required | Get current user's partner profile |
| `enroll` | mutation | required | Create partner profile |
| `dashboard` | query | required | Stats: referrals, earnings, conversions |
| `listReferrals` | query | required | Paginated referral list with status filter |
| `getEarnings` | query | required | Earnings breakdown by month and tier |
| `getMyNetwork` | query | required | Referred shops with MRR |
| `requestPayout` | mutation | required | Request withdrawal (min $50) |
| `getMyPayouts` | query | required | Payout history |
| `updateSettings` | mutation | required | Update payout method, notifications |

## Money Flow Safety

The `requestPayout` mutation:
1. Validates amount >= $50
2. Checks amount <= `pendingEarnings`
3. Inserts payout record
4. Deducts from `pendingEarnings` using atomic SQL: `pendingEarnings - amount`

**Known gap:** Steps 3 and 4 are not wrapped in a DB transaction. A crash between
insert and update could create a payout record without deducting the balance. This
should be wrapped in a transaction when the volume justifies it.
