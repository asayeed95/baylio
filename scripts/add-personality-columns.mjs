#!/usr/bin/env node
/**
 * One-off migration: add personality columns to agent_configs table.
 * Run with:  node --env-file=.env.test scripts/add-personality-columns.mjs
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  await sql`
    ALTER TABLE agent_configs
      ADD COLUMN IF NOT EXISTS "characterPreset" varchar(32) NOT NULL DEFAULT 'warm_helper',
      ADD COLUMN IF NOT EXISTS "warmth"          integer      NOT NULL DEFAULT 4,
      ADD COLUMN IF NOT EXISTS "salesIntensity"  integer      NOT NULL DEFAULT 3,
      ADD COLUMN IF NOT EXISTS "technicalDepth"  integer      NOT NULL DEFAULT 2
  `;
  console.log("Verifying...");
  const cols = await sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'agent_configs'
      AND column_name IN ('characterPreset', 'warmth', 'salesIntensity', 'technicalDepth')
    ORDER BY column_name
  `;
  console.log(cols);
  console.log("✓ Personality columns added to agent_configs");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await sql.end();
}
