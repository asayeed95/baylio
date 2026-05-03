# Agency API Integrations — Design Spec

> **Status:** Future — spec now, build after Baylio reaches multi-location maturity
> **Date:** 2026-05-03
> **Author:** Abdur / Claude Code

---

## Problem

Baylio's core customers (independent auto repair shop owners) are non-technical — they want everything baked in and pay-tier determines features. But larger shops with multiple locations need custom integrations (custom CRM, fleet management, specialized DMS, custom workflows). These shops hire agencies to manage their tech stack.

Today, Baylio has no agency user type. Partners exist but are pure affiliate marketers — they sell and earn commission, no technical access. There is no programmatic API surface for third parties to extend Baylio's capabilities on behalf of shops.

## Three Personas (Finalized)

| Persona | Technical? | Role | API Access |
|---------|-----------|------|------------|
| **Shop Owner** | No | End customer. Pays tier, gets features. Zero config. | None — everything baked in |
| **Partner** | No | Affiliate marketer. Sells Baylio, earns commission. | None — sell only |
| **Agency** | Yes | Manages shops on behalf of owners. Custom integrations. | Full API access |

## What Agencies Do

Agencies manage Baylio for multi-location shops that need more than the standard baked-in integrations. An agency:

- Is assigned to manage one or more shops by the shop owner (or by Baylio sales)
- Gets API keys scoped to the shops they manage
- Can read call data, contact/enrichment data (via Mnemix), and agent configuration
- Can write custom integrations (connect to the shop's existing DMS, CRM, ERP, fleet tools)
- Can configure agent behavior programmatically (custom prompts, tool configurations, post-call webhooks)
- Cannot access billing, cannot change subscription tier, cannot transfer shop ownership

## Scope of API Access

### Read APIs (agency can pull data)

- **Call logs & transcripts** — full call history for managed shops
- **Contact data** — Mnemix-powered caller profiles, enrichment data, interaction history
- **Agent config** — current agent personality, voice, language, tools, prompt
- **Analytics** — call volume, booking rate, upsell conversion, missed calls
- **Integration status** — which integrations are active, sync logs

### Write APIs (agency can push changes)

- **Agent config** — update personality, prompt additions, language, business hours
- **Custom integrations** — register webhook endpoints for post-call events (call completed, appointment booked, upsell accepted)
- **Contact notes** — add context to caller profiles via Mnemix
- **Custom tools** — register external tool endpoints the agent can invoke during calls (e.g., lookup parts inventory, check work order status)

### Off-limits (agency cannot touch)

- Billing / subscription management
- Shop ownership transfer
- Phone number provisioning/release
- Partner commission data
- Other agencies' shops

## API Key Model

- Agency gets a single API key per agency account (not per shop)
- Key is scoped to all shops the agency is authorized to manage
- Shop owner (or Baylio admin) grants/revokes agency access per shop
- Keys use the same `sk_live_` / `sk_test_` prefix pattern as Mnemix
- Rate limited per agency (token bucket, same pattern as Mnemix)

## Mnemix Integration

Mnemix is already integrated into Baylio at the platform level (`mnemixService.ts` — pre-call caller lookup). For agencies:

- Agency API calls to contact/enrichment endpoints proxy through to the shop's Mnemix tenant
- Baylio is the Mnemix customer (one tenant), not the agency — agencies see data through Baylio's API, not Mnemix directly
- This is a hard claim for Mnemix: "Baylio's agency API is powered by Mnemix" — agencies get rich caller context because Mnemix enriches every contact automatically

## Data Model (Sketch)

```
agencies
  id, name, contact_email, api_key_hash, is_active, created_at

agency_shop_assignments
  id, agency_id, shop_id, granted_by (user_id), permissions (jsonb), created_at, revoked_at

agency_api_keys
  id, agency_id, key_prefix, key_hash, last_used_at, created_at, revoked_at

agency_webhooks
  id, agency_id, shop_id, event_type, url, secret_hash, is_active, created_at
```

## Event Types for Webhooks

- `call.completed` — call finished, transcript + analysis available
- `call.missed` — call went unanswered
- `appointment.booked` — agent booked an appointment
- `upsell.accepted` — caller accepted an upsell recommendation
- `contact.enriched` — Mnemix enrichment completed for a caller
- `contact.updated` — caller profile updated

## UI Surface

### For Shop Owners

Minimal. In shop settings:
- "Managed by: [Agency Name]" badge if an agency is assigned
- "Remove agency access" button
- No API keys, no webhook config, no technical surface

### For Agencies

New dashboard section (separate from partner portal):
- List of assigned shops with status
- API key management (generate, rotate, revoke)
- Webhook configuration per shop
- API usage / rate limit dashboard
- Documentation link

### For Baylio Admin

- Assign/revoke agency↔shop relationships
- View agency API usage across all shops
- Kill switch per agency

## Pricing

Agency API access is not a separate line item. It's a capability unlocked by the shop's tier:

- **Starter / Pro** — no agency access (shops at this level don't need it)
- **Elite** — agency access available. Shop owner can invite an agency.
- **Enterprise** (future) — dedicated agency support, custom rate limits, SLA

The agency itself doesn't pay Baylio. The shop pays Elite tier, which unlocks the ability to have an agency manage integrations.

## Dependencies

This feature depends on:

1. **Multi-location support** — agencies primarily serve multi-location operators. Baylio needs solid multi-location before agencies make sense.
2. **Mnemix stability** — agency API proxies Mnemix data. Mnemix needs to be production-hardened with spend caps, rate limiting, and tenant isolation.
3. **Webhook infrastructure** — Baylio needs a general webhook delivery system (similar to Mnemix's `webhooks.ts` with HMAC-SHA256 signing).
4. **Elite tier adoption** — need paying Elite customers before building agency features.

## Build Order (When the Time Comes)

1. `agencies` + `agency_shop_assignments` tables + RLS
2. Agency auth middleware (API key validation, shop scope check)
3. Read-only API endpoints (call logs, contacts, analytics)
4. Agency dashboard UI (shop list, API keys, usage)
5. Write API endpoints (agent config, webhooks, contact notes)
6. Webhook delivery system
7. Custom tools registration (agent can call external endpoints during calls)

## Content Strategy

- **YouTube long-form** — "How agencies can white-label AI receptionists for auto repair chains" (positions Baylio as a platform, not just a tool)
- **YouTube Shorts** — 45s demo of agency dashboard: "One API call and your client's AI receptionist knows their entire CRM"
- **X/Twitter** — Thread: "We just opened Baylio to agencies. Here's why multi-location auto repair shops need a managed AI receptionist, not a DIY one."
- **LinkedIn** — Case study angle: "How [Agency] manages 15 auto repair locations with one Baylio API integration"
- **Dev.to / HN** — Technical deep-dive on the API design, Mnemix enrichment pipeline powering caller context

## Mnemix Hard Claims (Cross-Product)

This feature generates hard claims for Mnemix marketing:
- "Baylio's agency integrations are powered by Mnemix — every caller is automatically enriched"
- "Agencies building on Baylio get Mnemix's memory layer for free — persistent caller context across locations"
- Cuentame can tell a similar story when it integrates Mnemix for student profiles
