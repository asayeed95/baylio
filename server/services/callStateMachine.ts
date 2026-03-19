/**
 * Call State Machine — Fallback Ladder
 * 
 * A deterministic state machine that governs call handling flow.
 * Business logic is separated from AI conversation — the AI handles
 * natural language, but the STATE MACHINE controls routing, escalation,
 * and fallback behavior using RULES, not prompts.
 * 
 * States:
 * 1. NORMAL_FLOW       — AI handles the call naturally (default)
 * 2. STRUCTURED_Q      — AI follows structured question script (fallback 1)
 * 3. COLLECT_MESSAGE    — Collect name, number, message for callback (fallback 2)
 * 4. HUMAN_HANDOFF     — Transfer to live person or queue callback (fallback 3)
 * 5. SMS_INTAKE        — Send SMS intake link for self-service (fallback 4)
 * 
 * Transitions are triggered by:
 * - Business hours rules (deterministic, not AI)
 * - Escalation triggers (angry caller, emergency, explicit request)
 * - AI confidence signals (low confidence → structured questions)
 * - Timeout/failure conditions (ElevenLabs down → collect message)
 * 
 * The state machine is instantiated per-call and tracks state transitions
 * for post-call analysis and quality improvement.
 */

// ─── Types ─────────────────────────────────────────────────────────

export type CallState =
  | "normal_flow"
  | "structured_questions"
  | "collect_message"
  | "human_handoff"
  | "sms_intake";

export type CallPriority = "urgent" | "normal" | "low";

export type EscalationReason =
  | "caller_requested_human"
  | "angry_caller"
  | "emergency"
  | "ai_low_confidence"
  | "ai_failure"
  | "after_hours"
  | "complex_issue"
  | "repeat_caller"
  | "policy_question";

export interface CallStateTransition {
  from: CallState;
  to: CallState;
  reason: EscalationReason | string;
  timestamp: number;
}

export interface CallStateMachineContext {
  /** Current state */
  state: CallState;
  /** Priority level for callback/handoff */
  priority: CallPriority;
  /** Why escalation happened (if any) */
  escalationReason?: EscalationReason;
  /** Collected caller info */
  callerInfo: {
    name?: string;
    phone: string;
    vehicle?: string;
    issue?: string;
    preferredCallback?: string;
  };
  /** State transition history for this call */
  transitions: CallStateTransition[];
  /** Timestamp when the call started */
  callStartedAt: number;
  /** Whether the call is during business hours */
  isDuringBusinessHours: boolean;
  /** Shop's handoff phone number (for live transfer) */
  handoffPhone?: string;
  /** Whether human handoff is available */
  handoffAvailable: boolean;
}

// ─── Business Hours Engine (Rules, NOT AI) ─────────────────────────

export interface BusinessHoursConfig {
  [day: string]: { open: string; close: string; closed: boolean };
}

/**
 * Determine if the current time falls within business hours.
 * This is a HARD RULE — the AI cannot override this.
 * 
 * @param hours - Business hours configuration from shop settings
 * @param timezone - Shop timezone (e.g., "America/New_York")
 * @returns boolean - true if currently within business hours
 */
export function isWithinBusinessHours(
  hours: BusinessHoursConfig,
  timezone: string
): boolean {
  if (!hours || Object.keys(hours).length === 0) {
    // No hours configured = always open (default)
    return true;
  }

  try {
    const now = new Date();
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
    });
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const dayName = dayFormatter.format(now).toLowerCase();
    const currentTime = timeFormatter.format(now); // "HH:MM"

    const dayHours = hours[dayName];
    if (!dayHours || dayHours.closed) return false;

    // Compare times as strings (HH:MM format allows lexicographic comparison)
    return currentTime >= dayHours.open && currentTime < dayHours.close;
  } catch {
    // If timezone parsing fails, assume open (fail-open for business)
    return true;
  }
}

/**
 * Get the next opening time for after-hours messaging.
 */
export function getNextOpenTime(
  hours: BusinessHoursConfig,
  timezone: string
): string {
  if (!hours || Object.keys(hours).length === 0) return "tomorrow morning";

  const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  try {
    const now = new Date();
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
    });
    const currentDay = dayFormatter.format(now).toLowerCase();
    const currentDayIndex = dayOrder.indexOf(currentDay);

    // Check today first (might still open later today), then next 7 days
    for (let offset = 0; offset < 7; offset++) {
      const checkDayIndex = (currentDayIndex + offset) % 7;
      const checkDay = dayOrder[checkDayIndex];
      const dayHours = hours[checkDay];

      if (dayHours && !dayHours.closed) {
        if (offset === 0) return `today at ${dayHours.open}`;
        if (offset === 1) return `tomorrow at ${dayHours.open}`;
        return `${checkDay.charAt(0).toUpperCase() + checkDay.slice(1)} at ${dayHours.open}`;
      }
    }
  } catch {
    // Fallback
  }

  return "our next business day";
}

