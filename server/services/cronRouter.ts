/**
 * Cron endpoints.
 *
 * Invoked by Vercel Cron (see vercel.json "crons"). Vercel automatically
 * attaches `Authorization: Bearer $CRON_SECRET` on every scheduled invocation;
 * we reject anything without the right secret so the endpoint can't be
 * triggered by the public internet.
 */
import { Router } from "express";
import { runTrialReminders } from "./trialReminders";

export const cronRouter = Router();

function isAuthorized(headerValue: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (!headerValue) return false;
  const expected = `Bearer ${secret}`;
  return headerValue === expected;
}

cronRouter.get("/trial-check", async (req, res) => {
  if (!isAuthorized(req.headers.authorization)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const result = await runTrialReminders();
    res.json({ ok: true, result });
  } catch (err) {
    console.error("[Cron] trial-check failed:", err);
    res.status(500).json({ ok: false, error: "internal" });
  }
});
