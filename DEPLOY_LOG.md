# Baylio Deploy Log

> **Claude Code: READ THIS FILE at the start of every session.**
> **Update it after every `git push` with what changed.**

---

## Latest Deploy

- **Date:** 2026-04-06
- **Branch:** main
- **Commit:** `8d3c54d` → `1d2dcf7`
- **Pushed by:** Claude Code (asec-mac)

### What Changed

1. **fix: Twilio signature validation breaking all inbound calls**
   - Vercel rewrites inject `?path=twilio%2Fvoice` query param
   - Twilio signs against clean URL without that param → signature mismatch → 403 on every call
   - Fix: strip Vercel's `path` query param before computing expected signature
   - Files: `server/middleware/twilioValidation.ts`, `api/index.js`

2. **docs: added push-after-every-change rule to CLAUDE.md**

### Current Production State

- **baylio.io** — live, SPA loads correctly
- **API health** — `GET /api/health` returns `{"status":"ok"}`
- **Twilio webhooks** — signature validation fixed, calls should route to ElevenLabs agent
- **Sales line (844-875-2441)** — routes to Sam agent
- **Auth** — Supabase Auth working
- **Stripe** — wired but needs live payment test
- **Phone provisioning** — buy/search/release numbers works, forwarding UI partially built

### Known Issues

- Vite build fails locally (missing deps on asec-mac), but esbuild bundles serverless function fine
- Contact form SMTP still broken (needs Resend)
- Call forwarding, number porting, SIP trunking — not yet built

### In Progress

- Designing full phone provisioning system (4 methods: forwarding, new number, porting, SIP)

---

## Previous Deploys

_(Add entries above this line, move latest to here when superseded)_
