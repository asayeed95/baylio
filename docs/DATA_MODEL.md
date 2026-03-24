# Baylio — Data Model Reference

> This document describes every table in the Baylio database, including field definitions, types, constraints, enums, and relationships. The database is **MySQL (TiDB-compatible)** and the schema is defined in `drizzle/schema.ts` using **Drizzle ORM**.

---

## Entity Relationship Overview

```
users ──────────┬──── organizations ──── shops
                │                         │
                │         ┌───────────────┼───────────────┐
                │         │               │               │
                │    agent_configs    call_logs    subscriptions
                │                         │               │
                │                  audit_call_entries  usage_records
                │                         │
                │                  missed_call_audits
                │
                ├──── partners ──── referrals
                │                      │
                │               partner_payouts
                │
                └──── notifications
```

---

## Table: `users`

The central user identity table. Created automatically on first OAuth login.

| Column      | Type                    | Constraints                                  | Description                                     |
| ----------- | ----------------------- | -------------------------------------------- | ----------------------------------------------- |
| `id`        | `int`                   | PK, auto-increment                           | Internal user ID                                |
| `openId`    | `varchar(255)`          | NOT NULL, UNIQUE                             | Manus OAuth unique identifier                   |
| `name`      | `varchar(255)`          | NOT NULL                                     | Display name from OAuth profile                 |
| `email`     | `varchar(320)`          |                                              | Email address (optional)                        |
| `avatarUrl` | `varchar(512)`          |                                              | Profile picture URL                             |
| `role`      | `enum('admin', 'user')` | NOT NULL, default `'user'`                   | Access level — `admin` unlocks the admin portal |
| `createdAt` | `timestamp`             | NOT NULL, default `NOW()`                    | Account creation time                           |
| `updatedAt` | `timestamp`             | NOT NULL, default `NOW()`, on update `NOW()` | Last profile update                             |

**Key relationships:** A user can own multiple `organizations`, `shops`, `partners` records, and `notifications`.

---

## Table: `organizations`

Groups multiple shops under one business entity. A shop owner with multiple locations uses organizations to manage them collectively.

| Column        | Type           | Constraints                                  | Description          |
| ------------- | -------------- | -------------------------------------------- | -------------------- |
| `id`          | `int`          | PK, auto-increment                           | Organization ID      |
| `ownerId`     | `int`          | NOT NULL                                     | FK → `users.id`      |
| `name`        | `varchar(255)` | NOT NULL                                     | Business name        |
| `description` | `text`         |                                              | Optional description |
| `createdAt`   | `timestamp`    | NOT NULL, default `NOW()`                    | Creation time        |
| `updatedAt`   | `timestamp`    | NOT NULL, default `NOW()`, on update `NOW()` | Last update          |

---

## Table: `shops`

The core business entity. Each shop represents one physical auto repair location with its own phone number, AI agent, and subscription.

| Column              | Type                                  | Constraints                                  | Description                                                    |
| ------------------- | ------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `id`                | `int`                                 | PK, auto-increment                           | Shop ID                                                        |
| `ownerId`           | `int`                                 | NOT NULL                                     | FK → `users.id`                                                |
| `organizationId`    | `int`                                 |                                              | FK → `organizations.id` (optional grouping)                    |
| `name`              | `varchar(255)`                        | NOT NULL                                     | Shop display name                                              |
| `phone`             | `varchar(20)`                         |                                              | Shop's main phone number                                       |
| `twilioPhoneNumber` | `varchar(20)`                         |                                              | Twilio-provisioned capture number                              |
| `twilioPhoneSid`    | `varchar(64)`                         |                                              | Twilio phone number SID                                        |
| `elevenLabsAgentId` | `varchar(128)`                        |                                              | ElevenLabs conversational agent ID                             |
| `address`           | `varchar(512)`                        |                                              | Street address                                                 |
| `city`              | `varchar(128)`                        |                                              | City                                                           |
| `state`             | `varchar(64)`                         |                                              | State/province                                                 |
| `zip`               | `varchar(16)`                         |                                              | ZIP/postal code                                                |
| `timezone`          | `varchar(64)`                         | default `'America/New_York'`                 | IANA timezone for business hours                               |
| `businessHours`     | `json`                                |                                              | Structured hours object (e.g., `{ "mon": "8:00-18:00", ... }`) |
| `serviceCatalog`    | `json`                                |                                              | Array of services offered (name, price range, description)     |
| `currentPromos`     | `json`                                |                                              | Active promotions/specials                                     |
| `status`            | `enum('active', 'inactive', 'trial')` | NOT NULL, default `'trial'`                  | Shop lifecycle state                                           |
| `createdAt`         | `timestamp`                           | NOT NULL, default `NOW()`                    | Creation time                                                  |
| `updatedAt`         | `timestamp`                           | NOT NULL, default `NOW()`, on update `NOW()` | Last update                                                    |

