/**
 * Google Sheets Service
 * Auto-syncs completed call data to a Google Sheet.
 */
import { google } from "googleapis";
import { getGoogleClient } from "./googleAuth";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { shopIntegrations, integrationSyncLogs } from "../../drizzle/schema";

const HEADER_ROW = [
  "Date",
  "Time",
  "Caller",
  "Phone",
  "Duration (s)",
  "Service Requested",
  "Appointment Booked",
  "Upsell Offered",
  "Upsell Accepted",
  "Sentiment",
  "Revenue Estimate",
  "Summary",
];

export async function syncCallToSheet(
  shopId: number,
  callLog: {
    createdAt: Date | null;
    callerName?: string | null;
    callerPhone?: string | null;
    duration?: number | null;
    serviceRequested?: string | null;
    appointmentBooked?: boolean | null;
    upsellAttempted?: boolean | null;
    upsellAccepted?: boolean | null;
    sentimentScore?: string | null;
    estimatedRevenue?: string | null;
    summary?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getGoogleClient(shopId, "google_sheets");
    if (!auth) return { success: false, error: "Google Sheets not connected" };

    const db = await getDb();
    if (!db) return { success: false, error: "Database unavailable" };

    const integration = await db
      .select()
      .from(shopIntegrations)
      .where(
        and(
          eq(shopIntegrations.shopId, shopId),
          eq(shopIntegrations.provider, "google_sheets")
        )
      )
      .limit(1);

    const sheetId = (integration[0]?.settings as any)?.sheetId;
    if (!sheetId) return { success: false, error: "No sheet configured" };

    const sheets = google.sheets({ version: "v4", auth });
    const date = callLog.createdAt || new Date();

    // Check if header row exists
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Sheet1!A1:L1",
    });

    if (!existing.data.values || existing.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Sheet1!A1:L1",
        valueInputOption: "RAW",
        requestBody: { values: [HEADER_ROW] },
      });
    }

    // Append the call data row
    const row = [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      callLog.callerName || "Unknown",
      callLog.callerPhone || "",
      callLog.duration?.toString() || "0",
      callLog.serviceRequested || "",
      callLog.appointmentBooked ? "Yes" : "No",
      callLog.upsellAttempted ? "Yes" : "No",
      callLog.upsellAccepted ? "Yes" : "No",
      callLog.sentimentScore || "",
      callLog.estimatedRevenue ? `$${callLog.estimatedRevenue}` : "",
      callLog.summary || "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:L",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    await db.insert(integrationSyncLogs).values({
      shopId,
      provider: "google_sheets",
      action: "sync_call",
      status: "success",
    });

    return { success: true };
  } catch (error: any) {
    console.error("[SHEETS] Error syncing call:", error.message);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(integrationSyncLogs).values({
          shopId,
          provider: "google_sheets",
          action: "sync_call",
          status: "failed",
          errorMessage: error.message,
        });
      }
    } catch {}
    return { success: false, error: error.message };
  }
}
