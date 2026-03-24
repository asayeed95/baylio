# Webhook Reference

## Twilio Webhooks

All Twilio webhooks are handled in `server/services/twilioWebhooks.ts`.
Protected by HMAC-SHA1 signature validation (`server/middleware/twilioValidation.ts`).

### POST /api/twilio/voice

**Trigger:** Inbound call to any Baylio-provisioned Twilio number.
**Constraint:** Must respond with valid TwiML in <2 seconds or Twilio drops the call.
**Response:** TwiML from ElevenLabs Register Call API, or voicemail fallback.

**Flow:**

1. Resolve shop by `To` number (cache → DB fallback)
2. Check ElevenLabs agent is configured
3. Register call with ElevenLabs (server-side, API key never exposed)
4. Return TwiML with authenticated WebSocket URL

**Safety:** Any exception → voicemail TwiML. Never returns a non-TwiML response.

### POST /api/twilio/status

**Trigger:** Call status changes (completed, no-answer, busy, failed).
**Idempotency:** Uses `INSERT ... ON DUPLICATE KEY UPDATE` on `twilioCallSid` (unique).
Twilio retries are safe — duplicates update the existing row.

**Known limitation:** `callStartedAt` and `callEndedAt` are set to `new Date()` at
callback time, not the actual call timestamps. Fix: use Twilio's `Timestamp` param.

### POST /api/twilio/recording-complete

**Trigger:** Voicemail recording finished.
**Action:** Updates `recordingUrl` on the call log by `twilioCallSid`.
**Safety:** If no call log exists yet (race with status callback), the update is a no-op.

### POST /api/twilio/transcription-complete

**Trigger:** Twilio finishes transcribing a voicemail.
**Action:** Updates `transcription` on the call log by `twilioCallSid`.

### GET /api/twilio/health

**Trigger:** Monitoring / uptime checks.
**Response:** Cache stats, service status.

## Stripe Webhooks

Handled in `server/stripe/stripeRoutes.ts`. Raw body middleware is applied
BEFORE `express.json()` so Stripe signature verification works.

### POST /api/stripe/webhook

**Events handled:**

- `checkout.session.completed` → Create/update subscription in DB
- `invoice.paid` → Reset billing period
- `invoice.payment_failed` → Set subscription to `past_due`
- `customer.subscription.updated` → Sync tier/status changes
- `customer.subscription.deleted` → Set subscription to `canceled`

**Safety:** Test events (`evt_test_*`) are acknowledged but not processed.

## Webhook Ordering Assumptions

Twilio does NOT guarantee callback ordering. The system handles this by:

- Using `twilioCallSid` as the idempotency key for call log creation
- Recording and transcription callbacks update by `twilioCallSid` (safe if call log doesn't exist yet — no-op)
- All webhook handlers respond 200 immediately, process async via `setImmediate`