**Key relationships:** Each shop has one `agent_configs` record, many `call_logs`, one `subscriptions` record, and many `missed_call_audits`.

---

## Table: `agent_configs`

Stores the AI agent persona configuration for each shop. This controls how the voice agent behaves on calls.

| Column                 | Type                                                                   | Constraints                                  | Description                                       |
| ---------------------- | ---------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| `id`                   | `int`                                                                  | PK, auto-increment                           | Config ID                                         |
| `shopId`               | `int`                                                                  | NOT NULL, UNIQUE                             | FK → `shops.id` (one config per shop)             |
| `ownerId`              | `int`                                                                  | NOT NULL, default `0`                        | FK → `users.id` (tenant isolation)                |
| `voicePersona`         | `enum('friendly_advisor', 'professional_technician', 'sales_focused')` | NOT NULL, default `'friendly_advisor'`       | Agent personality template                        |
| `agentName`            | `varchar(64)`                                                          | default `'Sam'`                              | The name the agent uses when greeting callers     |
| `systemPromptOverride` | `text`                                                                 |                                              | Custom system prompt (overrides compiled prompt)  |
| `greeting`             | `text`                                                                 |                                              | Custom first message                              |
| `upsellEnabled`        | `boolean`                                                              | NOT NULL, default `true`                     | Whether the agent suggests additional services    |
| `upsellRules`          | `json`                                                                 |                                              | Structured upsell logic (trigger → offer mapping) |
| `confidenceThreshold`  | `decimal(3,2)`                                                         | default `0.70`                               | Minimum confidence for service offers (0.00–1.00) |
| `maxCallDuration`      | `int`                                                                  | default `600`                                | Max call length in seconds before graceful end    |
| `voiceId`              | `varchar(128)`                                                         |                                              | ElevenLabs voice ID                               |
| `language`             | `varchar(10)`                                                          | default `'en'`                               | Primary language                                  |
| `createdAt`            | `timestamp`                                                            | NOT NULL, default `NOW()`                    | Creation time                                     |
| `updatedAt`            | `timestamp`                                                            | NOT NULL, default `NOW()`, on update `NOW()` | Last update                                       |

---

## Table: `call_logs`

Records every inbound call handled by the AI agent. This is the primary data source for analytics and billing.

