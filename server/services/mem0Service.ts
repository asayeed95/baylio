/**
 * Mem0 Memory Service
 *
 * Persistent memory layer for Baylio's Sam sales agent.
 * Stores and retrieves caller history so Sam remembers prospects
 * across calls — name, shop details, objections, interest level.
 *
 * user_id namespace: "sales_<e164_phone>" — scoped to the sales context,
 * isolated from any future per-shop memory.
 */
import MemoryClient from "mem0ai";
import { ENV } from "../_core/env";

let _client: MemoryClient | null = null;

function getClient(): MemoryClient | null {
  if (!ENV.mem0ApiKey) return null;
  if (!_client) {
    _client = new MemoryClient({ apiKey: ENV.mem0ApiKey });
  }
  return _client;
}

function salesUserId(phone: string): string {
  return `sales_${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * Retrieve caller memory for Sam's pre-call context injection.
 * Returns a formatted string ready to inject into Sam's prompt, or "" if none.
 */
export async function getCallerMemory(phone: string): Promise<string> {
  const client = getClient();
  if (!client) return "";

  try {
    const searchPromise = client.search(
      "caller background, shop details, objections, interest level",
      { filters: { user_id: salesUserId(phone) }, topK: 8 }
    );
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Mem0 timeout")), 2000)
    );
    const { results } = await Promise.race([searchPromise, timeoutPromise]);

    if (!results.length) return "";

    return results
      .map((m) => `- ${m.memory}`)
      .join("\n");
  } catch (err) {
    if (err instanceof Error && err.message === "Mem0 timeout") {
      console.warn("[MEM0] Search timed out after 2s, skipping");
    } else {
      console.error("[MEM0] Error fetching caller memory:", err);
    }
    return "";
  }
}

/**
 * Store a completed Sam conversation in Mem0.
 * Called after the ElevenLabs post-call webhook delivers the transcript.
 */
export async function storeCallMemory(
  phone: string,
  transcript: Array<{ role: "user" | "assistant"; content: string }>
): Promise<void> {
  const client = getClient();
  if (!client || !transcript.length) return;

  try {
    await client.add(transcript, { userId: salesUserId(phone) });
    console.log(`[MEM0] Stored ${transcript.length} turns for ${salesUserId(phone)}`);
  } catch (err) {
    console.error("[MEM0] Error storing call memory:", err);
  }
}
