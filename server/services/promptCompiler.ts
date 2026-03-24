/**
 * Prompt Compilation Layer
 *
 * Compiles shop-specific context into a structured system prompt for the
 * AI voice agent. Implements the 3-Stage Reasoning Architecture from the
 * market research:
 *
 * Stage 1: Symptom Extraction — Listen and identify what the customer describes
 * Stage 2: Catalog Mapping — ONLY match to shop-approved services (strict enforcement)
 * Stage 3: Natural Offer — Present recommendation + one adjacent upsell
 *
 * Critical constraint: The LLM must NEVER offer services not in the shop's
 * approved catalog. No discounts. No made-up services. No hallucination.
 */

export interface ShopContext {
  shopName: string;
  agentName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  timezone: string;
  businessHours: Record<
    string,
    { open: string; close: string; closed: boolean }
  >;
  serviceCatalog: Array<{
    name: string;
    category: string;
    price?: number;
    description?: string;
  }>;
  upsellRules: Array<{
    symptom: string;
    service: string;
    adjacent: string;
    confidence: number;
  }>;
  confidenceThreshold: number;
  maxUpsellsPerCall: number;
  greeting: string;
  language: string;
  customSystemPrompt?: string;
}

/**
 * Format business hours into a human-readable string for the prompt.
 */
function formatBusinessHours(
  hours: Record<string, { open: string; close: string; closed: boolean }>
): string {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const lines: string[] = [];

  for (const day of days) {
    const h = hours[day];
    if (!h || h.closed) {
      lines.push(`  ${day.charAt(0).toUpperCase() + day.slice(1)}: CLOSED`);
    } else {
      lines.push(
        `  ${day.charAt(0).toUpperCase() + day.slice(1)}: ${h.open} - ${h.close}`
      );
    }
  }

  return lines.join("\n");
}

/**
 * Format the service catalog as a strict JSON reference for the LLM.
 * This is the ONLY source of truth for what services the agent can offer.
 */
function formatServiceCatalog(catalog: ShopContext["serviceCatalog"]): string {
  if (!catalog || catalog.length === 0) {
    return "No services configured. Do NOT offer any specific services. Only take messages.";
  }

  const formatted = catalog.map(s => ({
    name: s.name,
    category: s.category,
    ...(s.price ? { price: `$${s.price}` } : {}),
    ...(s.description ? { description: s.description } : {}),
  }));

  return JSON.stringify(formatted, null, 2);
}

/**
 * Format upsell rules as structured guidance for the LLM.
 */
function formatUpsellRules(
  rules: ShopContext["upsellRules"],
  maxUpsells: number
): string {
  if (!rules || rules.length === 0) {
    return "No upsell rules configured. Do not suggest additional services.";
  }

  const formatted = rules.map(
    r =>
      `  - When customer mentions "${r.symptom}" → Primary: "${r.service}" → Adjacent upsell: "${r.adjacent}" (confidence: ${r.confidence})`
  );

  return `Maximum ${maxUpsells} upsell(s) per call.\n${formatted.join("\n")}`;
}

/**
 * Get the current day/time context for the prompt.
 */
function getTimeContext(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return formatter.format(now);
  } catch {
    return new Date().toLocaleString("en-US");
  }
}

/**
 * Compile the full system prompt from shop context.
 *
 * This is the core function that transforms shop configuration into
 * a production-ready system prompt for the voice agent.
 */
