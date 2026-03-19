/**
 * Trust & Reliability — Phase 13 Tests
 * 
 * Tests for all 6 features:
 * 1. Fallback Ladder (state machine)
 * 2. Appointment Verification (requested not confirmed)
 * 3. Knowledge Lock (structured data fields)
 * 4. Human Handoff (priority tagging, SMS alerts)
 * 5. Reputation Protection (anger detection, de-escalation)
 * 6. Pilot Pricing Tier ($149/mo)
 */

import { describe, it, expect } from "vitest";

// ─── Feature 1: Fallback Ladder State Machine ──────────────────────

import {
  createCallStateMachine,
  transitionState,
  detectEscalationTrigger,
  isWithinBusinessHours,
  getNextOpenTime,
  getStatePromptInstructions,
  getCallStateSummary,
  type CallStateMachineContext,
} from "./services/callStateMachine";

describe("Fallback Ladder — State Machine", () => {
  function makeSM(overrides?: Partial<Parameters<typeof createCallStateMachine>[0]>): CallStateMachineContext {
    return createCallStateMachine({
      callerPhone: "+15551234567",
      businessHours: {},
      timezone: "America/New_York",
      handoffPhone: "+15559876543",
      ...overrides,
    });
  }

  it("initializes in normal_flow state", () => {
    const ctx = makeSM();
    expect(ctx.state).toBe("normal_flow");
    expect(ctx.callerInfo.phone).toBe("+15551234567");
    expect(ctx.priority).toBe("normal");
  });

  it("transitions to structured_questions on AI low confidence", () => {
    const ctx = makeSM();
    const { context } = transitionState(ctx, "ai_low_confidence");
    expect(context.state).toBe("structured_questions");
  });

  it("transitions to collect_message on AI failure", () => {
    const ctx = makeSM();
    const { context } = transitionState(ctx, "ai_failure");
    expect(context.state).toBe("collect_message");
  });

  it("transitions to human_handoff on caller request (when handoff available)", () => {
    const ctx = makeSM({ handoffPhone: "+15559876543" });
    const { context } = transitionState(ctx, "caller_requested_human");
    expect(context.state).toBe("human_handoff");
    expect(context.priority).toBe("normal");
  });

  it("transitions to collect_message on caller request (when handoff NOT available)", () => {
    const ctx = makeSM({ handoffPhone: undefined });
    const { context } = transitionState(ctx, "caller_requested_human");
    expect(context.state).toBe("collect_message");
  });

  it("transitions to human_handoff on emergency", () => {
    const ctx = makeSM();
    const { context } = transitionState(ctx, "emergency");
    expect(context.state).toBe("human_handoff");
    expect(context.priority).toBe("urgent");
  });

  it("transitions to human_handoff on angry caller", () => {
    const ctx = makeSM();
    const { context } = transitionState(ctx, "angry_caller");
    expect(context.state).toBe("human_handoff");
    expect(context.priority).toBe("urgent");
    expect(context.escalationReason).toBe("angry_caller");
  });

  it("records transitions in history", () => {
    const ctx = makeSM();
    transitionState(ctx, "ai_low_confidence");
    transitionState(ctx, "ai_failure", "collect_message");
    expect(ctx.transitions.length).toBe(2);
    expect(ctx.transitions[0].from).toBe("normal_flow");
    expect(ctx.transitions[0].to).toBe("structured_questions");
    expect(ctx.transitions[1].from).toBe("structured_questions");
    expect(ctx.transitions[1].to).toBe("collect_message");
  });

  it("generates state prompt instructions for structured questions", () => {
    const ctx = makeSM();
    transitionState(ctx, "ai_low_confidence");
    const prompt = getStatePromptInstructions(ctx);
    expect(prompt).toContain("STRUCTURED QUESTION MODE");
    expect(prompt).toContain("Do NOT deviate");
  });

  it("generates state prompt instructions for collect message", () => {
    const ctx = makeSM();
    transitionState(ctx, "ai_failure");
    const prompt = getStatePromptInstructions(ctx);
    expect(prompt).toContain("MESSAGE COLLECTION MODE");
  });

  it("generates state prompt instructions for human handoff", () => {
    const ctx = makeSM();
    transitionState(ctx, "caller_requested_human");
    const prompt = getStatePromptInstructions(ctx);
    expect(prompt).toContain("HUMAN TRANSFER MODE");
    expect(prompt).toContain("PRODUCT FEATURE");
  });

  it("returns empty prompt for normal_flow", () => {
    const ctx = makeSM();
    const prompt = getStatePromptInstructions(ctx);
    expect(prompt).toBe("");
  });

  it("produces call summary", () => {
    const ctx = makeSM();
    transitionState(ctx, "angry_caller");
    const summary = getCallStateSummary(ctx);
    expect(summary.finalState).toBe("human_handoff");
    expect(summary.wasEscalated).toBe(true);
    expect(summary.priority).toBe("urgent");
    expect(summary.transitionCount).toBe(1);
  });
});

