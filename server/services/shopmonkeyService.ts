/**
 * Shopmonkey Integration Service
 * Creates work orders when AI books appointments.
 */
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { shopIntegrations, integrationSyncLogs } from "../../drizzle/schema";

interface WorkOrderParams {
  customerName: string;
  customerPhone: string;
  vehicleInfo?: { year?: string; make?: string; model?: string };
  service: string;
  appointmentDate?: string;
  notes?: string;
}

async function getShopmonkeyKeys(
  shopId: number
): Promise<{ publicKey: string; privateKey: string } | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(shopIntegrations)
    .where(
      and(
        eq(shopIntegrations.shopId, shopId),
        eq(shopIntegrations.provider, "shopmonkey"),
        eq(shopIntegrations.isActive, true)
      )
    )
    .limit(1);

  if (result.length === 0) return null;
  const settings = result[0].settings as any;
  if (!settings?.shopmonkeyPublicKey || !settings?.shopmonkeyPrivateKey)
    return null;
  return {
    publicKey: settings.shopmonkeyPublicKey,
    privateKey: settings.shopmonkeyPrivateKey,
  };
}

async function shopmonkeyFetch(
  path: string,
  keys: { publicKey: string; privateKey: string },
  options: RequestInit = {}
) {
  const response = await fetch(`https://api.shopmonkey.cloud${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${keys.privateKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopmonkey API error (${response.status}): ${text}`);
  }
  return response.json();
}

export async function createWorkOrder(
  shopId: number,
  params: WorkOrderParams
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const keys = await getShopmonkeyKeys(shopId);
    if (!keys) return { success: false, error: "Shopmonkey not connected" };

    // Step 1: Search or create customer
    let customerId: string | undefined;
    try {
      const searchResult = await shopmonkeyFetch(
        `/v3/customer?phone=${encodeURIComponent(params.customerPhone)}`,
        keys
      );
      if (searchResult.data?.length > 0) {
        customerId = searchResult.data[0].id;
      }
    } catch {}

    if (!customerId) {
      const nameParts = params.customerName.split(" ");
      const customer = await shopmonkeyFetch("/v3/customer", keys, {
        method: "POST",
        body: JSON.stringify({
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" ") || "",
          phone: [{ number: params.customerPhone, type: "mobile" }],
        }),
      });
      customerId = customer.data?.id;
    }

    // Step 2: Create order
    const order = await shopmonkeyFetch("/v3/order", keys, {
      method: "POST",
      body: JSON.stringify({
        customerId,
        note: `Service: ${params.service}\n${params.notes || ""}\n\nBooked via Baylio AI`,
        ...(params.appointmentDate
          ? { appointmentDate: params.appointmentDate }
          : {}),
      }),
    });

    const db = await getDb();
    if (db) {
      await db.insert(integrationSyncLogs).values({
        shopId,
        provider: "shopmonkey",
        action: "create_work_order",
        status: "success",
        metadata: { orderId: order.data?.id, customerId },
      });
    }

    return { success: true, orderId: order.data?.id };
  } catch (error: any) {
    console.error("[SHOPMONKEY] Error creating work order:", error.message);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(integrationSyncLogs).values({
          shopId,
          provider: "shopmonkey",
          action: "create_work_order",
          status: "failed",
          errorMessage: error.message,
        });
      }
    } catch {}
    return { success: false, error: error.message };
  }
}
