import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getNotificationsByUser,
  markNotificationRead,
  markAllNotificationsRead,
} from "./db";

/**
 * Notification Router
 * 
 * Handles in-app notifications for shop owners including:
 * - New customer calls
 * - High-value lead alerts
 * - System issues
 * - Weekly performance summaries
 * - Usage warnings
 * - Audit completion alerts
 * - Payment issues
 * 
 * Notifications are created server-side by webhooks and background jobs.
 * This router only exposes read/mark-read operations to authenticated users.
 */
export const notificationRouter = router({
  /**
   * List notifications for the current user.
   * Supports filtering to unread-only for badge counts.
   */
  list: protectedProcedure
    .input(z.object({
      unreadOnly: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getNotificationsByUser(ctx.user.id, input?.unreadOnly ?? false);
    }),

  /**
   * Get count of unread notifications for badge display.
   */
  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const unread = await getNotificationsByUser(ctx.user.id, true);
      return { count: unread.length };
    }),

  /**
   * Mark a single notification as read.
   */
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await markNotificationRead(input.id);
      return { success: true };
    }),

  /**
   * Mark all notifications as read for the current user.
   */
  markAllRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
});
