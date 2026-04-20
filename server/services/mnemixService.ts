/**
 * Mnemix Memory API client for Sam's pre-call context injection.
 *
 * Looks up a caller's phone number against Mnemix before Sam picks up.
 * Returns a formatted context string ready to inject into dynamic_variables.
 * Fails open — any error returns "" so Sam still connects.
 */

const MNEMIX_API_URL = process.env.MNEMIX_API_URL ?? "https://mnemix-api.sayeed965.workers.dev";
const MNEMIX_API_KEY = process.env.MNEMIX_API_KEY ?? "";

interface MnemixInteraction {
  channel: string;
  direction: string;
  summary: string;
  created_at: string;
}

interface MnemixContact {
  name?: string;
  company?: string;
  role?: string;
  sentiment?: string;
  relationship_status?: string;
  summary?: string;
}

interface MnemixLookupResponse {
  known: boolean;
  contact: MnemixContact;
  enrichment: {
    status: string;
    sources: string[];
    trestle?: { line_type?: string; carrier?: string; is_commercial?: boolean };
    twilio?: { line_type?: string; carrier_name?: string };
  };
  recent_interactions: MnemixInteraction[];
}

/**
 * Look up a caller phone number in Mnemix.
 * Returns the formatted context string for Sam's prompt, or "" if unavailable.
 */
export async function getMnemixCallerContext(phone: string): Promise<string> {
  if (!MNEMIX_API_KEY) return "";

  let data: MnemixLookupResponse;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${MNEMIX_API_URL}/v1/lookup/${encodeURIComponent(phone)}`, {
      headers: { Authorization: `Bearer ${MNEMIX_API_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[MNEMIX] Lookup returned ${res.status} for ${phone}`);
      return "";
    }
    data = (await res.json()) as MnemixLookupResponse;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("[MNEMIX] Lookup timed out after 3s, falling back");
    } else {
      console.error("[MNEMIX] Lookup failed:", err);
    }
    return "";
  }

  if (!data.known) {
    return "";
  }

  const lines: string[] = [];
  const { contact, enrichment, recent_interactions } = data;

  // Identity
  if (contact.name) lines.push(`Name: ${contact.name}`);
  if (contact.company) lines.push(`Company: ${contact.company}`);
  if (contact.role) lines.push(`Role: ${contact.role}`);

  // Relationship
  if (contact.relationship_status && contact.relationship_status !== "new") {
    lines.push(`Relationship: ${contact.relationship_status}`);
  }
  if (contact.sentiment && contact.sentiment !== "unknown") {
    lines.push(`Sentiment: ${contact.sentiment}`);
  }

  // Enrichment — carrier/line type context
  const trestle = enrichment.trestle;
  const twilio = enrichment.twilio;
  const lineType = trestle?.line_type ?? twilio?.line_type;
  const carrier = trestle?.carrier ?? twilio?.carrier_name;
  if (lineType) lines.push(`Line type: ${lineType}`);
  if (carrier) lines.push(`Carrier: ${carrier}`);
  if (trestle?.is_commercial) lines.push("Business phone: yes");

  // AI summary (most valuable — shown first if present)
  if (contact.summary) {
    lines.unshift(`Summary: ${contact.summary}`);
  }

  // Recent interactions
  if (recent_interactions.length > 0) {
    lines.push("\nRecent interactions:");
    for (const interaction of recent_interactions) {
      const date = new Date(interaction.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      lines.push(`- ${date} (${interaction.channel}): ${interaction.summary}`);
    }
  }

  return lines.join("\n");
}
