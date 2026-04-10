import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { seedDemoShop } from "./services/demoService";
import {
  createShop,
  getShopsByOwner,
  getShopById,
  updateShop,
  deleteShop,
  getAgentConfigByShop,
  upsertAgentConfig,
  getSubscriptionByShop,
  getDb,
} from "./db";
import { eq, and } from "drizzle-orm";
import { subscriptions } from "../drizzle/schema";
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
  previewVoiceTTS,
} from "./services/elevenLabsService";
import {
  compileSystemPrompt,
  compileGreeting,
  type ShopContext,
} from "./services/promptCompiler";
import { contextCache } from "./services/contextCache";

const shopInput = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  timezone: z.string().default("America/New_York"),
  organizationId: z.number().optional(),
  ringShopFirstEnabled: z.boolean().optional(),
  ringTimeoutSec: z.number().int().min(5).max(30).optional(),
  businessHours: z.any().optional(),
  serviceCatalog: z
    .array(
      z.object({
        name: z.string(),
        category: z.string(),
        price: z.number().optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

const agentConfigInput = z.object({
  shopId: z.number(),
  voiceId: z.string().optional(),
  voiceName: z.string().optional(),
  agentName: z.string().default("Baylio"),
  systemPrompt: z.string().optional(),
  greeting: z.string().optional(),
  upsellEnabled: z.boolean().default(true),
  upsellRules: z
    .array(
      z.object({
        symptom: z.string(),
        service: z.string(),
        adjacent: z.string(),
        confidence: z.number(),
      })
    )
    .optional(),
  confidenceThreshold: z.string().default("0.80"),
  maxUpsellsPerCall: z.number().default(1),
  language: z.string().default("en"),
  characterPreset: z.enum(["warm_helper", "efficient_closer", "tech_expert", "sales_pro"]).optional(),
  warmth: z.number().int().min(1).max(5).optional(),
  salesIntensity: z.number().int().min(1).max(5).optional(),
  technicalDepth: z.number().int().min(1).max(5).optional(),
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shop not found or unauthorized",
        });
      }
      await updateShop(input.id, input.data as any);
      // Invalidate context cache so the next inbound call picks up new settings
      // (ring config, phone, hours, services, etc. all live in the cached ShopContext)
      contextCache.invalidateShop(input.id);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.id);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shop not found or unauthorized",
        });
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shop not found or unauthorized",
        });
      }
      const id = await upsertAgentConfig(input);
      contextCache.invalidateShop(input.shopId);
      return { id };
    }),

  previewVoice: protectedProcedure
    .input(z.object({
      voiceId: z.string().min(10).max(64),
      text: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const text = input.text ?? "Hi, thanks for calling! This is your AI assistant. How can I help you today?";
      const audioBuffer = await previewVoiceTTS(input.voiceId, text);
      return { audio: `data:audio/mpeg;base64,${audioBuffer.toString("base64")}` };
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
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to fetch balance: ${err.message}`,
      });
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shop not found or unauthorized",
        });
      }

      let provisioned;
      try {
        provisioned = await purchasePhoneNumber(
          input.phoneNumber,
          input.shopId,
          input.webhookBaseUrl,
          `Baylio — ${shop.name}`
        );
      } catch (err: any) {
        // Twilio 21422 = number no longer available (race condition in inventory)
        const isUnavailable = err?.code === 21422 || err?.status === 400;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: isUnavailable
            ? `${input.phoneNumber} is no longer available — please search for a new number.`
            : `Failed to purchase number: ${err?.message ?? err}`,
        });
      }

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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shop not found or unauthorized",
        });
      }

      const phoneSid = (shop as any).twilioPhoneSid;
      if (!phoneSid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Twilio phone number assigned to this shop",
        });
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shop not found or unauthorized",
        });
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
        confidenceThreshold: parseFloat(
          agentConfig.confidenceThreshold?.toString() || "0.80"
        ),
        maxUpsellsPerCall: agentConfig.maxUpsellsPerCall || 1,
        greeting: agentConfig.greeting || "",
        language: agentConfig.language || "en",
        customSystemPrompt: agentConfig.systemPrompt || undefined,
        characterPreset: (agentConfig as any).characterPreset ?? "warm_helper",
        warmth: (agentConfig as any).warmth ?? 3,
        salesIntensity: (agentConfig as any).salesIntensity ?? 3,
        technicalDepth: (agentConfig as any).technicalDepth ?? 2,
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

  /**
   * Onboarding: Complete setup in one call.
   * Creates shop → saves agent config → provisions ElevenLabs agent → optionally provisions phone.
   * For "forward" phone option, we provision a hidden Baylio number that the shop forwards to.
   * For "new" phone option, we purchase the selected number.
   */
  completeOnboarding: protectedProcedure
    .input(
      z.object({
        // Shop details
        shopName: z.string().min(1),
        shopPhone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        timezone: z.string().default("America/New_York"),
        businessHours: z.any().optional(),
        serviceCatalog: z
          .array(
            z.object({
              name: z.string(),
              category: z.string(),
              price: z.number().optional(),
            })
          )
          .optional(),
        // Phone setup
        phoneOption: z.enum(["forward", "new"]),
        selectedNewNumber: z.string().optional(),
        // Agent config
        agentName: z.string().min(1),
        voiceId: z.string(),
        voiceName: z.string(),
        greeting: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const steps: string[] = [];

      // Step 1: Create the shop
      // Defaults: ring the shop's existing phone first for 12s, then AI takes over.
      // Shop owner can change these in ShopSettings → Call Routing.
      const shopId = await createShop({
        name: input.shopName,
        phone: input.shopPhone || undefined,
        address: input.address || undefined,
        city: input.city || undefined,
        state: input.state || undefined,
        zip: input.zip || undefined,
        timezone: input.timezone,
        businessHours: input.businessHours || undefined,
        serviceCatalog: input.serviceCatalog || undefined,
        ringShopFirstEnabled: true,
        ringTimeoutSec: 12,
        ownerId: ctx.user.id,
      });

      if (!shopId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create shop" });
      }
      steps.push("shop_created");

      // Step 2: Save agent config
      const defaultGreeting = `Thank you for calling ${input.shopName}! This is ${input.agentName}. How can I help you today?`;
      await upsertAgentConfig({
        shopId,
        agentName: input.agentName,
        voiceId: input.voiceId,
        voiceName: input.voiceName,
        greeting: input.greeting || defaultGreeting,
        upsellEnabled: true,
        confidenceThreshold: "0.80",
        maxUpsellsPerCall: 1,
        language: "en",
        ownerId: ctx.user.id,
      });
      steps.push("agent_config_saved");

      // Step 3: Provision ElevenLabs agent
      const agentConfig = await getAgentConfigByShop(shopId);
      const shop = await getShopById(shopId);

      if (!agentConfig || !shop) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve shop/config after creation" });
      }

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
        characterPreset: (agentConfig as any).characterPreset ?? "warm_helper",
        warmth: (agentConfig as any).warmth ?? 3,
        salesIntensity: (agentConfig as any).salesIntensity ?? 3,
        technicalDepth: (agentConfig as any).technicalDepth ?? 2,
      };

      const systemPrompt = compileSystemPrompt(shopContext);
      const greeting = compileGreeting(shopContext);

      let agentId: string;
      try {
        const result = await createConversationalAgent({
          name: `Baylio — ${shop.name} (${agentConfig.agentName || "Agent"})`,
          voiceId: input.voiceId || "cjVigY5qzO86Huf0OWal",
          systemPrompt,
          firstMessage: greeting,
          language: "en",
        });
        agentId = result.agent_id;

        // Save agent ID back to config
        await upsertAgentConfig({
          ...agentConfig,
          shopId,
          elevenLabsAgentId: agentId,
        } as any);
        steps.push("agent_provisioned");
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to provision AI agent: ${err.message}`,
        });
      }

      // Step 4: Phone provisioning
      let twilioNumber: string | null = null;
      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || ctx.req.headers.origin || "";

      if (input.phoneOption === "new" && input.selectedNewNumber) {
        // Purchase the selected number
        try {
          const provisioned = await purchasePhoneNumber(
            input.selectedNewNumber,
            shopId,
            webhookBaseUrl,
            `Baylio — ${shop.name}`
          );
          await updateShop(shopId, {
            twilioPhoneNumber: provisioned.phoneNumber,
            twilioPhoneSid: provisioned.sid,
          } as any);
          twilioNumber = provisioned.phoneNumber;
          steps.push("new_number_purchased");
        } catch (err: any) {
          console.error("[Onboarding] Failed to purchase number:", err);
          // Non-fatal — shop is still live, just without a dedicated number
          steps.push("phone_purchase_failed");
        }
      } else if (input.phoneOption === "forward") {
        // For call forwarding: provision a hidden Baylio number in the shop's area code
        // The shop owner will forward their existing number to this Baylio number
        try {
          // Extract area code from shop's phone, or default to 800
          const shopPhoneDigits = (input.shopPhone || "").replace(/\D/g, "");
          const areaCode = shopPhoneDigits.length >= 10 ? shopPhoneDigits.slice(shopPhoneDigits.length - 10, shopPhoneDigits.length - 7) : "800";

          // Search for an available number
          const available = await searchAvailableNumbers(areaCode);
          if (available.length > 0) {
            const provisioned = await purchasePhoneNumber(
              available[0].phoneNumber,
              shopId,
              webhookBaseUrl,
              `Baylio FWD — ${shop.name}`
            );
            await updateShop(shopId, {
              twilioPhoneNumber: provisioned.phoneNumber,
              twilioPhoneSid: provisioned.sid,
            } as any);
            twilioNumber = provisioned.phoneNumber;
            steps.push("forwarding_number_provisioned");
          } else {
            // Try toll-free as fallback
            const tollFree = await searchAvailableNumbers("800");
            if (tollFree.length > 0) {
              const provisioned = await purchasePhoneNumber(
                tollFree[0].phoneNumber,
                shopId,
                webhookBaseUrl,
                `Baylio FWD — ${shop.name}`
              );
              await updateShop(shopId, {
                twilioPhoneNumber: provisioned.phoneNumber,
                twilioPhoneSid: provisioned.sid,
              } as any);
              twilioNumber = provisioned.phoneNumber;
              steps.push("forwarding_number_provisioned_tollfree");
            } else {
              steps.push("forwarding_number_unavailable");
            }
          }
        } catch (err: any) {
          console.error("[Onboarding] Failed to provision forwarding number:", err);
          steps.push("forwarding_number_failed");
        }
      }

      // Check if this user already has active subscriptions on other shops.
      // If yes, this additional shop requires the $99/mo add-on before going live.
      const db = await getDb();
      let requiresAddon = false;
      if (db) {
        const activeSubs = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.ownerId, ctx.user.id),
              eq(subscriptions.status, "active")
            )
          )
          .limit(1);
        requiresAddon = activeSubs.length > 0;
      }

      return {
        shopId,
        agentId,
        twilioNumber,
        phoneOption: input.phoneOption,
        steps,
        isLive: !!agentId && !!twilioNumber && !requiresAddon,
        requiresAddon,
      };
    }),

  /** Create a demo shop with sample data for product demos */
  createDemo: protectedProcedure.mutation(async ({ ctx }) => {
    const shopId = await seedDemoShop(ctx.user.id);
    if (!shopId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create demo shop",
      });
    }
    return { shopId };
  }),
});
