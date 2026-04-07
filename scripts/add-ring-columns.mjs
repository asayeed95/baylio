#!/usr/bin/env node
/**
 * One-off migration: add ringShopFirstEnabled + ringTimeoutSec to shops table.
 * Run with:  node --env-file=.env.test scripts/add-ring-columns.mjs
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  console.log("Adding ringShopFirstEnabled column...");
  await sql`
    ALTER TABLE shops
    ADD COLUMN IF NOT EXISTS "ringShopFirstEnabled" boolean NOT NULL DEFAULT true
  `;
  console.log("Adding ringTimeoutSec column...");
  await sql`
    ALTER TABLE shops
    ADD COLUMN IF NOT EXISTS "ringTimeoutSec" integer NOT NULL DEFAULT 12
  `;
  console.log("Verifying...");
  const cols = await sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'shops'
      AND column_name IN ('ringShopFirstEnabled', 'ringTimeoutSec')
    ORDER BY column_name
  `;
  console.log(cols);
  console.log("Done.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await sql.end();
}
