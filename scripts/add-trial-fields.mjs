#!/usr/bin/env node
/**
 * One-off migration: add trial lifecycle columns to shops.
 *
 * New columns:
 *   - trialStartedAt        (when the trial started)
 *   - trialEndsAt           (when the trial expires; NULL = no trial)
 *   - trialDay7EmailSentAt  (idempotency marker for day-7 email)
 *   - trialDay12EmailSentAt
 *   - trialDay13EmailSentAt
 *   - trialDay14EmailSentAt (expiry email)
 *
 * Backfill: every existing shop gets a fresh 14-day trial starting now,
 * so no one is surprise-expired on deploy.
 *
 * Run with:  node --env-file=.env.local scripts/add-trial-fields.mjs
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  console.log("Adding trial columns to shops...");
  await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS "trialStartedAt" timestamp`;
  await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS "trialEndsAt" timestamp`;
  await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS "trialDay7EmailSentAt" timestamp`;
  await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS "trialDay12EmailSentAt" timestamp`;
  await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS "trialDay13EmailSentAt" timestamp`;
  await sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS "trialDay14EmailSentAt" timestamp`;

  console.log("Backfilling: fresh 14-day trial for existing shops without trial dates...");
  const result = await sql`
    UPDATE shops
    SET "trialStartedAt" = now(),
        "trialEndsAt"    = now() + interval '14 days'
    WHERE "trialEndsAt" IS NULL
  `;
  console.log(`Backfilled ${result.count} shops.`);

  console.log("Indexing trialEndsAt for the daily cron scan...");
  await sql`CREATE INDEX IF NOT EXISTS idx_shops_trial_ends ON shops("trialEndsAt") WHERE "trialEndsAt" IS NOT NULL`;

  console.log("Verifying...");
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name LIKE 'trial%'
    ORDER BY ordinal_position
  `;
  console.log(cols);
  console.log("Done.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await sql.end();
}
