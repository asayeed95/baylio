# Baylio — API Reference

> This document catalogs every tRPC procedure and Express endpoint in the Baylio backend. All tRPC procedures are accessed via `/api/trpc` and are fully type-safe end-to-end. Express endpoints handle webhooks and OAuth callbacks.

---

## Authentication Levels

| Level     | Constant             | Description                                           |
| --------- | -------------------- | ----------------------------------------------------- |
| Public    | `publicProcedure`    | No authentication required                            |
| Protected | `protectedProcedure` | Requires valid session cookie (`ctx.user` must exist) |
| Admin     | `adminProcedure`     | Requires `ctx.user.role === 'admin'`                  |

---

## Root Router (`server/routers.ts`)

The root router merges all sub-routers under a single namespace:

```ts
appRouter = {
  auth, // Authentication
  shop, // Shop management
  call, // Call logs & analytics
  subscription, // Billing & plans
  partner, // Affiliate program
  notification, // In-app notifications
  organization, // Multi-shop grouping
  stripe, // Stripe checkout & portal
  system, // System-level (owner notifications)
};
```

---

## Auth Router (`auth.*`)

| Procedure     | Type     | Auth   | Input | Output              | Description                                                          |
| ------------- | -------- | ------ | ----- | ------------------- | -------------------------------------------------------------------- |
| `auth.me`     | query    | public | —     | `User \| null`      | Returns the currently authenticated user, or `null` if not logged in |
| `auth.logout` | mutation | public | —     | `{ success: true }` | Clears the session cookie and logs the user out                      |

---

## Shop Router (`shop.*`)

**File:** `server/shopRouter.ts`

| Procedure                  | Type     | Auth      | Input                                                                                                                                                                | Output                                  | Description                                           |
| -------------------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `shop.list`                | query    | protected | —                                                                                                                                                                    | `Shop[]`                                | Lists all shops owned by the current user             |
| `shop.getById`             | query    | protected | `{ id: number }`                                                                                                                                                     | `Shop \| undefined`                     | Gets a single shop by ID                              |
| `shop.create`              | mutation | protected | `{ name, phone?, address?, city?, state?, zip?, timezone?, organizationId? }`                                                                                        | `Shop`                                  | Creates a new shop                                    |
| `shop.update`              | mutation | protected | `{ id, name?, phone?, address?, city?, state?, zip?, timezone?, businessHours?, serviceCatalog?, currentPromos?, status? }`                                          | `void`                                  | Updates shop fields                                   |
| `shop.delete`              | mutation | protected | `{ id: number }`                                                                                                                                                     | `void`                                  | Deletes a shop                                        |
| `shop.getAgentConfig`      | query    | protected | `{ shopId: number }`                                                                                                                                                 | `AgentConfig \| undefined`              | Gets the AI agent configuration for a shop            |
| `shop.saveAgentConfig`     | mutation | protected | `{ shopId, voicePersona?, agentName?, greeting?, systemPromptOverride?, upsellEnabled?, upsellRules?, confidenceThreshold?, maxCallDuration?, voiceId?, language? }` | `void`                                  | Creates or updates the agent config (upsert)          |
| `shop.getSubscription`     | query    | protected | `{ shopId: number }`                                                                                                                                                 | `Subscription \| undefined`             | Gets the subscription for a shop                      |
| `shop.twilioStatus`        | query    | protected | —                                                                                                                                                                    | `{ valid, accountSid?, friendlyName? }` | Checks if Twilio credentials are configured and valid |
| `shop.twilioBalance`       | query    | protected | —                                                                                                                                                                    | `{ balance, currency }`                 | Gets the Twilio account balance                       |
| `shop.searchPhoneNumbers`  | query    | protected | `{ areaCode?, contains? }`                                                                                                                                           | `AvailableNumber[]`                     | Searches for available Twilio phone numbers           |
| `shop.purchasePhoneNumber` | mutation | protected | `{ phoneNumber, shopId, friendlyName? }`                                                                                                                             | `{ success, phoneNumber, sid }`         | Purchases a Twilio number and assigns it to a shop    |
| `shop.releasePhoneNumber`  | mutation | protected | `{ shopId: number }`                                                                                                                                                 | `{ success: true }`                     | Releases a shop's Twilio phone number                 |

---

## Call Router (`call.*`)

**File:** `server/callRouter.ts`

