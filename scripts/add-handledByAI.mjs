#!/usr/bin/env node
/**
 * Add handledByAI column to call_logs table.
 * Run with: node --env-file=.env.test scripts/add-handledByAI.mjs
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const sql = postgres(url, { prepare: false, max: 1 });

try {
  await sql`
    ALTER TABLE call_logs
    ADD COLUMN IF NOT EXISTS "handledByAI" boolean NOT NULL DEFAULT false
  `;
  console.log('✓ handledByAI column added (or already existed)');

  // Mark the two confirmed AI calls (duration > 30s, which matches the real AI sessions)
  // This is best-effort cleanup of existing test data — not business-critical
  const result = await sql`
    UPDATE call_logs SET "handledByAI" = true WHERE duration > 30
  `;
  console.log(`✓ Marked ${result.count} existing long-duration calls as AI-handled`);
} finally {
  await sql.end();
}
