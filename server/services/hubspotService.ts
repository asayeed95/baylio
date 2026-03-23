/**
 * HubSpot CRM Service
 * Auto-creates/updates contacts and logs call engagements.
 */
import { Client } from "@hubspot/api-client";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { shopIntegrations, integrationSyncLogs } from "../../drizzle/schema";

function getHubspotClient(apiKey: string): Client {
  return new Client({ accessToken: apiKey });
}

async function getShopHubspotKey(shopId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(shopIntegrations)
    .where(and(eq(shopIntegrations.shopId, shopId), eq(shopIntegrations.provider, "hubspot"), eq(shopIntegrations.isActive, true)))
    .limit(1);

  if (result.length > 0 && result[0].accessToken) {
    return result[0].accessToken;
  }

  // Fallback to global key
  return process.env.HUBSPOT_API_KEY || null;
}

export async function syncCallerToHubspot(
  shopId: number,
  caller: {
    phone: string;
    name?: string;
    email?: string;
    service?: string;
    callSummary?: string;
    duration?: number;
    recordingUrl?: string;
  }
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const apiKey = await getShopHubspotKey(shopId);
    if (!apiKey) return { success: false, error: "HubSpot not connected" };

    const client = getHubspotClient(apiKey);

    // Search for existing contact by phone
    let contactId: string | undefined;
    try {
      const searchResult = await client.crm.contacts.searchApi.doSearch({
        filterGroups: [{
          filters: [{ propertyName: "phone", operator: "EQ" as any, value: caller.phone }],
        }],
        properties: ["phone", "firstname", "lastname", "email"],
        limit: 1,
      });

      if (searchResult.results.length > 0) {
        contactId = searchResult.results[0].id;
        // Update existing contact
        await client.crm.contacts.basicApi.update(contactId, {
          properties: {
            ...(caller.name ? { firstname: caller.name.split(" ")[0], lastname: caller.name.split(" ").slice(1).join(" ") || "" } : {}),
            hs_lead_status: "OPEN",
          },
        });
      }
    } catch {}

    // Create new contact if not found
    if (!contactId) {
      try {
        const nameParts = (caller.name || "Unknown").split(" ");
        const created = await client.crm.contacts.basicApi.create({
          properties: {
            phone: caller.phone,
            firstname: nameParts[0],
            lastname: nameParts.slice(1).join(" ") || "",
            ...(caller.email ? { email: caller.email } : {}),
            hs_lead_status: "NEW",
            lifecyclestage: "lead",
          },
        });
        contactId = created.id;
      } catch (err: any) {
        console.error("[HUBSPOT] Error creating contact:", err.message);
        return { success: false, error: err.message };
      }
    }

    // Create a note engagement with call summary
    if (caller.callSummary && contactId) {
      try {
        await client.crm.objects.notes.basicApi.create({
          properties: {
            hs_note_body: `Baylio AI Call Summary:\n\n${caller.callSummary}\n\nService: ${caller.service || "N/A"}\nDuration: ${caller.duration || 0}s`,
            hs_timestamp: new Date().toISOString(),
          },
          associations: [{
            to: { id: contactId },
            types: [{ associationCategory: "HUBSPOT_DEFINED" as any, associationTypeId: 202 }],
          }],
        });
      } catch (err: any) {
        console.error("[HUBSPOT] Error creating note:", err.message);
      }
    }

    // Log sync
    const db = await getDb();
    if (db) {
      await db.insert(integrationSyncLogs).values({
        shopId,
        provider: "hubspot",
        action: contactId ? "sync_contact" : "create_contact",
        status: "success",
        metadata: { contactId },
      });
    }

    return { success: true, contactId };
  } catch (error: any) {
    console.error("[HUBSPOT] Error syncing caller:", error.message);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(integrationSyncLogs).values({
          shopId,
          provider: "hubspot",
          action: "sync_contact",
          status: "failed",
          errorMessage: error.message,
        });
      }
    } catch {}
    return { success: false, error: error.message };
  }
}
