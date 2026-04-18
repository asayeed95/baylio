# Pi Monitor — Baylio Uptime + Synthetic Twilio Probe

**Date:** 2026-04-17
**Status:** Proposed — **not implemented**. To be built on the Raspberry Pi (NVMe, cooling fan, 24/7) in a later session.
**Owner:** Abdur (operator) + Claude Code (implementer, next session)

---

## Problem

LOOP-001 and LOOP-002 (`docs/memory/open-loops.md`) describe the same fear in different shapes: Baylio goes silently wrong in production and Abdur finds out via a customer complaint, not a metric.

Silent failure modes that generic uptime services (Pingdom, Better Stack) cannot see:
- Twilio signature validation broken → every inbound call 403s, but `/api/health` is fine
- ElevenLabs agent answers but plays silent audio (`ulaw_8000` regression, LLM model retired, agent config drift)
- Stripe webhook handler throws → subscriptions never activate, site looks up
- Post-call pipeline dies silently → `call_logs` has empty analysis columns
- DNS / certificate expiry 24h before production impact

A generic HTTP ping is insufficient because the entire Baylio value prop is the voice loop, which a cert-and-200 check can't validate.

## Goal

A Pi-hosted monitor that detects customer-visible regressions within ~90 seconds and pages Abdur on Telegram, covering both HTTP surface and the actual voice path.

## Non-Goals

- Not a replacement for Sentry/PostHog/Vercel analytics. Those catch in-flight errors; this catches total-outage cases.
- Not load testing.
- Not a general SaaS monitor. Baylio-specific probes only.
- Not multi-tenant monitoring (one operator, one Baylio install).

---

## Architecture

```
┌───────────┐  HTTP probe 60s    ┌──────────────────┐
│           │───────────────────►│ baylio.io        │
│           │                    │ /api/health, /   │
│  Pi       │                    └──────────────────┘
│  (Linux   │  Twilio REST call  ┌──────────────────┐
│   + NVMe) │───────────────────►│ twilio.com API   │
│           │                    │ calls.create     │
│           │                    └────────┬─────────┘
│           │                             │ places call
│           │                             ▼
│           │                    ┌──────────────────┐
│           │                    │ Baylio health-   │
│           │                    │ check number     │
│           │                    │ (answers via AI) │
│           │◄──status callbacks─└──────────────────┘
│           │   (via Cloudflare Tunnel → :8080)
│           │                              
│           │  Telegram Bot API   ┌──────────────────┐
│           │────────────────────►│ Abdur's Telegram │
└───────────┘                     └──────────────────┘
```

---

## Components

### 1. HTTP probe (every 60s)

`scripts/probe-http.sh` — runs under a systemd timer.

```bash
#!/bin/bash
set -u
STAMP=$(date -Iseconds)
for URL in https://baylio.io/api/health https://baylio.io/; do
  OUT=$(curl -sS -w 'http_code=%{http_code} total=%{time_total} cert_days=%{certs}' \
              -o /dev/null --max-time 10 "$URL" 2>&1)
  echo "$STAMP $URL $OUT" | tee -a /var/log/baylio-monitor/http.log
  # parse + record + alert on anomaly (see probe_result_handler.py)
done
```

Thresholds:
| Symptom | Condition | Severity |
|---|---|---|
| 5xx | 1 failure | page |
| 4xx (not 404) | 3 consecutive | warn |
| Latency > 5s | 3 consecutive | warn |
| DNS fail | 1 failure | page |
| TLS cert < 7d to expiry | any | daily reminder |

### 2. Synthetic Twilio call (hourly)

`scripts/synthetic-call.py` — Twilio Python SDK preferred (stdlib + 1 dep).

The Pi uses Twilio REST API to dial a **dedicated Baylio health-check phone number** from a **dedicated Twilio outbound number**, tagged as a tester so it doesn't pollute real metrics.

```python
from twilio.rest import Client
import os, time, sqlite3

client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])

call = client.calls.create(
    to=os.environ["TWILIO_SYNTHETIC_TO"],      # Baylio health-check number
    from_=os.environ["TWILIO_SYNTHETIC_FROM"], # dedicated outbound number
    status_callback="https://pi-monitor.example/twilio-status",
    status_callback_event=["initiated","ringing","answered","completed"],
    status_callback_method="POST",
    timeout=30,
    record=True,   # optional: keep a short recording to detect silent-audio regressions
)
# Insert call.sid into SQLite; status callbacks update the row.
```

