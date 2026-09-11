# Baylio Migration Guide: MySQL/TiDB → Supabase PostgreSQL + Vercel

> **When to execute this:** After reaching 100+ paying shops (~$20K MRR). The engineering cost is ~6 hours. At that scale, Supabase's native RLS and Vercel's edge network justify the migration.

---

## Pre-Migration Checklist

- [ ] Export production data backup from current DB
- [ ] Create Supabase project in US East (N. Virginia) region
- [ ] Create Vercel account connected to GitHub (asayeed95)
- [ ] Confirm all env vars are documented

---

## Step 1: Schema Migration (drizzle/schema.ts)

Replace all `mysqlTable` with `pgTable` and update column types:

```ts
// BEFORE (MySQL)
import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  json,
} from "drizzle-orm/mysql-core";

export const shops = mysqlTable("shops", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  // ...
});

// AFTER (PostgreSQL)
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  // ...
});
```

**Key type changes:**
| MySQL | PostgreSQL |
|---|---|
| `int().autoincrement()` | `serial()` |
| `int()` | `integer()` |
| `json()` | `jsonb()` |
| `tinyint` (boolean) | `boolean()` |
| `datetime()` | `timestamp()` |

---

## Step 2: Drizzle Config (drizzle.config.ts)

```ts
// BEFORE
export default {
  dialect: "mysql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  // ...
};

// AFTER
export default {
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  // ...
};
```

---

## Step 3: Database Connection (server/db.ts)

```ts
// BEFORE
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createPool(process.env.DATABASE_URL!);
export const db = drizzle(connection, { schema, mode: "default" });

// AFTER
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

---

## Step 4: Supabase Row Level Security (replaces tenantScope middleware)

After migration, enable RLS on all tables in Supabase SQL editor:

```sql
-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Create policy: users can only see their own rows
CREATE POLICY "owner_isolation" ON shops
  FOR ALL USING (owner_id = auth.uid()::integer);
```

This replaces the application-level `tenantScope` middleware entirely.

---

## Step 5: Environment Variables for Vercel

Set these in Vercel project settings → Environment Variables:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET=[same value]
TWILIO_ACCOUNT_SID=[same value]
TWILIO_AUTH_TOKEN=[same value]
ELEVENLABS_API_KEY=[same value]
STRIPE_SECRET_KEY=[same value]
STRIPE_WEBHOOK_SECRET=[new value - update Stripe webhook URL to Vercel domain]
```

**Important:** Update Twilio webhook URLs from Manus domain to Vercel domain after deploy.

---

## Step 6: Vercel Configuration (vercel.json)

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
  "framework": null,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Step 7: Data Migration

```bash
# Export from current DB
mysqldump $OLD_DATABASE_URL > baylio_backup.sql

# Use pgloader or manual CSV export/import for data migration
# Supabase provides a migration tool in their dashboard
```

---

## Estimated Timeline

| Task                            | Time           |
| ------------------------------- | -------------- |
| Schema rewrite                  | 1 hour         |
| Drizzle config + connection     | 30 min         |
| RLS policies                    | 1 hour         |
| Vercel setup + env vars         | 30 min         |
| Data migration                  | 1 hour         |
| Testing + Twilio webhook update | 1 hour         |
| **Total**                       | **~5-6 hours** |

---

## Cost Comparison

| Service         | Current (Manus)        | After Migration      |
| --------------- | ---------------------- | -------------------- |
| Hosting         | Included in Manus plan | Vercel Pro: $20/mo   |
| Database        | Included in Manus plan | Supabase Pro: $25/mo |
| SSL             | Free (Let's Encrypt)   | Free (Vercel)        |
| Custom domain   | Included               | Included             |
| **Total infra** | **~$0 extra**          | **~$45/mo**          |

**Verdict:** Only migrate when the operational benefits (global edge, native RLS, Supabase realtime) outweigh the $45/mo cost and 6-hour migration effort. At 100 shops ($20K MRR), this is trivially justified.
