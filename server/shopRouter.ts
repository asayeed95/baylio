import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import {
  createShop,
  getShopsByOwner,
  getShopById,
  updateShop,
  deleteShop,
  getAgentConfigByShop,
  upsertAgentConfig,
  getSubscriptionByShop,
} from "./db";
import {
  validateTwilioCredentials,
  searchAvailableNumbers,
  purchasePhoneNumber,
  releasePhoneNumber,
  getAccountBalance,
} from "./services/twilioProvisioning";
import {
  createConversationalAgent,
  updateConversationalAgent,
} from "./services/elevenLabsService";
import { compileSystemPrompt, compileGreeting, type ShopContext } from "./services/promptCompiler";

const shopInput = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  timezone: z.string().default("America/New_York"),
  organizationId: z.number().optional(),
  businessHours: z.any().optional(),
  serviceCatalog: z.array(z.object({
    name: z.string(),
    category: z.string(),
    price: z.number().optional(),
    description: z.string().optional(),
  })).optional(),
});

const agentConfigInput = z.object({
  shopId: z.number(),
  voiceId: z.string().optional(),
  voiceName: z.string().optional(),
  agentName: z.string().default("Baylio"),
  systemPrompt: z.string().optional(),
  greeting: z.string().optional(),
  upsellEnabled: z.boolean().default(true),
  upsellRules: z.array(z.object({
    symptom: z.string(),
    service: z.string(),
    adjacent: z.string(),
    confidence: z.number(),
  })).optional(),
  confidenceThreshold: z.string().default("0.80"),
  maxUpsellsPerCall: z.number().default(1),
  language: z.string().default("en"),
});

