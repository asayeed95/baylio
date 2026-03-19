import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { getShopById, upsertAgentConfig, getAgentConfigByShop } from "./db";

/**
 * Voice Router
 * 
 * Manages ElevenLabs voice selection for per-shop voice customization.
 * Voices are fetched from ElevenLabs API and cached server-side.
 * Shop owners can preview and select a voice for their AI agent.
 */

// ─── Types ─────────────────────────────────────────────────────────

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: {
    accent?: string;
    gender?: string;
    age?: string;
    use_case?: string;
    description?: string;
  };
  preview_url: string;
}

export interface VoiceOption {
  voiceId: string;
  name: string;
  accent: string;
  gender: string;
  useCase: string;
  description: string;
  previewUrl: string;
}

// ─── Voice Cache ───────────────────────────────────────────────────

let voiceCache: VoiceOption[] = [];
let voiceCacheExpiry = 0;
const VOICE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchVoicesFromElevenLabs(): Promise<VoiceOption[]> {
  const now = Date.now();
  if (voiceCache.length > 0 && now < voiceCacheExpiry) {
    return voiceCache;
  }

  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: {
      "xi-api-key": ENV.elevenLabsApiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs voices API failed: ${response.status}`);
  }

  const data = await response.json();
  const voices: ElevenLabsVoice[] = data.voices || [];

  // Map to our simplified format and filter for conversational voices
  voiceCache = voices.map((v) => ({
    voiceId: v.voice_id,
    name: v.name,
    accent: v.labels?.accent || "american",
    gender: v.labels?.gender || "unknown",
    useCase: v.labels?.use_case || "general",
    description: v.labels?.description || v.name,
    previewUrl: v.preview_url || "",
  }));

  voiceCacheExpiry = now + VOICE_CACHE_TTL_MS;
  return voiceCache;
}

// ─── Router ────────────────────────────────────────────────────────

export const voiceRouter = router({
  /**
   * List all available ElevenLabs voices.
   * Cached for 1 hour to avoid rate limits.
   */
  list: protectedProcedure.query(async () => {
    return fetchVoicesFromElevenLabs();
  }),

  /**
   * Get the currently selected voice for a shop.
   */
  getShopVoice: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return null;

      const config = await getAgentConfigByShop(input.shopId);
      if (!config) return null;

      return {
        voiceId: config.voiceId,
        voiceName: config.voiceName,
      };
    }),

  /**
   * Update the voice for a shop's AI agent.
   * Saves voiceId and voiceName to agentConfigs.
   */
  setShopVoice: protectedProcedure
    .input(
      z.object({
        shopId: z.number(),
        voiceId: z.string().min(1),
        voiceName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new Error("Shop not found or unauthorized");
      }

      // Get existing config to preserve other fields
      const existing = await getAgentConfigByShop(input.shopId);

      await upsertAgentConfig({
        shopId: input.shopId,
        voiceId: input.voiceId,
        voiceName: input.voiceName,
        agentName: existing?.agentName || "Baylio",
        language: existing?.language || "en",
        upsellEnabled: existing?.upsellEnabled ?? true,
        confidenceThreshold: existing?.confidenceThreshold?.toString() || "0.80",
        maxUpsellsPerCall: existing?.maxUpsellsPerCall || 1,
      });

      return { success: true, voiceId: input.voiceId, voiceName: input.voiceName };
    }),
});
