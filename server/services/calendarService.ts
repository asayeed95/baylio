/**
 * Google Calendar Service
 * Creates appointment events on the shop owner's Google Calendar.
 */
import { google } from "googleapis";
import { getGoogleClient } from "./googleAuth";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { shopIntegrations, integrationSyncLogs } from "../../drizzle/schema";

interface AppointmentParams {
  customerName: string;
  customerPhone: string;
  service: string;
  dateTime: string;
  duration?: number;
  notes?: string;
}

export async function createAppointment(
  shopId: number,
  params: AppointmentParams
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const auth = await getGoogleClient(shopId, "google_calendar");
    if (!auth) {
      console.log("[CALENDAR] No Google Calendar connected for shop", shopId);
      return { success: false, error: "Google Calendar not connected" };
    }

    // Get the calendar ID from integration settings
    const db = await getDb();
    if (!db) return { success: false, error: "Database unavailable" };

    const integration = await db
      .select()
      .from(shopIntegrations)
      .where(
        and(
          eq(shopIntegrations.shopId, shopId),
          eq(shopIntegrations.provider, "google_calendar")
        )
      )
      .limit(1);

    const calendarId =
      (integration[0]?.settings as any)?.calendarId || "primary";

    const calendar = google.calendar({ version: "v3", auth });
    const startDate = new Date(params.dateTime);
    const endDate = new Date(
      startDate.getTime() + (params.duration || 60) * 60 * 1000
    );

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `[Baylio] ${params.service} — ${params.customerName}`,
        description: [
          `Customer: ${params.customerName}`,
          `Phone: ${params.customerPhone}`,
          `Service: ${params.service}`,
          params.notes ? `Notes: ${params.notes}` : "",
          "",
          "Booked by Baylio AI Call Assistant",
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      },
    });

    // Log successful sync
    await db.insert(integrationSyncLogs).values({
      shopId,
      provider: "google_calendar",
      action: "create_appointment",
      status: "success",
      metadata: { eventId: event.data.id, customerName: params.customerName },
    });

    return { success: true, eventId: event.data.id || undefined };
  } catch (error: any) {
    console.error("[CALENDAR] Error creating appointment:", error.message);

    try {
      const db = await getDb();
      if (db) {
        await db.insert(integrationSyncLogs).values({
          shopId,
          provider: "google_calendar",
          action: "create_appointment",
          status: "failed",
          errorMessage: error.message,
        });
      }
    } catch {}

    return { success: false, error: error.message };
  }
}
