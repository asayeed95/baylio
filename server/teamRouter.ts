/**
 * Team Router
 *
 * Manages admin portal team members — invite, list, remove.
 * Uses the existing `users` table (role: admin | user).
 * Invitations are tracked in the `team_invites` table.
 *
 * All procedures are admin-only.
 */
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { teamInvites, users } from "../drizzle/schema";
import { getDb } from "./db";
import { protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";

/** Guard: only users with role=admin can call these procedures */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required.",
    });
  }
  return next({ ctx });
});

export const teamRouter = router({
  /**
   * List all active team members and pending invites.
   * Excludes the calling admin from the members list.
   */
  getMembers: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .where(ne(users.id, ctx.user.id))
      .orderBy(desc(users.createdAt));

    const pendingInvites = await db
      .select()
      .from(teamInvites)
      .where(eq(teamInvites.status, "pending"))
      .orderBy(desc(teamInvites.createdAt));

    return { members, pendingInvites };
  }),

  /**
   * Invite a new team member by email.
   * Creates a pending invite record. In production this would send an email.
   */
  inviteMember: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "user"]).default("user"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Check for duplicate pending invite
      const existing = await db
        .select({ id: teamInvites.id })
        .from(teamInvites)
        .where(
          and(
            eq(teamInvites.email, input.email),
            eq(teamInvites.status, "pending")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A pending invite already exists for ${input.email}`,
        });
      }

      // Generate a simple token (in production use crypto.randomBytes)
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      await db.insert(teamInvites).values({
        email: input.email,
        role: input.role,
        invitedBy: ctx.user.id,
        token,
        status: "pending",
      });

      // Notify owner of new invite
      await notifyOwner({
        title: "New Team Invite Sent",
        content: `${ctx.user.name ?? "Admin"} invited ${input.email} as ${input.role} to the Baylio admin portal.`,
      });

      return { success: true, email: input.email };
    }),

  /**
   * Remove a team member (demote to user role or delete invite).
   */
  removeMember: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Cannot remove yourself
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself from the team.",
        });
      }

      // Demote to regular user (soft remove — preserves their data)
      await db
        .update(users)
        .set({ role: "user" })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * Cancel a pending invite.
   */
  cancelInvite: adminProcedure
    .input(z.object({ inviteId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(teamInvites)
        .set({ status: "cancelled" })
        .where(eq(teamInvites.id, input.inviteId));

      return { success: true };
    }),

  /**
   * Promote a user to admin role.
   */
  promoteToAdmin: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(users)
        .set({ role: "admin" })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),
});
