/**
 * Support Router — admin-only triage + reply for incoming support tickets.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "./_core/trpc";
import {
  listSupportTickets,
  getSupportTicketById,
  updateSupportTicket,
} from "./db";
import { sendSupportReply } from "./services/emailService";

const STATUS = z.enum(["new", "triaged", "in_progress", "shipped", "declined", "spam"]);
const CATEGORY = z.enum([
  "feature_request",
  "bug_report",
  "question",
  "billing",
  "language_request",
  "integration_request",
  "other",
]);
const PRIORITY = z.enum(["low", "medium", "high", "urgent"]);

export const supportRouter = router({
  list: adminProcedure
    .input(z.object({ status: STATUS.optional(), limit: z.number().min(1).max(500).default(200) }).optional())
    .query(async ({ input }) => {
      return listSupportTickets({ status: input?.status, limit: input?.limit });
    }),

  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const ticket = await getSupportTicketById(input.id);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      return ticket;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: STATUS.optional(),
        category: CATEGORY.optional(),
        priority: PRIORITY.optional(),
        summary: z.string().max(500).optional(),
        adminNotes: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const existing = await getSupportTicketById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      const patch: Record<string, unknown> = { ...rest };
      if (rest.status === "shipped" && !existing.shippedAt) {
        patch.shippedAt = new Date();
      }

      await updateSupportTicket(id, patch);
      return { ok: true };
    }),

  reply: adminProcedure
    .input(
      z.object({
        id: z.number(),
        subject: z.string().min(1).max(500),
        body: z.string().min(1).max(10000),
        markStatus: STATUS.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const ticket = await getSupportTicketById(input.id);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      await sendSupportReply({
        toEmail: ticket.fromEmail,
        toName: ticket.fromName,
        subject: input.subject,
        body: input.body,
        ticketId: ticket.id,
      });

      const patch: Record<string, unknown> = {
        status: input.markStatus ?? "in_progress",
      };
      if (input.markStatus === "shipped" && !ticket.shippedAt) {
        patch.shippedAt = new Date();
      }

      await updateSupportTicket(ticket.id, patch);
      return { ok: true };
    }),
});
