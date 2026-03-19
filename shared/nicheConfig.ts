/**
 * Niche Configuration — Single Source of Truth
 * 
 * This file defines ALL niche-specific content for the AI Call Assistant platform.
 * To clone this product for a new vertical (dentist, restaurant, real estate, etc.),
 * you ONLY need to:
 * 1. Copy this file
 * 2. Change the values below
 * 3. Update environment variables
 * 
 * Everything else (database schema, Stripe integration, Twilio provisioning,
 * auto-provisioning pipeline, dashboard UI) is niche-agnostic.
 * 
 * See NICHE_REPLICATION_GUIDE.md for the full step-by-step process.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface NicheConfig {
  /** Core identity */
  brand: BrandConfig;
  /** Industry-specific knowledge */
  industry: IndustryConfig;
  /** Pricing tiers */
  pricing: PricingConfig;
  /** AI sales agent configuration */
  salesAgent: SalesAgentConfig;
  /** AI receptionist (inbound call handler) defaults */
  receptionist: ReceptionistConfig;
  /** SMS templates */
  smsTemplates: SMSTemplateConfig;
  /** Landing page content */
  landingPage: LandingPageConfig;
}

export interface BrandConfig {
  name: string;                    // "Baylio"
  pronunciation: string;           // "BAY-lee-oh"
  tagline: string;                 // "AI Call Assistant for Auto Repair Shops"
  domain: string;                  // "baylio.io"
  supportEmail: string;            // "hello@baylio.io"
  salesPhone: string;              // "(844) 875-2441"
  founderName: string;             // "Abdur"
  founderPronunciation: string;    // "Ab-DOOR"
  primaryColor: string;            // "#2563eb" (blue-600)
  accentColor: string;             // "#f59e0b" (amber-500)
}

export interface IndustryConfig {
  vertical: string;                // "auto_repair"
  verticalLabel: string;           // "Auto Repair Shops"
  businessType: string;            // "shop"
  businessTypeLabel: string;       // "Shop"
  ownerTitle: string;              // "shop owner"
  customerType: string;            // "vehicle owner"
  avgTicketValue: number;          // 466
  avgTicketLabel: string;          // "average repair order"
  /** Industry-specific services the AI should know about */
  commonServices: string[];
  /** Industry-specific upsell opportunities */
  upsellExamples: string[];
  /** Competitor names in this niche */
  competitors: string[];
  /** What makes generic competitors weak */
  competitorWeakness: string;
}

export interface PricingConfig {
  tiers: {
    starter: TierConfig;
    pro: TierConfig;
    elite: TierConfig;
  };
  setupFees: {
    single: number;       // cents
    multi_3: number;
    multi_5: number;
  };
  overageRate: number;    // dollars per minute
  trialDays: number;
  annualDiscount: number; // percentage (e.g., 20)
}

export interface TierConfig {
  name: string;
  monthlyPrice: number;   // cents
  includedMinutes: number;
  features: string[];
}

export interface SalesAgentConfig {
  /** Opening line when answering sales call */
  firstMessage: string;
  /** SPIN selling situation questions */
  situationQuestions: string[];
  /** SPIN selling problem questions */
  problemQuestions: string[];
  /** SPIN selling implication statements */
  implicationStatements: string[];
  /** SPIN selling need-payoff questions */
  needPayoffQuestions: string[];
  /** Objection handling scripts */
  objections: Record<string, string>;
  /** The close script */
  closeScript: string;
}

export interface ReceptionistConfig {
  defaultAgentName: string;        // "Baylio"
  defaultGreeting: string;         // "Thanks for calling {shopName}!"
  defaultLanguage: string;         // "en"
  defaultConfidenceThreshold: string; // "0.80"
}

export interface SMSTemplateConfig {
  checkoutLink: (ownerName: string, tierLabel: string, url: string) => string;
  welcomeMessage: (ownerName: string, shopName: string, appUrl: string) => string;
  setupMessage: (shopName: string, twilioNumber?: string) => string;
}

