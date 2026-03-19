import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { createContactSubmission } from "./db";

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
      return { success: true, id: id ?? null };
    }),
});
