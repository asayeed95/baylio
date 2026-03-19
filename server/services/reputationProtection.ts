/**
 * Reputation Protection Service
 * 
 * For angry callers: acknowledge frustration, capture context,
 * escalate fast, never argue, never improvise compensation or
 * policy promises. One bad call posted online can destroy trust.
 * 
 * This service provides:
 * 1. Anger detection (keyword + pattern matching, NOT AI judgment)
 * 2. De-escalation prompt instructions (strict script)
 * 3. Fast escalation to human handoff
 * 4. Incident logging for post-call review
 * 5. Forbidden phrases the AI must never say
 * 
 * The key principle: The AI's job with an angry caller is to
 * LISTEN, ACKNOWLEDGE, CAPTURE, and ESCALATE. Not to solve.
 */

import type { CallPriority, EscalationReason } from "./callStateMachine";

// ─── Types ─────────────────────────────────────────────────────────

export type AngerLevel = "none" | "frustrated" | "angry" | "hostile";

export interface AngerAssessment {
  level: AngerLevel;
  triggers: string[];
  priority: CallPriority;
  shouldEscalate: boolean;
  escalationReason?: EscalationReason;
}

export interface IncidentReport {
  callerPhone: string;
  callerName?: string;
  angerLevel: AngerLevel;
  triggers: string[];
  context: string;
  shopId: number;
  shopName: string;
  timestamp: number;
  aiResponseSummary?: string;
}

// ─── Anger Detection (Rules Engine) ────────────────────────────────

/**
 * Patterns that indicate caller frustration/anger.
 * Organized by severity level.
 * 
 * IMPORTANT: This is a RULES ENGINE, not AI sentiment analysis.
 * It catches explicit signals. The AI prompt handles tone detection.
 */

const HOSTILE_PATTERNS = [
  // Legal threats
  /\b(lawsuit|sue you|lawyer|attorney|legal action|court)\b/i,
  /\b(report you|bbb|better business bureau|consumer protection)\b/i,
  /\b(yelp review|google review|blast you|social media)\b/i,
  // Profanity patterns (keeping it clean but catching intent)
  /\b(scam|fraud|rip ?off|steal|thie[fv]|crook|con artist)\b/i,
  /\b(incompetent|useless|pathetic|disgrace)\b/i,
];

const ANGRY_PATTERNS = [
  /\b(unacceptable|outrageous|ridiculous|insane|absurd)\b/i,
  /\b(worst (service|experience|shop)|terrible|horrible|awful)\b/i,
  /\b(never coming back|lost my business|done with you)\b/i,
  /\b(demand|insist|expect|require) (a |an )?(refund|compensation|discount)\b/i,
  /\b(how dare|what the|are you kidding|you people)\b/i,
  /\b(lied to me|deceived|mislead|dishonest)\b/i,
  /\b(damaged my|broke my|ruined my|scratched my)\b/i,
];

const FRUSTRATED_PATTERNS = [
  /\b(frustrated|annoyed|upset|disappointed|unhappy)\b/i,
  /\b(not happy|not satisfied|not acceptable|not okay)\b/i,
  /\b(waited (too long|forever|hours)|still waiting|been waiting)\b/i,
  /\b(called (before|already|multiple times|three times))\b/i,
  /\b(no one (called|responded|got back|answered))\b/i,
  /\b(this is the (second|third|fourth) time)\b/i,
  /\b(keep getting|keep having|keep telling)\b/i,
];

/**
 * Assess caller anger level from their input.
 * Returns severity level, matched triggers, and whether to escalate.
 */
export function assessAngerLevel(callerInput: string): AngerAssessment {
  const triggers: string[] = [];

  // Check hostile patterns first (highest severity)
  for (const pattern of HOSTILE_PATTERNS) {
    const match = callerInput.match(pattern);
    if (match) {
      triggers.push(match[0]);
    }
  }

  if (triggers.length > 0) {
    return {
      level: "hostile",
      triggers,
      priority: "urgent",
      shouldEscalate: true,
      escalationReason: "angry_caller",
    };
  }

  // Check angry patterns
  for (const pattern of ANGRY_PATTERNS) {
    const match = callerInput.match(pattern);
    if (match) {
      triggers.push(match[0]);
    }
  }

  if (triggers.length > 0) {
    return {
      level: "angry",
      triggers,
      priority: "urgent",
      shouldEscalate: true,
      escalationReason: "angry_caller",
    };
  }

  // Check frustrated patterns
  for (const pattern of FRUSTRATED_PATTERNS) {
    const match = callerInput.match(pattern);
    if (match) {
      triggers.push(match[0]);
    }
  }

  if (triggers.length > 0) {
    return {
      level: "frustrated",
      triggers,
      priority: "normal",
      shouldEscalate: triggers.length >= 2, // Escalate if multiple frustration signals
      escalationReason: triggers.length >= 2 ? "angry_caller" : undefined,
    };
  }

  return {
    level: "none",
    triggers: [],
    priority: "normal",
    shouldEscalate: false,
  };
}

// ─── De-escalation Prompt Instructions ─────────────────────────────

