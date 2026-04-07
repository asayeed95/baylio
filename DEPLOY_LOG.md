# Baylio Deploy Log

> **Claude Code: READ THIS FILE at the start of every session.**
> **Update it after every `git push` with what changed.**

---

## Latest Deploy

- **Date:** 2026-04-07
- **Branch:** main
- **Commit:** `eff9696` → (next push)
- **Pushed by:** Claude Code (asec-mac)

### What Changed

1. **docs: phone provisioning architecture decision recorded**
   - Decided on layered call routing model (see "Phone Provisioning Design" below)
   - Primary path: Baylio owns the number, rings shop first via TwiML `<Dial>`, AI picks up on no-answer
   - This eliminates carrier-side dependency (AT&T `*61*` codes, etc.)

### Current Production State

- **baylio.io** — live, SPA loads correctly
- **API health** — `GET /api/health` returns `{"status":"ok"}`
- **Twilio webhooks** — signature validation fixed (strips Vercel `?path=` query param). Calls route to ElevenLabs agent
- **Sales line (844-875-2441)** — routes to Sam agent
- **Auth** — Supabase Auth working
- **Stripe** — wired, needs live payment test
- **Phone provisioning** — buy/search/release Twilio numbers works (`server/services/twilioProvisioning.ts` + `shopRouter.ts` lines 159-253). Onboarding wizard has phone setup step. ShopSettings has full TwilioPhoneCard UI.

### Known Issues

- Vite build fails locally on asec-mac (missing deps), but `esbuild` bundles serverless function fine — Vercel builds it cleanly on push
- Contact form SMTP broken (needs Resend migration)
- Call forwarding, number porting, SIP trunking — not yet built (designed, see below)
- No "ring shop first then AI" routing yet — needs TwiML `<Dial>` step

### In Progress

- Phone provisioning expansion: 4-method layered system (see design below)
- User wants Autoblitz launched soon, needs end-to-end test of full pipeline

---

## Phone Provisioning Design (Decided 2026-04-07)

**Problem:** Carrier-side call forwarding (AT&T `*61*` codes) is fragile — landlines don't always support timed forwarding, PBX systems block it, non-technical shop owners can't configure it, settings reset, no way to verify it's working.

**Solution:** Flip the model. Baylio owns the number. Twilio rings the shop's existing phone first via `<Dial>` TwiML, falls back to AI agent on no-answer/busy/rejection.

### Layered Architecture

| Layer | Method | When to Use |
|-------|--------|-------------|
| 1 (Primary) | Baylio number + ring shop first via `<Dial>` | Default for new shops — instant setup, no carrier config |
| 2 (Migration) | Number porting (Twilio Porting API) | Shop wants to keep advertised number long-term |
| 3 (Enterprise) | SIP trunking | Shops with existing VoIP/PBX systems |
| 4 (Backup) | Carrier-side forwarding | Fallback if Twilio is down |

### Routing Flow (Layer 1)

```
Customer calls Baylio number
  → Twilio /api/twilio/voice webhook
  → Resolve shop context
  → Return TwiML: <Dial timeout="12">{shop's existing phone}</Dial>
  → Shop answers? Human handles call.
  → No answer / busy / rejected? → /api/twilio/no-answer
  → Register call with ElevenLabs → AI agent picks up
```

### Configurable Settings (per shop)

- Ring timeout before AI takes over (default: 12 sec, range: 5-30)
- Enable/disable "ring shop first" (some shops may want AI to answer immediately)
- After-hours behavior (always go straight to AI)
- Busy/no-answer/rejected → all route to AI

### Failure Cases Handled

| Failure | Behavior |
|---------|----------|
| Shop's phone is off/broken | AI picks up after timeout |
| Shop on another call (busy) | AI picks up immediately |
| Shop rejects call | AI picks up immediately |
| Shop's phone rings but no one picks up | AI picks up after timeout |
| Twilio itself down | Carrier forwarding as Layer 4 backup |
| Customer hangs up during the ring | Logged as missed, no recovery possible |

### What Needs to Be Built

- [ ] TwiML `<Dial>` step in `/api/twilio/voice` handler (with timeout from shop config)
- [ ] `/api/twilio/no-answer` endpoint that registers call with ElevenLabs
- [ ] `shops.ringTimeoutSec` column (default 12)
- [ ] `shops.ringShopFirstEnabled` column (default true)
- [ ] ShopSettings UI: ring timeout slider, toggle for "AI answers immediately"
- [ ] Number porting flow (Twilio Porting API + LOA upload + status tracking)
- [ ] SIP trunk provisioning (Twilio SIP Trunks API)
- [ ] Carrier forwarding instructions UI (per-carrier guides as Layer 4 fallback)
- [ ] End-to-end test of all 4 layers before Autoblitz launch

---

## Previous Deploys

### 2026-04-06

- **Commit:** `8d3c54d` → `1d2dcf7` → `eff9696`
- **Changes:**
  1. fix: Twilio signature validation — Vercel injects `?path=twilio%2Fvoice` query param into rewrites; Twilio signs against the clean URL → 403 on every call. Fix strips the param before signature check. Files: `server/middleware/twilioValidation.ts`, `api/index.js`
  2. docs: push-after-every-change rule added to CLAUDE.md
  3. feat: DEPLOY_LOG.md created for cross-machine session continuity

_(Add older entries above this line)_
