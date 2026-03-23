# Baylio Architecture

## System Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                     BAYLIO SERVER                        │
│                                                         │
│  Express + tRPC (port 5000)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  tRPC Router  │  │ Twilio HTTP  │  │ Stripe HTTP  │  │
│  │  /api/trpc/*  │  │ /api/twilio/*│  │ /api/stripe/*│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│  ┌──────┴─────────────────┴──────────────────┴───────┐  │
│  │              Business Logic (services/)            │  │
│  │  contextCache · promptCompiler · postCallPipeline  │  │
│  │  smsService · auditService · scorecardGenerator    │  │
│  │  elevenLabsService · twilioProvisioning            │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────┴────────────────────────────┐  │
│  │           Data Layer (db.ts + Drizzle ORM)         │  │
│  │        MySQL/TiDB · 13 tables · ownerId isolation  │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

External Services:
  Twilio      → Voice API, SMS, phone provisioning
  ElevenLabs  → Conversational AI voice agent (WebSocket)
  Stripe      → Subscriptions, checkout, billing portal
  Manus OAuth → User authentication (JWT cookies)
```

## Layer Model

| Layer | Responsibility | Files |
|-------|---------------|-------|
| **Routers** | Zod validation, auth, response shaping | `server/*Router.ts` |
| **Services** | Business workflows, external API calls | `server/services/*` |
| **Data** | Raw queries, connection management | `server/db.ts` |
| **Schema** | Table definitions, types | `drizzle/schema.ts` |

## Request Flow (tRPC)

1. Client calls `trpc.shop.create.mutate(input)`
2. tRPC middleware validates auth → injects `ctx.user`
3. Router validates input with Zod
4. Router calls db helper or service
5. Response serialized via SuperJSON

## Call Flow (Twilio → ElevenLabs)

1. Customer calls shop's Twilio number
2. Twilio POSTs to `/api/twilio/voice` (must respond <2s)
3. Server resolves shop context from hot cache (or DB fallback)
4. Server calls ElevenLabs Register Call API (server-side auth)
5. Returns TwiML with authenticated WebSocket URL
6. ElevenLabs AI agent handles the conversation
7. Call ends → Twilio POSTs status callback
8. `setImmediate` queues async DB write (Layer 2)
9. Recording/transcription callbacks update the call log

## Multi-Tenant Isolation

Every child table has an `ownerId` column. All queries filter by `ctx.user.id`.
There is no row-level security in MySQL — isolation is enforced at the application layer
in every router procedure.

## Portal Routing

The frontend serves three portals from one SPA:

| Portal | Trigger | Layout |
|--------|---------|--------|
| Main | Default / `baylio.io` | DashboardLayout (light) |
| Partners | `partners.baylio.io` or `?portal=partners` | PartnersPortalLayout (dark) |
| Admin | `admin.baylio.io` or `?portal=admin` | AdminPortal |

Detection happens in `App.tsx:detectPortal()` at render time.
