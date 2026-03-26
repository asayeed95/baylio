# Baylio Migration Plan: Manus → Supabase + Vercel

> **Prepared by:** Manus AI for Claude Code execution
> **Date:** March 25, 2026
> **Estimated effort:** 8–12 hours across 6 phases
> **Risk level:** Medium — the app is pre-revenue, so downtime is acceptable during migration

---

## Executive Summary

Baylio is migrating from the Manus Platform (TiDB/MySQL, Manus OAuth, S3 Forge storage, Manus hosting) to a fully independent stack: **Supabase** (Auth, PostgreSQL Database, Storage) and **Vercel** (hosting, serverless compute, CDN). This document is the complete execution blueprint for Claude Code to perform the migration.

The current stack is React 19 + Vite + Express 4 + tRPC 11 + Drizzle ORM + MySQL (TiDB). The target stack keeps React 19 + Vite + Express 4 + tRPC 11 + Drizzle ORM but swaps the database to **Supabase PostgreSQL**, auth to **Supabase Auth**, storage to **Supabase Storage**, and hosting to **Vercel**.

---

## Current Architecture Inventory

### Database: TiDB (MySQL-compatible)

The database has **18 tables** defined in `drizzle/schema.ts` using `mysqlTable` from `drizzle-orm/mysql-core`. The connection uses `mysql2` driver.

| Table | Purpose | Key Relations |
|-------|---------|---------------|
| `users` | User accounts (Manus OAuth) | Root entity |
| `organizations` | Multi-shop grouping | `ownerId → users.id` |
| `shops` | Auto repair shop profiles | `ownerId → users.id`, `organizationId → organizations.id` |
| `agent_configs` | AI voice agent settings per shop | `shopId → shops.id` |
| `call_logs` | Inbound call records | `shopId → shops.id` |
| `call_transcriptions` | Post-call transcription analysis | `callLogId → call_logs.id` |
| `missed_call_audits` | 7-day audit tracking | `shopId → shops.id` |
| `audit_calls` | Individual calls within an audit | `auditId → missed_call_audits.id` |
| `subscriptions` | Stripe subscription tracking | `shopId → shops.id` |
| `usage_records` | Monthly usage tracking | `subscriptionId → subscriptions.id` |
| `notifications` | In-app notification system | `userId → users.id` |
| `contact_submissions` | Landing page contact form | Standalone |
| `partner_applications` | Partner program applications | Standalone |
| `partner_referrals` | Partner referral tracking | `partnerId → partner_applications.id` |
| `invoices` | Stripe invoice references | `subscriptionId → subscriptions.id` |
| `sms_logs` | SMS message tracking | `shopId → shops.id` |
| `google_integrations` | Google Calendar/Sheets OAuth | `userId → users.id` |
| `appointments` | Booked appointments | `shopId → shops.id` |

### Auth: Manus OAuth

The current auth system uses Manus OAuth with JWT session cookies. Key files:

| File | Purpose |
|------|---------|
| `server/_core/oauth.ts` | OAuth callback handler, sets JWT cookie |
| `server/_core/cookies.ts` | Cookie configuration (domain, httpOnly, secure) |
| `server/_core/sdk.ts` | JWT verification, session parsing, user context |
| `server/_core/context.ts` | tRPC context builder (injects `ctx.user`) |
| `server/_core/trpc.ts` | `publicProcedure` and `protectedProcedure` definitions |
| `client/src/const.ts` | `getLoginUrl()` — builds Manus OAuth redirect URL |
| `client/src/contexts/AuthContext.tsx` | `useAuth()` hook, reads `trpc.auth.me` |

### Storage: Manus Forge S3 Proxy

File storage uses `server/storage.ts` which calls the Manus Forge API (`BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY`) for S3 operations. Two functions: `storagePut()` and `storageGet()`.

### External API Integrations (These Stay Unchanged)

