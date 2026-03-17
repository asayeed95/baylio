/**
 * Missed Call Audit Service
 * 
 * Implements the automated 7-day missed call audit workflow:
 * 
 * 1. Forwarding Wizard: Provision a Twilio capture number, set up
 *    call forwarding from the shop's existing line
 * 2. 7-Day Tracking: Log every missed call with timestamp, day part,
 *    and urgency classification
 * 3. Scorecard Generation: Compile audit data into a structured
 *    scorecard with revenue estimates (ranges, not fake precision)
 * 4. Peak Call Analysis: Identify when missed calls cluster to show
 *    the shop owner their worst coverage gaps
 * 
 * Revenue estimation uses conservative ranges:
 * - Low estimate: missed calls × 25% conversion × $300 avg order
 * - High estimate: missed calls × 40% conversion × $600 avg order
 * - This prevents the "made up number" objection from shop owners
 */
import { getDb } from "../db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  missedCallAudits,
  auditCallEntries,
  shops,
} from "../../drizzle/schema";

export interface AuditScorecard {
  shopName: string;
  auditPeriod: { start: string; end: string };
  totalMissedCalls: number;
  peakCallAnalysis: {
    dayPart: string;
    count: number;
    percentage: number;
  }[];
  dailyBreakdown: {
    date: string;
    dayOfWeek: string;
    missedCount: number;
  }[];
  revenueEstimate: {
    low: number;
    high: number;
    midpoint: number;
  };
  urgencyBreakdown: {
    level: string;
    count: number;
  }[];
  topRecommendations: string[];
  competitorRisk: string;
}

/**
 * Generate a complete audit scorecard from the audit data.
 * 
 * Uses revenue RANGES (not fake precision) as recommended by
 * the market research to avoid the "made up number" objection.
 */
export async function generateScorecard(auditId: number): Promise<AuditScorecard | null> {
  const db = await getDb();
  if (!db) return null;

  // Fetch audit and shop info
  const auditResults = await db
    .select()
    .from(missedCallAudits)
    .where(eq(missedCallAudits.id, auditId))
    .limit(1);

  if (auditResults.length === 0) return null;
  const audit = auditResults[0];

  if (!audit.shopId) return null;

  const shopResults = await db
    .select()
    .from(shops)
    .where(eq(shops.id, audit.shopId))
    .limit(1);

  const shop = shopResults[0];

  // Fetch all call entries for this audit
  const entries = await db
    .select()
    .from(auditCallEntries)
    .where(eq(auditCallEntries.auditId, auditId));

  // Peak call analysis by day part
  const dayPartCounts: Record<string, number> = {};
  const urgencyCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};

  for (const entry of entries) {
    const dp = entry.dayPart || "unknown";
    dayPartCounts[dp] = (dayPartCounts[dp] || 0) + 1;

    const urgency = entry.urgencyLevel || "medium";
    urgencyCounts[urgency] = (urgencyCounts[urgency] || 0) + 1;

    if (entry.callTimestamp) {
      const dateKey = new Date(entry.callTimestamp).toISOString().split("T")[0];
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    }
  }

  const totalMissed = entries.length;

  // Peak call analysis
  const peakCallAnalysis = Object.entries(dayPartCounts)
    .map(([dayPart, count]) => ({
      dayPart,
      count,
      percentage: totalMissed > 0 ? Math.round((count / totalMissed) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Daily breakdown
  const dailyBreakdown = Object.entries(dailyCounts)
    .map(([date, missedCount]) => ({
      date,
      dayOfWeek: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
      missedCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Revenue estimate (RANGES, not fake precision)
  const lowConversion = 0.25;
  const highConversion = 0.40;
  const lowARO = 300;
  const highARO = 600;

  const monthlyMissedEstimate = totalMissed * (30 / 7); // extrapolate to monthly
  const revenueEstimate = {
    low: Math.round(monthlyMissedEstimate * lowConversion * lowARO),
    high: Math.round(monthlyMissedEstimate * highConversion * highARO),
    midpoint: 0,
  };
  revenueEstimate.midpoint = Math.round((revenueEstimate.low + revenueEstimate.high) / 2);

  // Urgency breakdown
  const urgencyBreakdown = Object.entries(urgencyCounts)
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => b.count - a.count);

  // Generate recommendations based on data
  const topRecommendations: string[] = [];

  if (peakCallAnalysis.length > 0) {
    const peak = peakCallAnalysis[0];
    topRecommendations.push(
      `Your highest missed call volume is during ${peak.dayPart} hours (${peak.percentage}% of all missed calls). Consider adding coverage during this window.`
    );
  }

  if (totalMissed > 20) {
    topRecommendations.push(
      `At ${totalMissed} missed calls in 7 days, you're potentially losing ${revenueEstimate.low.toLocaleString()}-${revenueEstimate.high.toLocaleString()} per month. An AI receptionist would capture 90%+ of these calls.`
    );
  }

  const highUrgency = urgencyCounts["high"] || 0;
  if (highUrgency > 0) {
    topRecommendations.push(
      `${highUrgency} calls were classified as high-urgency (potential safety issues or breakdowns). These callers likely went to a competitor.`
    );
  }

  if (topRecommendations.length < 3) {
    topRecommendations.push(
      "85% of callers who reach voicemail won't call back. Every missed call is a customer your competitor answers."
    );
  }

  // Competitor risk assessment
  let competitorRisk: string;
  if (totalMissed > 30) {
    competitorRisk = "CRITICAL — At this volume, you're losing 4-5 customers per week to competitors who answer their phones.";
  } else if (totalMissed > 15) {
    competitorRisk = "HIGH — Multiple customers per week are likely going elsewhere after reaching your voicemail.";
  } else if (totalMissed > 5) {
    competitorRisk = "MODERATE — Some customers are being lost, especially during peak hours.";
  } else {
    competitorRisk = "LOW — Your call coverage is reasonable, but there's still room for improvement.";
  }

  return {
    shopName: shop?.name || "Your Shop",
    auditPeriod: {
      start: audit.startDate ? new Date(audit.startDate).toISOString().split("T")[0] : "",
      end: audit.endDate ? new Date(audit.endDate).toISOString().split("T")[0] : "",
    },
    totalMissedCalls: totalMissed,
    peakCallAnalysis,
    dailyBreakdown,
    revenueEstimate,
    urgencyBreakdown,
    topRecommendations,
    competitorRisk,
  };
}

/**
 * Complete an audit and generate the final scorecard.
 * Updates the audit status and stores the scorecard data.
 */
export async function completeAudit(auditId: number): Promise<AuditScorecard | null> {
  const db = await getDb();
  if (!db) return null;

  const scorecard = await generateScorecard(auditId);
  if (!scorecard) return null;

  // Update audit status — scorecardData must match the schema's $type
  await db
    .update(missedCallAudits)
    .set({
      status: "completed",
      endDate: new Date(),
      totalMissedCalls: scorecard.totalMissedCalls,
      estimatedLostRevenue: scorecard.revenueEstimate.midpoint.toFixed(2),
      scorecardData: {
        callsByDayPart: Object.fromEntries(
          scorecard.peakCallAnalysis.map(p => [p.dayPart, p.count])
        ),
        intentBreakdown: {}, // populated from audit call entries if available
        urgencyBreakdown: Object.fromEntries(
          scorecard.urgencyBreakdown.map(u => [u.level, u.count])
        ),
        estimatedRevenueRange: {
          low: scorecard.revenueEstimate.low,
          high: scorecard.revenueEstimate.high,
        },
      },
    })
    .where(eq(missedCallAudits.id, auditId));

  return scorecard;
}