The Pi exposes `/twilio-status` via a small Flask/FastAPI app (`scripts/webhook-server.py`) fronted by a Cloudflare Tunnel so Twilio can reach it without opening residential ports.

Pass/fail criteria per call:
- `status == "completed"` AND `duration >= 10s` → pass
- `status == "failed" | "busy" | "no-answer"` → page
- `status == "completed"` AND `duration < 5s` → page (silent-audio regression)
- If `record=True`: fetch recording, detect near-silence via ffmpeg volume-detect → page on anomaly

### 3. Telegram alerting

`scripts/alert.py` — direct HTTP POST to `https://api.telegram.org/bot<TOKEN>/sendMessage`.

Features:
- Per-symptom debounce: max 1 alert per symptom per 15 minutes
- Auto-recover ping when probe returns to healthy
- Severity prefix: 🔴 page / 🟡 warn / ℹ️ info
- Include context link: URL, http code, latency, timestamp

Telegram bot token + chat ID stored in `/opt/baylio-monitor/.env` (0600 perms, owned by `baylio-monitor` system user).

### 4. Metrics persistence

SQLite at `/var/lib/baylio-monitor/metrics.db`:

```sql
CREATE TABLE http_probe (
  ts TIMESTAMP NOT NULL,
  url TEXT NOT NULL,
  http_code INTEGER,
  latency_ms INTEGER,
  cert_days_left INTEGER,
  ok BOOLEAN NOT NULL
);

CREATE TABLE synthetic_call (
  sid TEXT PRIMARY KEY,
  ts TIMESTAMP NOT NULL,
  status TEXT,
  duration_sec INTEGER,
  recording_url TEXT,
  silent_audio_detected BOOLEAN,
  ok BOOLEAN
);

CREATE TABLE alert_state (
  symptom TEXT PRIMARY KEY,
  last_fired_at TIMESTAMP,
  active BOOLEAN
);

CREATE INDEX http_probe_ts ON http_probe(ts);
CREATE INDEX synthetic_call_ts ON synthetic_call(ts);
```

Retention: keep 30 days via a daily cleanup cron. No need for time-series DB at this scale.

### 5. Dashboard (optional, post-MVP)

Single HTML page served from the same webhook-server process:
- Last 24h http probe success rate
- Last 7d synthetic call outcomes
- Current alert state table
- Exposed only via Tailscale (not public)

---

## Deployment

### Directory layout

```
/opt/baylio-monitor/
├── bin/
│   ├── probe-http.sh
│   ├── synthetic-call.py
│   ├── webhook-server.py       # Flask/FastAPI on :8080
│   └── alert.py                 # shared Telegram sender
├── .env                         # 0600, owned baylio-monitor:baylio-monitor
├── .venv/                       # Python virtualenv
└── requirements.txt

/var/log/baylio-monitor/
├── http.log                     # rotated by logrotate
├── synthetic.log
└── alerts.log

/var/lib/baylio-monitor/
└── metrics.db                   # SQLite
```

### systemd units

`/etc/systemd/system/baylio-http-probe.service`
`/etc/systemd/system/baylio-http-probe.timer` (OnCalendar=*:*:00/60)
`/etc/systemd/system/baylio-synthetic-call.service`
`/etc/systemd/system/baylio-synthetic-call.timer` (OnCalendar=*:07:00)
`/etc/systemd/system/baylio-webhook.service` (Type=simple, Restart=always)

Run everything as the `baylio-monitor` system user (not root). Secrets in `.env`, loaded via `EnvironmentFile=` directive.

### Public endpoint (for Twilio callbacks)

Cloudflare Tunnel (`cloudflared`) — free, no open ports, stable subdomain:
```
pi-monitor.<abdur-personal-domain>  → localhost:8080
```

Alternative: ngrok free tier, but tunnel URL changes on restart.

---

## Secrets

Stored in `/opt/baylio-monitor/.env` only. Not in the Baylio repo. Not in any git history.

```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_SYNTHETIC_FROM=+1XXXXXXXXXX   # dedicated outbound number (~$1/mo)
TWILIO_SYNTHETIC_TO=+1YYYYYYYYYY     # dedicated Baylio health-check inbound
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
BAYLIO_HEALTHCHECK_SHOP_ID=...       # for future — to tag calls in Baylio DB
```

Before first run, seed a row in Baylio's `caller_profiles` table with `phone=TWILIO_SYNTHETIC_FROM`, `callerRole='tester'` so synthetic calls are excluded from usage/analytics.