describe("Fallback Ladder — Escalation Detection", () => {
  it("detects emergency keywords", () => {
    const result = detectEscalationTrigger("My car is on fire, I need help");
    expect(result).not.toBeNull();
    expect(result!.reason).toBe("emergency");
    expect(result!.priority).toBe("urgent");
  });

  it("detects angry keywords", () => {
    const result = detectEscalationTrigger("This is a scam, I want to talk to your lawyer");
    expect(result).not.toBeNull();
    expect(result!.reason).toBe("angry_caller");
  });

  it("detects human request keywords", () => {
    const result = detectEscalationTrigger("Can I talk to a real person please?");
    expect(result).not.toBeNull();
    expect(result!.reason).toBe("caller_requested_human");
    expect(result!.priority).toBe("normal");
  });

  it("returns null for normal conversation", () => {
    const result = detectEscalationTrigger("I need an oil change for my Honda Civic");
    expect(result).toBeNull();
  });

  it("detects towing request as emergency", () => {
    const result = detectEscalationTrigger("I need a tow truck, my car broke down");
    expect(result).not.toBeNull();
    expect(result!.reason).toBe("emergency");
  });

  it("detects manager request as human request", () => {
    const result = detectEscalationTrigger("Let me speak to the manager");
    expect(result).not.toBeNull();
    expect(result!.reason).toBe("caller_requested_human");
  });
});

describe("Fallback Ladder — Business Hours", () => {
  it("returns true when no hours configured (always open)", () => {
    expect(isWithinBusinessHours({}, "America/New_York")).toBe(true);
  });

  it("returns next open time as 'tomorrow morning' when no hours", () => {
    expect(getNextOpenTime({}, "America/New_York")).toBe("tomorrow morning");
  });
});

// ─── Feature 2: Appointment Verification ───────────────────────────

import {
  buildShopNotificationSMS,
  buildCallerConfirmationSMS,
  buildCallerRescheduleSMS,
  APPOINTMENT_PROMPT_RULES,
  type AppointmentRequest,
} from "./services/appointmentVerification";

