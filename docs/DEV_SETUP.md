# Development Setup

## Prerequisites

- Node.js 20+
- pnpm 10+
- MySQL 8 or TiDB (for local dev, TiDB Serverless works)

## Quick Start

```bash
git clone https://github.com/asayeed95/baylio.git
cd baylio
pnpm install
```

## Environment Variables

Copy from the team vault or create `.env` in the project root:

```env
DATABASE_URL=mysql://user:pass@host:port/baylio
JWT_SECRET=<32+ char random string>
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=<32-char hex>
ELEVENLABS_API_KEY=<your key>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Optional:

```env
TWILIO_VALIDATION_ENABLED=false  # Disable webhook HMAC check in dev
```

## Running

```bash
pnpm dev        # Start dev server (Vite + Express on :5000)
pnpm test       # Run Vitest
pnpm test --run # Run once, no watch
```

## Database

Schema is managed with Drizzle ORM. Definitions in `drizzle/schema.ts`.

```bash
pnpm drizzle-kit generate  # Generate SQL migration from schema changes
pnpm drizzle-kit push      # Push schema directly to DB (dev only!)
```

**Production migrations** are documented in `docs/PENDING_MIGRATIONS.md` and run manually.

## Testing

- Tests live in `server/*.test.ts`
- DB is mocked — tests don't need a real database
- Twilio/ElevenLabs integration tests require env vars and are skipped without them
- Run `pnpm test --run` after every significant change

## Project Structure

```
client/src/           Frontend (React 19 + Vite)
  pages/              Page components (one per route)
  components/         Shared components + layouts
  _core/              Auth hooks, trpc client
server/               Backend (Express + tRPC)
  _core/              Framework plumbing (don't edit)
  services/           Business logic + external integrations
  middleware/          Express middleware (Twilio validation, tenant scope)
  stripe/             Stripe checkout + webhook handling
  *Router.ts          tRPC router files
  db.ts               Drizzle query helpers
drizzle/              Schema + migrations
docs/                 Architecture, API, webhook, and setup docs
```

## What is Safe to Modify

| Area                 | Safety      | Notes                              |
| -------------------- | ----------- | ---------------------------------- |
| `client/src/pages/*` | Safe        | Self-contained page components     |
| `server/*Router.ts`  | Safe        | Add procedures, keep auth checks   |
| `server/services/*`  | Careful     | Business logic, test after changes |
| `server/db.ts`       | Careful     | Used by all routers                |
| `drizzle/schema.ts`  | Careful     | Schema changes need migrations     |
| `server/_core/*`     | Do not edit | Framework internals                |
