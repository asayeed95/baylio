import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { shopRouter } from "./shopRouter";
import { callRouter } from "./callRouter";
import { notificationRouter } from "./notificationRouter";
import { subscriptionRouter } from "./subscriptionRouter";
import { organizationRouter } from "./organizationRouter";
import { stripeRouter } from "./stripe/stripeRouter";
import { partnerRouter } from "./partnerRouter";
import { analyticsRouter } from "./analyticsRouter";
import { contactRouter } from "./contactRouter";
import { integrationRouter } from "./integrationRouter";

/**
 * Baylio App Router
 *
 * All tRPC procedures are organized by domain:
 *
 * - system:        Health checks, system info (built-in)
 * - auth:          Login/logout, session management (built-in)
 * - shop:          Shop CRUD, agent config, subscription info
 * - call:          Call logs, analytics, missed call audits
 * - notification:  In-app alerts, read/unread management
 * - subscription:  Tier management, usage tracking, billing
 * - organization:  Multi-location grouping
 * - stripe:        Checkout sessions, billing portal, tier info
 */
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  shop: shopRouter,
  calls: callRouter,
  notification: notificationRouter,
  subscription: subscriptionRouter,
  organization: organizationRouter,
  stripe: stripeRouter,
  partner: partnerRouter,
  analytics: analyticsRouter,
  contact: contactRouter,
  integration: integrationRouter,
});

export type AppRouter = typeof appRouter;