| Procedure                | Type     | Auth      | Input                                                                                                                                           | Output                                                                                           | Description                                            |
| ------------------------ | -------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `call.list`              | query    | protected | `{ shopId?, limit?, offset?, status?, startDate?, endDate? }`                                                                                   | `CallLog[]`                                                                                      | Lists call logs with optional filters                  |
| `call.analytics`         | query    | protected | `{ shopId, startDate?, endDate? }`                                                                                                              | `{ totalCalls, avgDuration, appointmentRate, topIntents, revenueRecovered, sentimentBreakdown }` | Aggregated analytics for a shop                        |
| `call.audits`            | query    | protected | `{ shopId?: number }`                                                                                                                           | `MissedCallAudit[]`                                                                              | Lists missed call audits                               |
| `call.createAudit`       | mutation | protected | `{ shopId, startDate, endDate, totalMissedCalls?, estimatedRevenueLost?, avgRevenuePerCall?, peakMissedHour?, peakMissedDay? }`                 | `MissedCallAudit`                                                                                | Creates a new 7-day missed call audit                  |
| `call.updateAudit`       | mutation | protected | `{ id, totalMissedCalls?, estimatedRevenueLost?, avgRevenuePerCall?, peakMissedHour?, peakMissedDay?, scorecardUrl?, scorecardData?, status? }` | `void`                                                                                           | Updates audit data                                     |
| `call.generateScorecard` | query    | protected | `{ auditId: number }`                                                                                                                           | `AuditScorecard \| null`                                                                         | Generates a scorecard from audit data                  |
| `call.completeAudit`     | mutation | protected | `{ auditId: number }`                                                                                                                           | `AuditScorecard \| null`                                                                         | Marks audit as completed and generates final scorecard |

---

## Subscription Router (`subscription.*`)

**File:** `server/subscriptionRouter.ts`

| Procedure                    | Type     | Auth      | Input                                                        | Output                      | Description                                                       |
| ---------------------------- | -------- | --------- | ------------------------------------------------------------ | --------------------------- | ----------------------------------------------------------------- |
| `subscription.getByShop`     | query    | protected | `{ shopId: number }`                                         | `Subscription \| undefined` | Gets subscription with calculated usage stats                     |
| `subscription.listAll`       | query    | protected | —                                                            | `SubscriptionWithShop[]`    | Lists all subscriptions for the current user (includes shop name) |
| `subscription.create`        | mutation | protected | `{ shopId, tier, stripeCustomerId?, stripeSubscriptionId? }` | `Subscription`              | Creates a subscription with tier-based pricing                    |
| `subscription.changeTier`    | mutation | protected | `{ subscriptionId, newTier }`                                | `void`                      | Changes subscription tier (updates pricing)                       |
| `subscription.getUsage`      | query    | protected | `{ subscriptionId: number }`                                 | `UsageRecord[]`             | Gets usage records for a subscription                             |
| `subscription.getTierConfig` | query    | protected | —                                                            | `TierConfig`                | Returns pricing/limits for all tiers                              |

---

## Partner Router (`partner.*`)

**File:** `server/partnerRouter.ts`

| Procedure                | Type     | Auth      | Input                                                                                                          | Output                                                                               | Description                                                       |
| ------------------------ | -------- | --------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `partner.getProfile`     | query    | protected | —                                                                                                              | `Partner \| null`                                                                    | Gets the current user's partner profile (null if not enrolled)    |
| `partner.enroll`         | mutation | protected | `{ companyName?, website?, payoutMethod?, payoutEmail? }`                                                      | `Partner`                                                                            | Enrolls the current user as a partner (generates referral code)   |
| `partner.dashboard`      | query    | protected | —                                                                                                              | `{ partner, stats, recentReferrals, recentPayouts, monthlyEarnings[] }`              | Full dashboard data with aggregated stats                         |
| `partner.listReferrals`  | query    | protected | `{ status?, limit?, offset? }`                                                                                 | `{ referrals, total }`                                                               | Paginated referral list with filters                              |
| `partner.getEarnings`    | query    | protected | —                                                                                                              | `{ totalEarnings, pendingEarnings, paidEarnings, monthlyBreakdown[], tierProgress }` | Earnings summary with monthly breakdown                           |
| `partner.getMyNetwork`   | query    | protected | —                                                                                                              | `{ totalPartners, activePartners, networkReferrals, networkEarnings, members[] }`    | Downline network stats (placeholder for 2-level override)         |
| `partner.requestPayout`  | mutation | protected | `{ amount, payoutMethod, payoutEmail }`                                                                        | `PartnerPayout`                                                                      | Requests a payout (minimum $50, must not exceed pending earnings) |
| `partner.getMyPayouts`   | query    | protected | —                                                                                                              | `PartnerPayout[]`                                                                    | Lists all payout requests for the current partner                 |
| `partner.updateSettings` | mutation | protected | `{ payoutMethod?, payoutEmail?, companyName?, website?, notifyReferrals?, notifyPayouts?, notifyNewsletter? }` | `void`                                                                               | Updates partner profile settings                                  |

---

## Notification Router (`notification.*`)

**File:** `server/notificationRouter.ts`