describe("Appointment Verification — Requested Not Confirmed", () => {
  const mockRequest: AppointmentRequest = {
    callerName: "John Smith",
    callerPhone: "+15551234567",
    vehicle: "2019 Honda Civic",
    serviceRequested: "Oil change and tire rotation",
    requestedDate: "Tuesday",
    requestedTime: "10am",
    needsTransportation: true,
    notes: "Prefers morning drop-off",
    shopId: 1,
    shopOwnerPhone: "+15559876543",
    shopName: "Mike's Auto Repair",
  };

  it("builds shop notification SMS with all details", () => {
    const sms = buildShopNotificationSMS(mockRequest);
    expect(sms).toContain("NEW APPOINTMENT REQUEST");
    expect(sms).toContain("John Smith");
    expect(sms).toContain("+15551234567");
    expect(sms).toContain("2019 Honda Civic");
    expect(sms).toContain("Oil change and tire rotation");
    expect(sms).toContain("Tuesday");
    expect(sms).toContain("10am");
    expect(sms).toContain("Needs ride/loaner");
    expect(sms).toContain("Reply YES to confirm or NO to deny");
  });

  it("builds caller confirmation SMS", () => {
    const sms = buildCallerConfirmationSMS(mockRequest);
    expect(sms).toContain("Appointment Confirmed");
    expect(sms).toContain("Mike's Auto Repair");
    expect(sms).toContain("Tuesday at 10am");
    expect(sms).toContain("2019 Honda Civic");
    expect(sms).toContain("Transportation arranged");
  });

  it("builds caller reschedule SMS with shop response", () => {
    const sms = buildCallerRescheduleSMS(mockRequest, "We're booked Tuesday, can you do Wednesday?");
    expect(sms).toContain("Scheduling Update");
    expect(sms).toContain("Tuesday at 10am");
    expect(sms).toContain("We're booked Tuesday");
    expect(sms).toContain("+15559876543");
  });

  it("builds reschedule SMS without shop response", () => {
    const sms = buildCallerRescheduleSMS(mockRequest);
    expect(sms).toContain("Scheduling Update");
    expect(sms).not.toContain("Note from shop");
  });

  it("omits transportation line when not needed", () => {
    const noTransport = { ...mockRequest, needsTransportation: false };
    const sms = buildShopNotificationSMS(noTransport);
    expect(sms).not.toContain("Needs ride/loaner");
  });

  it("prompt rules enforce 'requested' not 'confirmed' language", () => {
    expect(APPOINTMENT_PROMPT_RULES).toContain('NEVER say "confirmed"');
    expect(APPOINTMENT_PROMPT_RULES).toContain("submitted your appointment request");
    expect(APPOINTMENT_PROMPT_RULES).toContain("confirmation text shortly");
  });

  it("prompt rules forbid booking language", () => {
    // Check the actual wording in the prompt
    expect(APPOINTMENT_PROMPT_RULES).toContain("NEVER say");
    expect(APPOINTMENT_PROMPT_RULES).toContain("booked");
    expect(APPOINTMENT_PROMPT_RULES).toContain("scheduled for");
  });
});

// ─── Feature 3: Knowledge Lock ─────────────────────────────────────

import {
  compileKnowledgeLockPrompt,
  validateKnowledgeLock,
  mergeKnowledgeLock,
  DEFAULT_KNOWLEDGE_LOCK,
  type KnowledgeLockConfig,
} from "./services/knowledgeLock";

