/**
 * Support Triage Service
 *
 * Takes an inbound support email, asks Claude to classify it into a
 * structured {category, priority, summary} shape so the admin queue at
 * /admin/requests can be filtered and sorted without a human reading
 * every incoming message first.
 */

import { invokeLLM } from "../_core/llm";
import type { SupportTicket } from "../../drizzle/schema";

export type TriageCategory =
  | "feature_request"
  | "bug_report"
  | "question"
  | "billing"
  | "language_request"
  | "integration_request"
  | "other";

export type TriagePriority = "low" | "medium" | "high" | "urgent";

export type TriageResult = {
  category: TriageCategory;
  priority: TriagePriority;
  summary: string;
};

const CATEGORIES: TriageCategory[] = [
  "feature_request",
  "bug_report",
  "question",
  "billing",
  "language_request",
  "integration_request",
  "other",
];

const PRIORITIES: TriagePriority[] = ["low", "medium", "high", "urgent"];

const SYSTEM_PROMPT = `You are the triage layer for Baylio, an AI phone receptionist for auto repair shops.
Incoming emails come to support@baylio.io from shop owners and prospects.
Classify each email into one category, one priority, and a one-line summary.

Categories:
- feature_request: asks for new functionality (e.g. "add QuickBooks", "add Russian language")
- bug_report: something broken or behaving wrong
- question: general help, onboarding, how-to
- billing: pricing, subscription, refund, payment
- language_request: specifically asking Baylio to support a new language
- integration_request: asking for a new integration (Shopmonkey, HubSpot, custom CRM, etc.)
- other: doesn't fit above

Priorities:
- urgent: production is broken for a paying customer right now
- high: paying customer blocked, or high-revenue prospect about to churn
- medium: important but not blocking
- low: nice-to-have, informational, thank-you notes, off-topic

The summary must be ONE sentence under 140 characters, in the imperative voice where possible.
Example good summary: "Add Russian language support for Brooklyn shop customers"
Example bad summary: "The user is asking about Russian language"

Return valid JSON only.`;

const OUTPUT_SCHEMA = {
  name: "support_triage",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["category", "priority", "summary"],
    properties: {
      category: { type: "string", enum: CATEGORIES },
      priority: { type: "string", enum: PRIORITIES },
      summary: { type: "string", maxLength: 200 },
    },
  },
};

export async function triageSupportTicket(ticket: Pick<SupportTicket, "subject" | "body" | "fromEmail">): Promise<TriageResult | null> {
  const userContent = [
    `From: ${ticket.fromEmail}`,
    `Subject: ${ticket.subject ?? "(no subject)"}`,
    "",
    "Body:",
    ticket.body.slice(0, 4000),
  ].join("\n");

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      outputSchema: OUTPUT_SCHEMA,
      maxTokens: 500,
    });

    const raw = result.choices[0]?.message?.content;
    const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map(p => (p.type === "text" ? p.text : "")).join("") : "";
    if (!text) return null;

    const parsed = JSON.parse(text) as TriageResult;
    if (!CATEGORIES.includes(parsed.category)) return null;
    if (!PRIORITIES.includes(parsed.priority)) return null;
    if (!parsed.summary || typeof parsed.summary !== "string") return null;

    return parsed;
  } catch (err) {
    console.error("[SUPPORT-TRIAGE] Failed:", err);
    return null;
  }
}