| Column              | Type                                                              | Constraints                     | Description                                                            |
| ------------------- | ----------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `id`                | `int`                                                             | PK, auto-increment              | Call log ID                                                            |
| `shopId`            | `int`                                                             | NOT NULL                        | FK → `shops.id`                                                        |
| `ownerId`           | `int`                                                             | NOT NULL, default `0`           | FK → `users.id` (tenant isolation)                                     |
| `callSid`           | `varchar(64)`                                                     |                                 | Twilio Call SID                                                        |
| `callerPhone`       | `varchar(20)`                                                     |                                 | Caller's phone number                                                  |
| `callerName`        | `varchar(255)`                                                    |                                 | Caller name (if identified)                                            |
| `direction`         | `enum('inbound', 'outbound')`                                     | NOT NULL, default `'inbound'`   | Call direction                                                         |
| `status`            | `enum('completed', 'missed', 'voicemail', 'abandoned', 'failed')` | NOT NULL, default `'completed'` | Call outcome                                                           |
| `duration`          | `int`                                                             | default `0`                     | Call duration in seconds                                               |
| `recordingUrl`      | `varchar(512)`                                                    |                                 | URL to call recording                                                  |
| `transcription`     | `text`                                                            |                                 | Full call transcription                                                |
| `summary`           | `text`                                                            |                                 | LLM-generated call summary                                             |
| `intent`            | `varchar(64)`                                                     |                                 | Classified caller intent (e.g., `appointment`, `pricing`, `emergency`) |
| `sentiment`         | `enum('positive', 'neutral', 'negative')`                         |                                 | Caller sentiment analysis                                              |
| `appointmentBooked` | `boolean`                                                         | NOT NULL, default `false`       | Whether an appointment was scheduled                                   |
| `vehicleInfo`       | `json`                                                            |                                 | Captured vehicle details `{ year, make, model }`                       |
| `servicesDiscussed` | `json`                                                            |                                 | Array of services mentioned                                            |
| `estimatedRevenue`  | `decimal(10,2)`                                                   |                                 | Estimated revenue from this call                                       |
| `qaFlags`           | `json`                                                            |                                 | Quality assurance flags from LLM analysis                              |
| `metadata`          | `json`                                                            |                                 | Additional call metadata                                               |
| `calledAt`          | `timestamp`                                                       | NOT NULL, default `NOW()`       | When the call occurred                                                 |
| `createdAt`         | `timestamp`                                                       | NOT NULL, default `NOW()`       | Record creation time                                                   |

---

## Table: `missed_call_audits`

Tracks 7-day missed call audit campaigns. Shop owners can run an audit to quantify revenue lost to missed calls.

| Column                 | Type                                       | Constraints                                  | Description                                   |
| ---------------------- | ------------------------------------------ | -------------------------------------------- | --------------------------------------------- |
| `id`                   | `int`                                      | PK, auto-increment                           | Audit ID                                      |
| `shopId`               | `int`                                      | NOT NULL                                     | FK → `shops.id`                               |
| `ownerId`              | `int`                                      | NOT NULL, default `0`                        | FK → `users.id`                               |
| `status`               | `enum('active', 'completed', 'cancelled')` | NOT NULL, default `'active'`                 | Audit lifecycle state                         |
| `startDate`            | `timestamp`                                | NOT NULL                                     | Audit start date                              |
| `endDate`              | `timestamp`                                | NOT NULL                                     | Audit end date (start + 7 days)               |
| `totalMissedCalls`     | `int`                                      | default `0`                                  | Count of missed calls during audit            |
| `estimatedRevenueLost` | `decimal(10,2)`                            |                                              | Total estimated revenue lost                  |
| `avgRevenuePerCall`    | `decimal(10,2)`                            |                                              | Average revenue per missed call               |
| `peakMissedHour`       | `varchar(8)`                               |                                              | Hour with most missed calls (e.g., `"09:00"`) |
| `peakMissedDay`        | `varchar(16)`                              |                                              | Day with most missed calls (e.g., `"Monday"`) |
| `scorecardUrl`         | `varchar(512)`                             |                                              | URL to generated PDF scorecard                |
| `scorecardData`        | `json`                                     |                                              | Raw scorecard data for rendering              |
| `createdAt`            | `timestamp`                                | NOT NULL, default `NOW()`                    | Creation time                                 |
| `updatedAt`            | `timestamp`                                | NOT NULL, default `NOW()`, on update `NOW()` | Last update                                   |

---

## Table: `audit_call_entries`

Individual call entries within a missed call audit. Each row represents one missed call captured during the audit period.

| Column             | Type            | Constraints               | Description                    |
| ------------------ | --------------- | ------------------------- | ------------------------------ |
| `id`               | `int`           | PK, auto-increment        | Entry ID                       |
| `auditId`          | `int`           | NOT NULL                  | FK → `missed_call_audits.id`   |
| `callerPhone`      | `varchar(20)`   |                           | Caller's phone number          |
| `callerName`       | `varchar(255)`  |                           | Caller name (if available)     |
| `calledAt`         | `timestamp`     | NOT NULL                  | When the call occurred         |
| `intent`           | `varchar(64)`   |                           | Classified intent              |
| `estimatedRevenue` | `decimal(10,2)` |                           | Revenue estimate for this call |
| `notes`            | `text`          |                           | Additional notes               |
| `createdAt`        | `timestamp`     | NOT NULL, default `NOW()` | Record creation time           |

