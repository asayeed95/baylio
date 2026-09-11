# ANTIGRAVITY UI/UX SPRINT — Baylio

> **Context:** You are working on Baylio (baylio.io), an AI-powered phone receptionist for auto repair shops. The lead engineer (Claude Code) has the backend, deployment, and architecture locked down. Your job is to make every single page in this app look world-class — clean, minimal, professional, and ready for a sales demo to our first paying customer.
>
> **Live site:** https://baylio.io
> **Stack:** React 19 + Tailwind 4 + shadcn/ui + wouter (routing) + Vite
> **Theme:** We JUST switched from dark to light theme. Some pages may still have hardcoded dark-mode colors (dark backgrounds, light text on dark cards, etc.). Fix all of these.
>
> **Design system:** shadcn/ui components in `client/src/components/ui/`. Use these — do NOT install new UI libraries. Fonts: Inter (body), JetBrains Mono (data/numbers).

---

## YOUR MISSION

Go through EVERY page listed below. For each one:

1. **Read the file** — understand what it does
2. **Audit the UI** — check for visual bugs, dark-mode leftovers, inconsistent spacing, ugly layouts, missing hover states, poor mobile responsiveness
3. **Upgrade it** — make it look like a $10M SaaS product. Clean, minimal, professional. Think Linear, Vercel Dashboard, Stripe Dashboard level quality.
4. **Test on light theme** — the app now uses `defaultTheme="light"`. Every page MUST look great on a white background. No dark cards, no gray-on-gray text, no hardcoded dark colors.

---

## DESIGN PRINCIPLES (Follow these religiously)

- **White space is your best friend.** Don't cram elements together. Give everything room to breathe.
- **Hierarchy matters.** One clear heading, supporting text in muted-foreground, data in mono font.
- **Cards should be subtle.** White background, very light border (`border-border`), no heavy shadows. Use `shadow-sm` at most.
- **Primary color is teal/green** (oklch 0.45 0.18 162). Use it sparingly — for CTAs, active states, key metrics. Not everywhere.
- **Font sizes:** Page titles = `text-2xl font-semibold tracking-tight`. Section labels = `text-sm font-medium`. Data = `font-mono tabular-nums`. Body = `text-sm`.
- **Buttons:** Primary = filled teal. Secondary = `variant="outline"`. Destructive = red outline. Ghost for subtle actions.
- **No unnecessary borders between sibling cards.** Use spacing instead.
- **Icons:** Use Lucide icons (already imported). 16px (`h-4 w-4`) for inline, 20px for standalone.
- **Empty states:** If a page shows "no data", make it a centered message with an icon, heading, and CTA button. Never show a blank page.
- **Loading states:** Use `Loader2` spinner from Lucide with `animate-spin`. Center it in the content area.
- **Mobile:** Every page must work on mobile (375px). Use `grid sm:grid-cols-2 lg:grid-cols-3` patterns. Stack on mobile, grid on desktop.

---

## PAGES TO AUDIT AND UPGRADE

### TIER 1 — CRITICAL PATH (These are shown during demos. Must be perfect.)

#### 1. `client/src/pages/Landing.tsx`
The public marketing page at baylio.io. This is the FIRST thing prospects see.
- Must have a clear hero section with headline, subheadline, and CTA
- Feature sections showing the value prop (AI answers calls, books appointments, upsells)
- Pricing section with 3 tiers ($199/$349/$599)
- Social proof / trust indicators
- Clean footer
- **Check:** Does it have hardcoded dark backgrounds? Fix them.
- **Check:** Is the CTA above the fold? Is it clear what Baylio does within 5 seconds?
- **Check:** Mobile responsive? Hero text readable on iPhone?

#### 2. `client/src/pages/Login.tsx`
Sign in / sign up page.
- Should be centered card on white background
- Google OAuth button + email/password form
- Toggle between sign in and sign up
- **Check:** Already looks clean — just verify light theme works, no dark remnants

#### 3. `client/src/pages/Onboarding.tsx`
Multi-step wizard (4 steps: Shop Details, Phone Setup, AI Agent, Go Live).
- Just upgraded with category-based service picker and editable prices
- **Check:** All 4 steps render cleanly in light theme
- **Check:** Progress bar and step indicators look right
- **Check:** Phone number search cards aren't using dark backgrounds
- **Check:** Voice selection cards need good contrast on white
- **Check:** "Go Live" success state should feel celebratory but clean

#### 4. `client/src/pages/Dashboard.tsx`
Main dashboard after login. Shows shops, stats, recent calls.
- This is the HOME for logged-in users
- Should show: welcome message, shop cards with key metrics, quick actions
- **Upgrade:** Make shop cards feel premium — clean layout, key stats (calls today, appointments, status badge)
- **Check:** Empty state when user has no shops — should guide them to onboarding
- **Check:** No dark backgrounds on stat cards

#### 5. `client/src/pages/ShopDetail.tsx`
Individual shop view with tabs/sections.
- **Check:** Tab navigation looks clean
- **Check:** Stat cards use proper light theme colors
- **Check:** Agent status indicator is visible

#### 6. `client/src/pages/CallLogs.tsx`
Table of inbound calls with filters.
- **Upgrade:** Table should have clean alternating row colors (very subtle)
- **Check:** Date range filter, status filter, search all work visually
- **Check:** Call detail dialog/drawer looks professional
- **Check:** Status badges (completed, missed, in-progress) have distinct colors

#### 7. `client/src/pages/Subscriptions.tsx`
Pricing tiers and subscription management.
- **Upgrade:** 3-tier pricing cards (Starter $199, Pro $349, Enterprise $599) — should look like Stripe's pricing page
- **Check:** Current plan highlighted, upgrade/downgrade CTAs clear
- **Check:** Feature comparison is scannable

