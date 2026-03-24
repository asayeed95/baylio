import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { createContactSubmission } from "./db";
import { sendContactNotification } from "./services/emailService";
import { notifyOwner } from "./_core/notification";

export const contactRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        phone: z.string().max(32).optional().default(""),
        message: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createContactSubmission({
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        message: input.message,
      });

      // Send email notification to hello@baylio.io (fire-and-forget)
      sendContactNotification({
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        message: input.message,
      }).catch((err) => {
        console.error("[Contact] Email notification failed:", err);
      });

      // Send in-app notification to owner (fire-and-forget)
      notifyOwner({
        title: `New contact from ${input.name}`,
        content: `Email: ${input.email}\nPhone: ${input.phone || "N/A"}\n\n${input.message}`,
      }).catch((err) => {
        console.error("[Contact] Owner notification failed:", err);
      });

      return { success: true, id: id ?? null };
    }),
});
