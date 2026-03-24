# Claude Code Brief: Cost Analytics Admin Dashboard

> **Assignee:** Claude Code (Mac Mini)
> **Branch:** `feature/admin-cost-analytics`
> **Base branch:** `main`
> **Estimated time:** 4–6 hours
> **Priority:** High — needed before onboarding first paying shops

---

## Objective

Build a **Cost Analytics page** in the Baylio Admin Portal (`admin.baylio.io`) that shows Abdur real-time infrastructure costs per shop, platform-wide COGS, and gross margin. This is an internal tool — it does not need to be pretty, it needs to be accurate and fast.

---

## Context

Baylio charges shops $99–$399/mo. The two variable costs are:

- **Twilio** — $1.15/mo per phone number + $0.0085/min inbound calls + $0.0079/SMS
- **ElevenLabs** — ~$0.10–$0.15/min of conversational AI (varies by plan)

Currently there is no visibility into these costs. Abdur is flying blind on margins. This page fixes that.

---

## What to Build

### Route

Add `/admin/costs` to the admin portal router in `client/src/App.tsx`. The existing admin portal is at `?portal=admin` in dev.

### Page: `client/src/pages/AdminCostAnalytics.tsx`

The page has three sections:

**Section 1 — Platform Summary Cards (top row)**

Four stat cards:

- Total MRR (sum of all active subscription amounts)
- Total COGS this month (Twilio + ElevenLabs combined)
- Gross Margin % (`(MRR - COGS) / MRR * 100`)
- Active shops count

**Section 2 — Per-Shop Cost Table**

A sortable table with one row per shop:

| Column           | Source                             | Notes                                                   |
| ---------------- | ---------------------------------- | ------------------------------------------------------- |
| Shop Name        | `shops.name`                       | Link to shop detail                                     |
| Plan             | `subscriptions.tier`               | starter / pro / elite                                   |
| MRR              | `subscriptions.amount`             | Monthly revenue from this shop                          |
| Calls This Month | `call_logs` COUNT                  | Filter by current month                                 |
| Call Minutes     | `call_logs` SUM of `duration` / 60 | Total minutes                                           |
| Twilio Cost      | Calculated                         | `(call_minutes * 0.0085) + 1.15 + (sms_count * 0.0079)` |
| ElevenLabs Cost  | Calculated                         | `call_minutes * 0.12` (use 0.12 as default rate)        |
| Total COGS       | Calculated                         | Twilio + ElevenLabs                                     |
| Gross Margin     | Calculated                         | `(MRR - COGS) / MRR * 100` formatted as percentage      |
| Margin Status    | Visual badge                       | Green (>60%), Yellow (40–60%), Red (<40%)               |

**Section 3 — Monthly Trend Chart**

A line chart (Recharts `LineChart`) showing the last 6 months:

- Line 1: Total MRR (green)
- Line 2: Total COGS (red)
- Line 3: Gross Profit (blue, dashed)

X-axis: month labels (e.g., "Oct", "Nov", "Dec", "Jan", "Feb", "Mar")
Y-axis: dollar amounts

---

## Backend Work Required

### New tRPC Procedure: `admin.getCostAnalytics`

Add to `server/routers/adminRouter.ts` (create this file if it doesn't exist, or add to `server/routers.ts`).

This procedure is `adminProcedure` (requires `role === 'admin'`).

**Input:**

```ts
z.object({
  month: z.string().optional(), // "2026-03" format, defaults to current month
});
```

**Output:**

```ts
{
  summary: {
    totalMRR: number,
    totalCOGS: number,
    grossMargin: number,
    activeShops: number,
  },
  shopCosts: Array<{
    shopId: number,
    shopName: string,
    plan: string,
    mrr: number,
    callCount: number,
    callMinutes: number,
    smsSent: number,
    twilioCost: number,
    elevenLabsCost: number,
    totalCOGS: number,
    grossMargin: number,
  }>,
  monthlyTrend: Array<{
    month: string,        // "2026-01"
    mrr: number,
    cogs: number,
    grossProfit: number,
  }>,
}
```

**Query logic:**

```ts
// Get all active subscriptions
const subs = await db
  .select()
  .from(subscriptions)
  .where(eq(subscriptions.status, "active"));

// For each shop, get call stats for the current month
const callStats = await db
  .select({
    shopId: callLogs.shopId,
    callCount: count(),
    totalDuration: sum(callLogs.duration),
  })
  .from(callLogs)
  .where(
    and(
      gte(callLogs.callStartedAt, startOfMonth),
      lte(callLogs.callStartedAt, endOfMonth)
    )
  )
  .groupBy(callLogs.shopId);

// Cost calculation constants
const TWILIO_PER_MINUTE = 0.0085;
const TWILIO_PHONE_NUMBER = 1.15;
const TWILIO_SMS = 0.0079;
const ELEVENLABS_PER_MINUTE = 0.12;
```

**Subscription MRR mapping:**

```ts
const PLAN_MRR = {
  starter: 99,
  pro: 199,
  elite: 399,
};
```

---

## File Locations

```
server/routers/adminRouter.ts     ← Add getCostAnalytics procedure here
client/src/pages/AdminCostAnalytics.tsx  ← New page
client/src/App.tsx                ← Add /admin/costs route
```

---

## Dependencies

Recharts is already installed. Import from `recharts`:

```ts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
```

shadcn/ui components to use:

- `Card`, `CardHeader`, `CardContent` for stat cards
- `Table`, `TableHeader`, `TableRow`, `TableCell` for the shop table
- `Badge` for margin status
- `Select` for month picker

---

## Styling Notes

The admin portal uses a **dark theme** with the following accent colors:

- Green: `#10b981` (positive metrics, good margin)
- Red: `#ef4444` (costs, bad margin)
- Blue: `#3b82f6` (neutral metrics)
- Yellow: `#f59e0b` (warning margin)

Background: `#0f172a` (slate-900), Card background: `#1e293b` (slate-800)

---

## Definition of Done

- [ ] `admin.getCostAnalytics` tRPC procedure returns correct data
- [ ] Platform summary cards display MRR, COGS, margin, active shops
- [ ] Per-shop table is sortable by any column
- [ ] Margin status badge shows correct color (green/yellow/red)
- [ ] Monthly trend chart renders 6 months of data
- [ ] Month picker allows viewing historical months
- [ ] Page is accessible at `?portal=admin` → navigate to `/admin/costs`
- [ ] TypeScript: 0 errors
- [ ] Vitest: add at least 2 tests for the cost calculation logic
- [ ] Push to `feature/admin-cost-analytics` branch and open a PR

---

## Notes for Claude Code

The admin portal currently lives in `client/src/pages/AdminPortal.tsx`. The sidebar navigation is defined inside that file. Add a "Cost Analytics" nav item pointing to `/admin/costs`.

The `adminProcedure` middleware pattern is:

```ts
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});
```

Do not hardcode cost rates in the frontend — keep them in a constants file (`server/constants/billingRates.ts`) so they can be updated in one place when Twilio/ElevenLabs pricing changes.