// ─── Escalation Rules Engine ───────────────────────────────────────

/**
 * Keywords and patterns that trigger escalation.
 * These are HARD RULES — the AI cannot suppress them.
 */
const EMERGENCY_KEYWORDS = [
  "emergency", "fire", "accident", "crash", "smoke",
  "brakes failed", "brake failure", "can't stop",
  "overheating", "on fire", "stranded", "stuck",
  "tow", "towing", "roadside",
];

const ANGRY_KEYWORDS = [
  "lawsuit", "lawyer", "attorney", "sue you",
  "better business bureau", "bbb", "report you",
  "worst", "terrible", "horrible", "disgusting",
  "scam", "rip off", "ripoff", "fraud",
  "never coming back", "lost my business",
];

const HUMAN_REQUEST_KEYWORDS = [
  "talk to a person", "talk to someone", "real person",
  "speak to a human", "speak to someone", "speak with someone",
  "talk to a human", "manager", "supervisor", "owner",
  "get me a person", "transfer me", "connect me",
];

/**
 * Analyze caller input for escalation triggers.
 * Returns the escalation reason if triggered, null otherwise.
 * 
 * This is a RULES ENGINE — deterministic, not AI-based.
 */
export function detectEscalationTrigger(
  callerInput: string
): { reason: EscalationReason; priority: CallPriority } | null {
  const input = callerInput.toLowerCase();

  // Priority 1: Emergency — immediate escalation
  for (const keyword of EMERGENCY_KEYWORDS) {
    if (input.includes(keyword)) {
      return { reason: "emergency", priority: "urgent" };
    }
  }

  // Priority 2: Angry caller — fast escalation
  for (const keyword of ANGRY_KEYWORDS) {
    if (input.includes(keyword)) {
      return { reason: "angry_caller", priority: "urgent" };
    }
  }

  // Priority 3: Explicit human request — respectful escalation
  for (const keyword of HUMAN_REQUEST_KEYWORDS) {
    if (input.includes(keyword)) {
      return { reason: "caller_requested_human", priority: "normal" };
    }
  }

  return null;
}

// ─── State Machine ─────────────────────────────────────────────────

/**
 * Create a new call state machine instance.
 * One instance per call — tracks the full lifecycle.
 */
export function createCallStateMachine(config: {
  callerPhone: string;
  businessHours: BusinessHoursConfig;
  timezone: string;
  handoffPhone?: string;
  isAfterHoursOnly?: boolean;
}): CallStateMachineContext {
  const isDuringBusinessHours = isWithinBusinessHours(
    config.businessHours,
    config.timezone
  );

  // Determine initial state based on business hours
  let initialState: CallState = "normal_flow";

  // If after-hours and no after-hours AI configured, go to collect_message
  if (!isDuringBusinessHours && config.isAfterHoursOnly) {
    // After-hours only plan: AI handles after-hours, during hours → human
    initialState = "normal_flow";
  } else if (!isDuringBusinessHours) {
    // Default: AI handles after-hours calls normally
    initialState = "normal_flow";
  }

  return {
    state: initialState,
    priority: "normal",
    callerInfo: {
      phone: config.callerPhone,
    },
    transitions: [],
    callStartedAt: Date.now(),
    isDuringBusinessHours,
    handoffPhone: config.handoffPhone,
    handoffAvailable: !!config.handoffPhone,
  };
}

/**
 * Transition the state machine to a new state.
 * Records the transition for post-call analysis.
 * 
 * Returns the new state context and any actions to take.
 */
export function transitionState(
  ctx: CallStateMachineContext,
  reason: EscalationReason | string,
  targetState?: CallState
): {
  context: CallStateMachineContext;
  action: CallStateAction;
} {
  const previousState = ctx.state;

  // Determine target state based on reason if not explicitly provided
  const newState = targetState || getTargetState(ctx, reason as EscalationReason);

  // Record the transition
  ctx.transitions.push({
    from: previousState,
    to: newState,
    reason,
    timestamp: Date.now(),
  });

  ctx.state = newState;

  // Set priority based on escalation reason
  if (reason === "emergency" || reason === "angry_caller") {
    ctx.priority = "urgent";
    ctx.escalationReason = reason as EscalationReason;
  } else if (reason === "caller_requested_human") {
    ctx.priority = "normal";
    ctx.escalationReason = reason as EscalationReason;
  }

  // Determine what action to take
  const action = getStateAction(ctx);

  return { context: ctx, action };
}

/**
 * Determine the target state based on escalation reason.
 * Implements the fallback ladder logic.
 */