describe("Knowledge Lock — Structured Data Fields", () => {
  it("compiles default config into prompt with immutable header", () => {
    const prompt = compileKnowledgeLockPrompt(DEFAULT_KNOWLEDGE_LOCK);
    expect(prompt).toContain("KNOWLEDGE LOCK");
    expect(prompt).toContain("IMMUTABLE");
    expect(prompt).toContain("DO NOT OVERRIDE");
  });

  it("includes towing policy verbatim", () => {
    const config: KnowledgeLockConfig = {
      ...DEFAULT_KNOWLEDGE_LOCK,
      towingPolicy: "Free towing within 10 miles for all customers.",
    };
    const prompt = compileKnowledgeLockPrompt(config);
    expect(prompt).toContain("Free towing within 10 miles for all customers.");
    expect(prompt).toContain("TOWING POLICY");
  });

  it("includes diagnostic fee verbatim", () => {
    const config: KnowledgeLockConfig = {
      ...DEFAULT_KNOWLEDGE_LOCK,
      diagnosticFee: "$89 diagnostic fee, waived if you proceed with repair.",
    };
    const prompt = compileKnowledgeLockPrompt(config);
    expect(prompt).toContain("$89 diagnostic fee, waived if you proceed with repair.");
    expect(prompt).toContain("Do NOT waive this fee");
  });

  it("includes warranty policy with strict enforcement", () => {
    const config: KnowledgeLockConfig = {
      ...DEFAULT_KNOWLEDGE_LOCK,
      warrantyPolicy: "24-month / 24,000-mile warranty on all parts and labor.",
    };
    const prompt = compileKnowledgeLockPrompt(config);
    expect(prompt).toContain("24-month / 24,000-mile warranty");
    expect(prompt).toContain("Do NOT extend, modify, or improvise warranty terms");
  });

  it("includes accepted makes when configured", () => {
    const config: KnowledgeLockConfig = {
      ...DEFAULT_KNOWLEDGE_LOCK,
      acceptedMakes: ["Honda", "Toyota", "Nissan", "Subaru"],
    };
    const prompt = compileKnowledgeLockPrompt(config);
    expect(prompt).toContain("ACCEPTED VEHICLES");
    expect(prompt).toContain("Honda, Toyota, Nissan, Subaru");
  });

  it("includes rejected makes when configured", () => {
    const config: KnowledgeLockConfig = {
      ...DEFAULT_KNOWLEDGE_LOCK,
      rejectedMakes: ["Tesla", "Rivian"],
    };
    const prompt = compileKnowledgeLockPrompt(config);
    expect(prompt).toContain("VEHICLES WE DO NOT SERVICE");
    expect(prompt).toContain("Tesla, Rivian");
  });

  it("shows loaner vehicles as NOT available by default", () => {
    const prompt = compileKnowledgeLockPrompt(DEFAULT_KNOWLEDGE_LOCK);
    expect(prompt).toContain("Loaner vehicles are NOT available");
  });

  it("shows loaner vehicles as available when configured", () => {
    const config: KnowledgeLockConfig = {
      ...DEFAULT_KNOWLEDGE_LOCK,
      loanerVehicles: true,
    };
    const prompt = compileKnowledgeLockPrompt(config);
    expect(prompt).toContain("Loaner vehicles are available");
  });

  it("includes custom policies", () => {
    const config: KnowledgeLockConfig = {
      ...DEFAULT_KNOWLEDGE_LOCK,
      customPolicies: {
        "Pets in waiting area": "Small pets on leash are welcome in our waiting area.",
      },
    };
    const prompt = compileKnowledgeLockPrompt(config);
    expect(prompt).toContain("Pets in waiting area");
    expect(prompt).toContain("Small pets on leash are welcome");
  });

  it("validates empty diagnostic fee", () => {
    const result = validateKnowledgeLock({ diagnosticFee: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validates empty warranty policy", () => {
    const result = validateKnowledgeLock({ warrantyPolicy: "  " });
    expect(result.valid).toBe(false);
  });

  it("validates empty languages array", () => {
    const result = validateKnowledgeLock({ languagesSupported: [] });
    expect(result.valid).toBe(false);
  });

  it("passes validation for valid config", () => {
    const result = validateKnowledgeLock({
      diagnosticFee: "$50",
      warrantyPolicy: "1 year",
      languagesSupported: ["English"],
      paymentMethods: ["Cash"],
    });
    expect(result.valid).toBe(true);
  });

  it("merges partial updates correctly", () => {
    const merged = mergeKnowledgeLock(DEFAULT_KNOWLEDGE_LOCK, {
      diagnosticFee: "$99",
      loanerVehicles: true,
    });
    expect(merged.diagnosticFee).toBe("$99");
    expect(merged.loanerVehicles).toBe(true);
    expect(merged.towingPolicy).toBe(DEFAULT_KNOWLEDGE_LOCK.towingPolicy);
    expect(merged.warrantyPolicy).toBe(DEFAULT_KNOWLEDGE_LOCK.warrantyPolicy);
  });
});

// ─── Feature 4: Human Handoff ──────────────────────────────────────

import {
  buildStaffAlertSMS,
  generateTransferTwiML,
  HANDOFF_PROMPT_RULES,
  type CallbackRequest,
} from "./services/humanHandoff";

describe("Human Handoff — Priority Tagging & SMS Alerts", () => {
  const mockCallback: CallbackRequest = {
    callerPhone: "+15551234567",
    callerName: "Jane Doe",
    priority: "urgent",
    reason: "angry_caller",
    context: {
      callerName: "Jane Doe",
      vehicle: "2020 BMW X5",
      issue: "Engine light on after recent service",
      conversationSummary: "Caller upset about engine light returning after oil change",
    },
    shopId: 1,
    shopName: "Mike's Auto Repair",
    staffPhones: ["+15559876543"],
    fromNumber: "+18001234567",
  };

  it("builds urgent staff alert SMS with correct emoji", () => {
    const sms = buildStaffAlertSMS(mockCallback);
    expect(sms).toContain("🚨");
    expect(sms).toContain("URGENT");
    expect(sms).toContain("Jane Doe");
    expect(sms).toContain("+15551234567");
    expect(sms).toContain("2020 BMW X5");
    expect(sms).toContain("Engine light on after recent service");
  });

  it("builds normal priority alert SMS", () => {
    const normalCallback = { ...mockCallback, priority: "normal" as const, reason: "caller_requested_human" as const };
    const sms = buildStaffAlertSMS(normalCallback);
    expect(sms).toContain("📞");
    expect(sms).toContain("NORMAL");
    expect(sms).toContain("Caller asked to speak with a person");
  });

  it("builds low priority alert SMS", () => {
    const lowCallback = { ...mockCallback, priority: "low" as const, reason: "complex_issue" as const };
    const sms = buildStaffAlertSMS(lowCallback);
    expect(sms).toContain("📋");
    expect(sms).toContain("LOW");
  });

  it("includes AI conversation summary in alert", () => {
    const sms = buildStaffAlertSMS(mockCallback);
    expect(sms).toContain("AI Notes:");
    expect(sms).toContain("Caller upset about engine light");
  });

  it("generates valid TwiML for call transfer", () => {
    const twiml = generateTransferTwiML("+15559876543", "Caller: Jane, Vehicle: BMW X5");
    expect(twiml).toContain("<?xml");
    expect(twiml).toContain("<Response>");
    expect(twiml).toContain("<Dial");
    expect(twiml).toContain("<Number>");
    expect(twiml).toContain("+15559876543");
    expect(twiml).toContain("<Record");
  });

  it("TwiML includes fallback voicemail when transfer fails", () => {
    const twiml = generateTransferTwiML("+15559876543", "context");
    expect(twiml).toContain("currently unavailable");
    expect(twiml).toContain("<Record");
  });

  it("prompt rules frame handoff as a feature", () => {
    expect(HANDOFF_PROMPT_RULES).toContain("FEATURE, NOT A FAILURE");
    expect(HANDOFF_PROMPT_RULES).toContain("best help possible");
  });

  it("prompt rules forbid apologetic language", () => {
    // The prompt contains "I can't help" inside a NEVER say instruction
    expect(HANDOFF_PROMPT_RULES).toContain("NEVER say");
    expect(HANDOFF_PROMPT_RULES).toContain("I'm just an AI");
  });
});

// ─── Feature 5: Reputation Protection ──────────────────────────────

import {
  assessAngerLevel,
  REPUTATION_PROTECTION_PROMPT,
  createIncidentReport,
  shouldNotifyOwner,
  buildIncidentNotification,
} from "./services/reputationProtection";

describe("Reputation Protection — Anger Detection", () => {
  it("detects no anger in normal conversation", () => {
    const result = assessAngerLevel("I'd like to schedule an oil change for my Honda Civic");
    expect(result.level).toBe("none");
    expect(result.shouldEscalate).toBe(false);
  });

  it("detects frustrated caller", () => {
    const result = assessAngerLevel("I'm really frustrated, I've been waiting for 3 hours");
    expect(result.level).toBe("frustrated");
    expect(result.triggers.length).toBeGreaterThan(0);
  });

  it("detects angry caller with strong language", () => {
    const result = assessAngerLevel("This is the worst service I've ever experienced, absolutely unacceptable");
    expect(result.level).toBe("angry");
    expect(result.shouldEscalate).toBe(true);
    expect(result.priority).toBe("urgent");
  });

  it("detects hostile caller with legal threats", () => {
    const result = assessAngerLevel("I'm going to sue you and leave a Yelp review about this scam");
    expect(result.level).toBe("hostile");
    expect(result.shouldEscalate).toBe(true);
    expect(result.priority).toBe("urgent");
    expect(result.escalationReason).toBe("angry_caller");
  });

  it("detects BBB threat as hostile", () => {
    const result = assessAngerLevel("I'm reporting you to the Better Business Bureau");
    expect(result.level).toBe("hostile");
  });

  it("detects repeat caller frustration", () => {
    const result = assessAngerLevel("This is the third time I've called about this issue");
    expect(result.level).toBe("frustrated");
  });

  it("detects demand for refund as angry", () => {
    const result = assessAngerLevel("I demand a refund for this terrible work");
    expect(result.level).toBe("angry");
  });

  it("detects vehicle damage claim as angry", () => {
    const result = assessAngerLevel("You scratched my car during the service");
    expect(result.level).toBe("angry");
  });

  it("detects fraud accusation as hostile", () => {
    const result = assessAngerLevel("This is a complete rip off, you're a con artist");
    expect(result.level).toBe("hostile");
  });

  it("single frustrated trigger does not escalate", () => {
    const result = assessAngerLevel("I'm a bit disappointed with the wait time");
    expect(result.level).toBe("frustrated");
    expect(result.shouldEscalate).toBe(false);
  });

  it("multiple frustrated triggers DO escalate", () => {
    const result = assessAngerLevel("I'm frustrated and not happy, I called before and no one responded");
    expect(result.level).toBe("frustrated");
    expect(result.shouldEscalate).toBe(true);
  });
});

describe("Reputation Protection — De-escalation Prompt", () => {
  it("includes acknowledge step", () => {
    expect(REPUTATION_PROTECTION_PROMPT).toContain("STEP 1: ACKNOWLEDGE");
    expect(REPUTATION_PROTECTION_PROMPT).toContain("I completely understand your frustration");
  });

  it("includes capture step", () => {
    expect(REPUTATION_PROTECTION_PROMPT).toContain("STEP 2: CAPTURE");
    expect(REPUTATION_PROTECTION_PROMPT).toContain("walk me through what happened");
  });

  it("includes validate step", () => {
    expect(REPUTATION_PROTECTION_PROMPT).toContain("STEP 3: VALIDATE");
  });

  it("includes escalate step", () => {
    expect(REPUTATION_PROTECTION_PROMPT).toContain("STEP 4: ESCALATE");
  });

  it("forbids compensation promises", () => {
    expect(REPUTATION_PROTECTION_PROMPT).toContain("NEVER offer compensation");
    expect(REPUTATION_PROTECTION_PROMPT).toContain("NEVER promise free work");
  });

  it("forbids telling caller to calm down", () => {
    expect(REPUTATION_PROTECTION_PROMPT).toContain("Calm down");
  });

  it("handles compensation demands correctly", () => {
    expect(REPUTATION_PROTECTION_PROMPT).toContain("decision our manager needs to make personally");
  });

  it("handles online review threats correctly", () => {
    expect(REPUTATION_PROTECTION_PROMPT).toContain("Do NOT react to the threat");
    expect(REPUTATION_PROTECTION_PROMPT).toContain("Do NOT beg them not to post");
  });
});

describe("Reputation Protection — Incident Reports", () => {
  it("creates incident report with all fields", () => {
    const assessment = assessAngerLevel("I'm going to sue you for this fraud");
    const report = createIncidentReport({
      callerPhone: "+15551234567",
      callerName: "Angry Customer",
      assessment,
      context: "Called about brake repair, claims car was damaged",
      shopId: 1,
      shopName: "Mike's Auto",
    });
    expect(report.angerLevel).toBe("hostile");
    expect(report.callerPhone).toBe("+15551234567");
    expect(report.triggers.length).toBeGreaterThan(0);
    expect(report.timestamp).toBeGreaterThan(0);
  });

  it("hostile incidents notify owner", () => {
    const report = createIncidentReport({
      callerPhone: "+15551234567",
      assessment: { level: "hostile", triggers: ["sue"], priority: "urgent", shouldEscalate: true },
      context: "Legal threat",
      shopId: 1,
      shopName: "Test Shop",
    });
    expect(shouldNotifyOwner(report)).toBe(true);
  });

  it("angry incidents notify owner", () => {
    const report = createIncidentReport({
      callerPhone: "+15551234567",
      assessment: { level: "angry", triggers: ["worst service"], priority: "urgent", shouldEscalate: true },
      context: "Complaint",
      shopId: 1,
      shopName: "Test Shop",
    });
    expect(shouldNotifyOwner(report)).toBe(true);
  });

  it("frustrated incidents do NOT notify owner", () => {
    const report = createIncidentReport({
      callerPhone: "+15551234567",
      assessment: { level: "frustrated", triggers: ["frustrated"], priority: "normal", shouldEscalate: false },
      context: "Minor complaint",
      shopId: 1,
      shopName: "Test Shop",
    });
    expect(shouldNotifyOwner(report)).toBe(false);
  });

  it("builds incident notification with correct severity emoji", () => {
    const report = createIncidentReport({
      callerPhone: "+15551234567",
      callerName: "John",
      assessment: { level: "hostile", triggers: ["lawsuit"], priority: "urgent", shouldEscalate: true },
      context: "Threatened legal action",
      shopId: 1,
      shopName: "Mike's Auto",
    });
    const notification = buildIncidentNotification(report);
    expect(notification).toContain("🚨");
    expect(notification).toContain("HOSTILE");
    expect(notification).toContain("John");
    expect(notification).toContain("lawsuit");
    expect(notification).toContain("Call back within 1 hour");
  });
});

// ─── Feature 6: Pilot Pricing Tier ────────────────────────────────

import {
  TIERS,
  getTierConfig,
  getOverageCharge,
  isAfterHoursOnly,
  getSetupFee,
} from "./stripe/products";

describe("Pilot Pricing Tier — $149/mo", () => {
  it("pilot tier exists with correct price", () => {
    const pilot = TIERS.pilot;
    expect(pilot).toBeDefined();
    expect(pilot.monthlyPrice).toBe(14900);
  });

  it("pilot tier has 150 included minutes", () => {
    expect(TIERS.pilot.includedMinutes).toBe(150);
  });

  it("pilot tier is after-hours only", () => {
    expect(TIERS.pilot.afterHoursOnly).toBe(true);
    expect(isAfterHoursOnly("pilot")).toBe(true);
  });

  it("pilot tier has 30-day trial", () => {
    expect(TIERS.pilot.trialDays).toBe(30);
  });

  it("pilot tier has no setup fee", () => {
    expect(TIERS.pilot.setupFeeWaived).toBe(true);
    expect(getSetupFee("pilot")).toBe(0);
  });

  it("pilot tier limited to 1 location and 1 line", () => {
    expect(TIERS.pilot.maxLocations).toBe(1);
    expect(TIERS.pilot.maxLines).toBe(1);
  });

  it("pilot tier has no annual billing", () => {
    expect(TIERS.pilot.annualAvailable).toBe(false);
    expect(TIERS.pilot.annualPrice).toBe(0);
  });

  it("starter tier is NOT after-hours only", () => {
    expect(isAfterHoursOnly("starter")).toBe(false);
  });

  it("getTierConfig returns correct config", () => {
    const config = getTierConfig("pilot");
    expect(config?.id).toBe("pilot");
    expect(config?.monthlyPrice).toBe(14900);
  });

  it("getTierConfig returns undefined for invalid tier", () => {
    expect(getTierConfig("nonexistent")).toBeUndefined();
  });

  it("overage charge calculates correctly", () => {
    expect(getOverageCharge(10, 0.15)).toBe(1.5);
    expect(getOverageCharge(100, 0.15)).toBe(15);
    expect(getOverageCharge(0, 0.15)).toBe(0);
  });

  it("setup fee is waived for pilot, charged for others", () => {
    expect(getSetupFee("pilot")).toBe(0);
    expect(getSetupFee("starter")).toBe(50000);
    expect(getSetupFee("pro", 3)).toBe(125000);
    expect(getSetupFee("elite", 5)).toBe(200000);
  });

  it("all four tiers exist", () => {
    expect(Object.keys(TIERS)).toEqual(["pilot", "starter", "pro", "elite"]);
  });

  it("tier prices are in ascending order", () => {
    expect(TIERS.pilot.monthlyPrice).toBeLessThan(TIERS.starter.monthlyPrice);
    expect(TIERS.starter.monthlyPrice).toBeLessThan(TIERS.pro.monthlyPrice);
    expect(TIERS.pro.monthlyPrice).toBeLessThan(TIERS.elite.monthlyPrice);
  });
});
