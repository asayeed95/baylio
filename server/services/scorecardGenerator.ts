/**
 * Scorecard PDF Generator
 *
 * Generates a professional missed call audit scorecard that can be
 * presented to shop owners during door-to-door sales. The scorecard
 * is designed to be a "leave-behind" document that makes the case
 * for Baylio with hard data from their own phone lines.
 *
 * Output: HTML string that can be rendered as a PDF or displayed
 * in the browser. Uses inline styles for maximum compatibility.
 *
 * Revenue estimates use RANGES (not fake precision) to avoid the
 * "made up number" objection from shop owners.
 */

import type { AuditScorecard } from "./auditService";

/**
 * Generate an HTML scorecard document from audit data.
 * This HTML can be:
 * 1. Rendered in the browser as a preview
 * 2. Converted to PDF server-side
 * 3. Emailed to the prospect
 */
export function generateScorecardHTML(scorecard: AuditScorecard): string {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const peakRows = scorecard.peakCallAnalysis
    .map(
      p => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-transform: capitalize;">${p.dayPart}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.count}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.percentage}%</td>
    </tr>`
    )
    .join("");

  const dailyRows = scorecard.dailyBreakdown
    .map(
      d => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${d.dayOfWeek}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${d.date}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${d.missedCount}</td>
    </tr>`
    )
    .join("");

  const recommendationItems = scorecard.topRecommendations
    .map(r => `<li style="margin-bottom: 8px; line-height: 1.5;">${r}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Missed Call Audit Report - ${scorecard.shopName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #1a1a1a; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #059669;">
    <div>
      <h1 style="font-size: 28px; font-weight: 700; color: #059669; margin-bottom: 4px;">Baylio</h1>
      <p style="font-size: 12px; color: #6b7280;">AI-Powered Call Management</p>
    </div>
    <div style="text-align: right;">
      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">Missed Call Audit Report</h2>
      <p style="font-size: 12px; color: #6b7280;">${scorecard.auditPeriod.start} to ${scorecard.auditPeriod.end}</p>
    </div>
  </div>

  <!-- Shop Info -->
  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
    <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 4px;">${scorecard.shopName}</h3>
    <p style="font-size: 14px; color: #6b7280;">7-Day Call Analysis Report</p>
  </div>

  <!-- Key Metrics -->
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 32px;">
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; text-align: center;">
      <p style="font-size: 36px; font-weight: 700; color: #dc2626;">${scorecard.totalMissedCalls}</p>
      <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">Missed Calls (7 days)</p>
    </div>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; text-align: center;">
      <p style="font-size: 24px; font-weight: 700; color: #dc2626;">${formatCurrency(scorecard.revenueEstimate.low)} - ${formatCurrency(scorecard.revenueEstimate.high)}</p>
      <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">Est. Monthly Revenue at Risk</p>
    </div>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; text-align: center;">
      <p style="font-size: 16px; font-weight: 700; color: #dc2626;">${scorecard.competitorRisk.split("—")[0].trim()}</p>
      <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">Competitor Risk Level</p>
    </div>
  </div>

  <!-- Peak Call Analysis -->
  <div style="margin-bottom: 32px;">
    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">When You're Missing Calls</h3>
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280;">Time of Day</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280;">Missed Calls</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280;">% of Total</th>
        </tr>
      </thead>
      <tbody>
        ${peakRows}
      </tbody>
    </table>
  </div>

  <!-- Daily Breakdown -->
  <div style="margin-bottom: 32px;">
    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Daily Breakdown</h3>
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280;">Day</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280;">Date</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280;">Missed</th>
        </tr>
      </thead>
      <tbody>
        ${dailyRows}
      </tbody>
    </table>
  </div>

  <!-- Recommendations -->
  <div style="margin-bottom: 32px;">
    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Key Findings & Recommendations</h3>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px;">
      <ul style="padding-left: 20px; font-size: 14px; color: #1a1a1a;">
        ${recommendationItems}
      </ul>
    </div>
  </div>

  <!-- Competitor Risk -->
  <div style="margin-bottom: 32px;">
    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Competitor Risk Assessment</h3>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px;">
      <p style="font-size: 14px; line-height: 1.6;">${scorecard.competitorRisk}</p>
    </div>
  </div>

  <!-- CTA -->
  <div style="background: linear-gradient(135deg, #059669, #047857); border-radius: 12px; padding: 32px; text-align: center; color: white;">
    <h3 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Stop Losing Revenue to Missed Calls</h3>
    <p style="font-size: 14px; opacity: 0.9; margin-bottom: 16px;">
      Baylio's AI receptionist answers every call 24/7, books appointments, and captures revenue you're currently losing.
    </p>
    <p style="font-size: 18px; font-weight: 600;">Start your 14-day free trial at baylio.io</p>
  </div>

  <!-- Footer -->
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
    <p style="font-size: 11px; color: #9ca3af;">
      This report was generated by Baylio. Revenue estimates are based on industry averages 
      (25-40% call-to-appointment conversion, $300-$600 average repair order) and may vary.
      &copy; ${new Date().getFullYear()} Baylio. All rights reserved.
    </p>
  </div>
</div>
</body>
</html>`;
}
