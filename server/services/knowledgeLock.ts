/**
 * Knowledge Lock — Structured Data Fields
 * 
 * Hard rules the AI CANNOT override or hallucinate.
 * These are structured data fields stored in agentConfig that define
 * the ground truth for each shop. The AI reads them but cannot
 * improvise, modify, or contradict them.
 * 
 * Fields:
 * - Services offered (with prices if configured)
 * - Makes and models accepted
 * - Business hours (already in ShopContext)
 * - Towing policy
 * - Diagnostic fees
 * - Warranty wording
 * - Financing policy
 * - Languages supported
 * 
 * The Knowledge Lock is compiled into prompt instructions that use
 * STRICT ENFORCEMENT blocks — the AI is told these are immutable facts.
 */

// ─── Types ─────────────────────────────────────────────────────────

export interface KnowledgeLockConfig {
  /** Makes and models the shop works on (empty = all makes) */
  acceptedMakes: string[];
  /** Makes the shop does NOT work on */
  rejectedMakes: string[];
  /** Towing policy — exact wording the AI must use */
  towingPolicy: string;
  /** Diagnostic/inspection fee — exact amount or "free" */
  diagnosticFee: string;
  /** Warranty wording — exact language, no improvisation */
  warrantyPolicy: string;
  /** Financing options — exact terms or "not available" */
  financingPolicy: string;
  /** Languages the shop supports */
  languagesSupported: string[];
  /** Payment methods accepted */
  paymentMethods: string[];
  /** Whether the shop offers loaner vehicles */
  loanerVehicles: boolean;
  /** Whether the shop offers shuttle/ride service */
  shuttleService: boolean;
  /** Maximum wait time for walk-ins (or "by appointment only") */
  walkInPolicy: string;
  /** Any certifications (ASE, AAA, dealer certified, etc.) */
  certifications: string[];
  /** Custom policies the shop wants enforced (key-value pairs) */
  customPolicies: Record<string, string>;
}

/**
 * Default knowledge lock config for new shops.
 * These are safe defaults that prevent the AI from making claims.
 */
export const DEFAULT_KNOWLEDGE_LOCK: KnowledgeLockConfig = {
  acceptedMakes: [], // Empty = all makes accepted
  rejectedMakes: [],
  towingPolicy: "Please call us to discuss towing options for your situation.",
  diagnosticFee: "Diagnostic fees vary by vehicle. Please call or visit for a quote.",
  warrantyPolicy: "Please ask our service team about warranty coverage for your specific repair.",
  financingPolicy: "Please ask our team about available payment options.",
  languagesSupported: ["English"],
  paymentMethods: ["Cash", "Credit Card", "Debit Card"],
  loanerVehicles: false,
  shuttleService: false,
  walkInPolicy: "We recommend scheduling an appointment for the best service.",
  certifications: [],
  customPolicies: {},
};

// ─── Prompt Compilation ────────────────────────────────────────────

/**
 * Compile Knowledge Lock config into strict prompt instructions.
 * These instructions use HARD ENFORCEMENT language that the AI
 * cannot override, improvise, or contradict.
 */
