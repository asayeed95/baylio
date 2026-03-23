# Code Audit Report — 2026-03-23

## 1. Duplicate Files
**No duplicates found.** All layouts and pages serve distinct purposes:
- `DashboardLayout.tsx` — main app sidebar (9 pages)
- `PartnersPortalLayout.tsx` — partner portal dark sidebar (6 pages)
- `PartnersPortal.tsx` — authenticated dashboard vs `PartnersLanding.tsx` — public landing page
- `server/routers.ts` is a single file, no `server/routers/` directory

## 2. Dead Code

| File | Issue | Action |
|------|-------|--------|
| `client/src/pages/Home.tsx` | Never imported or routed — scaffold/template page | Deleted |
| `client/src/pages/ComponentShowcase.tsx` | Never imported or routed — dev-only kitchen sink | Deleted |
| `client/src/components/AIChatBox.tsx` | Only used by ComponentShowcase (now deleted) | Deleted |
| `client/src/components/ManusDialog.tsx` | Never imported anywhere | Deleted |
| `client/src/components/Map.tsx` | Never imported anywhere | Deleted |

## 3. Routing Inconsistencies

| File | Line | Issue | Action |
|------|------|-------|--------|
| `client/src/pages/PartnersPortal.tsx` | 125 | Hardcoded `https://baylio.io` in referral link | Fixed: uses `window.location.origin` |
| `client/src/pages/PartnersResources.tsx` | 130 | Hardcoded `https://baylio.io` in referral link | Fixed: uses `window.location.origin` |

**Intentionally kept as-is:**
- `Landing.tsx:36-37` — subdomain detection logic requires literal domain check
- `PartnersLanding.tsx:439` — footer link to main site (branding)
- `PartnersLanding.tsx:440` — mailto link (brand contact email)
- `stripeRouter.ts:49,105,158` — fallback after `ctx.req.headers.origin` (correct pattern)
- `smsService.ts:185`, `scorecardGenerator.ts:165` — text content in SMS/PDF (no code path)

All routes in App.tsx resolve to existing page files. No orphaned routes found.

## 4. Import Path Inconsistency

| File | Line | Issue | Action |
|------|------|-------|--------|
| `client/src/App.tsx` | 7 | Uses relative `"./_core/hooks/useAuth"` while all other files use alias `"@/_core/hooks/useAuth"` | Fixed: normalized to `@/_core/hooks/useAuth` |

No broken imports found. The `@/` alias is correctly configured in both `vite.config.ts` and `tsconfig.json`.

## 5. Console Errors
`.manus-logs/browserConsole.log` does not exist. No `.log` files found in the repo.
