# Niche Replication Guide

**How to Clone Baylio for Any Vertical in Under 2 Hours**

This guide walks you through every file, every config change, and every setup step required to take the Baylio codebase and launch it for a completely different industry — dentists, restaurants, real estate agencies, pharmacies, veterinary clinics, or any business that answers phones.

The architecture is designed so that **swapping niches is changing config, not rewriting code**. The database schema, Stripe integration, Twilio provisioning, auto-provisioning pipeline, and dashboard UI are all niche-agnostic. The only things that change are branding, industry knowledge, and pricing.

---

## Architecture Overview

The Baylio platform has two distinct AI agents running on the same codebase:

| Agent | Purpose | Technology | Config Source |
|-------|---------|------------|---------------|
| **Sales Agent** | Answers the sales line, closes deals over the phone, sends Stripe checkout via SMS | ElevenLabs Conversational AI + Twilio | `shared/nicheConfig.ts` → `server/services/prompts/baylioSalesAgent.ts` |
| **Shop Receptionist** | Answers each customer's shop line, handles appointments, upsells | ElevenLabs Conversational AI + Twilio | `agent_configs` table (per-shop) + `shared/nicheConfig.ts` defaults |

The autonomous sales pipeline works as follows: a prospect calls the sales number, the AI closes the deal using SPIN selling, collects their info, triggers `POST /api/onboard` which creates a Stripe Checkout Session and sends the link via SMS, and when the prospect pays, the Stripe webhook fires `checkout.session.completed` which auto-provisions their entire account (user, shop, agent config, Twilio number, welcome SMS) with zero human intervention.

---

## Step 0: Prerequisites

Before starting, ensure you have accounts and credentials for the following services.