export function compileKnowledgeLockPrompt(config: KnowledgeLockConfig): string {
  const sections: string[] = [];

  sections.push(`## KNOWLEDGE LOCK (IMMUTABLE — DO NOT OVERRIDE, IMPROVISE, OR CONTRADICT)

The following information is GROUND TRUTH for this shop. You MUST use this exact information when answering questions. You CANNOT make up, modify, or improvise any of these facts. If a caller asks about something not covered here, say: "Let me have our team get back to you with the exact details on that."`);

  // Makes & Models
  if (config.acceptedMakes.length > 0) {
    sections.push(`### ACCEPTED VEHICLES
This shop works on: ${config.acceptedMakes.join(", ")}.
If a caller has a vehicle NOT on this list, say: "We specialize in ${config.acceptedMakes.slice(0, 3).join(", ")}${config.acceptedMakes.length > 3 ? " and more" : ""}. Let me check with our team if we can help with your [vehicle make]."`);
  }

  if (config.rejectedMakes.length > 0) {
    sections.push(`### VEHICLES WE DO NOT SERVICE
This shop does NOT work on: ${config.rejectedMakes.join(", ")}.
If a caller has one of these vehicles, say: "Unfortunately, we don't service ${config.rejectedMakes.join(" or ")} vehicles at this location. I'd recommend checking with a specialized dealer or shop for that make."`);
  }

  // Towing Policy
  sections.push(`### TOWING POLICY
EXACT wording to use: "${config.towingPolicy}"
Do NOT promise free towing unless this policy explicitly says "free."
Do NOT quote towing prices unless they are stated above.`);

  // Diagnostic Fee
  sections.push(`### DIAGNOSTIC / INSPECTION FEE
EXACT wording to use: "${config.diagnosticFee}"
Do NOT waive this fee. Do NOT say "free diagnostic" unless stated above.
Do NOT quote a different amount than what is stated above.`);

  // Warranty
  sections.push(`### WARRANTY POLICY
EXACT wording to use: "${config.warrantyPolicy}"
Do NOT extend, modify, or improvise warranty terms.
Do NOT promise warranty coverage on any specific repair unless stated above.`);

  // Financing
  sections.push(`### FINANCING / PAYMENT OPTIONS
EXACT wording to use: "${config.financingPolicy}"
Accepted payment methods: ${config.paymentMethods.join(", ")}.
Do NOT offer payment plans or financing unless stated above.
Do NOT accept payment methods not listed above.`);

  // Languages
  if (config.languagesSupported.length > 0) {
    sections.push(`### LANGUAGES SUPPORTED
This shop supports: ${config.languagesSupported.join(", ")}.
If a caller needs a language not listed, say: "Let me see if we have someone who can help in [language]. Can I take your information and have someone call you back?"`);
  }

  // Transportation
  const transportLines: string[] = [];
  if (config.loanerVehicles) {
    transportLines.push("✅ Loaner vehicles are available (subject to availability).");
  } else {
    transportLines.push("❌ Loaner vehicles are NOT available. Do NOT offer them.");
  }
  if (config.shuttleService) {
    transportLines.push("✅ Shuttle/ride service is available.");
  } else {
    transportLines.push("❌ Shuttle/ride service is NOT available. Do NOT offer it.");
  }
  sections.push(`### TRANSPORTATION
${transportLines.join("\n")}`);

  // Walk-in Policy
  sections.push(`### WALK-IN POLICY
"${config.walkInPolicy}"`);

  // Certifications
  if (config.certifications.length > 0) {
    sections.push(`### CERTIFICATIONS
This shop holds: ${config.certifications.join(", ")}.
You may mention these when relevant to build trust.`);
  }

  // Custom Policies
  if (Object.keys(config.customPolicies).length > 0) {
    const customLines = Object.entries(config.customPolicies)
      .map(([key, value]) => `- **${key}**: "${value}"`)
      .join("\n");
    sections.push(`### ADDITIONAL POLICIES
${customLines}
Use these EXACT wordings. Do NOT paraphrase or improvise.`);
  }

  return sections.join("\n\n");
}

/**
 * Validate a Knowledge Lock config — ensure required fields have values.
 * Returns validation errors if any.
 */
export function validateKnowledgeLock(
  config: Partial<KnowledgeLockConfig>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.diagnosticFee !== undefined && config.diagnosticFee.trim() === "") {
    errors.push("Diagnostic fee cannot be empty — use a default like 'Please call for pricing'");
  }

  if (config.warrantyPolicy !== undefined && config.warrantyPolicy.trim() === "") {
    errors.push("Warranty policy cannot be empty — use a default like 'Ask our team about warranty coverage'");
  }

  if (config.towingPolicy !== undefined && config.towingPolicy.trim() === "") {
    errors.push("Towing policy cannot be empty — use a default like 'Call us to discuss towing options'");
  }

  if (config.languagesSupported && config.languagesSupported.length === 0) {
    errors.push("At least one language must be supported");
  }

  if (config.paymentMethods && config.paymentMethods.length === 0) {
    errors.push("At least one payment method must be listed");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Merge partial knowledge lock updates with existing config.
 * Only overwrites fields that are explicitly provided.
 */
export function mergeKnowledgeLock(
  existing: KnowledgeLockConfig,
  updates: Partial<KnowledgeLockConfig>
): KnowledgeLockConfig {
  return {
    ...existing,
    ...Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    ),
  } as KnowledgeLockConfig;
}