| Service | Files | Env Vars |
|---------|-------|----------|
| **Twilio** (calls, SMS) | `server/services/twilioWebhooks.ts`, `twilioProvisioning.ts`, `smsService.ts` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| **ElevenLabs** (voice AI) | `server/services/elevenLabsService.ts` | `ELEVENLABS_API_KEY` |
| **Stripe** (billing) | `server/stripe/stripeRouter.ts`, `stripeRoutes.ts` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **HubSpot** (CRM) | `server/integrationRouter.ts` | `HUBSPOT_API_KEY` |
| **Nodemailer** (email) | `server/services/emailService.ts` | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| **PostHog** (analytics) | `client/src/main.tsx` | `VITE_POSTHOG_KEY` |
| **Google APIs** | `server/services/googleAuth.ts` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

### Express Routes (Non-tRPC)

These Express routes handle webhooks and OAuth callbacks that cannot go through tRPC:

| Route | Handler | Purpose |
|-------|---------|---------|
| `POST /api/twilio/voice` | `twilioWebhooks.ts` | Inbound call webhook |
| `POST /api/twilio/status` | `twilioWebhooks.ts` | Call status callback |
| `POST /api/twilio/recording` | `twilioWebhooks.ts` | Recording callback |
| `GET /api/twilio/health` | `twilioWebhooks.ts` | Health check |
| `POST /api/stripe/webhook` | `stripeRoutes.ts` | Stripe webhook |
| `GET /api/oauth/callback` | `oauth.ts` | Manus OAuth callback (WILL BE REMOVED) |
| `GET /api/integrations/google/*` | `googleAuth.ts` | Google OAuth flow |

### Manus-Specific Dependencies to Replace

| Current (Manus) | Replacement (Supabase/Vercel) | Files Affected |
|-----------------|-------------------------------|----------------|
| `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` | Supabase client | `server/_core/llm.ts`, `storage.ts`, `dataApi.ts`, `imageGeneration.ts`, `voiceTranscription.ts`, `map.ts`, `notification.ts` |
| `OAUTH_SERVER_URL` + `VITE_OAUTH_PORTAL_URL` + `VITE_APP_ID` | Supabase Auth | `server/_core/oauth.ts`, `sdk.ts`, `env.ts`, `client/src/const.ts` |
| `OWNER_OPEN_ID` | Supabase admin role check | `server/_core/env.ts` |
| `mysql2` driver | `postgres` driver | `server/db.ts` (or wherever drizzle is initialized) |
| `drizzle-orm/mysql-core` | `drizzle-orm/pg-core` | `drizzle/schema.ts` |
| Manus hosting | Vercel | `server/_core/index.ts`, `vite.config.ts` |

---

## Phase 1: Supabase Project Setup (Manual — Abdur)

This phase requires manual setup in the Supabase dashboard. Claude Code cannot do this.