| Procedure                  | Type     | Auth      | Input                      | Output              | Description                                          |
| -------------------------- | -------- | --------- | -------------------------- | ------------------- | ---------------------------------------------------- |
| `notification.list`        | query    | protected | `{ unreadOnly?: boolean }` | `Notification[]`    | Lists notifications for the current user             |
| `notification.unreadCount` | query    | protected | —                          | `{ count: number }` | Returns count of unread notifications                |
| `notification.markRead`    | mutation | protected | `{ id: number }`           | `void`              | Marks a single notification as read                  |
| `notification.markAllRead` | mutation | protected | —                          | `void`              | Marks all notifications as read for the current user |

---

## Organization Router (`organization.*`)

**File:** `server/organizationRouter.ts`

| Procedure                      | Type     | Auth      | Input                    | Output                          | Description                                   |
| ------------------------------ | -------- | --------- | ------------------------ | ------------------------------- | --------------------------------------------- |
| `organization.list`            | query    | protected | —                        | `Organization[]`                | Lists organizations owned by the current user |
| `organization.create`          | mutation | protected | `{ name, description? }` | `Organization`                  | Creates a new organization                    |
| `organization.getShopsGrouped` | query    | protected | —                        | `{ orgId, orgName, shops[] }[]` | Returns shops grouped by organization         |

---

## Stripe Router (`stripe.*`)

**File:** `server/stripe/stripeRouter.ts`

| Procedure                           | Type     | Auth      | Input                       | Output            | Description                                                     |
| ----------------------------------- | -------- | --------- | --------------------------- | ----------------- | --------------------------------------------------------------- |
| `stripe.createSubscriptionCheckout` | mutation | protected | `{ shopId, tier, annual? }` | `{ url: string }` | Creates a Stripe Checkout session for subscription purchase     |
| `stripe.createSetupFeeCheckout`     | mutation | protected | `{ shopId, tier }`          | `{ url: string }` | Creates a Checkout session for one-time setup fee               |
| `stripe.createPortalSession`        | mutation | protected | `{ shopId: number }`        | `{ url: string }` | Creates a Stripe Customer Portal session for billing management |
| `stripe.getTiers`                   | query    | protected | —                           | `TierConfig`      | Returns all tier pricing and Stripe price IDs                   |

---

## System Router (`system.*`)

**File:** `server/_core/systemRouter.ts`

| Procedure            | Type     | Auth      | Input                | Output    | Description                                     |
| -------------------- | -------- | --------- | -------------------- | --------- | ----------------------------------------------- |
| `system.notifyOwner` | mutation | protected | `{ title, content }` | `boolean` | Sends a push notification to the platform owner |

---

## Express Endpoints (Non-tRPC)

These endpoints are registered directly on the Express app, outside of tRPC.

### Twilio Webhooks

**File:** `server/services/twilioWebhooks.ts`

| Method | Path                    | Middleware                  | Description                                                                           |
| ------ | ----------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| `POST` | `/api/twilio/voice`     | Twilio signature validation | Inbound call handler — looks up shop config, registers with ElevenLabs, returns TwiML |
| `POST` | `/api/twilio/status`    | Twilio signature validation | Call status callback — triggers post-call pipeline on `completed` status              |
| `POST` | `/api/twilio/recording` | Twilio signature validation | Recording callback — stores recording URL                                             |

### Stripe Webhook

**File:** `server/stripe/stripeRoutes.ts`

| Method | Path                  | Middleware                               | Description                                                                                                   |
| ------ | --------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/stripe/webhook` | `express.raw()` + signature verification | Processes Stripe events (`checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, etc.) |

### OAuth

**File:** `server/_core/oauth.ts`

| Method | Path                  | Description                                                                                |
| ------ | --------------------- | ------------------------------------------------------------------------------------------ |
| `GET`  | `/api/oauth/callback` | Manus OAuth callback — exchanges code for token, creates/updates user, sets session cookie |

---

## Error Handling

All tRPC procedures throw typed errors using `TRPCError`:

| Code                    | HTTP Status | When Used                                                            |
| ----------------------- | ----------- | -------------------------------------------------------------------- |
| `UNAUTHORIZED`          | 401         | Missing or invalid session                                           |
| `FORBIDDEN`             | 403         | User lacks required role (e.g., non-admin accessing admin procedure) |
| `NOT_FOUND`             | 404         | Requested resource doesn't exist                                     |
| `BAD_REQUEST`           | 400         | Invalid input or business rule violation                             |
| `INTERNAL_SERVER_ERROR` | 500         | Unexpected server error                                              |

Frontend handles these via tRPC's built-in error typing — `error.data?.code` is available on every mutation/query error.

---

## Frontend Usage Patterns

### Reading data

```tsx
const { data, isLoading, error } = trpc.shop.list.useQuery();
```

### Mutating data

```tsx
const utils = trpc.useUtils();
const createShop = trpc.shop.create.useMutation({
  onSuccess: () => {
    utils.shop.list.invalidate();
    toast.success("Shop created!");
  },
});
```

### Auth state

```tsx
const { user, isLoading } = useAuth();
if (!user) redirect to login;
```