---

## Table: `subscriptions`

Tracks each shop's billing subscription. One subscription per shop.

| Column                 | Type                                               | Constraints                                  | Description                                |
| ---------------------- | -------------------------------------------------- | -------------------------------------------- | ------------------------------------------ |
| `id`                   | `int`                                              | PK, auto-increment                           | Subscription ID                            |
| `shopId`               | `int`                                              | NOT NULL                                     | FK → `shops.id`                            |
| `ownerId`              | `int`                                              | NOT NULL, default `0`                        | FK → `users.id`                            |
| `tier`                 | `enum('starter', 'pro', 'elite')`                  | NOT NULL, default `'starter'`                | Subscription plan                          |
| `status`               | `enum('active', 'past_due', 'cancelled', 'trial')` | NOT NULL, default `'trial'`                  | Billing state                              |
| `stripeCustomerId`     | `varchar(128)`                                     |                                              | Stripe Customer ID                         |
| `stripeSubscriptionId` | `varchar(128)`                                     |                                              | Stripe Subscription ID                     |
| `monthlyPrice`         | `decimal(10,2)`                                    | NOT NULL                                     | Monthly price in USD                       |
| `includedMinutes`      | `int`                                              | NOT NULL                                     | Minutes included in plan                   |
| `overageRate`          | `decimal(6,4)`                                     | NOT NULL                                     | Per-minute overage charge                  |
| `currentPeriodStart`   | `timestamp`                                        |                                              | Current billing period start               |
| `currentPeriodEnd`     | `timestamp`                                        |                                              | Current billing period end                 |
| `cancelAtPeriodEnd`    | `boolean`                                          | NOT NULL, default `false`                    | Whether subscription cancels at period end |
| `trialEndsAt`          | `timestamp`                                        |                                              | Trial expiration date                      |
| `createdAt`            | `timestamp`                                        | NOT NULL, default `NOW()`                    | Creation time                              |
| `updatedAt`            | `timestamp`                                        | NOT NULL, default `NOW()`, on update `NOW()` | Last update                                |

**Tier pricing:**

| Tier    | Monthly Price | Included Minutes | Overage Rate |
| ------- | ------------- | ---------------- | ------------ |
| Starter | $99           | 200              | $0.15/min    |
| Pro     | $199          | 500              | $0.12/min    |
| Elite   | $399          | 1500             | $0.10/min    |

---

## Table: `usage_records`

Tracks per-call minute usage for billing and overage calculations.

| Column           | Type            | Constraints               | Description                                |
| ---------------- | --------------- | ------------------------- | ------------------------------------------ |
| `id`             | `int`           | PK, auto-increment        | Usage record ID                            |
| `subscriptionId` | `int`           | NOT NULL                  | FK → `subscriptions.id`                    |
| `shopId`         | `int`           | NOT NULL                  | FK → `shops.id`                            |
| `ownerId`        | `int`           | NOT NULL, default `0`     | FK → `users.id`                            |
| `callLogId`      | `int`           |                           | FK → `call_logs.id` (optional link)        |
| `minutesUsed`    | `decimal(8,2)`  | NOT NULL                  | Minutes consumed by this call              |
| `isOverage`      | `boolean`       | NOT NULL, default `false` | Whether this usage exceeded the plan limit |
| `overageCharge`  | `decimal(10,2)` |                           | Dollar amount of overage charge            |
| `recordedAt`     | `timestamp`     | NOT NULL, default `NOW()` | When usage was recorded                    |

---

## Table: `notifications`

In-app notifications for shop owners. Generated by the system for events like new calls, high-value leads, and billing issues.

