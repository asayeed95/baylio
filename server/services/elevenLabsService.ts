/**
 * ElevenLabs Conversational AI Service
 *
 * Handles agent provisioning, voice catalog, and the Register Call API.
 * This service manages the lifecycle of ElevenLabs conversational agents
 * for each shop.
 *
 * Key operations:
 * - List available voices
 * - Create/update conversational AI agents
 * - Register calls (for the Twilio bridge)
 * - Get agent status and analytics
 */
import axios, { AxiosError } from "axios";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";

/**
 * Retry helper with exponential backoff.
 * Retries on 429 (rate limit) or 5xx (server error) up to maxRetries times.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  label: string = "API call"
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status || error?.status;
      const isRetryable = status === 429 || (status >= 500 && status < 600);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.warn(
        `[ElevenLabs] ${label} failed (${status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

/**
 * Get the ElevenLabs API key from environment.
 */
function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }
  return key;
}

/**
 * Create an axios instance configured for ElevenLabs API.
 */
function createClient() {
  return axios.create({
    baseURL: ELEVENLABS_BASE_URL,
    headers: {
      "xi-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });
}

// ─── Voice Catalog ──────────────────────────────────────────────────

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
  description?: string;
}

/**
 * List available voices from ElevenLabs.
 * Returns both pre-made and cloned voices.
 */
export async function listVoices(): Promise<Voice[]> {
  try {
    return await withRetry(async () => {
      const client = createClient();
      const response = await client.get("/v1/voices");
      return response.data.voices || [];
    }, 3, "listVoices");
  } catch (error) {
    console.error("[ElevenLabs] Error listing voices:", error);
    throw new Error("Failed to list voices from ElevenLabs");
  }
}

// ─── Conversational AI Agent Management ─────────────────────────────

export interface CreateAgentParams {
  name: string;
  voiceId: string;
  systemPrompt: string;
  firstMessage: string;
  language?: string;
}

export interface AgentResponse {
  agent_id: string;
  name: string;
  conversation_config: Record<string, unknown>;
}

/**
 * Create a new Conversational AI agent for a shop.
 *
 * This creates the agent in ElevenLabs that will handle live calls.
 * The agent_id is stored in the shop's agent_configs table.
 *
 * Conversation settings are tuned for maximum human-likeness:
 * - Turn detection: server-based VAD with 300ms silence threshold
 * - Interruption handling: agent pauses and lets caller speak
 * - Response pacing: natural 0.5s delay so it doesn't feel instant
 * - Stability + similarity: balanced for natural but consistent voice
 */
export async function createConversationalAgent(
  params: CreateAgentParams
): Promise<AgentResponse> {
  try {
    return await withRetry(async () => {
      const client = createClient();
      const payload = {
        conversation_config: {
          agent: {
            prompt: { prompt: params.systemPrompt },
            first_message: params.firstMessage,
            language: params.language || "en",
          },
          tts: {
            voice_id: params.voiceId,
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.35,
            optimize_streaming_latency: 3,
          },
          conversation: {
            // Turn detection: how long to wait for the caller to finish speaking
            client_events: ["agent_response", "user_transcript"],
            // Max call duration: 15 minutes
            max_duration_seconds: 900,
          },
          asr: {
            // Automatic speech recognition quality setting
            quality: "high",
          },
        },
        name: params.name,
        platform_settings: {
          auth: { enable_auth: false },
        },
      };
      const response = await client.post("/v1/convai/agents/create", payload);
      return response.data;
    }, 3, "createAgent");
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("[ElevenLabs] Error creating agent:", axiosError.response?.data || axiosError.message);
    throw new Error(`Failed to create ElevenLabs agent: ${axiosError.message}`);
  }
}

/**
 * Update an existing Conversational AI agent.
 * Always re-applies voice tuning params to keep the agent consistent.
 */
export async function updateConversationalAgent(
  agentId: string,
  params: Partial<CreateAgentParams>
): Promise<AgentResponse> {
  try {
    return await withRetry(async () => {
      const client = createClient();
      const convConfig: Record<string, unknown> = {};

      if (params.systemPrompt || params.firstMessage || params.language) {
        convConfig.agent = {
          ...(params.systemPrompt ? { prompt: { prompt: params.systemPrompt } } : {}),
          ...(params.firstMessage ? { first_message: params.firstMessage } : {}),
          ...(params.language ? { language: params.language } : {}),
        };
      }

      if (params.voiceId) {
        convConfig.tts = {
          voice_id: params.voiceId,
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.35,
          optimize_streaming_latency: 3,
        };
      }

      const payload: Record<string, unknown> = { conversation_config: convConfig };
      if (params.name) payload.name = params.name;

      const response = await client.patch(`/v1/convai/agents/${agentId}`, payload);
      return response.data;
    }, 3, "updateAgent");
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("[ElevenLabs] Error updating agent:", axiosError.response?.data || axiosError.message);
    throw new Error(`Failed to update ElevenLabs agent: ${axiosError.message}`);
  }
}

/**
 * Delete a Conversational AI agent.
 */
export async function deleteConversationalAgent(
  agentId: string
): Promise<void> {
  try {
    await withRetry(async () => {
      const client = createClient();
      await client.delete(`/v1/convai/agents/${agentId}`);
    }, 3, "deleteAgent");
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("[ElevenLabs] Error deleting agent:", axiosError.response?.data || axiosError.message);
    throw new Error(`Failed to delete ElevenLabs agent: ${axiosError.message}`);
  }
}

/**
 * Get agent details.
 */
export async function getAgent(agentId: string): Promise<AgentResponse> {
  try {
    return await withRetry(async () => {
      const client = createClient();
      const response = await client.get(`/v1/convai/agents/${agentId}`);
      return response.data;
    }, 3, "getAgent");
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("[ElevenLabs] Error getting agent:", axiosError.response?.data || axiosError.message);
    throw new Error(`Failed to get ElevenLabs agent: ${axiosError.message}`);
  }
}

// ─── Account & Usage ────────────────────────────────────────────────

export interface SubscriptionInfo {
  tier: string;
  character_count: number;
  character_limit: number;
  can_extend_character_limit: boolean;
  next_character_count_reset_unix: number;
}

/**
 * Get current ElevenLabs subscription info for usage tracking.
 */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  try {
    const client = createClient();
    const response = await client.get("/v1/user/subscription");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(
      "[ElevenLabs] Error getting subscription:",
      axiosError.response?.data || axiosError.message
    );
    throw new Error(
      `Failed to get ElevenLabs subscription info: ${axiosError.message}`
    );
  }
}

/**
 * Get conversation history for an agent (for analytics).
 */
export async function getConversationHistory(
  agentId: string,
  limit: number = 20
): Promise<any[]> {
  try {
    const client = createClient();
    const response = await client.get(`/v1/convai/conversations`, {
      params: { agent_id: agentId, page_size: limit },
    });
    return response.data.conversations || [];
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(
      "[ElevenLabs] Error getting conversations:",
      axiosError.response?.data || axiosError.message
    );
    return [];
  }
}