---

## Cost

| Line item | Monthly |
|---|---|
| Twilio outbound, ~30s calls × 24/day | $0.007 × 24 × 30 ≈ $5 |
| Twilio dedicated outbound number | $1 |
| Twilio dedicated Baylio inbound number | $1 (already provisioned?) |
| Cloudflare Tunnel | $0 |
| Telegram bot | $0 |
| Pi electricity (already running) | $0 marginal |
| **Total** | **~$7/mo** |

Compare: Pingdom starter $15/mo + doesn't cover voice-specific regressions.

---

## Failure modes

| Failure | Detection | Handling |
|---|---|---|
| Pi offline | Mac Mini daily cron pings `http://pi.local:8080/heartbeat`. Missing = Telegram alert. | Manual reboot. |
| Twilio balance low | Probe reads balance daily, alerts at $10. | Top up. |
| Telegram rate limit (30 msg/sec) | Alert sender has per-chat throttle. | Debounce. |
| Cloudflare Tunnel down | webhook-server detects no callbacks for 2h during active calls. | Fallback: Tailscale subnet + direct Pi URL. |
| Baylio's health-check agent drifts | Synthetic call duration regression — alert on duration deltas. | Redeploy Sam/Zee config from `scripts/setup-sam.mjs`. |
| Pi clock drift | ntpd pinned in systemd. | Auto. |

---

## Alerting rules (fired to Telegram)

🔴 **Page** (immediate):
- `/api/health` returns 5xx
- Synthetic call status != `completed`
- Synthetic call duration < 5s
- DNS resolution fails for baylio.io

🟡 **Warn** (3 consecutive):
- HTTP latency > 5s
- HTTP 4xx (not 404)

ℹ️ **Info** (daily summary):
- Probe success rate last 24h
- Twilio balance
- TLS expiry if <14d

---

## Test plan (manual)

Once built, verify each symptom fires correctly:

1. Disable Vercel function (`vercel rollback` to broken commit) → confirm 🔴 within 3min.
2. Revoke Twilio auth temporarily → confirm synthetic-call alert.
3. Mis-configure ElevenLabs agent model → confirm silent-audio detected.
4. Block Pi from internet → confirm Mac Mini heartbeat alert.
5. Resolve each → confirm auto-recover ping lands in Telegram.

---

## Implementation order (next session on the Pi)

1. [ ] Provision dedicated Twilio outbound + Baylio inbound numbers (or reuse existing test number).
2. [ ] Seed `caller_profiles` row with `callerRole='tester'` for the outbound number.
3. [ ] Set up Telegram bot via `@BotFather`; grab chat_id from a first message.
4. [ ] `cloudflared` install on Pi → tunnel `pi-monitor.<domain>` → `localhost:8080`.
5. [ ] Create `baylio-monitor` system user + directory layout.
6. [ ] Python venv + requirements (`twilio`, `flask`, `requests`).
7. [ ] `probe-http.sh` + systemd timer — verify writes to SQLite.
8. [ ] `alert.py` — send test Telegram message.
9. [ ] `webhook-server.py` — Twilio status callback handler.
10. [ ] `synthetic-call.py` + systemd timer — one manual trigger, verify full round-trip.
11. [ ] Alert debounce table + per-symptom rules.
12. [ ] Mac Mini Pi-heartbeat cron.
13. [ ] Break each symptom intentionally, verify alerts fire, document in DEPLOY_LOG.

---

## Open questions

- **Pi model/OS:** 4B (4GB RAM) would be ample; Zero 2W would work but tight on memory if dashboard runs. Likely whatever Abdur has.
- **Python vs Node for the services:** Python stdlib + Flask is simplest. Node keeps us closer to the Baylio stack but pulls in a package tree. Python wins on Pi resource usage.
- **Recording storage:** Keep last 24 synthetic-call recordings for manual QA sampling? ~100MB/day on NVMe — fine.
- **Dashboard priority:** Skip for MVP. Add when Abdur wants a glance without opening Telegram.
- **Alert fatigue:** Start with page/warn/info distinction + per-symptom debounce. Tune after 30 days.

---

## Out of scope (for future specs)

- Multi-region probes (we're a US-only product today).
- Load generation / stress tests.
- Integration with Baylio's admin UI (no UI path planned).
- Replacing the nightly QA pipeline (different layer — QA = code quality; this = production reality).
