# CLAUDE CODE — BAYLIO EXHAUSTIVE QA, BUG FIX, AND CODE QUALITY MEGA-SCRIPT

**Purpose:** This is a single mega-prompt for Claude Code. When loaded, Claude will autonomously audit the entire Baylio codebase across 12 phases: static analysis, TypeScript strictness, security audit, dead code removal, JSDoc/comments on every file, import organization, test coverage expansion, integration testing, edge case testing, performance audit, accessibility audit, and final regression suite. It will fix every issue it finds, document every change, and produce a full QA report.

**Usage:** Open Claude Code in the Baylio project root and paste this entire document as a prompt.

---

## SYSTEM INSTRUCTIONS

You are a senior staff engineer performing a comprehensive quality assurance audit on the Baylio codebase. Your job is to leave this codebase in production-grade condition. You will execute 12 phases sequentially. For each phase, you will:

1. **Audit** — Scan every relevant file and identify all issues
2. **Fix** — Apply fixes directly to the codebase
3. **Document** — Add JSDoc comments, inline comments, and update documentation
4. **Test** — Write or update tests to cover the fix
5. **Verify** — Run `npx tsc --noEmit` and `npx vitest run` after each phase to confirm nothing is broken

**CRITICAL RULES:**
- Never skip a phase. Execute all 12 in order.
- After EVERY fix, run `npx tsc --noEmit --pretty` to verify TypeScript compiles
- After EVERY phase, run `npx vitest run` to verify all tests pass
- If a fix breaks something, revert it and try a different approach
- Keep a running changelog in `QA_REPORT.md` at the project root
- Do NOT modify files in `server/_core/` or `client/src/components/ui/` — those are framework files
- Do NOT delete test files or reduce test coverage
- Commit after each phase with message: `qa(phase-N): [description]`

---

## PHASE 1: TYPESCRIPT STRICT MODE AUDIT

**Goal:** Ensure the entire codebase compiles with zero errors and zero warnings under strict TypeScript.

**Steps:**

1. Run `npx tsc --noEmit --pretty 2>&1` and capture ALL output
2. For every error, fix it in the source file:
   - Missing type annotations → add explicit types
   - Implicit `any` → add proper types or use `unknown` with type guards
   - Null/undefined issues → add null checks or optional chaining
   - Unused variables → remove them or prefix with `_`
   - Missing imports → add them
   - Type mismatches → fix the types to match actual usage