### 1A. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. **Region:** US East (N. Virginia) — closest to Twilio/Stripe
3. **Name:** `baylio-production`
4. **Password:** Generate a strong password and save it
5. Note the following from Project Settings → API:
   - `SUPABASE_URL` (e.g., `https://xxxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` (public, safe for frontend)
   - `SUPABASE_SERVICE_ROLE_KEY` (secret, server-only)
6. Note the database connection string from Project Settings → Database:
   - `DATABASE_URL` (e.g., `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`)
   - Use the **Session pooler** connection string for Drizzle ORM

### 1B. Configure Supabase Auth

1. Go to Authentication → Providers
2. Enable **Email** provider (for shop owners to sign up with email/password)
3. Enable **Google** provider (optional, for Google OAuth login)
4. Go to Authentication → URL Configuration:
   - Site URL: `https://baylio.io`
   - Redirect URLs: `https://baylio.io/**`, `https://admin.baylio.io/**`, `https://partners.baylio.io/**`, `http://localhost:3000/**`

### 1C. Create Supabase Storage Bucket

1. Go to Storage → Create new bucket
2. Name: `baylio-files`
3. Public: No (use signed URLs for access)
4. File size limit: 50MB

### 1D. Collect All Credentials

After setup, provide Claude Code with these values (set as env vars):

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## Phase 2: Database Migration (Claude Code)

### 2A. Install PostgreSQL Dependencies

```bash
# Remove MySQL driver, add PostgreSQL driver
pnpm remove mysql2
pnpm add postgres
pnpm add @supabase/supabase-js
```

### 2B. Convert Schema — `drizzle/schema.ts`

Replace all MySQL types with PostgreSQL equivalents. Here is the complete type mapping:

| MySQL (Current) | PostgreSQL (Target) | Notes |
|----------------|--------------------|----|
| `import { mysqlTable, mysqlEnum, int, varchar, text, boolean, timestamp, json } from "drizzle-orm/mysql-core"` | `import { pgTable, pgEnum, serial, integer, varchar, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core"` | Top-level import change |
| `mysqlTable("name", {...})` | `pgTable("name", {...})` | Every table definition |
| `int("col").autoincrement().primaryKey()` | `serial("col").primaryKey()` | Auto-increment PKs |
| `int("col")` | `integer("col")` | Regular integers |
| `mysqlEnum("col", [...])` | Use `pgEnum` defined separately, then reference | Enum handling differs |
| `json("col").$type<T>()` | `jsonb("col").$type<T>()` | JSON columns |
| `timestamp("col").defaultNow().onUpdateNow()` | `timestamp("col").defaultNow()` | PostgreSQL has no `onUpdateNow()` — handle in application code or use a trigger |

**Critical: `onUpdateNow()` does not exist in PostgreSQL.** For `updatedAt` columns, you have two options:

**Option A (Recommended):** Create a PostgreSQL trigger function to auto-update timestamps:

```sql
-- Run this in Supabase SQL Editor after migration
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to each table that has updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ... repeat for all tables with updatedAt
```

**Option B:** Set `updatedAt` manually in every Drizzle update query:

```typescript
await db.update(shops).set({ ...data, updatedAt: new Date() }).where(eq(shops.id, id));
```

**Enum conversion example:**

```typescript
// BEFORE (MySQL)
role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),

// AFTER (PostgreSQL) — define enum at top of file, then reference
export const roleEnum = pgEnum("role", ["user", "admin"]);
// Then in the table:
role: roleEnum("role").default("user").notNull(),
```

### 2C. Update Database Connection

**File: `server/db.ts`** (or wherever the Drizzle instance is created)

```typescript
// BEFORE
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
const connection = await mysql.createPool(process.env.DATABASE_URL!);
export const db = drizzle(connection, { schema, mode: "default" });

// AFTER
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
// Disable prefetch for Supabase connection pooling (Transaction mode)
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
```

### 2D. Update Drizzle Config

**File: `drizzle.config.ts`**

```typescript
export default {
  dialect: "postgresql",  // was "mysql"
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};
```

### 2E. Generate and Apply Migration

```bash
# Generate the PostgreSQL migration
pnpm drizzle-kit generate

# Push schema directly to Supabase (for initial setup)
pnpm drizzle-kit push
```

### 2F. Migrate Existing Data

If there is production data to migrate, use pgloader or the Supabase Google Colab migration tool [1]. For Baylio's current state (pre-revenue, minimal data), it may be simpler to start fresh and re-seed test data.

If data migration is needed:

```bash
# Export from current TiDB/MySQL
mysqldump -h $OLD_HOST -u $OLD_USER -p $OLD_DB > baylio_backup.sql

# Use pgloader to convert and load into Supabase
pgloader mysql://$OLD_USER:$OLD_PASS@$OLD_HOST/$OLD_DB \
         postgresql://postgres:$SUPA_PASS@db.$SUPA_REF.supabase.co:5432/postgres
```

---

## Phase 3: Auth Migration (Claude Code)

This is the most complex phase. Manus OAuth is deeply integrated into the server core.

### 3A. Install Supabase Auth Dependencies

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### 3B. Create Supabase Client Helpers

**New file: `server/lib/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

// Server-side admin client (uses service role key — full access)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create a per-request client from the user's JWT
export function createSupabaseClient(accessToken?: string) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    }
  );
}
```

**New file: `client/src/lib/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### 3C. Replace Manus OAuth Callback

**Delete or gut: `server/_core/oauth.ts`**

Replace the Manus OAuth callback with Supabase Auth session handling. Supabase Auth uses its own JWT tokens, so the flow changes:

1. Frontend calls `supabase.auth.signInWithPassword()` or `supabase.auth.signInWithOAuth()`
2. Supabase returns a session with `access_token` and `refresh_token`
3. Frontend sends `access_token` in the Authorization header (or as a cookie) with every tRPC request
4. Server verifies the token using `supabase.auth.getUser(token)`

### 3D. Replace tRPC Context — `server/_core/context.ts`

```typescript
import { inferAsyncReturnType } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { supabaseAdmin } from "../lib/supabase";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Extract Supabase access token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  let user = null;

  if (token) {
    try {
      // Verify the token with Supabase
      const { data: { user: supaUser }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (supaUser && !error) {
        // Look up or create the user in our database
        let [dbUser] = await db.select().from(users).where(eq(users.supabaseId, supaUser.id));
        
        if (!dbUser) {
          // Auto-create user on first login
          const [newUser] = await db.insert(users).values({
            supabaseId: supaUser.id,
            email: supaUser.email ?? "",
            name: supaUser.user_metadata?.full_name ?? supaUser.email?.split("@")[0] ?? "User",
            role: "user",
          }).returning();
          dbUser = newUser;
        }
        
        user = dbUser;
      }
    } catch (e) {
      console.error("[Auth] Token verification failed:", e);
    }
  }

  return { req, res, user };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

### 3E. Update User Schema

Add `supabaseId` column to the users table (replaces `openId`):

```typescript
// In drizzle/schema.ts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  supabaseId: varchar("supabaseId", { length: 128 }).notNull().unique(), // replaces openId
  email: varchar("email", { length: 320 }),
  name: text("name"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
```

### 3F. Replace Frontend Auth

**Replace: `client/src/const.ts`** — remove `getLoginUrl()` entirely.

**Replace: `client/src/contexts/AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
```

### 3G. Update tRPC Client to Send Auth Token

**File: `client/src/main.tsx`** — update the tRPC client to include the Supabase access token:

```typescript
import { supabase } from "@/lib/supabase";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        const { data: { session } } = await supabase.auth.getSession();
        return {
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        };
      },
    }),
  ],
});
```

### 3H. Create Login/Signup Pages

Replace the current login flow (redirect to Manus OAuth) with Supabase Auth UI. Either use `@supabase/auth-ui-react` for a pre-built component, or build custom forms that call `signIn()` / `signUp()` from the AuthContext.

---

## Phase 4: Storage Migration (Claude Code)

### 4A. Replace Storage Helpers

**Rewrite: `server/storage.ts`**

```typescript
import { supabaseAdmin } from "./lib/supabase";

const BUCKET = "baylio-files";

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType?: string
): Promise<{ key: string; url: string }> {
  const { data: result, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(relKey, data, {
      contentType: contentType ?? "application/octet-stream",
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(relKey);

  return { key: relKey, url: urlData.publicUrl };
}

export async function storageGet(
  relKey: string,
  expiresIn: number = 3600
): Promise<{ key: string; url: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(relKey, expiresIn);

  if (error) throw new Error(`Storage signed URL failed: ${error.message}`);

  return { key: relKey, url: data.signedUrl };
}
```

### 4B. Update Image Generation Helper

**File: `server/_core/imageGeneration.ts`** — this currently uses `BUILT_IN_FORGE_API_URL` for image generation. Replace with a direct OpenAI/Anthropic API call or keep using the Forge API if you have standalone credentials. If not, replace `generateImage` with a call to the OpenAI DALL-E API or similar.

### 4C. Update LLM Helper

**File: `server/_core/llm.ts`** — currently proxies through Manus Forge. Replace with direct API calls:

```typescript
// Option 1: Use Anthropic directly (you have ANTHROPIC_API_KEY)
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Option 2: Use OpenRouter (you have OPENROUTER_API_KEY)
// Make HTTP calls to https://openrouter.ai/api/v1/chat/completions
```

### 4D. Update Voice Transcription

**File: `server/_core/voiceTranscription.ts`** — replace Forge proxy with direct Whisper API call via OpenAI.

### 4E. Update Notification Helper

**File: `server/_core/notification.ts`** — the `notifyOwner()` function uses Forge API. Replace with email notification via Nodemailer (already configured) or a Supabase Edge Function.

---

## Phase 5: Vercel Deployment Setup (Claude Code + Abdur)

### 5A. Create Vercel Project

**Abdur (manual):**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `asayeed95/baylio` GitHub repository
3. Framework Preset: **Other** (not Next.js)
4. Build Command: `pnpm build`
5. Output Directory: `dist`
6. Install Command: `pnpm install`

### 5B. Configure Vercel for Express + Vite

**Claude Code — create `vercel.json` in project root:**

```json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Update `server/_core/index.ts`** to export the Express app as default:

```typescript
// At the bottom of the file, after all routes are registered:
export default app;
```

The Express app must NOT hardcode a port. Use `process.env.PORT` or let Vercel handle it:

```typescript
// Only listen when not on Vercel
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}
```

### 5C. Update Build Scripts

**File: `package.json`** — ensure the build script produces both the client bundle and the server entry:

```json
{
  "scripts": {
    "dev": "tsx server/_core/index.ts",
    "build": "vite build && tsc --project tsconfig.server.json",
    "start": "node dist/server/index.js"
  }
}
```

You may need a `tsconfig.server.json` that compiles the server code to `dist/server/`.

### 5D. Set Environment Variables in Vercel

**Abdur (manual) — go to Vercel Project → Settings → Environment Variables:**

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | Supabase connection string | Production, Preview |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview |
| `SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Production (only) |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` | Production, Preview |
| `TWILIO_ACCOUNT_SID` | Current value | Production |
| `TWILIO_AUTH_TOKEN` | Current value | Production |
| `ELEVENLABS_API_KEY` | Current value | Production |
| `STRIPE_SECRET_KEY` | Current value | Production |
| `STRIPE_WEBHOOK_SECRET` | **New value** (update in Stripe Dashboard) | Production |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Current value | Production, Preview |
| `HUBSPOT_API_KEY` | Current value | Production |
| `WEBHOOK_BASE_URL` | `https://baylio.io` | Production |
| `JWT_SECRET` | Generate new or keep current | Production |
| `ANTHROPIC_API_KEY` | For direct LLM calls | Production |

### 5E. Configure Custom Domains

**Abdur (manual) — in Vercel Project → Settings → Domains:**

1. Add `baylio.io` — Vercel will provide DNS records
2. Add `www.baylio.io` — redirect to `baylio.io`
3. Add `admin.baylio.io` — same deployment, route-based separation
4. Add `partners.baylio.io` — same deployment, route-based separation
5. Update DNS records at your domain registrar to point to Vercel

### 5F. Update Webhook URLs

After deployment, update these external services:

| Service | Setting | New URL |
|---------|---------|---------|
| **Twilio** | Phone number → Voice webhook URL | `https://baylio.io/api/twilio/voice` |
| **Twilio** | Phone number → Status callback URL | `https://baylio.io/api/twilio/status` |
| **Stripe** | Developers → Webhooks → Endpoint URL | `https://baylio.io/api/stripe/webhook` |

---

## Phase 6: Testing and Cutover (Claude Code + Abdur)

### 6A. Pre-Cutover Checklist

| Check | Command/Action | Expected Result |
|-------|---------------|-----------------|
| All tests pass | `pnpm test` | 161+ tests green |
| Database connects | `pnpm drizzle-kit push` | No errors |
| Auth flow works | Sign up → Login → Dashboard | User created in Supabase + local DB |
| tRPC queries work | Load dashboard, check call logs | Data renders correctly |
| Twilio webhook responds | `curl -X POST https://baylio.io/api/twilio/health` | `{ "status": "ok" }` |
| Stripe webhook responds | Send test event from Stripe Dashboard | `{ "verified": true }` |
| Storage upload works | Upload a file through the app | File appears in Supabase Storage |
| Admin portal works | Login at `admin.baylio.io` | Cookie shared across subdomains |

### 6B. DNS Cutover Sequence

1. Deploy to Vercel (automatic on `git push`)
2. Verify preview deployment works at `*.vercel.app`
3. Add custom domains in Vercel
4. Update DNS A/CNAME records at registrar
5. Wait for DNS propagation (5–30 minutes)
6. Verify `https://baylio.io` loads from Vercel
7. Update Twilio webhook URLs
8. Update Stripe webhook URL + generate new webhook secret
9. Test a live phone call
10. Test a Stripe test payment

### 6C. Rollback Plan

If the migration fails, the rollback is straightforward since the Manus deployment remains intact:

1. Revert DNS records to point back to Manus
2. The Manus deployment continues running independently
3. No data loss since the old database is untouched

---

## Cost Comparison

| Service | Current (Manus) | After Migration |
|---------|----------------|-----------------|
| Hosting | Included in Manus plan | Vercel Pro: $20/mo |
| Database | Included (TiDB) | Supabase Pro: $25/mo |
| Auth | Included (Manus OAuth) | Included in Supabase |
| Storage | Included (S3 Forge) | Included in Supabase (up to 100GB) |
| SSL | Free | Free (Vercel) |
| Custom domains | Included | Included (Vercel) |
| **Total infrastructure** | **~$0 extra** | **~$45/mo** |

The $45/mo cost is justified by: full control over the stack, no vendor lock-in to Manus, Supabase RLS for security, Vercel edge network for global performance, and independent scaling.

---

## Files to Delete After Migration

These Manus-specific files can be removed once migration is complete:

| File | Reason |
|------|--------|
| `server/_core/oauth.ts` | Replaced by Supabase Auth |
| `server/_core/cookies.ts` | Supabase handles session cookies |
| `server/_core/sdk.ts` | Manus OAuth SDK — no longer needed |
| `server/_core/dataApi.ts` | Manus Forge data API proxy |
| `server/_core/map.ts` | Manus Forge Google Maps proxy (replace with direct API) |
| `server/_core/vite.ts` | Manus Vite plugin integration |
| `vite-plugin-manus-runtime` | Manus-specific Vite plugin (remove from devDependencies) |
| `MIGRATION.md` | Old migration doc (superseded by this file) |

---

## Claude Code Execution Prompt

Copy-paste this into Claude Code to begin the migration:

```
Read MIGRATION_PLAN.md first for full context.

MIGRATION SPRINT — Execute in this exact order:

PHASE 2: Database
1. pnpm remove mysql2 && pnpm add postgres @supabase/supabase-js @supabase/ssr
2. Convert drizzle/schema.ts: mysqlTable→pgTable, int→integer/serial, json→jsonb, mysqlEnum→pgEnum
3. Handle onUpdateNow() removal — add trigger SQL or manual updatedAt
4. Update db.ts: drizzle-orm/mysql2 → drizzle-orm/postgres-js, mysql pool → postgres client
5. Update drizzle.config.ts: dialect mysql → postgresql
6. Run: pnpm drizzle-kit generate && pnpm drizzle-kit push

PHASE 3: Auth
7. Create server/lib/supabase.ts (admin client + per-request client)
8. Create client/src/lib/supabase.ts (browser client)
9. Rewrite server/_core/context.ts to verify Supabase JWT instead of Manus cookie
10. Add supabaseId column to users table (replaces openId)
11. Rewrite client/src/contexts/AuthContext.tsx with Supabase Auth
12. Update client/src/main.tsx tRPC client to send Bearer token
13. Create Login/Signup pages with email + Google OAuth

PHASE 4: Storage
14. Rewrite server/storage.ts to use Supabase Storage
15. Replace server/_core/llm.ts Forge proxy with direct Anthropic API
16. Replace server/_core/voiceTranscription.ts with direct Whisper API
17. Replace server/_core/notification.ts with Nodemailer

PHASE 5: Vercel
18. Create vercel.json with rewrites
19. Export Express app as default in server/_core/index.ts
20. Update build scripts in package.json
21. Remove Manus-specific devDependencies (vite-plugin-manus-runtime)

After each phase: run pnpm test (all must stay green)
After all phases: deploy to Vercel preview and test all flows
```

---

## References

[1]: [Supabase MySQL Migration Guide](https://supabase.com/docs/guides/platform/migrating-to-supabase/mysql)
[2]: [Drizzle ORM + Supabase Setup](https://orm.drizzle.team/docs/get-started/supabase-new)
[3]: [Express on Vercel](https://vercel.com/docs/frameworks/backend/express)
[4]: [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
[5]: [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
