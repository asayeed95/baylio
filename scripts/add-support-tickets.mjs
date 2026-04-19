#!/usr/bin/env node
/**
 * One-off migration: create support_tickets table + enums.
 * Run with:  node --env-file=.env.local scripts/add-support-tickets.mjs
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });

try {
  console.log("Creating support_status enum...");
  await sql`
    DO $$ BEGIN
      CREATE TYPE support_status AS ENUM ('new','triaged','in_progress','shipped','declined','spam');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;

  console.log("Creating support_category enum...");
  await sql`
    DO $$ BEGIN
      CREATE TYPE support_category AS ENUM ('feature_request','bug_report','question','billing','language_request','integration_request','other');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;

  console.log("Creating support_priority enum...");
  await sql`
    DO $$ BEGIN
      CREATE TYPE support_priority AS ENUM ('low','medium','high','urgent');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `;

  console.log("Creating support_tickets table...");
  await sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id serial PRIMARY KEY,
      "fromEmail" varchar(320) NOT NULL,
      "fromName" varchar(255),
      subject varchar(500),
      body text NOT NULL,
      "bodyHtml" text,
      "messageId" varchar(500),
      status support_status NOT NULL DEFAULT 'new',
      category support_category,
      priority support_priority,
      summary text,
      "adminNotes" text,
      "autoAckSentAt" timestamp,
      "triagedAt" timestamp,
      "shippedAt" timestamp,
      "assignedToUserId" integer,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `;

  console.log("Indexing support_tickets...");
  await sql`CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets("createdAt" DESC)`;

  console.log("Verifying...");
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'support_tickets'
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
