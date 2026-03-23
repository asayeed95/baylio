/**
 * Leads Router — Admin portal for cold leads (from AgencyFlow) and warm leads (site signups)
 * All procedures are admin-only.
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { prospects, prospectNotes, users } from "../drizzle/schema";
import { eq, desc, and, or, like, count, SQL } from "drizzle-orm";

function requireAdmin(role: string | undefined) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

const outreachStatusEnum = z.enum([
  "not_contacted", "called", "voicemail", "interested",
  "demo_scheduled", "signed_up", "not_interested", "do_not_call"
]);

export const leadsRouter = router({
  // ── Cold Leads (from AgencyFlow) ──────────────────────────────────────────
  getColdLeads: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(25),
      status: outreachStatusEnum.optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user?.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const offset = (input.page - 1) * input.limit;
      const conditions: SQL[] = [];

      if (input.status) {
        conditions.push(eq(prospects.outreachStatus, input.status));
      }
      if (input.search) {
        conditions.push(
          or(
            like(prospects.shopName, `%${input.search}%`),
            like(prospects.ownerName, `%${input.search}%`),
            like(prospects.city, `%${input.search}%`),
            like(prospects.phone, `%${input.search}%`)
          ) as SQL
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalRows] = await Promise.all([
        db.select().from(prospects)
          .where(whereClause)
          .orderBy(desc(prospects.createdAt))
          .limit(input.limit)
          .offset(offset),
        db.select({ count: count() }).from(prospects).where(whereClause),
      ]);

      return {
        leads: rows,
        total: totalRows[0]?.count ?? 0,
        page: input.page,
        limit: input.limit,
      };
    }),

  // ── Warm Leads (site signups who opted into marketing) ───────────────────
  getWarmLeads: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(25),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user?.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const offset = (input.page - 1) * input.limit;
      const conditions: SQL[] = [];

      if (input.search) {
        conditions.push(
          or(
            like(users.name, `%${input.search}%`),
            like(users.email, `%${input.search}%`)
          ) as SQL
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalRows] = await Promise.all([
        db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
        }).from(users)
          .where(whereClause)
          .orderBy(desc(users.createdAt))
          .limit(input.limit)
          .offset(offset),
        db.select({ count: count() }).from(users).where(whereClause),
      ]);

      return {
        leads: rows,
        total: totalRows[0]?.count ?? 0,
        page: input.page,
        limit: input.limit,
      };
    }),

  // ── Update cold lead outreach status ─────────────────────────────────────
  updateLeadStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: outreachStatusEnum,
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user?.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.update(prospects).set({
        outreachStatus: input.status,
        lastContactedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(prospects.id, input.id));

      if (input.note) {
        await db.insert(prospectNotes).values({
          prospectId: input.id,
          note: input.note,
          createdBy: "human",
        });
      }

      return { success: true };
    }),

  // ── Add a manual cold lead ────────────────────────────────────────────────
  addColdLead: protectedProcedure
    .input(z.object({
      ownerName: z.string().min(1),
      shopName: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user?.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [inserted] = await db.insert(prospects).values({
        ownerName: input.ownerName,
        shopName: input.shopName,
        phone: input.phone,
        email: input.email,
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        notes: input.notes,
        source: "manual",
        outreachStatus: "not_contacted",
      });

      return { success: true, id: (inserted as { insertId: number }).insertId };
    }),

  // ── Pipeline stats ────────────────────────────────────────────────────────
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      requireAdmin(ctx.user?.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [coldLeadsRows, warmLeadsRows] = await Promise.all([
        db.select({ outreachStatus: prospects.outreachStatus }).from(prospects),
        db.select({ count: count() }).from(users),
      ]);

      const byStatus = coldLeadsRows.reduce((acc, p) => {
        acc[p.outreachStatus] = (acc[p.outreachStatus] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalCold = coldLeadsRows.length;
      const converted = byStatus["signed_up"] ?? 0;
      const conversionRate = totalCold > 0 ? ((converted / totalCold) * 100).toFixed(1) : "0.0";

      return {
        coldLeads: {
          total: totalCold,
          byStatus,
          conversionRate: `${conversionRate}%`,
        },
        warmLeads: {
          total: warmLeadsRows[0]?.count ?? 0,
        },
      };
    }),

  // ── Get notes for a cold lead ─────────────────────────────────────────────
  getLeadNotes: protectedProcedure
    .input(z.object({ prospectId: z.number() }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user?.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return db.select().from(prospectNotes)
        .where(eq(prospectNotes.prospectId, input.prospectId))
        .orderBy(desc(prospectNotes.createdAt));
    }),
});
