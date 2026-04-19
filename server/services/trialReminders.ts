/**
 * Trial reminder dispatcher.
 *
 * Called once per day by the Vercel cron at /api/cron/trial-check.
 * Scans shops whose trialEndsAt falls in the next 7 days (or has just passed)
 * and sends the appropriate Day-7 / Day-12 / Day-13 / Day-14 email,
 * using the trialDayXEmailSentAt columns for idempotency.
 *
 * Days are measured against trialEndsAt (the expiry), not trialStartedAt:
 *   - Day 7  email →  7 days before expiry
 *   - Day 12 email →  2 days before expiry
 *   - Day 13 email →  1 day before expiry
 *   - Day 14 email →  at or after expiry
 *
 * A single cron run sends at most one email per shop (the highest-priority
 * unsent milestone). If a shop signs up and the cron misses a day
 * (e.g. deploy outage), it'll pick up the next day at the correct stage.
 */
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { getDb } from "../db";
import { shops, users, subscriptions } from "../../drizzle/schema";
import {
  sendTrialDay7Email,
  sendTrialDay12Email,
  sendTrialDay13Email,
  sendTrialDay14Email,
} from "./emailService";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TrialReminderResult = {
  scanned: number;
  sent: {
    day7: number;
    day12: number;
    day13: number;
    day14: number;
  };
  skipped: number;
  errors: number;
};

export async function runTrialReminders(now: Date = new Date()): Promise<TrialReminderResult> {
  const result: TrialReminderResult = {
    scanned: 0,
    sent: { day7: 0, day12: 0, day13: 0, day14: 0 },
    skipped: 0,
    errors: 0,
  };

  const db = await getDb();
  if (!db) {
    console.error("[TrialReminders] DB unavailable — skipping run");
    return result;
  }

  // Horizon: anything expiring in the next 8 days OR already expired within the
  // last 3 days. Shops outside that window don't need a reminder email.
  const horizonEnd = new Date(now.getTime() + 8 * MS_PER_DAY);
  const lookbackStart = new Date(now.getTime() - 3 * MS_PER_DAY);

  const rows = await db
    .select({
      shopId: shops.id,
      shopName: shops.name,
      ownerId: shops.ownerId,
      trialEndsAt: shops.trialEndsAt,
      trialDay7EmailSentAt: shops.trialDay7EmailSentAt,
      trialDay12EmailSentAt: shops.trialDay12EmailSentAt,
      trialDay13EmailSentAt: shops.trialDay13EmailSentAt,
      trialDay14EmailSentAt: shops.trialDay14EmailSentAt,
      ownerEmail: users.email,
      ownerName: users.name,
    })
    .from(shops)
    .innerJoin(users, eq(users.id, shops.ownerId))
    .where(
      and(
        isNotNull(shops.trialEndsAt),
        lte(shops.trialEndsAt, horizonEnd)
      )
    );

  result.scanned = rows.length;

  for (const row of rows) {
    if (!row.trialEndsAt || !row.ownerEmail) {
      result.skipped++;
      continue;
    }

    // Skip shops that already have a paid subscription — they don't need
    // trial-expiry pressure emails.
    const paidSubRow = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.shopId, row.shopId),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    if (paidSubRow.length > 0) {
      result.skipped++;
      continue;
    }

    const msRemaining = row.trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / MS_PER_DAY);

    // Determine highest-priority milestone not yet sent.
    let milestone: 7 | 12 | 13 | 14 | null = null;

    if (row.trialEndsAt.getTime() <= now.getTime()) {
      if (
        !row.trialDay14EmailSentAt &&
        row.trialEndsAt.getTime() >= lookbackStart.getTime()
      ) {
        milestone = 14;
      }
    } else if (daysRemaining <= 1 && !row.trialDay13EmailSentAt) {
      milestone = 13;
    } else if (daysRemaining <= 2 && !row.trialDay12EmailSentAt) {
      milestone = 12;
    } else if (daysRemaining <= 7 && !row.trialDay7EmailSentAt) {
      milestone = 7;
    }

    if (milestone === null) {
      result.skipped++;
      continue;
    }

    const payload = {
      toEmail: row.ownerEmail,
      toName: row.ownerName,
      shopName: row.shopName,
      trialEndsAt: row.trialEndsAt,
    };

    try {
      let sent = false;
      switch (milestone) {
        case 7:
          sent = await sendTrialDay7Email(payload);
          break;
        case 12:
          sent = await sendTrialDay12Email(payload);
          break;
        case 13:
          sent = await sendTrialDay13Email(payload);
          break;
        case 14:
          sent = await sendTrialDay14Email(payload);
          break;
      }

      if (!sent) {
        result.errors++;
        continue;
      }

      const column =
        milestone === 7
          ? { trialDay7EmailSentAt: now }
          : milestone === 12
            ? { trialDay12EmailSentAt: now }
            : milestone === 13
              ? { trialDay13EmailSentAt: now }
              : { trialDay14EmailSentAt: now };

      await db.update(shops).set(column).where(eq(shops.id, row.shopId));

      result.sent[`day${milestone}` as keyof TrialReminderResult["sent"]]++;
    } catch (err) {
      console.error(
        `[TrialReminders] Failed for shop ${row.shopId} milestone day${milestone}:`,
        err
      );
      result.errors++;
    }
  }

  console.log("[TrialReminders] Run complete:", result);
  return result;
}
