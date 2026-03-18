# Baylio: Tasks at Hand (Current State)

**Last Updated:** March 18, 2026
**Project:** Baylio (AI Call Assistant for Auto Repair Shops)
**Current Phase:** Phase 10 (Polish & Launch) / Phase 14 (Market Research Features)

## 1. Current Architecture State
Baylio is currently split across two repositories:
1. `baylio` (Main Platform): Contains the core engine, Twilio webhook endpoints, ElevenLabs integration, Stripe billing, and the React/Vite frontend.
2. `baylio-prompts` (Prompt Engine): Contains the 12 specialized Claude prompt templates (Service Advisor, Sales Closer, Spanish Native Agent, etc.) and the prompt compilation logic.

**Recent Wins (Already Pushed):**
- Security hardening (Twilio webhook validation, tenant isolation).
- Core 3-layer architecture (Webhook -> Cache -> Prompt Compiler).
- 12 fully tested Claude persona templates pushed to `baylio-prompts`.

## 2. Immediate Next Steps (The "Tasks at Hand")

These are the exact tasks that need to be executed next. When starting a new session, pick the top item from this list.

### High Priority (Revenue Blocking)
- [ ] **Merge Prompt Engine:** The `baylio-prompts` logic needs to be fully integrated into the main `baylio` repository's `server/services/promptCompiler.ts` so the frontend can dynamically generate prompts.
- [ ] **Agent Config UI:** Build the frontend page where shop owners can preview their compiled Claude prompt with their specific variables (`{{SHOP_NAME}}`, `{{SERVICE_CATALOG}}`) injected.
- [ ] **TwiML Voicemail Fallback:** Implement the fallback logic in `/api/twilio/voice` so that if ElevenLabs fails or times out, the caller is routed to a standard voicemail instead of a dead line.

### Medium Priority (Market Features)
- [ ] **Forwarding Wizard:** Build the UI flow to auto-provision a Twilio capture number for the 7-day missed call audit.
- [ ] **Peak Call Analysis:** Implement the analytics dashboard widget showing call volume heatmaps (e.g., Monday/Tuesday 8-11:30 AM patterns).
- [ ] **Mobile Responsiveness:** Ensure the Dashboard and Call Logs pages render correctly on mobile devices for shop owners on the floor.

## 3. End-of-Day Commit Protocol

To maintain the Empire Brain, execute this exact prompt to Claude or Manus at the end of every work session:

> *"Session complete. Update the `TASKS_AT_HAND.md` file in the Baylio repo to reflect what we finished today and what is next. Then commit and push the changes to GitHub with a detailed commit message."*