### TIER 2 — IMPORTANT (Used regularly, should look great)

#### 8. `client/src/pages/Analytics.tsx`
Charts and metrics. Uses Recharts.
- **Check:** Chart colors work on white background (the chart CSS vars were updated)
- **Upgrade:** Metric cards should use `stat-number` and `stat-label` utility classes
- **Check:** Date range picker looks right

#### 9. `client/src/pages/AgentConfig.tsx`
AI voice agent configuration.
- Voice selection, system prompt, upsell rules, confidence thresholds
- **Upgrade:** Make this feel like a "control panel" — clean sections, clear labels
- **Check:** Textarea for system prompt has sufficient height
- **Check:** Slider/threshold controls are intuitive

#### 10. `client/src/pages/ShopSettings.tsx`
Shop business info editing.
- **Check:** Form layout matches onboarding style (consistent)
- **Check:** Save button feedback (loading state, success toast)

#### 11. `client/src/pages/Integrations.tsx`
Google Calendar, Sheets, HubSpot, Shopmonkey connections.
- **Upgrade:** Integration cards should show connected/disconnected status clearly
- Each card: logo/icon, name, description, connect/disconnect button, status badge

#### 12. `client/src/pages/Notifications.tsx`
In-app notification list.
- **Check:** Read/unread visual distinction
- **Check:** Empty state

#### 13. `client/src/pages/MissedCallAudit.tsx`
7-day missed call audit with revenue impact.
- **Upgrade:** Make the revenue impact number pop (large, bold, primary color)
- **Check:** Audit cards look clean in light theme

#### 14. `client/src/pages/CallScorecard.tsx`
Individual call analysis — transcript, sentiment, intent.
- **Upgrade:** Clean layout with sidebar for metadata + main area for transcript
- **Check:** Sentiment score visualization looks right

#### 15. `client/src/pages/CostAnalytics.tsx`
Per-call cost breakdown (Twilio + ElevenLabs + Claude).
- **Check:** Cost tables and charts work in light theme

### TIER 3 — SECONDARY (Polish when Tier 1-2 are done)

#### 16. `client/src/pages/Contact.tsx`
Contact form page.
- **Check:** Light theme, form styling consistent with Login page

#### 17. `client/src/pages/FAQ.tsx`
Accordion FAQ.
- **Check:** Accordion borders/backgrounds work in light theme

#### 18. `client/src/pages/Help.tsx`
Help center / documentation links.

#### 19. `client/src/pages/AdminPortal.tsx`
Admin-only dashboard.
- **Check:** Light theme compatibility

#### 20. `client/src/pages/NotFound.tsx`
404 page.
- Should be clean with a "Go Home" button

#### 21–26. Partners Portal Pages
- `PartnersLanding.tsx` — Public landing page for partner program
- `PartnersPortal.tsx` — Partner dashboard
- `PartnersReferrals.tsx` — Referral tracking
- `PartnersEarnings.tsx` — Earnings dashboard
- `PartnersNetwork.tsx` — Network view
- `PartnersResources.tsx` — Marketing materials
- `PartnersSettings.tsx` — Partner account settings

All partners pages: Check light theme, consistent styling with main app.

---

## LAYOUT COMPONENTS TO CHECK

#### `client/src/components/DashboardLayout.tsx`
Sidebar + main content layout used by all authenticated pages.
- **Check:** Sidebar looks clean in light theme — no dark backgrounds
- **Check:** Active nav item is highlighted with primary color
- **Check:** Mobile hamburger menu works
- **Check:** User avatar/name in sidebar

#### `client/src/components/PartnersPortalLayout.tsx`
Partners section layout.
- Same checks as DashboardLayout

---

## GLOBAL CSS — `client/src/index.css`
- Light theme vars are already set. Do NOT change them.
- Utility classes: `.stat-number`, `.stat-label`, `.panel`, `.badge-live` — use these in pages where appropriate.
- If you need new utility classes, add them in `@layer utilities`.

---

## WHAT NOT TO DO

- Do NOT change the backend, API, or tRPC routes
- Do NOT modify `server/` directory files
- Do NOT change the routing in `App.tsx` (routes are final)
- Do NOT install new npm packages without explicit approval
- Do NOT change the auth flow (Supabase Auth is working)
- Do NOT change environment variables or deployment config
- Do NOT add features — this is a UI/UX polish sprint, not feature work
- Do NOT remove functionality. If something works, keep it working.
- Do NOT change the dark theme CSS vars — only fix hardcoded dark colors IN components
- Do NOT use emojis in code or UI unless explicitly in the existing design

---

## HOW TO WORK

1. Start with Tier 1 pages. Go file by file.
2. For each file: read it, identify issues, fix them. Move on.
3. After each page, run `pnpm run build:client` to verify no build errors.
4. Commit after each page or logical group with a clear message.
5. Push to `main` branch — Vercel auto-deploys on push.

After all changes, rebuild the serverless bundle too:
```bash
pnpm run build:vercel
git add api/index.js  # this is the pre-bundled serverless function
```

---

## QUALITY BAR

When you're done, every page should pass this test:
- [ ] Looks professional on a white background
- [ ] No hardcoded dark colors (bg-gray-900, text-white on dark cards, etc.)
- [ ] Proper visual hierarchy (heading → description → content)
- [ ] Clean empty states with icon + message + CTA
- [ ] Mobile responsive (nothing overflows on 375px width)
- [ ] Consistent with shadcn/ui component styling
- [ ] Loading states use Loader2 spinner
- [ ] Interactive elements have hover/focus states

**The goal: A shop owner visits baylio.io, signs up, onboards their shop, and thinks "this is a premium product worth $199/month." Every pixel supports that impression.**
