/**
 * ElevenLabs Post-Call Webhook Handler
 *
 * Receives the post_call_transcription event from ElevenLabs when a Sam
 * conversation ends. Extracts the caller's phone (passed in dynamic_variables
 * at call initiation) and stores the transcript in Mem0.
 *
 * Configure Sam's ElevenLabs agent to POST to:
 *   https://baylio.io/api/elevenlabs/conversation
 *
 * Run scripts/setup-sam-mem0.mjs once to wire this up.
 */
import { Router, Request, Response } from "express";
import { storeCallMemory } from "./mem0Service";

export const elevenLabsWebhookRouter = Router();

interface ElevenLabsTranscriptTurn {
  role: "agent" | "user";
  message: string;
  time_in_call_secs?: number;
}

interface ElevenLabsWebhookPayload {
  type: string;
  data?: {
    agent_id?: string;
    conversation_id?: string;
    status?: string;
    transcript?: ElevenLabsTranscriptTurn[];
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, string>;
    };
  };
}

/**
 * POST /api/elevenlabs/conversation
 *
 * ElevenLabs fires this when a conversation ends with the full transcript.
 * We extract caller_phone from the dynamic_variables we passed at call start.
 */
elevenLabsWebhookRouter.post(
  "/conversation",
  async (req: Request, res: Response) => {
    // Respond immediately — Mem0 storage is fire-and-forget
    res.status(200).send("OK");

    try {
      const payload = req.body as ElevenLabsWebhookPayload;

      if (payload.type !== "post_call_transcription") return;

      const data = payload.data;
      if (!data) return;

      const callerPhone =
        data.conversation_initiation_client_data?.dynamic_variables
          ?.caller_phone;

      if (!callerPhone) {
        console.warn(
          "[ELEVENLABS-WEBHOOK] No caller_phone in dynamic_variables — skipping Mem0 storage"
        );
        return;
      }

      const transcript = data.transcript;
      if (!transcript?.length) return;

      // Map ElevenLabs roles to Mem0 message format
      const messages: Array<{ role: "user" | "assistant"; content: string }> =
        transcript
          .filter((t) => t.message?.trim())
          .map((t) => ({
            role: t.role === "user" ? "user" : "assistant",
            content: t.message.trim(),
          }));

      await storeCallMemory(callerPhone, messages);

      console.log(
        `[ELEVENLABS-WEBHOOK] Stored memory for ${callerPhone} — conv ${data.conversation_id}`
      );
    } catch (err) {
      console.error("[ELEVENLABS-WEBHOOK] Error processing webhook:", err);
    }
  }
);