3. Check `tsconfig.json` and ensure these strict options are enabled:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true,
       "exactOptionalPropertyTypes": false
     }
   }
   ```
   If enabling any of these causes new errors, fix those errors too.
4. Run `npx tsc --noEmit --pretty` again — must be ZERO errors
5. Log all fixes in QA_REPORT.md under "## Phase 1: TypeScript Strict Mode"

**Files to audit (in order):**
```
drizzle/schema.ts
shared/nicheConfig.ts
shared/types.ts
shared/const.ts
server/db.ts
server/routers.ts
server/shopRouter.ts
server/callRouter.ts
server/subscriptionRouter.ts
server/notificationRouter.ts
server/organizationRouter.ts
server/voiceRouter.ts
server/stripe/products.ts
server/stripe/stripeRouter.ts
server/stripe/stripeRoutes.ts
server/routes/onboardRoute.ts
server/middleware/tenantScope.ts
server/middleware/twilioValidation.ts
server/services/auditService.ts
server/services/autoProvisionService.ts
server/services/contextCache.ts
server/services/elevenLabsService.ts
server/services/onboardService.ts
server/services/postCallPipeline.ts
server/services/promptCompiler.ts
server/services/scorecardGenerator.ts
server/services/smsService.ts
server/services/twilioProvisioning.ts
server/services/twilioWebhooks.ts
server/services/prompts/*.ts
server/storage.ts
client/src/App.tsx
client/src/pages/*.tsx
client/src/components/DashboardLayout.tsx
client/src/components/ErrorBoundary.tsx
```

---

## PHASE 2: SECURITY AUDIT

**Goal:** Identify and fix every security vulnerability in the codebase.

**Checklist:**

1. **SQL Injection** — Verify ALL database queries use parameterized queries via Drizzle ORM. Search for any raw SQL strings or string concatenation in queries:
   ```bash
   grep -rn "sql\`" server/ --include="*.ts" | grep -v node_modules
   grep -rn "\.execute(" server/ --include="*.ts" | grep -v node_modules
   ```
   If any raw SQL exists, convert to Drizzle query builder.

2. **XSS Prevention** — Check all user inputs that are rendered in the frontend:
   - Search for `dangerouslySetInnerHTML` — remove or sanitize
   - Verify all tRPC inputs have Zod validation with `.max()` length limits
   - Verify all form inputs have `maxLength` attributes

3. **Authentication Bypass** — Verify every protected route uses `protectedProcedure`:
   ```bash
   grep -rn "publicProcedure" server/ --include="*.ts" | grep -v node_modules | grep -v test
   ```
   For each `publicProcedure`, verify it SHOULD be public. Flag any that access user data.

4. **Secrets Exposure** — Search for hardcoded secrets:
   ```bash
   grep -rn "sk_test\|sk_live\|whsec_\|AC[a-z0-9]\{32\}\|xi-api-key" . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v .env
   ```
   Remove any hardcoded secrets and replace with `process.env.*`.

5. **Rate Limiting** — Check if critical endpoints have rate limiting:
   - `/api/onboard` (Stripe checkout creation)
   - `/api/stripe/webhook` (webhook handler)
   - `contact.submit` (contact form)
   Add rate limiting comments/TODO if missing.

6. **Webhook Signature Validation** — Verify:
   - Stripe webhook validates signatures with `stripe.webhooks.constructEvent()`
   - Twilio webhook validates signatures with `twilioValidation` middleware
   - Both use timing-safe comparison

7. **CORS/Headers** — Check Express middleware for security headers.

8. **Input Validation** — For EVERY tRPC procedure, verify:
   - Input has Zod schema with appropriate constraints
   - String fields have `.max()` limits
   - Number fields have `.min()` and `.max()` ranges
   - Email fields use `.email()` validator
   - Phone fields have format validation

9. Log all findings and fixes in QA_REPORT.md under "## Phase 2: Security Audit"

---

## PHASE 3: DEAD CODE ELIMINATION

**Goal:** Remove all unused code, imports, variables, functions, and files.

**Steps:**

1. **Unused imports** — For every `.ts` and `.tsx` file:
   ```bash
   npx tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1
   ```
   Remove every unused import.

2. **Unused exports** — Search for exported functions/types that are never imported:
   ```bash
   # For each export in server/*.ts, check if it's imported anywhere
   grep -rn "export " server/ --include="*.ts" | grep -v node_modules | grep -v test
   ```
   Cross-reference with imports. Remove truly unused exports (keep test helpers).

3. **Unused files** — Check if any `.ts`/`.tsx` files are never imported:
   - `client/src/pages/ComponentShowcase.tsx` — is this used in App.tsx routes?
   - `docs/*.md` — are these still relevant?
   - `notes_elevenlabs_twilio.md` — development notes, should be in docs/ or removed

4. **Commented-out code** — Search for large blocks of commented code:
   ```bash
   grep -rn "^[[:space:]]*//" server/ client/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
   ```
   Remove commented-out code blocks (not documentation comments).

5. **Console.log cleanup** — Search for debug console.log statements:
   ```bash
   grep -rn "console\.log" server/ client/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v test
   ```
   Replace debug logs with proper structured logging. Keep intentional logs (webhook events, errors).

6. **Duplicate code** — Identify repeated patterns across files:
   - Repeated Twilio client initialization → extract to shared helper
   - Repeated Stripe client initialization → extract to shared helper
   - Repeated error handling patterns → extract to shared middleware

7. Log all removals in QA_REPORT.md under "## Phase 3: Dead Code Elimination"

---

## PHASE 4: JSDOC AND COMMENTS — EVERY FILE

**Goal:** Add comprehensive JSDoc comments to every exported function, type, interface, and class. Add inline comments explaining complex logic.

**Standards:**

```typescript
/**
 * Brief one-line description of what this does.
 *
 * Longer explanation if the function is complex. Explain WHY, not just WHAT.
 * Include any important side effects, error conditions, or business logic.
 *
 * @param paramName - Description of the parameter
 * @returns Description of the return value
 * @throws {TRPCError} When the user is not authorized
 * @example
 * ```ts
 * const result = await createShop({ name: "Joe's Auto", ownerId: 1 });
 * ```
 */
