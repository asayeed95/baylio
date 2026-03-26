/**
 * Google OAuth 2.0 Service
 * Handles OAuth flow for Google Calendar + Sheets integration.
 */
import { Router, Request, Response } from "express";
import { google } from "googleapis";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { shopIntegrations, shops } from "../../drizzle/schema";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
];

function getOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export const googleAuthRouter = Router();

/** Start Google OAuth flow */
googleAuthRouter.get("/connect", (req: Request, res: Response) => {
  const { shopId, origin } = req.query;
  if (!shopId || !origin) {
    res.status(400).json({ error: "shopId and origin are required" });
    return;
  }

  const redirectUri = `${origin}/api/integrations/google/callback`;
  const oauth2Client = getOAuth2Client(redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: JSON.stringify({ shopId, origin }),
  });

  res.redirect(authUrl);
});

/** Handle Google OAuth callback */
googleAuthRouter.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      res.status(400).send("Missing code or state");
      return;
    }

    const { shopId, origin } = JSON.parse(state as string);
    const redirectUri = `${origin}/api/integrations/google/callback`;
    const oauth2Client = getOAuth2Client(redirectUri);

    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Get the user's email for display
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const db = await getDb();
    if (!db) {
      res.status(500).send("Database unavailable");
      return;
    }

    // Upsert integration for both Calendar and Sheets (same tokens)
    for (const provider of ["google_calendar", "google_sheets"] as const) {
      const existing = await db
        .select({ id: shopIntegrations.id })
        .from(shopIntegrations)
        .where(
          and(
            eq(shopIntegrations.shopId, parseInt(shopId)),
            eq(shopIntegrations.provider, provider)
          )
        )
        .limit(1);

      const tokenData = {
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token || null,
        tokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        externalAccountId: userInfo.data.email || null,
        isActive: true,
      };

      if (existing.length > 0) {
        await db
          .update(shopIntegrations)
          .set(tokenData)
          .where(eq(shopIntegrations.id, existing[0].id));
      } else {
        await db.insert(shopIntegrations).values({
          shopId: parseInt(shopId),
          provider,
          ...tokenData,
        });
      }
    }

    res.redirect(`${origin}/shops/${shopId}/integrations?google=connected`);
  } catch (error) {
    console.error("[GOOGLE-AUTH] OAuth callback error:", error);
    res.status(500).send("Failed to complete Google authentication");
  }
});

/**
 * Get an authenticated Google OAuth2 client for a shop's integration.
 * Automatically refreshes expired tokens.
 */
export async function getGoogleClient(
  shopId: number,
  provider: "google_calendar" | "google_sheets"
) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(shopIntegrations)
    .where(
      and(
        eq(shopIntegrations.shopId, shopId),
        eq(shopIntegrations.provider, provider),
        eq(shopIntegrations.isActive, true)
      )
    )
    .limit(1);

  if (results.length === 0) return null;

  const integration = results[0];
  if (!integration.accessToken) return null;

  const oauth2Client = getOAuth2Client("");
  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
    expiry_date: integration.tokenExpiresAt?.getTime(),
  });

  // Auto-refresh if expired
  if (integration.tokenExpiresAt && integration.tokenExpiresAt < new Date()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await db
        .update(shopIntegrations)
        .set({
          accessToken: credentials.access_token || integration.accessToken,
          tokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
        })
        .where(eq(shopIntegrations.id, integration.id));
      oauth2Client.setCredentials(credentials);
    } catch (err) {
      console.error("[GOOGLE-AUTH] Token refresh failed:", err);
      return null;
    }
  }

  return oauth2Client;
}