function getTargetState(
  ctx: CallStateMachineContext,
  reason: EscalationReason
): CallState {
  switch (reason) {
    // Emergency → immediate human handoff
    case "emergency":
      return ctx.handoffAvailable ? "human_handoff" : "collect_message";

    // Angry caller → human handoff (or collect message if unavailable)
    case "angry_caller":
      return ctx.handoffAvailable ? "human_handoff" : "collect_message";

    // Caller explicitly asked for human
    case "caller_requested_human":
      return ctx.handoffAvailable ? "human_handoff" : "collect_message";

    // AI struggling → fall back to structured questions
    case "ai_low_confidence":
      return "structured_questions";

    // AI completely failed → collect message
    case "ai_failure":
      return "collect_message";

    // After hours → normal flow (AI handles) or collect message
    case "after_hours":
      return "normal_flow";

    // Complex issue → structured questions first
    case "complex_issue":
      return "structured_questions";

    // Repeat caller → escalate to human
    case "repeat_caller":
      return ctx.handoffAvailable ? "human_handoff" : "structured_questions";

    // Policy question → structured questions (don't let AI improvise)
    case "policy_question":
      return "structured_questions";

    default:
      return ctx.state; // Stay in current state
  }
}

// ─── State Actions ─────────────────────────────────────────────────

export type CallStateAction =
  | { type: "continue_ai"; instructions?: string }
  | { type: "structured_script"; questions: string[] }
  | { type: "collect_info"; fields: string[] }
  | { type: "transfer_call"; phone: string; priority: CallPriority; context: string }
  | { type: "send_sms_intake"; phone: string; intakeUrl: string }
  | { type: "alert_staff"; phone: string; priority: CallPriority; message: string };

/**
 * Get the action to take for the current state.
 */
function getStateAction(ctx: CallStateMachineContext): CallStateAction {
  switch (ctx.state) {
    case "normal_flow":
      return { type: "continue_ai" };

    case "structured_questions":
      return {
        type: "structured_script",
        questions: getStructuredQuestions(ctx),
      };

    case "collect_message":
      return {
        type: "collect_info",
        fields: ["name", "phone", "vehicle", "issue", "preferred_callback_time"],
      };

    case "human_handoff":
      if (ctx.handoffAvailable && ctx.handoffPhone) {
        return {
          type: "transfer_call",
          phone: ctx.handoffPhone,
          priority: ctx.priority,
          context: buildHandoffContext(ctx),
        };
      }
      // Fallback: alert staff via SMS
      return {
        type: "alert_staff",
        phone: ctx.callerInfo.phone,
        priority: ctx.priority,
        message: buildStaffAlert(ctx),
      };

    case "sms_intake":
      return {
        type: "send_sms_intake",
        phone: ctx.callerInfo.phone,
        intakeUrl: "", // Will be populated by the caller
      };

    default:
      return { type: "continue_ai" };
  }
}

/**
 * Get structured questions based on what information is still needed.
 * These are deterministic — the AI reads them, not improvises.
 */
function getStructuredQuestions(ctx: CallStateMachineContext): string[] {
  const questions: string[] = [];

  if (!ctx.callerInfo.name) {
    questions.push("Can I get your name please?");
  }
  if (!ctx.callerInfo.vehicle) {
    questions.push("What's the year, make, and model of your vehicle?");
  }
  if (!ctx.callerInfo.issue) {
    questions.push("Can you describe what's going on with your vehicle?");
  }
  questions.push("Would you like to schedule an appointment, or would you prefer a callback?");

  return questions;
}

/**
 * Build context summary for human handoff.
 * This is what the human agent sees before picking up.
 */
function buildHandoffContext(ctx: CallStateMachineContext): string {
  const parts: string[] = [];

  parts.push(`Priority: ${ctx.priority.toUpperCase()}`);

  if (ctx.escalationReason) {
    const reasonLabels: Record<EscalationReason, string> = {
      caller_requested_human: "Caller requested to speak with a person",
      angry_caller: "Caller is upset/frustrated — handle with care",
      emergency: "EMERGENCY — caller reports urgent vehicle issue",
      ai_low_confidence: "AI was unable to fully assist",
      ai_failure: "AI system error — caller needs help",
      after_hours: "After-hours call",
      complex_issue: "Complex issue requiring human expertise",
      repeat_caller: "Repeat caller — may need follow-up",
      policy_question: "Policy/warranty question requiring human judgment",
    };
    parts.push(`Reason: ${reasonLabels[ctx.escalationReason]}`);
  }

  if (ctx.callerInfo.name) parts.push(`Caller: ${ctx.callerInfo.name}`);
  parts.push(`Phone: ${ctx.callerInfo.phone}`);
  if (ctx.callerInfo.vehicle) parts.push(`Vehicle: ${ctx.callerInfo.vehicle}`);
  if (ctx.callerInfo.issue) parts.push(`Issue: ${ctx.callerInfo.issue}`);

  return parts.join(" | ");
}