export const shopRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getShopsByOwner(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.id);
      if (!shop || shop.ownerId !== ctx.user.id) {
        return null;
      }
      return shop;
    }),

  create: protectedProcedure
    .input(shopInput)
    .mutation(async ({ ctx, input }) => {
      const id = await createShop({ ...input, ownerId: ctx.user.id });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: shopInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.id);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found or unauthorized" });
      }
      await updateShop(input.id, input.data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.id);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found or unauthorized" });
      }
      await deleteShop(input.id);
      return { success: true };
    }),

  // Agent config
  getAgentConfig: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return null;
      return getAgentConfigByShop(input.shopId);
    }),

  saveAgentConfig: protectedProcedure
    .input(agentConfigInput)
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found or unauthorized" });
      }
      const id = await upsertAgentConfig(input);
      return { id };
    }),

  // Subscription info
  getSubscription: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return null;
      return getSubscriptionByShop(input.shopId);
    }),

  // ─── Twilio Phone Provisioning ───────────────────────────────────────────

  /** Validate Twilio credentials and return account info */
  twilioStatus: protectedProcedure.query(async () => {
    try {
      const account = await validateTwilioCredentials();
      return { connected: true, ...account };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }),

  /** Get Twilio account balance */
  twilioBalance: protectedProcedure.query(async () => {
    try {
      return await getAccountBalance();
    } catch (err: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Failed to fetch balance: ${err.message}` });
    }
  }),

  /** Search available phone numbers by area code */
  searchPhoneNumbers: protectedProcedure
    .input(z.object({ areaCode: z.string().length(3) }))
    .query(async ({ input }) => {
      return searchAvailableNumbers(input.areaCode);
    }),

  /** Purchase a phone number and assign it to a shop */
  purchasePhoneNumber: protectedProcedure
    .input(
      z.object({
        shopId: z.number(),
        phoneNumber: z.string(),
        webhookBaseUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found or unauthorized" });
      }

      const provisioned = await purchasePhoneNumber(
        input.phoneNumber,
        input.shopId,
        input.webhookBaseUrl,
        `Baylio — ${shop.name}`
      );

      // Save the Twilio phone number and SID to the shop record
      await updateShop(input.shopId, {
        twilioPhoneNumber: provisioned.phoneNumber,
        twilioPhoneSid: provisioned.sid,
      } as any);

      return provisioned;
    }),

  /** Release a phone number from a shop */
  releasePhoneNumber: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found or unauthorized" });
      }

      const phoneSid = (shop as any).twilioPhoneSid;
      if (!phoneSid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No Twilio phone number assigned to this shop" });
      }

      await releasePhoneNumber(phoneSid);

      // Clear the phone fields from the shop record
      await updateShop(input.shopId, {
        twilioPhoneNumber: null,
        twilioPhoneSid: null,
      } as any);

      return { success: true };
    }),

  // ─── ElevenLabs Agent Provisioning ──────────────────────────────────

  /**
   * Provision (create or update) an ElevenLabs conversational AI agent for a shop.
   * This is the critical step that makes inbound calls work.
   * If no elevenLabsAgentId exists, creates a new agent.
   * If one exists, updates the existing agent with the latest config.
   */
  provisionAgent: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found or unauthorized" });
      }

      const agentConfig = await getAgentConfigByShop(input.shopId);
      if (!agentConfig) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Save your agent configuration first before provisioning.",
        });
      }

      // Build the prompt from shop context
      const shopContext: ShopContext = {
        shopName: shop.name,
        agentName: agentConfig.agentName || "Baylio",
        phone: shop.phone || "",
        address: shop.address || "",
        city: shop.city || "",
        state: shop.state || "",
        timezone: shop.timezone || "America/New_York",
        businessHours: (shop.businessHours as any) || {},
        serviceCatalog: (shop.serviceCatalog as any) || [],
        upsellRules: (agentConfig.upsellRules as any) || [],
        confidenceThreshold: parseFloat(agentConfig.confidenceThreshold?.toString() || "0.80"),
        maxUpsellsPerCall: agentConfig.maxUpsellsPerCall || 1,
        greeting: agentConfig.greeting || "",
        language: agentConfig.language || "en",
        customSystemPrompt: agentConfig.systemPrompt || undefined,
      };

      const systemPrompt = compileSystemPrompt(shopContext);
      const greeting = compileGreeting(shopContext);

      const existingAgentId = agentConfig.elevenLabsAgentId;

      try {
        if (existingAgentId) {
          // Update existing agent
          const result = await updateConversationalAgent(existingAgentId, {
            name: `Baylio — ${shop.name} (${agentConfig.agentName || "Agent"})`,
            voiceId: agentConfig.voiceId || undefined,
            systemPrompt,
            firstMessage: greeting,
            language: agentConfig.language || "en",
          });
          return { agentId: existingAgentId, action: "updated" as const };
        } else {
          // Create new agent
          const result = await createConversationalAgent({
            name: `Baylio — ${shop.name} (${agentConfig.agentName || "Agent"})`,
            voiceId: agentConfig.voiceId || "cjVigY5qzO86Huf0OWal", // Default voice
            systemPrompt,
            firstMessage: greeting,
            language: agentConfig.language || "en",
          });

          // Save the agent ID back to the config
          await upsertAgentConfig({
            ...agentConfig,
            shopId: input.shopId,
            elevenLabsAgentId: result.agent_id,
          } as any);

          return { agentId: result.agent_id, action: "created" as const };
        }
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to provision ElevenLabs agent: ${err.message}`,
        });
      }
    }),

  /** Get the current agent provisioning status for a shop. */
  getAgentStatus: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return null;
      const config = await getAgentConfigByShop(input.shopId);
      return {
        hasConfig: !!config,
        hasAgent: !!config?.elevenLabsAgentId,
        hasPhone: !!shop.twilioPhoneNumber,
        agentId: config?.elevenLabsAgentId || null,
        phoneNumber: shop.twilioPhoneNumber || null,
        isLive: !!config?.elevenLabsAgentId && !!shop.twilioPhoneNumber,
      };
    }),
});
