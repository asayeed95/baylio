# Pending Schema Migrations

Run these SQL statements **manually** against the production database before deploying
the corresponding code changes. Order matters.

---

## Migration 001 — Unique constraints for idempotency and data integrity

**Date:** 2026-03-23
**Commit:** `fix: codebase hardening — schema, webhooks, error handling, race conditions`

### Why

1. `call_logs.twilioCallSid` must be unique to prevent duplicate call log rows when Twilio retries
   status callbacks. The webhook code now uses `INSERT ... ON DUPLICATE KEY UPDATE`, which requires
   this constraint.

2. `partners.userId` must be unique to enforce one partner profile per user. The enroll endpoint
   checks for duplicates in code, but without a DB constraint a race condition could create two
   profiles for the same user.

### SQL

```sql
-- 1. Deduplicate any existing call_logs before adding constraint
-- (skip if table is empty / newly created)
-- DELETE c1 FROM call_logs c1
-- INNER JOIN call_logs c2
-- WHERE c1.id > c2.id AND c1.twilioCallSid = c2.twilioCallSid
--   AND c1.twilioCallSid IS NOT NULL;

ALTER TABLE call_logs
  ADD UNIQUE INDEX uq_call_logs_twilio_sid (twilioCallSid);

-- 2. Deduplicate any existing partners before adding constraint
-- DELETE p1 FROM partners p1
-- INNER JOIN partners p2
-- WHERE p1.id > p2.id AND p1.userId = p2.userId;

ALTER TABLE partners
  ADD UNIQUE INDEX uq_partners_user_id (userId);
```

### Rollback

```sql
ALTER TABLE call_logs DROP INDEX uq_call_logs_twilio_sid;
ALTER TABLE partners DROP INDEX uq_partners_user_id;
```

---

## Migration 002 — Create caller_profiles table

**Date:** 2026-03-23
**Commit:** `feat(voice): agent transfer, caller profiles, post-call pipeline, cost analytics`

### Why

The `/api/twilio/voice` webhook now looks up callers in `caller_profiles` to pass
`caller_name` and `caller_role` as dynamic variables to ElevenLabs. Unknown callers
get a profile auto-created via `INSERT ... ON DUPLICATE KEY UPDATE`.

This table already exists in the production DB (seeded manually). This migration
formalizes it in the Drizzle schema and ensures the structure matches.

### SQL

```sql
CREATE TABLE IF NOT EXISTS caller_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(255),
  callerRole ENUM('prospect', 'shop_owner', 'founder', 'tester', 'vendor', 'unknown') NOT NULL DEFAULT 'unknown',
  shopName VARCHAR(255),
  callCount INT NOT NULL DEFAULT 0,
  lastCalledAt TIMESTAMP NULL,
  notes TEXT,
  doNotSell BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Rollback

```sql
DROP TABLE IF EXISTS caller_profiles;
```
