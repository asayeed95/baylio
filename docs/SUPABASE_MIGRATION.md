# Baylio — Supabase Migration Runbook

> **Target:** Migrate Baylio from TiDB/MySQL (Manus managed) to Supabase/PostgreSQL in one working day.
> **Trigger:** Execute this when Baylio reaches 50+ active shops or when realtime dashboard features become a priority.
> **Estimated time:** 6–8 hours for a developer who has read this document.

---

## Why Migrate

The current TiDB/MySQL setup is solid for 0–100 shops. The migration to Supabase becomes worthwhile when:

- You need **realtime subscriptions** (admin dashboard auto-updates on new calls without polling)
- You need **row-level security (RLS)** enforced at the database layer for multi-tenant isolation
- You want **Supabase Edge Functions** for webhook processing closer to users
- You want **built-in file storage** (Supabase Storage) to replace S3 for call recordings
- PostgreSQL's advanced analytics functions (`window functions`, `JSONB`, `full-text search`) are needed for complex reporting

---

## Pre-Migration Checklist

Complete these before starting the migration day:

- [ ] Supabase project created at [supabase.com](https://supabase.com) — note the `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`
- [ ] Supabase project is on the **Pro plan** ($25/mo) — free tier has connection limits that will cause issues at scale
- [ ] Full database backup taken from current TiDB instance
- [ ] All team members notified of maintenance window
- [ ] Feature freeze in effect — no new deployments during migration

---

## Step 1: Update Drizzle Schema (MySQL → PostgreSQL)

**Time: ~1 hour**

Every table in `drizzle/schema.ts` uses MySQL-specific types. These must be converted to PostgreSQL equivalents.

### Import Changes

```ts
// BEFORE (MySQL)
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  decimal,
} from "drizzle-orm/mysql-core";

// AFTER (PostgreSQL)
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  jsonb,
  decimal,
  serial,
} from "drizzle-orm/pg-core";
```

### Type Mapping Reference

| MySQL Type              | PostgreSQL Equivalent     | Notes                                                   |
| ----------------------- | ------------------------- | ------------------------------------------------------- |
| `mysqlTable`            | `pgTable`                 | Direct rename                                           |
| `mysqlEnum`             | `pgEnum`                  | Must be declared separately (see below)                 |
| `int().autoincrement()` | `serial()` or `integer()` | Use `serial()` for auto-increment PKs                   |
| `int()`                 | `integer()`               | Direct rename                                           |
| `varchar(n)`            | `varchar(n)`              | Same                                                    |
| `text`                  | `text`                    | Same                                                    |
| `boolean`               | `boolean`                 | Same                                                    |
| `timestamp`             | `timestamp`               | Same, but remove `.onUpdateNow()` — not supported in PG |
| `json`                  | `jsonb`                   | Use `jsonb` for better indexing and querying            |
| `decimal`               | `decimal`                 | Same                                                    |

### Enum Declaration Change

MySQL enums are inline. PostgreSQL enums must be declared separately:

```ts
// BEFORE (MySQL — inline enum)
role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),

// AFTER (PostgreSQL — separate declaration)
export const roleEnum = pgEnum("role", ["user", "admin"]);
// Then in table:
role: roleEnum("role").default("user").notNull(),
```

**All enums to convert:**

| Enum Name          | Values                                                      |
| ------------------ | ----------------------------------------------------------- |
| `roleEnum`         | `user`, `admin`                                             |
| `directionEnum`    | `inbound`, `outbound`                                       |
| `callStatusEnum`   | `completed`, `missed`, `voicemail`, `transferred`, `failed` |
| `auditStatusEnum`  | `pending`, `active`, `completed`, `expired`                 |
| `dayPartEnum`      | `morning`, `afternoon`, `evening`, `night`                  |
| `urgencyLevelEnum` | `low`, `medium`, `high`, `emergency`                        |
| `tierEnum`         | `starter`, `pro`, `elite`                                   |
| `subStatusEnum`    | `active`, `past_due`, `canceled`, `trialing`                |

### Remove `.onUpdateNow()`

PostgreSQL does not support `onUpdateNow()`. Replace with a trigger or handle in application code:

```ts
// BEFORE
updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),

// AFTER
updatedAt: timestamp("updatedAt").defaultNow().notNull(),
// Add a Supabase trigger to auto-update this field (see Step 4)
```

---

## Step 2: Update Drizzle Config

**Time: 15 minutes**

```ts
// drizzle.config.ts — BEFORE
export default {
  dialect: "mysql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: { url: process.env.DATABASE_URL! },
};

// drizzle.config.ts — AFTER
export default {
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: { url: process.env.DATABASE_URL! },
};
```

---

## Step 3: Update Database Connection

**Time: 15 minutes**

```ts
// server/db.ts — BEFORE (MySQL/TiDB)
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// AFTER (PostgreSQL/Supabase)
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

Update `package.json` dependencies:

```bash
# Remove
pnpm remove mysql2

# Add
pnpm add postgres drizzle-orm@latest
pnpm add -D drizzle-kit@latest
```

---

## Step 4: Generate and Apply Migrations

**Time: 30 minutes**

```bash
# Generate migration SQL from updated schema
pnpm drizzle-kit generate

# Review the generated SQL in drizzle/migrations/
# Then apply via Supabase SQL editor or psql
```

Add the `updated_at` auto-update trigger to replace `.onUpdateNow()`:

```sql
-- Run this in Supabase SQL editor after applying migrations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to each table that has updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_agent_configs_updated_at BEFORE UPDATE ON agent_configs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_call_logs_updated_at BEFORE UPDATE ON call_logs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

---

## Step 5: Data Migration

**Time: 1–2 hours depending on data volume**

Export data from TiDB and import into Supabase:

```bash
# Export from TiDB (run on current server)
mysqldump -h <TIDB_HOST> -u <USER> -p <DATABASE> \
  --no-create-info --complete-insert \
  users organizations shops agent_configs call_logs \
  subscriptions partners partner_referrals \
  > baylio_data_export.sql

# Convert MySQL syntax to PostgreSQL
# Key differences to fix manually:
# 1. Replace backticks with double quotes
# 2. Replace MySQL boolean (0/1) with PostgreSQL (false/true)
# 3. Replace MySQL timestamp format if needed
# 4. Remove MySQL-specific comments

# Import into Supabase
psql <SUPABASE_CONNECTION_STRING> < baylio_data_converted.sql
```

**Verify row counts match after import:**

```sql
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL SELECT 'shops', COUNT(*) FROM shops
UNION ALL SELECT 'call_logs', COUNT(*) FROM call_logs
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions;
```

---

## Step 6: Update Environment Variables

**Time: 15 minutes**

In Manus Settings → Secrets, update:

| Variable       | New Value                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL` | Supabase PostgreSQL connection string (from Supabase Settings → Database) |

Add new Supabase-specific variables:

| Variable                    | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `SUPABASE_URL`              | Your project URL (e.g., `https://xyz.supabase.co`) |
| `SUPABASE_ANON_KEY`         | Public anon key for client-side queries            |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key (never expose to frontend)   |

---

## Step 7: Enable Row-Level Security (Optional but Recommended)

**Time: 1 hour**

Supabase's RLS enforces that shop owners can only access their own data at the database layer, not just in application code. This is a significant security upgrade.

```sql
-- Enable RLS on all tenant tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;

-- Policy: shop owners can only see their own shops
CREATE POLICY "shops_owner_policy" ON shops
  FOR ALL USING (auth.uid()::text = owner_id::text);

-- Policy: call logs visible only to shop owner
CREATE POLICY "call_logs_owner_policy" ON call_logs
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()::integer)
  );
```

Note: RLS works with Supabase Auth. If continuing to use Manus OAuth, you will need to set `auth.uid()` manually via a custom JWT claim or skip RLS and rely on application-level access control (current approach).

---

## Step 8: Add Realtime Subscriptions (Bonus)

After migration, enable realtime on the `call_logs` table for the admin dashboard:

```sql
-- In Supabase Dashboard → Database → Replication
-- Enable replication for: call_logs, shops
```

```ts
// In AdminAnalytics.tsx — subscribe to new calls in real time
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

supabase
  .channel("call_logs")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "call_logs" },
    payload => {
      // New call came in — update dashboard without polling
      setRecentCalls(prev => [payload.new, ...prev]);
    }
  )
  .subscribe();
```

---

## Post-Migration Verification Checklist

- [ ] All row counts match between old and new database
- [ ] Login flow works (Manus OAuth → session cookie → `ctx.user` populated)
- [ ] Shop dashboard loads with correct data
- [ ] New call logs are being written correctly
- [ ] Twilio webhooks write to the new database
- [ ] ElevenLabs context cache loads from new database
- [ ] Stripe webhooks update subscriptions correctly
- [ ] Partner portal loads referral data
- [ ] Admin portal loads platform stats
- [ ] Run `pnpm test` — all tests pass

---

## Rollback Plan

If anything goes wrong during migration, the rollback is straightforward:

1. Revert `DATABASE_URL` in Manus Secrets to the original TiDB connection string
2. Revert `drizzle/schema.ts` to the MySQL version via `git checkout <pre-migration-commit> -- drizzle/schema.ts`
3. Revert `server/db.ts` similarly
4. Restart the dev server

The old TiDB database is not deleted during migration — it remains available as a fallback until you confirm the Supabase migration is stable in production.

---

## Cost Comparison

|               | TiDB (Current)         | Supabase Pro                     |
| ------------- | ---------------------- | -------------------------------- |
| Monthly cost  | Included in Manus plan | $25/mo                           |
| Storage       | Managed                | 8GB included                     |
| Connections   | Managed                | 200 direct, unlimited via pooler |
| Realtime      | No                     | Yes                              |
| RLS           | No                     | Yes                              |
| Backups       | Managed                | Daily, 7-day retention           |
| Self-hostable | No                     | Yes (open source)                |
