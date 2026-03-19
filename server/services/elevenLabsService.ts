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
    const client = createClient();
    const response = await client.get("/v1/voices");
    return response.data.voices || [];
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
 */
export async function createConversationalAgent(
  params: CreateAgentParams
): Promise<AgentResponse> {
  try {
    const client = createClient();

    const payload = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: params.systemPrompt,
          },
          first_message: params.firstMessage,
          language: params.language || "en",
        },
        tts: {
          voice_id: params.voiceId,
        },
      },
      name: params.name,
      // Platform settings for Twilio integration
      platform_settings: {
        auth: {
          // Allow Twilio to connect without additional auth
          // (Twilio signature validation happens at our middleware layer)
          enable_auth: false,
        },
      },
    };

    const response = await client.post("/v1/convai/agents/create", payload);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("[ElevenLabs] Error creating agent:", axiosError.response?.data || axiosError.message);
    throw new Error(`Failed to create ElevenLabs agent: ${axiosError.message}`);
  }
}

/**
 * Update an existing Conversational AI agent.
 */
export async function updateConversationalAgent(
  agentId: string,
  params: Partial<CreateAgentParams>
): Promise<AgentResponse> {
  try {
    const client = createClient();

    const conversationConfig: Record<string, unknown> = {};

    if (params.systemPrompt || params.firstMessage || params.language) {
      const agent: Record<string, unknown> = {};
      if (params.systemPrompt) {
        agent.prompt = { prompt: params.systemPrompt };
      }
      if (params.firstMessage) {
        agent.first_message = params.firstMessage;
      }
      if (params.language) {
        agent.language = params.language;
      }
      conversationConfig.agent = agent;
    }

    if (params.voiceId) {
      conversationConfig.tts = { voice_id: params.voiceId };
    }

    const payload: Record<string, unknown> = {
      conversation_config: conversationConfig,
    };

    if (params.name) {
      payload.name = params.name;
    }

    const response = await client.patch(`/v1/convai/agents/${agentId}`, payload);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("[ElevenLabs] Error updating agent:", axiosError.response?.data || axiosError.message);
    throw new Error(`Failed to update ElevenLabs agent: ${axiosError.message}`);
  }
}

/**
 * Delete a Conversational AI agent.
 */
export async function deleteConversationalAgent(agentId: string): Promise<void> {
  try {
    const client = createClient();
    await client.delete(`/v1/convai/agents/${agentId}`);
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
    const client = createClient();
    const response = await client.get(`/v1/convai/agents/${agentId}`);
    return response.data;
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
    console.error("[ElevenLabs] Error getting subscription:", axiosError.response?.data || axiosError.message);
    throw new Error(`Failed to get ElevenLabs subscription info: ${axiosError.message}`);
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
    console.error("[ElevenLabs] Error getting conversations:", axiosError.response?.data || axiosError.message);
    return [];
  }
}