/**
 * Build SMS alert message for staff when handoff isn't available.
 */
function buildStaffAlert(ctx: CallStateMachineContext): string {
  const priorityEmoji = ctx.priority === "urgent" ? "🚨" : ctx.priority === "normal" ? "📞" : "📋";

  let msg = `${priorityEmoji} CALLBACK NEEDED\n`;
  msg += `Priority: ${ctx.priority.toUpperCase()}\n`;

  if (ctx.escalationReason === "angry_caller") {
    msg += `⚠️ Caller is upset — handle with care\n`;
  } else if (ctx.escalationReason === "emergency") {
    msg += `🚨 EMERGENCY — immediate attention needed\n`;
  }

  if (ctx.callerInfo.name) msg += `Name: ${ctx.callerInfo.name}\n`;
  msg += `Phone: ${ctx.callerInfo.phone}\n`;
  if (ctx.callerInfo.vehicle) msg += `Vehicle: ${ctx.callerInfo.vehicle}\n`;
  if (ctx.callerInfo.issue) msg += `Issue: ${ctx.callerInfo.issue}\n`;
  if (ctx.callerInfo.preferredCallback) msg += `Callback: ${ctx.callerInfo.preferredCallback}\n`;

  return msg;
}

// ─── Prompt Injection for State Machine ────────────────────────────

/**
 * Generate prompt instructions based on current state machine state.
 * These instructions are INJECTED into the AI prompt to guide behavior
 * based on the state machine's deterministic decisions.
 * 
 * The AI follows these instructions — it doesn't make the routing decisions.
 */
export function getStatePromptInstructions(ctx: CallStateMachineContext): string {
  switch (ctx.state) {
    case "normal_flow":
      return ""; // No special instructions — normal AI behavior

    case "structured_questions":
      return `
## STRUCTURED QUESTION MODE (ACTIVE)
You are now in structured question mode. Follow these questions IN ORDER:
${getStructuredQuestions(ctx).map((q, i) => `${i + 1}. ${q}`).join("\n")}

Do NOT deviate from these questions. Do NOT improvise additional questions.
After collecting all answers, offer to schedule an appointment or arrange a callback.`;

    case "collect_message":
      return `
## MESSAGE COLLECTION MODE (ACTIVE)
The caller needs to leave a message. Collect the following information:
1. Their name
2. Confirm their phone number
3. Brief description of what they need
4. When they'd like a callback

Be warm and efficient. Say: "I want to make sure the right person gets back to you quickly. Can I get your name?"
After collecting all info, confirm: "I've got all your details. Someone from our team will call you back [timeframe]. Is there anything else?"`;

    case "human_handoff":
      if (ctx.handoffAvailable) {
        return `
## HUMAN TRANSFER MODE (ACTIVE)
Transfer the caller to a live team member. Say something like:
"Let me connect you with one of our team members who can help you with this directly."
Do NOT apologize excessively. Frame it as: "I want to make sure you get the best help possible."
This is a PRODUCT FEATURE, not a failure.`;
      }
      return `
## CALLBACK ARRANGEMENT MODE (ACTIVE)
A team member is not available right now. Collect callback information:
"I want to make sure the right person reaches out to you. Let me get your details so we can call you back."
Collect: name, phone, issue description, preferred callback time.
Priority: ${ctx.priority.toUpperCase()}`;

    case "sms_intake":
      return `
## SMS INTAKE MODE (ACTIVE)
Offer to send the caller a link to submit their request:
"I can text you a quick link where you can fill in your details and we'll get right on it. Would that work?"
If they agree, confirm their phone number and let them know the text is on its way.`;

    default:
      return "";
  }
}

/**
 * Get the full state summary for post-call logging.
 */
export function getCallStateSummary(ctx: CallStateMachineContext): {
  finalState: CallState;
  priority: CallPriority;
  escalationReason?: EscalationReason;
  transitionCount: number;
  transitions: CallStateTransition[];
  callerInfo: CallStateMachineContext["callerInfo"];
  callDurationMs: number;
  wasEscalated: boolean;
} {
  return {
    finalState: ctx.state,
    priority: ctx.priority,
    escalationReason: ctx.escalationReason,
    transitionCount: ctx.transitions.length,
    transitions: ctx.transitions,
    callerInfo: ctx.callerInfo,
    callDurationMs: Date.now() - ctx.callStartedAt,
    wasEscalated: ctx.state !== "normal_flow",
  };
}
