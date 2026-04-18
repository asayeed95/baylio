#!/usr/bin/env node
/**
 * One-off migration: create sam_lead_intent enum + sam_leads table.
 * Schema source: drizzle/schema.ts lines 389-423.
 *
 * Run with:  node --env-file=.env.test scripts/add-sam-leads.mjs
 *     (or)   node --env-file=.env.local scripts/add-sam-leads.mjs
 *
 * Idempotent — safe to re-run. Uses IF NOT EXISTS everywhere.
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set — run with --env-file=.env.test (or .env.local)");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  console.log("Creating sam_lead_intent enum...");
  await sql`
    DO $$ BEGIN
      CREATE TYPE sam_lead_intent AS ENUM (
        'shop_owner_prospect',
        'curious_tester',
        'car_question',
        'existing_customer',
        'onboarding_help',
        'other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `;

  console.log("Creating sam_leads table...");
  await sql`
    CREATE TABLE IF NOT EXISTS sam_leads (
      id serial PRIMARY KEY,
      "callerPhone" varchar(32) NOT NULL,
      name varchar(255),
      email varchar(320),
      "shopName" varchar(255),
      city varchar(128),
      intent sam_lead_intent NOT NULL DEFAULT 'other',
      "intentSummary" text,
      language varchar(16) DEFAULT 'en',
      "marketingConsent" boolean NOT NULL DEFAULT false,
      "smsSent" boolean NOT NULL DEFAULT false,
      "emailSent" boolean NOT NULL DEFAULT false,
      "transferredToHuman" boolean NOT NULL DEFAULT false,
      "hubspotContactId" varchar(64),
      "conversationId" varchar(128),
      "callCount" integer NOT NULL DEFAULT 1,
      "lastCalledAt" timestamp NOT NULL DEFAULT now(),
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `;

  console.log("Creating unique index on callerPhone (quoted to preserve case)...");
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "sam_leads_callerPhone_idx"
      ON sam_leads ("callerPhone")
  `;
  // Clean up the lowercase variant if an earlier run produced it
  await sql`DROP INDEX IF EXISTS sam_leads_callerphone_idx`;

  console.log("Verifying...");
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'sam_leads'
    ORDER BY ordinal_position
  `;
  console.table(cols);

  const idx = await sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'sam_leads'
  `;
  console.log("Indexes:", idx);

  console.log("✅ Done.");
} catch (err) {
  console.error("❌ Migration failed:", err);
  process.exit(1);
} finally {
  await sql.end();
}