/**
 * Prompt instructions for handling angry/frustrated callers.
 * These are STRICT RULES — the AI follows this script exactly.
 */
export const REPUTATION_PROTECTION_PROMPT = `
## REPUTATION PROTECTION PROTOCOL (ACTIVE WHEN CALLER IS UPSET)

You are speaking with an upset or frustrated caller. Follow this EXACT protocol:

### STEP 1: ACKNOWLEDGE (First 10 seconds)
Use ONE of these EXACT phrases:
- "I completely understand your frustration, and I'm sorry you're dealing with this."
- "I hear you, and I want to make sure we get this resolved for you."
- "That's absolutely not the experience we want you to have. I'm here to help."

Do NOT:
- Minimize their feelings ("It's not that bad", "These things happen")
- Blame them ("Well, if you had...")
- Make excuses ("We've been really busy")
- Say "I understand" without specifics

### STEP 2: CAPTURE (Next 30 seconds)
Collect the facts WITHOUT defending:
- "Can you walk me through what happened?"
- "When did this occur?"
- "What was the original service you came in for?"

Listen actively. Do NOT interrupt. Do NOT correct them even if their account seems inaccurate.

### STEP 3: VALIDATE (5 seconds)
Repeat back what you heard:
- "So if I understand correctly, [their issue]. Is that right?"

### STEP 4: ESCALATE (Immediately)
- "I want to make sure the right person handles this for you personally. Let me connect you with our manager/owner."
- If no one is available: "I'm going to have our manager call you back within [timeframe]. This is a priority for us."

### FORBIDDEN PHRASES (NEVER SAY THESE — EVER):
❌ "That's not our policy"
❌ "There's nothing I can do"
❌ "You should have..."
❌ "That's not what happened"
❌ "I'm just an AI" or "I'm just a computer"
❌ "Calm down" or "Relax"
❌ "I'll give you a discount" or "I'll waive the fee" (NEVER offer compensation)
❌ "We'll fix it for free" (NEVER promise free work)
❌ "That won't happen again" (NEVER make guarantees)
❌ "Our technician says..." (NEVER blame or defend staff)
❌ Any specific dollar amount for refund/compensation
❌ Any promise about timeline for resolution

### WHAT YOU CAN SAY:
✅ "I want to make sure this gets resolved properly."
✅ "Your satisfaction is important to us."
✅ "Let me get the right person involved."
✅ "I'm documenting everything so nothing gets missed."
✅ "We take this seriously."

### IF CALLER DEMANDS COMPENSATION:
"I completely understand you want this made right. That's a decision our manager needs to make personally, and I want to make sure they have all the details. Let me get them involved right away."

### IF CALLER THREATENS ONLINE REVIEW:
Do NOT react to the threat. Do NOT beg them not to post.
"I understand your frustration. Let's focus on getting this resolved for you. I'm connecting you with our manager who can address this directly."

### IF CALLER IS USING PROFANITY:
Stay calm. Do NOT match their energy. Do NOT scold them.
"I can hear how frustrated you are, and I want to help. Let me get our manager on the line for you."
If profanity continues after 2 attempts: "I want to help you, and I think speaking with our manager directly would be the best next step."
`;

/**
 * Get the appropriate de-escalation prompt based on anger level.
 */
export function getDeescalationPrompt(level: AngerLevel): string {
  if (level === "none") return "";
  return REPUTATION_PROTECTION_PROMPT;
}

// ─── Incident Logging ──────────────────────────────────────────────

/**
 * Create an incident report for post-call review.
 * This is logged to the database for quality tracking.
 */
export function createIncidentReport(params: {
  callerPhone: string;
  callerName?: string;
  assessment: AngerAssessment;
  context: string;
  shopId: number;
  shopName: string;
}): IncidentReport {
  return {
    callerPhone: params.callerPhone,
    callerName: params.callerName,
    angerLevel: params.assessment.level,
    triggers: params.assessment.triggers,
    context: params.context,
    shopId: params.shopId,
    shopName: params.shopName,
    timestamp: Date.now(),
  };
}

/**
 * Determine if an incident needs owner notification.
 * Hostile and angry incidents always notify the owner.
 */
export function shouldNotifyOwner(report: IncidentReport): boolean {
  return report.angerLevel === "hostile" || report.angerLevel === "angry";
}

/**
 * Build owner notification message for an angry caller incident.
 */
export function buildIncidentNotification(report: IncidentReport): string {
  const levelEmoji = report.angerLevel === "hostile" ? "🚨" : "⚠️";

  let msg = `${levelEmoji} UPSET CALLER ALERT — ${report.shopName}\n\n`;
  msg += `Severity: ${report.angerLevel.toUpperCase()}\n`;
  if (report.callerName) msg += `Caller: ${report.callerName}\n`;
  msg += `Phone: ${report.callerPhone}\n`;
  msg += `Triggers: ${report.triggers.join(", ")}\n`;
  if (report.context) msg += `\nContext: ${report.context}\n`;
  msg += `\nTime: ${new Date(report.timestamp).toLocaleString()}\n`;
  msg += `\nRecommended: Call back within 1 hour to resolve.`;

  return msg;
}
