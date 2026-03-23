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
