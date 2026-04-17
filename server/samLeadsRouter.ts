/**
 * Sam Leads tRPC Router (admin-only)
 *
 * Reads `sam_leads` rows captured during Sam's sales calls. Powers
 * /admin/sam-leads in the admin portal.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { samLeads } from "../drizzle/schema";

export const samLeadsRouter = router({
  /**
   * Paginated list of Sam leads, optional search by name/phone/email.
   */
  list: adminProcedure
    .input(
      z.object({
        search: z.string().trim().optional(),
        intent: z
          .enum([
            "shop_owner_prospect",
            "curious_tester",
            "car_question",
            "existing_customer",
            "onboarding_help",
            "other",
          ])
          .optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const filters = [];
      if (input.search) {
        const term = `%${input.search}%`;
        filters.push(
          or(
            ilike(samLeads.name, term),
            ilike(samLeads.callerPhone, term),
            ilike(samLeads.email, term),
            ilike(samLeads.shopName, term)
          )
        );
      }
      if (input.intent) {
        filters.push(eq(samLeads.intent, input.intent));
      }

      const whereClause = filters.length
        ? filters.reduce((a, b) => sql`${a} AND ${b}`)
        : undefined;

      const baseQuery = db.select().from(samLeads);
      const rows = whereClause
        ? await baseQuery
            .where(whereClause)
            .orderBy(desc(samLeads.lastCalledAt))
            .limit(input.limit)
            .offset(input.offset)
        : await baseQuery
            .orderBy(desc(samLeads.lastCalledAt))
            .limit(input.limit)
            .offset(input.offset);

      const totalResult = whereClause
        ? await db.select({ count: sql<number>`count(*)::int` }).from(samLeads).where(whereClause)
        : await db.select({ count: sql<number>`count(*)::int` }).from(samLeads);

      return {
        leads: rows,
        total: totalResult[0]?.count ?? 0,
      };
    }),

  /**
   * Single lead detail.
   */
  get: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const rows = await db
        .select()
        .from(samLeads)
        .where(eq(samLeads.id, input.id))
        .limit(1);

      if (rows.length === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      return rows[0];
    }),

  /**
   * Funnel stats for the admin overview.
   */
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const [totals] = await db
      .select({
        total: sql<number>`count(*)::int`,
        prospects: sql<number>`count(*) filter (where intent = 'shop_owner_prospect')::int`,
        onboarding: sql<number>`count(*) filter (where intent = 'onboarding_help')::int`,
        sms: sql<number>`count(*) filter (where "smsSent" = true)::int`,
        email: sql<number>`count(*) filter (where "emailSent" = true)::int`,
        transferred: sql<number>`count(*) filter (where "transferredToHuman" = true)::int`,
        with_email: sql<number>`count(*) filter (where email is not null)::int`,
        marketing_opt_in: sql<number>`count(*) filter (where "marketingConsent" = true)::int`,
      })
      .from(samLeads);

    return totals;
  }),
});