```

**Files to document (ALL of these, in order):**

### Server Layer
- `server/db.ts` — Every query helper function
- `server/routers.ts` — The appRouter and each sub-router registration
- `server/shopRouter.ts` — Every procedure (list, getById, create, update, delete)
- `server/callRouter.ts` — Every procedure
- `server/subscriptionRouter.ts` — Every procedure
- `server/notificationRouter.ts` — Every procedure
- `server/organizationRouter.ts` — Every procedure
- `server/voiceRouter.ts` — Every procedure
- `server/stripe/products.ts` — Tier definitions, pricing constants
- `server/stripe/stripeRouter.ts` — Every procedure
- `server/stripe/stripeRoutes.ts` — Webhook handler, event processing
- `server/routes/onboardRoute.ts` — Onboard endpoint
- `server/middleware/tenantScope.ts` — Tenant isolation middleware
- `server/middleware/twilioValidation.ts` — Webhook signature validation

### Services Layer
- `server/services/auditService.ts` — Missed call audit logic
- `server/services/autoProvisionService.ts` — Post-payment account provisioning
- `server/services/contextCache.ts` — In-memory shop context cache
- `server/services/elevenLabsService.ts` — ElevenLabs API integration
- `server/services/onboardService.ts` — Stripe checkout + SMS delivery
- `server/services/postCallPipeline.ts` — Post-call transcription + analysis
- `server/services/promptCompiler.ts` — System prompt compilation
- `server/services/scorecardGenerator.ts` — PDF scorecard generation
- `server/services/smsService.ts` — Twilio SMS sending
- `server/services/twilioProvisioning.ts` — Phone number purchase/config
- `server/services/twilioWebhooks.ts` — Inbound call handling + ElevenLabs bridge

### Prompts Layer
- `server/services/prompts/types.ts` — Persona type definitions
- `server/services/prompts/promptBuilder.ts` — Prompt template builder
- `server/services/prompts/baylioSalesAgent.ts` — Sales AI prompt (SPIN selling)
- `server/services/prompts/*.ts` — All 12 persona templates

### Shared Layer
- `shared/nicheConfig.ts` — Niche configuration (brand, industry, pricing, scripts)
- `shared/types.ts` — Shared TypeScript types
- `shared/const.ts` — Shared constants

### Client Layer
- `client/src/App.tsx` — Route definitions and layout
- `client/src/pages/Landing.tsx` — Public landing page
- `client/src/pages/Home.tsx` — Authenticated home/redirect
- `client/src/pages/Dashboard.tsx` — Main dashboard
- `client/src/pages/AgentConfig.tsx` — AI agent configuration
- `client/src/pages/Analytics.tsx` — Analytics dashboard
- `client/src/pages/CallLogs.tsx` — Call log viewer
- `client/src/pages/MissedCallAudit.tsx` — Audit interface
- `client/src/pages/Notifications.tsx` — Notification center
- `client/src/pages/ShopDetail.tsx` — Shop detail view
- `client/src/pages/ShopSettings.tsx` — Shop settings + Twilio provisioning
- `client/src/pages/Subscriptions.tsx` — Subscription management
- `client/src/components/DashboardLayout.tsx` — Sidebar layout
- `client/src/components/ErrorBoundary.tsx` — Error boundary

### Inline Comments
For every file, add inline comments explaining:
- Complex conditional logic (why, not what)
- Business rules (e.g., "// Starter tier gets 300 minutes included")
- API integration quirks (e.g., "// ElevenLabs requires conversation_config_override for voice settings")
- Error handling rationale (e.g., "// Graceful fallback: if Twilio fails, still create the account")
- Performance considerations (e.g., "// Cache expires after 5 minutes to balance freshness vs DB load")

Log all documentation additions in QA_REPORT.md under "## Phase 4: JSDoc and Comments"

---

## PHASE 5: IMPORT ORGANIZATION

**Goal:** Organize all imports in every file following a consistent pattern.

**Import Order Standard:**
```typescript
// 1. Node.js built-ins
import { readFileSync } from "fs";
import path from "path";

// 2. External packages (npm)
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

// 3. Internal framework (_core)
import { protectedProcedure, router } from "./_core/trpc";
import { env } from "./_core/env";

// 4. Internal modules (same project)
import { getShopById, createShop } from "./db";
import { TIERS } from "./stripe/products";

// 5. Types (type-only imports)
import type { Shop, InsertShop } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
```

**Rules:**
- Each group separated by a blank line
- Alphabetical within each group
- Use `import type` for type-only imports
- No duplicate imports
- No wildcard imports (`import * as`) unless necessary

Apply this to EVERY `.ts` and `.tsx` file in the project.

---

## PHASE 6: ERROR HANDLING AUDIT

**Goal:** Ensure every function has proper error handling with meaningful error messages.

**Checklist:**

1. **tRPC procedures** — Every procedure should:
   - Catch specific errors and throw `TRPCError` with appropriate code
   - Include meaningful error messages that help debugging
   - NOT expose internal details (stack traces, SQL errors) to the client
   ```typescript
   // ❌ Bad
   throw new Error("Failed");
   
   // ✅ Good
   throw new TRPCError({
     code: "NOT_FOUND",
     message: `Shop with ID ${input.shopId} not found or you don't have access`,
   });
   ```

2. **External API calls** — Every fetch/API call should:
   - Have a timeout (use AbortController)
   - Catch network errors
   - Log the error with context
   - Return a meaningful fallback or throw a user-friendly error
   ```typescript
   // Check: elevenLabsService.ts, twilioProvisioning.ts, onboardService.ts, smsService.ts
   ```

3. **Database operations** — Every DB call should:
   - Handle connection failures gracefully
   - Handle constraint violations (duplicate keys, foreign keys)
   - Log failures with the operation context

4. **Webhook handlers** — Must:
   - Always return 200 to the webhook sender (even on internal errors)
   - Log errors with full context for debugging
   - Not throw unhandled exceptions

5. **Frontend error states** — Every page should:
   - Handle `isLoading` state (show skeleton/spinner)
   - Handle `isError` state (show error message with retry button)
   - Handle empty data state (show empty state component)

6. Fix all issues found. Log in QA_REPORT.md under "## Phase 6: Error Handling Audit"

---

## PHASE 7: UNIT TEST EXPANSION

**Goal:** Achieve comprehensive test coverage for every server module. Target: every exported function has at least one test.

**Current test files (8):**
```
server/auth.logout.test.ts     — Auth logout
server/baylio.test.ts           — Core CRUD operations
server/elevenlabs.test.ts       — ElevenLabs API
server/onboard.test.ts          — Onboard pipeline + Stripe + Twilio SMS
server/salesLine.test.ts        — Sales line config
server/security.test.ts         — Twilio signature validation + tenant isolation
server/twilio.test.ts           — Twilio credentials
server/twilioOverride.test.ts   — ElevenLabs override config
```

**NEW test files to create:**

### server/contactRouter.test.ts
```
- Valid submission (name, email, phone, message)
- Submission without phone (optional field)
- Public access (no auth required)
- Invalid email rejection
- Empty name rejection
- Empty message rejection
- Message length limit (5000 chars)
- DB call verification
```

### server/shopRouter.test.ts
```
- List shops for owner (returns owned shops only)
- Get shop by ID (owner can access)
- Get shop by ID (non-owner gets FORBIDDEN)
- Create shop (valid input)
- Create shop (missing required fields)
- Update shop (owner can update)
- Update shop (non-owner gets FORBIDDEN)
- Delete shop (owner can delete)
- Delete shop (non-owner gets FORBIDDEN)
```

### server/subscriptionRouter.test.ts
```
- Get subscription by shop
- Create subscription (valid tier)
- Create subscription (invalid tier)
- Update subscription (upgrade)
- Update subscription (downgrade)
- Cancel subscription
- Usage tracking (within limits)
- Usage tracking (overage calculation)
```

### server/notificationRouter.test.ts
```
- List notifications for user
- Mark single notification as read
- Mark all notifications as read
- Notification filtering by type
```

### server/services/promptCompiler.test.ts
```
- Compile prompt with full shop context
- Compile prompt with minimal context
- Variable interpolation ({{SHOP_NAME}}, {{SERVICE_CATALOG}}, etc.)
- Sanitize custom system prompt (prevent injection)
- Default prompt when no custom prompt set
```

### server/services/contextCache.test.ts
```
- Cache miss → fetches from DB
- Cache hit → returns cached value
- Cache expiration
- Cache invalidation on shop update
```

### server/services/onboardService.test.ts (expand existing)
```
- createOnboardCheckout with valid data
- createOnboardCheckout with missing fields
- Stripe session creation (mock)
- SMS delivery (mock)
- SMS delivery failure handling
- Invalid tier rejection
- Invalid phone format rejection
```

### server/services/autoProvisionService.test.ts
```
- Full provisioning flow (mock all externals)
- User creation
- Shop creation
- AgentConfig creation
- Twilio number assignment (mock)
- Welcome SMS sequence (mock)
- Partial failure handling (Twilio fails, user still created)
- Duplicate prevention (same email twice)
```

### server/stripe/stripeRoutes.test.ts
```
- Webhook signature validation
- Test event handling (evt_test_*)
- checkout.session.completed event processing
- Unknown event type (ignored gracefully)
- Invalid signature rejection
- Missing metadata handling
```

**For each test file:**
1. Mock all external dependencies (DB, Twilio, Stripe, ElevenLabs)
2. Test happy path AND error paths
3. Test edge cases (empty strings, null values, very long strings)
4. Test authorization (owner vs non-owner, admin vs user)
5. Verify mock calls (correct arguments passed to dependencies)

Run `npx vitest run` after creating each test file. All tests must pass.

Log test count and coverage in QA_REPORT.md under "## Phase 7: Unit Test Expansion"

---

## PHASE 8: INTEGRATION TEST SUITE

**Goal:** Test the interaction between multiple modules working together.

### server/integration/callFlow.test.ts
```
Test the full call flow:
1. Twilio webhook → ElevenLabs register call → TwiML response
2. Status callback → post-call pipeline trigger
3. Post-call: transcription → analysis → DB write → SMS recap
Mock external APIs but test the full internal chain.
```

### server/integration/onboardFlow.test.ts
```
Test the full onboard flow:
1. POST /api/onboard → Stripe checkout session → SMS
2. Stripe webhook → auto-provision → user + shop + config + number + welcome SMS
Mock Stripe and Twilio but test the full internal chain.
```

### server/integration/salesPipeline.test.ts
```
Test the sales pipeline:
1. Sales prompt generation with niche config
2. SPIN selling flow structure validation
3. Onboard link tool invocation
4. Checkout session metadata correctness
```

---

## PHASE 9: EDGE CASE AND STRESS TESTING

**Goal:** Test every boundary condition and failure mode.

### server/edgeCases.test.ts
```
Database edge cases:
- Empty database (no shops, no users)
- Maximum string lengths (255 char names, 5000 char messages)
- Unicode characters in all text fields (emoji, CJK, Arabic, RTL)
- SQL injection attempts in text fields (should be safe via Drizzle)
- Concurrent operations (two requests to same endpoint)

API edge cases:
- Twilio webhook with missing fields
- Twilio webhook with extra fields
- Stripe webhook with future API version
- ElevenLabs API timeout
- ElevenLabs API 429 (rate limit)
- Invalid phone number formats (+1, 1234, international)
- Invalid email formats

Business logic edge cases:
- Shop with no agent config
- Shop with no subscription
- Subscription with 0 minutes remaining
- Subscription exactly at limit
- Call log with 0 duration
- Missed call audit with no calls
- Notification for deleted user
```

---

## PHASE 10: PERFORMANCE AUDIT

**Goal:** Identify and fix performance bottlenecks.

**Checklist:**

1. **N+1 queries** — Check for loops that make individual DB queries:
   ```bash
   grep -rn "for.*await.*db\|forEach.*await.*db\|map.*await.*db" server/ --include="*.ts"
   ```
   Replace with batch queries using `WHERE IN`.

2. **Missing database indexes** — Check schema for columns used in WHERE clauses:
   ```
   - shops.ownerId (already indexed?)
   - callLogs.shopId + callLogs.createdAt (composite index for date-range queries)
   - subscriptions.shopId
   - notifications.userId + notifications.isRead
   - usageRecords.subscriptionId + usageRecords.recordedAt
   ```

3. **Large payload responses** — Check tRPC procedures that return full objects:
   - Are we returning entire call transcripts when only summaries are needed?
   - Are we returning all notification fields when only unread count is needed?
   - Add `.select()` to Drizzle queries to limit returned columns.

4. **Memory leaks** — Check for:
   - Event listeners not being cleaned up
   - Intervals/timeouts not being cleared
   - Growing in-memory caches without eviction (contextCache.ts)

5. **Frontend performance** — Check for:
   - Unstable query references (new objects in render → infinite re-fetches)
   - Missing `useMemo`/`useCallback` on expensive computations
   - Large component re-renders (missing React.memo on list items)
   - Missing loading states (full page blocks)

6. Log all findings and fixes in QA_REPORT.md under "## Phase 10: Performance Audit"

---

## PHASE 11: ACCESSIBILITY AUDIT

**Goal:** Ensure the frontend meets WCAG 2.1 AA standards.

**Checklist for every page:**

1. **Semantic HTML** — Use proper elements:
   - `<nav>` for navigation
   - `<main>` for main content
   - `<section>` with headings for content sections
   - `<button>` for clickable actions (not `<div onClick>`)
   - `<a>` for navigation links

2. **ARIA labels** — Add to:
   - Icon-only buttons (`aria-label="Close"`)
   - Form inputs without visible labels
   - Dynamic content regions (`aria-live="polite"`)
   - Modal dialogs (`role="dialog"`, `aria-modal="true"`)

3. **Keyboard navigation** — Verify:
   - All interactive elements are focusable
   - Tab order is logical
   - Focus is trapped in modals
   - Escape key closes modals/dropdowns

4. **Color contrast** — Verify:
   - Text on background meets 4.5:1 ratio (AA)
   - Large text meets 3:1 ratio
   - Focus indicators are visible
   - Don't rely on color alone for information

5. **Screen reader** — Verify:
   - Images have alt text
   - Tables have headers
   - Forms have labels
   - Error messages are announced

6. Log all fixes in QA_REPORT.md under "## Phase 11: Accessibility Audit"

---

## PHASE 12: FINAL REGRESSION AND QA REPORT

**Goal:** Run the complete test suite, verify everything works, and produce the final report.

**Steps:**

1. Run full TypeScript check:
   ```bash
   npx tsc --noEmit --pretty 2>&1
   ```
   Must be ZERO errors.

2. Run full test suite:
   ```bash
   npx vitest run 2>&1
   ```
   Must be ALL PASSING.

3. Count total tests:
   ```bash
   npx vitest run 2>&1 | grep "Tests"
   ```

4. Check for any remaining TODO/FIXME/HACK comments:
   ```bash
   grep -rn "TODO\|FIXME\|HACK\|XXX" server/ client/src/ shared/ --include="*.ts" --include="*.tsx" | grep -v node_modules
   ```
   Either fix them or document why they exist.

5. Verify file organization:
   ```
   ✅ No files in wrong directories
   ✅ No orphaned files
   ✅ No duplicate functionality
   ✅ Consistent naming conventions (camelCase files, PascalCase components)
   ```

6. **Generate QA_REPORT.md** with this structure:

```markdown
# Baylio QA Report

**Date:** [current date]
**Engineer:** Claude Code
**Codebase Version:** [git hash]

## Summary
- Total files audited: [count]
- Total issues found: [count]
- Total issues fixed: [count]
- Total tests before QA: 104
- Total tests after QA: [count]
- TypeScript errors: 0
- Security vulnerabilities fixed: [count]
- Dead code removed: [lines]
- Files documented with JSDoc: [count]

## Phase 1: TypeScript Strict Mode
[findings and fixes]

## Phase 2: Security Audit
[findings and fixes]

## Phase 3: Dead Code Elimination
[findings and fixes]

## Phase 4: JSDoc and Comments
[files documented]

## Phase 5: Import Organization
[files organized]

## Phase 6: Error Handling Audit
[findings and fixes]

## Phase 7: Unit Test Expansion
[new tests added, coverage numbers]

## Phase 8: Integration Tests
[new integration tests]

## Phase 9: Edge Case Tests
[edge cases covered]

## Phase 10: Performance Audit
[findings and fixes]

## Phase 11: Accessibility Audit
[findings and fixes]

## Phase 12: Final Regression
[final test count, TypeScript status, remaining TODOs]

## Files Modified
[complete list of every file touched]

## Remaining Items
[anything that couldn't be fixed and why]
```

7. Commit the final state:
   ```bash
   git add -A
   git commit -m "qa: complete 12-phase exhaustive QA audit — [total tests] tests passing"
   ```

---

## EXECUTION CHECKLIST

Before you start, confirm:
- [ ] You are in the Baylio project root directory
- [ ] `npx tsc --noEmit` passes (baseline)
- [ ] `npx vitest run` passes (baseline)
- [ ] You have created `QA_REPORT.md` with the header

Then execute phases 1-12 in order. After each phase:
- [ ] TypeScript compiles with zero errors
- [ ] All tests pass
- [ ] QA_REPORT.md is updated
- [ ] Changes are committed

**Estimated time:** 2-4 hours depending on issues found.

**Expected outcome:** Production-grade codebase with 150+ tests, full JSDoc coverage, zero TypeScript errors, zero security vulnerabilities, organized imports, proper error handling, and a comprehensive QA report.

---

**END OF QA MEGA-SCRIPT**