| Column      | Type           | Constraints               | Description                                                                                                                                |
| ----------- | -------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`        | `int`          | PK, auto-increment        | Notification ID                                                                                                                            |
| `userId`    | `int`          | NOT NULL                  | FK → `users.id`                                                                                                                            |
| `shopId`    | `int`          |                           | FK → `shops.id` (optional — some notifications are user-level)                                                                             |
| `type`      | `enum(...)`    | NOT NULL                  | One of: `new_call`, `high_value_lead`, `missed_call`, `system_issue`, `weekly_summary`, `usage_warning`, `audit_complete`, `payment_issue` |
| `title`     | `varchar(255)` | NOT NULL                  | Notification headline                                                                                                                      |
| `message`   | `text`         |                           | Notification body                                                                                                                          |
| `isRead`    | `boolean`      | NOT NULL, default `false` | Read/unread state                                                                                                                          |
| `metadata`  | `json`         |                           | Additional structured data                                                                                                                 |
| `createdAt` | `timestamp`    | NOT NULL, default `NOW()` | Creation time                                                                                                                              |

---

## Table: `partners`

Affiliate partner profiles. A user becomes a partner by enrolling through the partner portal.

| Column             | Type                                           | Constraints                                  | Description                               |
| ------------------ | ---------------------------------------------- | -------------------------------------------- | ----------------------------------------- |
| `id`               | `int`                                          | PK, auto-increment                           | Partner ID                                |
| `userId`           | `int`                                          | NOT NULL                                     | FK → `users.id`                           |
| `referralCode`     | `varchar(32)`                                  | NOT NULL, UNIQUE                             | Unique referral code (e.g., `ABDUR-7X2K`) |
| `commissionRate`   | `decimal(5,4)`                                 | NOT NULL, default `0.2000`                   | Commission percentage (0.2000 = 20%)      |
| `tier`             | `enum('bronze', 'silver', 'gold', 'platinum')` | NOT NULL, default `'bronze'`                 | Partner tier                              |
| `status`           | `enum('pending', 'active', 'suspended')`       | NOT NULL, default `'pending'`                | Partner status                            |
| `totalReferrals`   | `int`                                          | NOT NULL, default `0`                        | Lifetime referral count                   |
| `totalEarnings`    | `decimal(10,2)`                                | NOT NULL, default `0.00`                     | Lifetime earnings                         |
| `pendingEarnings`  | `decimal(10,2)`                                | NOT NULL, default `0.00`                     | Unpaid earnings balance                   |
| `payoutMethod`     | `enum('stripe', 'paypal', 'bank_transfer')`    | default `'stripe'`                           | Preferred payout method                   |
| `payoutEmail`      | `varchar(320)`                                 |                                              | PayPal email or payout destination        |
| `companyName`      | `varchar(255)`                                 |                                              | Partner's company name                    |
| `website`          | `varchar(512)`                                 |                                              | Partner's website URL                     |
| `notifyReferrals`  | `boolean`                                      | NOT NULL, default `true`                     | Email on new referral                     |
| `notifyPayouts`    | `boolean`                                      | NOT NULL, default `true`                     | Email on payout processed                 |
| `notifyNewsletter` | `boolean`                                      | NOT NULL, default `true`                     | Receive partner newsletter                |
| `createdAt`        | `timestamp`                                    | NOT NULL, default `NOW()`                    | Enrollment date                           |
| `updatedAt`        | `timestamp`                                    | NOT NULL, default `NOW()`, on update `NOW()` | Last update                               |

**Tier thresholds:**

| Tier     | Required Referrals | Commission Rate |
| -------- | ------------------ | --------------- |
| Bronze   | 0                  | 20%             |
| Silver   | 5                  | 22%             |
| Gold     | 15                 | 25%             |
| Platinum | 30                 | 30%             |

---

## Table: `referrals`

Tracks each individual referral made by a partner. A referral progresses through a lifecycle: `pending` → `signed_up` → `subscribed` (or `churned`).

| Column             | Type                                                    | Constraints                                  | Description                                        |
| ------------------ | ------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `id`               | `int`                                                   | PK, auto-increment                           | Referral ID                                        |
| `partnerId`        | `int`                                                   | NOT NULL                                     | FK → `partners.id`                                 |
| `referredUserId`   | `int`                                                   |                                              | FK → `users.id` (set when referral signs up)       |
| `referredShopId`   | `int`                                                   |                                              | FK → `shops.id` (set when referral creates a shop) |
| `referredEmail`    | `varchar(320)`                                          |                                              | Email of the referred person                       |
| `referredName`     | `varchar(255)`                                          |                                              | Name of the referred person                        |
| `status`           | `enum('pending', 'signed_up', 'subscribed', 'churned')` | NOT NULL, default `'pending'`                | Referral lifecycle state                           |
| `subscriptionTier` | `varchar(20)`                                           |                                              | Which plan the referral subscribed to              |
| `monthlyValue`     | `decimal(10,2)`                                         |                                              | Monthly subscription value                         |
| `commissionEarned` | `decimal(10,2)`                                         | NOT NULL, default `0.00`                     | Total commission earned from this referral         |
| `convertedAt`      | `timestamp`                                             |                                              | When the referral converted to a paying customer   |
| `createdAt`        | `timestamp`                                             | NOT NULL, default `NOW()`                    | Referral creation time                             |
| `updatedAt`        | `timestamp`                                             | NOT NULL, default `NOW()`, on update `NOW()` | Last update                                        |

---

## Table: `partner_payouts`

Tracks payout requests from partners. Partners request payouts when their `pendingEarnings` reach a threshold.

| Column          | Type                                                   | Constraints                   | Description                                 |
| --------------- | ------------------------------------------------------ | ----------------------------- | ------------------------------------------- |
| `id`            | `int`                                                  | PK, auto-increment            | Payout ID                                   |
| `partnerId`     | `int`                                                  | NOT NULL                      | FK → `partners.id`                          |
| `amount`        | `decimal(10,2)`                                        | NOT NULL                      | Payout amount in USD                        |
| `status`        | `enum('pending', 'processing', 'completed', 'failed')` | NOT NULL, default `'pending'` | Payout lifecycle state                      |
| `payoutMethod`  | `varchar(32)`                                          |                               | Method used (stripe, paypal, bank_transfer) |
| `payoutEmail`   | `varchar(320)`                                         |                               | Destination email/account                   |
| `transactionId` | `varchar(255)`                                         |                               | External transaction reference              |
| `notes`         | `text`                                                 |                               | Admin notes                                 |
| `requestedAt`   | `timestamp`                                            | NOT NULL, default `NOW()`     | When the partner requested payout           |
| `processedAt`   | `timestamp`                                            |                               | When the payout was processed               |
| `createdAt`     | `timestamp`                                            | NOT NULL, default `NOW()`     | Record creation time                        |

---

## Indexes

The following indexes exist for performance optimization:

| Table           | Index              | Columns        | Purpose                       |
| --------------- | ------------------ | -------------- | ----------------------------- |
| `users`         | `openId_idx`       | `openId`       | Fast OAuth lookup             |
| `shops`         | `ownerId_idx`      | `ownerId`      | Tenant-scoped shop queries    |
| `call_logs`     | `shopId_idx`       | `shopId`       | Call history by shop          |
| `call_logs`     | `ownerId_idx`      | `ownerId`      | Tenant-scoped call queries    |
| `subscriptions` | `shopId_idx`       | `shopId`       | Subscription lookup by shop   |
| `partners`      | `referralCode_idx` | `referralCode` | Referral code lookup (unique) |
| `partners`      | `userId_idx`       | `userId`       | Partner profile by user       |
| `referrals`     | `partnerId_idx`    | `partnerId`    | Referrals by partner          |
| `notifications` | `userId_idx`       | `userId`       | Notifications by user         |

---

## Design Principles

The data model follows these principles:

1. **Tenant isolation** — Every child table includes an `ownerId` column. The `tenantScope` middleware ensures users can only access their own data.

2. **Stripe as source of truth** — Only Stripe resource IDs are stored locally (`stripeCustomerId`, `stripeSubscriptionId`). Payment amounts, card details, and invoice data are fetched from Stripe's API when needed.

3. **JSON for flexible structures** — Fields like `businessHours`, `serviceCatalog`, `vehicleInfo`, and `upsellRules` use JSON columns to accommodate varying structures without schema changes.

4. **Timestamps in UTC** — All `timestamp` columns store UTC values. Frontend converts to local timezone for display.

5. **Soft lifecycle states** — Entities use enum status fields (`active`/`inactive`/`trial`, `pending`/`completed`/`cancelled`) rather than hard deletes.