export function compileSystemPrompt(context: ShopContext): string {
  const timeContext = getTimeContext(context.timezone);
  const hoursFormatted = context.businessHours
    ? formatBusinessHours(context.businessHours)
    : "Business hours not configured.";
  const catalogFormatted = formatServiceCatalog(context.serviceCatalog);
  const upsellFormatted = formatUpsellRules(
    context.upsellRules,
    context.maxUpsellsPerCall
  );

  const confidenceLabel =
    context.confidenceThreshold >= 0.8
      ? "HIGH (only offer when very confident)"
      : context.confidenceThreshold >= 0.5
        ? "MEDIUM (offer with reasonable confidence, ask clarifying questions when unsure)"
        : "LOW (offer suggestions more freely)";

  const prompt = `You are ${context.agentName}, the AI service advisor for ${context.shopName}. You are answering a phone call right now.

## YOUR IDENTITY
- Name: ${context.agentName}
- Role: Service Advisor & Receptionist at ${context.shopName}
- Tone: Professional, warm, knowledgeable. You sound like a real person who works at the shop.
- Language: ${context.language === "en" ? "English" : context.language}

## CURRENT CONTEXT
- Current time: ${timeContext}
- Shop location: ${context.address}, ${context.city}, ${context.state}
- Shop phone: ${context.phone}

## BUSINESS HOURS
${hoursFormatted}

## THREE-STAGE REASONING PROTOCOL (MANDATORY)

You MUST follow this exact reasoning process for every customer interaction:

### Stage 1: SYMPTOM EXTRACTION
Listen carefully to what the customer describes. Identify:
- What symptoms or issues they mention (noises, warning lights, performance issues)
- What service they're explicitly requesting
- Vehicle information (year, make, model, mileage if mentioned)
- Urgency level (safety concern, convenience, routine maintenance)

### Stage 2: CATALOG MAPPING (STRICT ENFORCEMENT)
Match the customer's needs to ONLY the services in the APPROVED SERVICE CATALOG below.

**CRITICAL RULES:**
- You may ONLY recommend services that exist in the catalog below
- You may NEVER invent, suggest, or imply services not in this catalog
- You may NEVER offer discounts, coupons, or price adjustments
- You may NEVER quote prices unless they are explicitly listed in the catalog
- If the customer's need doesn't match any catalog service, say: "I'd like to have one of our technicians take a closer look at that. Let me get you scheduled for a diagnostic appointment."
- If unsure, DEFAULT to booking a diagnostic/inspection appointment

**APPROVED SERVICE CATALOG (JSON — this is your ONLY source of truth):**
${catalogFormatted}

### Stage 3: NATURAL OFFER
Present your recommendation conversationally:
1. Acknowledge the customer's concern empathetically
2. Recommend the matched service naturally (don't read from a list)
3. If confidence is ${confidenceLabel}, suggest ONE adjacent service that would benefit them
4. Always close by offering to schedule an appointment

## UPSELL GUIDELINES
${upsellFormatted}

Confidence threshold: ${confidenceLabel}

**UPSELL RULES:**
- Never push. Suggest naturally: "While we have your car in, many customers also..."
- If the customer declines, accept gracefully and move on immediately
- Never upsell safety-critical items as optional add-ons
- Track: did you attempt an upsell? Did they accept?

## APPOINTMENT BOOKING
When booking appointments, collect:
1. Customer name (first and last)
2. Phone number (confirm the one they're calling from)
3. Vehicle: Year, Make, Model
4. Brief description of the issue or service needed
5. Preferred date and time
6. Whether they need a ride or loaner vehicle

## CALL HANDLING RULES
- If the customer asks about pricing and it's not in the catalog: "Pricing can vary depending on your specific vehicle. I'd recommend bringing it in for a quick look so we can give you an accurate estimate."
- If the customer has an emergency (brakes failed, smoke, overheating): "That sounds like it needs immediate attention. For your safety, I'd recommend not driving the vehicle. Can we arrange a tow to our shop?"
- If the customer asks to speak to a person: "Absolutely, let me transfer you to our team." (flag for transfer)
- If calling outside business hours: "We're currently closed, but I can take your information and have someone call you back first thing when we open at [opening time]."
- If the customer is angry or upset: Stay calm, empathize, do not argue. "I completely understand your frustration. Let me make sure we get this resolved for you."

## WHAT YOU MUST NEVER DO
1. Never diagnose a mechanical problem — you are not a technician
2. Never guarantee repair times or costs
3. Never offer services not in the approved catalog
4. Never offer discounts or negotiate prices
5. Never share information about other customers
6. Never make promises the shop hasn't authorized
7. Never argue with the customer

${context.customSystemPrompt ? `## ADDITIONAL SHOP-SPECIFIC INSTRUCTIONS\n${context.customSystemPrompt}` : ""}`;

  return prompt;
}

/**
 * Compile a greeting message for the voice agent.
 */
export function compileGreeting(context: ShopContext): string {
  if (context.greeting) {
    return context.greeting
      .replace(/\{\{SHOP_NAME\}\}/g, context.shopName)
      .replace(/\{\{AGENT_NAME\}\}/g, context.agentName);
  }

  return `Thank you for calling ${context.shopName}! This is ${context.agentName}. How can I help you today?`;
}

/**
 * Validate that a compiled prompt doesn't exceed token limits.
 * Rough estimate: 1 token ≈ 4 characters for English text.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Get a summary of what the prompt contains for debugging/preview.
 */
export function getPromptSummary(context: ShopContext): {
  estimatedTokens: number;
  serviceCount: number;
  upsellRuleCount: number;
  hasCustomPrompt: boolean;
  hasBusinessHours: boolean;
  confidenceLevel: string;
} {
  const prompt = compileSystemPrompt(context);
  return {
    estimatedTokens: estimateTokenCount(prompt),
    serviceCount: context.serviceCatalog?.length || 0,
    upsellRuleCount: context.upsellRules?.length || 0,
    hasCustomPrompt: !!context.customSystemPrompt,
    hasBusinessHours:
      !!context.businessHours && Object.keys(context.businessHours).length > 0,
    confidenceLevel:
      context.confidenceThreshold >= 0.8
        ? "HIGH"
        : context.confidenceThreshold >= 0.5
          ? "MEDIUM"
          : "LOW",
  };
}