export interface LandingPageConfig {
  heroTitle: string;
  heroSubtitle: string;
  problemStatement: string;
  solutionStatement: string;
  socialProof: string[];
  ctaText: string;
}

// ─── BAYLIO CONFIG (Auto Repair) ────────────────────────────────────

export const NICHE_CONFIG: NicheConfig = {
  brand: {
    name: "Baylio",
    pronunciation: "BAY-lee-oh",
    tagline: "AI Call Assistant for Auto Repair Shops",
    domain: "baylio.io",
    supportEmail: "hello@baylio.io",
    salesPhone: "(844) 875-2441",
    founderName: "Abdur",
    founderPronunciation: "Ab-DOOR",
    primaryColor: "#2563eb",
    accentColor: "#f59e0b",
  },

  industry: {
    vertical: "auto_repair",
    verticalLabel: "Auto Repair Shops",
    businessType: "shop",
    businessTypeLabel: "Shop",
    ownerTitle: "shop owner",
    customerType: "vehicle owner",
    avgTicketValue: 466,
    avgTicketLabel: "average repair order",
    commonServices: [
      "Oil change",
      "Brake pad replacement",
      "Brake flush",
      "Tire rotation",
      "Wheel alignment",
      "Transmission service",
      "AC repair",
      "Engine diagnostics",
      "Battery replacement",
      "State inspection",
    ],
    upsellExamples: [
      "Brake pads → Brake flush",
      "Oil change → Tire rotation",
      "Engine light → Full diagnostic",
      "Battery test → Battery replacement",
    ],
    competitors: ["Smith.ai", "Ruby", "AnswerConnect"],
    competitorWeakness: "Generic answering services that just take messages. None built specifically for auto repair. They don't know the difference between a brake flush and a brake pad replacement.",
  },

  pricing: {
    tiers: {
      starter: {
        name: "Starter",
        monthlyPrice: 19900,
        includedMinutes: 300,
        features: [
          "AI receptionist (300 min/mo)",
          "Call logging & transcription",
          "Basic analytics dashboard",
          "Email notifications",
          "Business hours configuration",
        ],
      },
      pro: {
        name: "Professional",
        monthlyPrice: 34900,
        includedMinutes: 750,
        features: [
          "Everything in Starter",
          "750 minutes per month",
          "Calendar integration",
          "Advanced analytics & trends",
          "SMS notifications to owner",
          "Custom AI voice & persona",
        ],
      },
      elite: {
        name: "Elite",
        monthlyPrice: 59900,
        includedMinutes: 1500,
        features: [
          "Everything in Pro",
          "1,500 minutes per month",
          "Intelligent upsell engine",
          "CRM integration",
          "Multi-location management",
          "Priority support",
          "Weekly performance reports",
        ],
      },
    },
    setupFees: {
      single: 50000,
      multi_3: 125000,
      multi_5: 200000,
    },
    overageRate: 0.15,
    trialDays: 7,
    annualDiscount: 20,
  },

  salesAgent: {
    firstMessage: `Hey there! Thanks for calling ${getBrandName()}. I'm the AI that answers phones for auto repair shops — and yeah, you're actually talking to me right now, which is pretty cool. Are you a shop owner looking to catch more calls?`,
    situationQuestions: [
      "So tell me a little about your shop — how many bays you running?",
      "Who's answering your phones right now?",
      "How many calls would you say you get on a typical day?",
    ],
    problemQuestions: [
      "So what happens when you're under a car and the phone rings?",
      "How often do calls end up going to voicemail?",
      "What about after hours or weekends — those calls just go nowhere?",
    ],
    implicationStatements: [
      "If you're missing even 10 calls a week, and the average repair order is around $466... that's almost $5,000 a week walking out the door.",
      "A first-time caller who gets voicemail almost never calls back. They just Google the next shop.",
      "That's not just lost revenue today — that's a customer who could've been coming back for years.",
    ],
    needPayoffQuestions: [
      "What if every single call was answered instantly, 24/7, by an AI that knows your services and pricing?",
      "Would it help if after every call you got a text saying exactly who called and what they need?",
    ],
    objections: {
      "I already have someone answering phones": "That's great! But what happens when they're on another line, at lunch, or after 5pm? {brand} is backup — catches everything your team can't.",
      "I don't trust AI": "I totally get that. And honestly... we're having this conversation right now, and I'm {brand}. This is the same AI that would answer your {businessType}'s phones. How's it feel so far?",
      "Too expensive": "The {avgTicketLabel} is ${avgTicketValue}. If {brand} catches ONE missed call per week, that's almost $1,900 a month. For $199. The math speaks for itself.",
      "Need to think about it": "Absolutely. But the free trial is zero risk — no credit card. Let me just send you the link so you have it. You can start whenever you're ready.",
      "Can I try it free?": "Yeah! {trialDays}-day free trial, no credit card. Let me get your info and send you the link right now.",
    },
    closeScript: `Here's what I'd suggest — let's get you started right now. We have a free {trialDays}-day trial, no credit card needed to start. But if you want to lock in the Starter plan at $199 a month, I can send a secure payment link straight to your phone right now. Takes like 30 seconds. Which sounds better — the free trial or jumping straight into the full plan?`,
  },

  receptionist: {
    defaultAgentName: "Baylio",
    defaultGreeting: "Thanks for calling {shopName}! This is Baylio, your AI assistant. How can I help you today?",
    defaultLanguage: "en",
    defaultConfidenceThreshold: "0.80",
  },

  smsTemplates: {
    checkoutLink: (ownerName: string, tierLabel: string, url: string) =>
      `Hey ${ownerName}! 👋 Here's your Baylio ${tierLabel} signup link:\n\n${url}\n\nTap the link to complete your signup. Once done, we'll automatically set up your AI phone agent and text you your login info.\n\n— Baylio AI`,
    welcomeMessage: (ownerName: string, shopName: string, appUrl: string) =>
      `🎉 Welcome to Baylio, ${ownerName}!\n\nYour AI receptionist for ${shopName} is being set up right now.\n\nLog in to your dashboard:\n${appUrl}\n\nUse your email to sign in.`,
    setupMessage: (shopName: string, twilioNumber?: string) => {
      const numberInfo = twilioNumber
        ? `Your dedicated AI phone number: ${twilioNumber}\n\nTo go live, set up call forwarding from your ${shopName} main line to ${twilioNumber}.`
        : `We're assigning you a dedicated phone number — you'll get a text with it shortly.`;
      return `📋 Next steps for ${shopName}:\n\n${numberInfo}\n\nNeed help? Reply to this text or call (844) 875-2441.\n\n— The Baylio Team`;
    },
  },

  landingPage: {
    heroTitle: "Never Miss Another Call",
    heroSubtitle: "AI-powered phone answering built specifically for auto repair shops. Every call answered. Every customer served. 24/7/365.",
    problemStatement: "The average auto repair shop misses 30% of incoming calls. Each missed call is a $466 repair order walking out the door.",
    solutionStatement: "Baylio answers every call with an AI that knows brake flushes from brake pads, books appointments, and texts you a recap — all in real time.",
    socialProof: [
      "Catches an average of 47 missed calls per month",
      "9x ROI for the average shop",
      "$466 average ticket value recovered per answered call",
    ],
    ctaText: "Start Your Free 7-Day Trial",
  },
};

// ─── Helper to get brand name (avoids circular reference) ───────────

function getBrandName(): string {
  return "Bay-lee-oh";
}

// ─── Convenience Accessors ──────────────────────────────────────────

export const BRAND = NICHE_CONFIG.brand;
export const INDUSTRY = NICHE_CONFIG.industry;
export const PRICING = NICHE_CONFIG.pricing;
export const SALES_AGENT = NICHE_CONFIG.salesAgent;
export const RECEPTIONIST = NICHE_CONFIG.receptionist;
export const SMS_TEMPLATES = NICHE_CONFIG.smsTemplates;
export const LANDING_PAGE = NICHE_CONFIG.landingPage;