| Service | What You Need | Where to Get It |
|---------|--------------|-----------------|
| **Manus** | Project hosting account | [manus.im](https://manus.im) |
| **Stripe** | Secret key, publishable key, webhook secret | [dashboard.stripe.com](https://dashboard.stripe.com) |
| **Twilio** | Account SID, auth token, phone number | [twilio.com/console](https://twilio.com/console) |
| **ElevenLabs** | API key, agent ID | [elevenlabs.io](https://elevenlabs.io) |
| **Domain** | Custom domain for the product | Any registrar |

---

## Step 1: Clone the Repository

```bash
gh repo clone your-org/baylio new-product-name
cd new-product-name
pnpm install
```

---

## Step 2: Update the Niche Config (Primary Change)

The single most important file is `shared/nicheConfig.ts`. This is the **single source of truth** for all niche-specific content. Open it and update every section.

### 2.1 Brand Config

```typescript
brand: {
  name: "DentFlow",                          // Your product name
  pronunciation: "DENT-flow",                // How the AI should say it
  tagline: "AI Call Assistant for Dental Offices",
  domain: "dentflow.io",
  supportEmail: "hello@dentflow.io",
  salesPhone: "(844) XXX-XXXX",              // Your Twilio sales number
  founderName: "Abdur",                      // Your name
  founderPronunciation: "Ab-DOOR",
  primaryColor: "#0891b2",                   // Cyan for dental
  accentColor: "#10b981",                    // Green for health
},
```

### 2.2 Industry Config

This is where the AI learns about the new vertical. Every question, objection response, and implication statement in the sales script references these values.

```typescript
industry: {
  vertical: "dental",
  verticalLabel: "Dental Offices",
  businessType: "office",                    // "shop" → "office"
  businessTypeLabel: "Office",
  ownerTitle: "practice owner",              // "shop owner" → "practice owner"
  customerType: "patient",                   // "vehicle owner" → "patient"
  avgTicketValue: 288,                       // Average dental visit value
  avgTicketLabel: "average patient visit",
  commonServices: [
    "Teeth cleaning",
    "Dental exam",
    "Cavity filling",
    "Root canal",
    "Crown placement",
    "Teeth whitening",
    "Dental implant consultation",
    "Emergency dental care",
    "Orthodontic consultation",
    "Wisdom tooth extraction",
  ],
  upsellExamples: [
    "Cleaning → Whitening treatment",
    "Exam → X-rays",
    "Filling → Crown assessment",
    "Check-up → Orthodontic consultation",
  ],
  competitors: ["Weave", "Dentrix", "RevenueWell"],
  competitorWeakness: "Generic patient communication platforms that send reminders but can't actually answer the phone. None have a real-time AI voice agent that knows dental procedures.",
},
```

### 2.3 Sales Agent Config

Update the SPIN selling questions and objection scripts for the new industry. The framework stays the same — only the industry-specific details change.

```typescript
salesAgent: {
  firstMessage: "Hey there! Thanks for calling DentFlow. I'm the AI that answers phones for dental offices — and yeah, you're actually talking to me right now. Are you a practice owner looking to catch more patient calls?",
  situationQuestions: [
    "Tell me about your practice — how many chairs are you running?",
    "Who's handling your front desk phones right now?",
    "How many new patient calls do you get in a typical week?",
  ],
  problemQuestions: [
    "What happens when your front desk is with a patient and the phone rings?",
    "How often do new patient calls go to voicemail?",
    "What about lunch hours and after 5pm — those calls just go nowhere?",
  ],
  implicationStatements: [
    "If you're missing even 8 calls a week, and the average patient visit is $288... that's over $2,300 a week in lost revenue.",
    "A new patient who gets voicemail almost never calls back. They just Google the next dentist.",
    "That's not just one visit — that's a patient who could've been coming back twice a year for decades.",
  ],
  // ... (update needPayoffQuestions, objections, closeScript similarly)
},
```

### 2.4 Pricing Config

Adjust pricing based on the new vertical's willingness to pay and competitive landscape.

```typescript
pricing: {
  tiers: {
    starter: {
      name: "Starter",
      monthlyPrice: 14900,        // $149/mo for dental (lower barrier)
      includedMinutes: 200,
      features: [/* ... */],
    },
    // ... pro and elite tiers
  },
  trialDays: 14,                  // Longer trial for dental
  // ...
},
```

---

## Step 3: Update the Sales Agent Prompt

The sales agent prompt lives in `server/services/prompts/baylioSalesAgent.ts`. While `nicheConfig.ts` holds the structured data, this file is the actual system prompt sent to ElevenLabs. You need to rewrite it for the new vertical.

**What to change:**

| Section | What Changes | Example |
|---------|-------------|---------|
| Identity line | Product name, pronunciation, vertical | "You are the AI sales closer for DentFlow, an AI phone answering service for dental offices." |
| PHASE 1 (Situation) | Industry-specific discovery questions | "How many chairs are you running?" instead of "How many bays?" |
| PHASE 2 (Problem) | Industry-specific pain points | "What happens when your hygienist is with a patient and the phone rings?" |
| PHASE 3 (Implication) | Average ticket value, revenue math | "$288 average patient visit" instead of "$466 repair order" |
| PHASE 4 (Need-Payoff) | Industry-specific benefits | "What if every new patient call was answered instantly?" |
| PHASE 5 (Close) | Pricing, trial length | Update dollar amounts and trial days |
| Product Knowledge | Services, differentiators, competitors | Dental services instead of auto repair services |
| Objection Handling | Industry-specific rebuttals | "I don't trust AI" response references dental context |
| Rules | Company info, domain, email | Update URLs and contact info |

**Template structure to preserve** (these are niche-agnostic):

The SPIN framework phases, the 4-piece info collection flow (business name, owner name, email, phone), the `send_onboard_link` tool call, the `end_call` tool reference, and the voice style instructions all stay exactly the same regardless of niche.

---

## Step 4: Update Branding Files

### 4.1 Application Title and Logo

Set these via the Manus Management UI (Settings) or through environment variables:

```
VITE_APP_TITLE=DentFlow
VITE_APP_LOGO=https://cdn.example.com/dentflow-logo.png
```

### 4.2 Color Theme

Edit `client/src/index.css` to update the CSS custom properties:

```css
:root {
  --primary: 192 91% 38%;        /* Cyan for dental */
  --primary-foreground: 0 0% 100%;
  --accent: 160 84% 39%;          /* Green for health */
  /* ... update all color variables */
}
```

### 4.3 Landing Page Content

The landing page at `client/src/pages/Home.tsx` pulls hero text, problem/solution statements, and CTA copy. Update these to match the new vertical. The `LANDING_PAGE` section of `nicheConfig.ts` provides the content — wire it into the React components.

### 4.4 Favicon and Meta Tags

Replace `client/public/favicon.ico` with the new brand's icon. Update `client/index.html` meta tags (title, description, Open Graph).

---

## Step 5: Update Stripe Products

### 5.1 Products File

The file `server/stripe/products.ts` defines the tier structure. Update it to match the new pricing from `nicheConfig.ts`:

```typescript
export const TIERS: Record<string, BaylioTier> = {
  starter: {
    id: "starter",
    name: "DentFlow Starter",
    description: "AI receptionist for single-location dental offices",
    monthlyPrice: 14900,
    // ...
  },
};
```

### 5.2 Onboard Service

The file `server/services/onboardService.ts` has a `TIER_PRICES` constant that must match. Update the amounts, names, and minutes:

```typescript
const TIER_PRICES = {
  starter: { amount: 14900, name: "DentFlow Starter", minutes: 200 },
  pro:     { amount: 29900, name: "DentFlow Pro", minutes: 600 },
  elite:   { amount: 49900, name: "DentFlow Elite", minutes: 1200 },
};
```

### 5.3 Stripe Dashboard

In the Stripe Dashboard, create new products and prices that match. The onboard service auto-creates them on first use, but it is cleaner to pre-create them in the dashboard for visibility.

---

## Step 6: Set Up Twilio

### 6.1 Purchase a Sales Number

Buy a toll-free or local number in the Twilio Console. This is the number prospects call to talk to the AI sales agent.

### 6.2 Configure the Webhook

Point the number's voice webhook to your deployed app:

```
Voice URL: https://your-domain.com/api/twilio/voice
Method: POST
```

### 6.3 Update Environment Variable

```
BAYLIO_SALES_PHONE=+1XXXXXXXXXX
```

### 6.4 SMS Capability

Ensure the number has SMS capability enabled. The autonomous pipeline sends Stripe checkout links and welcome messages via SMS from this number.

---

## Step 7: Configure ElevenLabs Agent

### 7.1 Create a New Agent

In the ElevenLabs dashboard, create a new Conversational AI agent with the following settings:

| Setting | Value |
|---------|-------|
| **Model** | Claude (or latest available) |
| **Voice** | Choose a voice that fits the new brand personality |
| **First Message** | Copy from `nicheConfig.ts` → `salesAgent.firstMessage` |
| **System Prompt** | Copy from `server/services/prompts/baylioSalesAgent.ts` (the updated version) |
| **Max Duration** | 600 seconds |
| **Streaming Latency** | 4 (max optimization) |
| **TTS Speed** | 1.05 |

### 7.2 Enable Built-in Tools

Enable these tools in the ElevenLabs agent settings:

- **end_call** — allows the AI to hang up when the conversation is complete
- **send_onboard_link** (custom tool) — calls `POST /api/onboard` with collected prospect info

### 7.3 Custom Tool Configuration

Create the `send_onboard_link` custom tool:

```json
{
  "name": "send_onboard_link",
  "description": "Send a signup link via SMS to the prospect after collecting their info",
  "parameters": {
    "type": "object",
    "properties": {
      "shopName": { "type": "string", "description": "The business name" },
      "ownerName": { "type": "string", "description": "The owner/manager name" },
      "email": { "type": "string", "description": "Their email address" },
      "phone": { "type": "string", "description": "Their phone number for SMS" },
      "tier": { "type": "string", "enum": ["starter", "pro", "elite", "trial"] }
    },
    "required": ["shopName", "ownerName", "email", "phone"]
  },
  "webhook": {
    "url": "https://your-domain.com/api/onboard",
    "method": "POST"
  }
}
```

### 7.4 Update Environment Variables

```
ELEVENLABS_API_KEY=your_key
ELEVENLABS_AGENT_ID=your_new_agent_id
```

---

## Step 8: Database — No Schema Changes Needed

The database schema in `drizzle/schema.ts` is **completely niche-agnostic**. The tables use generic names and structures that work for any vertical:

| Table | Niche-Agnostic Because |
|-------|----------------------|
| `users` | Standard user accounts |
| `shops` | Generic "business location" — works for shops, offices, clinics, restaurants |
| `agent_configs` | Per-location AI config — greeting, voice, upsell rules are all customizable |
| `call_logs` | Call metadata is the same regardless of industry |
| `subscriptions` | Stripe subscription tracking is universal |
| `notifications` | Standard notification system |

The `serviceCatalog` JSON field on the `shops` table stores industry-specific services (auto repair services, dental procedures, restaurant menu items, etc.) as flexible JSON — no schema migration needed.

---

## Step 9: Environment Variables

Here is the complete list of environment variables needed for a new niche deployment.

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `VITE_APP_TITLE` | Product name displayed in browser | Your choice |
| `VITE_APP_LOGO` | CDN URL to logo image | Upload via `manus-upload-file --webdev` |
| `STRIPE_SECRET_KEY` | Stripe secret API key | Stripe Dashboard → Developers → API Keys |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Same location |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe Dashboard → Developers → Webhooks |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | Twilio Console |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Twilio Console |
| `BAYLIO_SALES_PHONE` | Sales line phone number (E.164) | Twilio Console → Phone Numbers |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | ElevenLabs Dashboard |
| `ELEVENLABS_AGENT_ID` | ElevenLabs agent identifier | ElevenLabs Dashboard → Agents |
| `JWT_SECRET` | Session signing secret | Generate: `openssl rand -hex 32` |
| `DATABASE_URL` | MySQL/TiDB connection string | Auto-configured by Manus |

---

## Step 10: Test the Full Pipeline

### 10.1 Run the Test Suite

```bash
pnpm test
```

All tests should pass. The test suite validates Stripe connectivity, Twilio SMS capability, prompt structure, and pipeline wiring.

### 10.2 Make a Test Sales Call

Call your sales number and walk through the full flow:

1. AI answers with the new brand's first message
2. AI asks SPIN discovery questions about the new industry
3. AI presents pricing and closes
4. AI collects your info (business name, your name, email, phone)
5. AI calls `send_onboard_link` → you receive an SMS with a Stripe checkout link
6. Complete checkout with test card `4242 4242 4242 4242`
7. Stripe webhook fires → account auto-provisioned → welcome SMS received

### 10.3 Verify Auto-Provisioning

Check the database to confirm:

- New user created with your email
- New shop created with your business name
- Agent config created with default greeting
- Subscription created with correct tier
- Twilio number assigned (if available)

---

## Complete File Change Checklist

This table lists every file that needs modification, what to change, and the estimated time.

| File | What to Change | Time |
|------|---------------|------|
| `shared/nicheConfig.ts` | All niche-specific content (brand, industry, pricing, sales scripts, SMS templates, landing page) | 30 min |
| `server/services/prompts/baylioSalesAgent.ts` | Full sales prompt rewrite for new vertical | 20 min |
| `server/stripe/products.ts` | Tier names, descriptions, pricing | 5 min |
| `server/services/onboardService.ts` | `TIER_PRICES` constant (amounts, names, minutes) | 5 min |
| `client/src/index.css` | Color theme CSS variables | 10 min |
| `client/src/pages/Home.tsx` | Landing page copy, hero text, CTAs | 15 min |
| `client/index.html` | Meta tags, title, favicon reference | 5 min |
| `client/public/favicon.ico` | New brand favicon | 2 min |
| `.env` / Environment Variables | All API keys and config values | 10 min |
| **ElevenLabs Dashboard** | New agent with updated prompt, voice, and tools | 15 min |
| **Twilio Console** | New sales number, webhook URL | 5 min |
| **Stripe Dashboard** | Verify products/prices created correctly | 5 min |

**Total estimated time: ~2 hours**

---

## Example: Baylio → DentFlow (Dental Offices)

For a concrete example, here is what the key values look like when converting from auto repair to dental:

| Config Key | Baylio (Auto Repair) | DentFlow (Dental) |
|-----------|---------------------|-------------------|
| `brand.name` | Baylio | DentFlow |
| `brand.tagline` | AI Call Assistant for Auto Repair Shops | AI Call Assistant for Dental Offices |
| `industry.vertical` | auto_repair | dental |
| `industry.businessType` | shop | office |
| `industry.ownerTitle` | shop owner | practice owner |
| `industry.customerType` | vehicle owner | patient |
| `industry.avgTicketValue` | 466 | 288 |
| `pricing.tiers.starter.monthlyPrice` | 19900 | 14900 |
| Situation Q | "How many bays you running?" | "How many chairs are you running?" |
| Problem Q | "What happens when you're under a car?" | "What happens when your hygienist is with a patient?" |
| Implication | "$466 repair order walking out the door" | "$288 patient visit walking out the door" |

---

## Future: Multi-Niche from One Codebase

The long-term vision is to run multiple niches from a single deployment, where `nicheConfig.ts` becomes a lookup table keyed by domain or subdomain. This would allow `dentflow.io`, `vetcall.ai`, and `restaline.com` to all run on the same infrastructure with different configs loaded at runtime. The database already supports this — the `shops` table has no niche-specific columns, and the `serviceCatalog` JSON field adapts to any industry.

---

*Last updated: March 19, 2026*
*Author: Manus AI for Abdur's AI App Factory*
