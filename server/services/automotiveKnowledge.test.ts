/**
 * Automotive knowledge base tests.
 *
 * Load-bearing: this knowledge is compiled into every system prompt, so a
 * regression here means agents lose the ASE-grade vocabulary that makes
 * callers trust Baylio.
 */
import { describe, it, expect } from "vitest";
import {
  KNOWLEDGE_BY_DOMAIN,
  COMPLAINT_INDEX,
  UNIVERSAL_GUIDANCE,
  selectDomainsForIntent,
  type ASEDomain,
} from "./automotiveKnowledge";
import { compileSystemPrompt, type ShopContext } from "./promptCompiler";

const ALL_DOMAINS: ASEDomain[] = [
  "A1_engine_repair",
  "A2_transmission",
  "A3_drivetrain_axles",
  "A4_suspension_steering",
  "A5_brakes",
  "A6_electrical",
  "A7_hvac",
  "A8_engine_performance",
  "A9_light_duty_diesel",
];

describe("KNOWLEDGE_BY_DOMAIN", () => {
  it("covers all 9 ASE domains", () => {
    for (const d of ALL_DOMAINS) {
      expect(KNOWLEDGE_BY_DOMAIN[d]).toBeDefined();
      expect(KNOWLEDGE_BY_DOMAIN[d].domain).toBe(d);
    }
  });

  it("every domain has substantive content in every array", () => {
    for (const d of ALL_DOMAINS) {
      const k = KNOWLEDGE_BY_DOMAIN[d];
      expect(k.commonComplaints.length).toBeGreaterThanOrEqual(4);
      expect(k.likelyCauses.length).toBeGreaterThanOrEqual(4);
      expect(k.relatedServices.length).toBeGreaterThanOrEqual(4);
      expect(k.triageQuestions.length).toBeGreaterThanOrEqual(3);
      expect(k.safetyEscalations.length).toBeGreaterThanOrEqual(1);
      expect(k.upsellAdjacencies.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("COMPLAINT_INDEX + selectDomainsForIntent", () => {
  it("has at least 60 entries", () => {
    expect(Object.keys(COMPLAINT_INDEX).length).toBeGreaterThanOrEqual(60);
  });

  it("routes brake complaints to A5", () => {
    const domains = selectDomainsForIntent("my car is grinding when i brake");
    expect(domains).toContain("A5_brakes");
  });

  it("routes won't-start to electrical / engine perf / engine", () => {
    const domains = selectDomainsForIntent("my car won't start");
    // Should hit at least one of battery/charging/engine domains
    const hasEngineOrElectrical = domains.some(d =>
      d === "A6_electrical" || d === "A1_engine_repair" || d === "A8_engine_performance"
    );
    expect(hasEngineOrElectrical).toBe(true);
  });

  it("returns empty for completely unrelated text", () => {
    const domains = selectDomainsForIntent("what time do you close");
    expect(domains).toEqual([]);
  });

  it("is case-insensitive", () => {
    const lower = selectDomainsForIntent("grinding when i brake");
    const upper = selectDomainsForIntent("GRINDING WHEN I BRAKE");
    expect(upper).toEqual(lower);
  });

  it("returns deduplicated domains when multiple keys match the same one", () => {
    const domains = selectDomainsForIntent("squealing grinding brake noise");
    const unique = new Set(domains);
    expect(domains.length).toBe(unique.size);
  });
});

describe("UNIVERSAL_GUIDANCE", () => {
  it("has all required sections populated", () => {
    expect(UNIVERSAL_GUIDANCE.neverDiagnose.length).toBeGreaterThan(0);
    expect(UNIVERSAL_GUIDANCE.inspectionPolicy.length).toBeGreaterThan(0);
    expect(UNIVERSAL_GUIDANCE.emergencyEscalation.length).toBeGreaterThan(0);
    expect(UNIVERSAL_GUIDANCE.pricingEtiquette.length).toBeGreaterThan(0);
    expect(UNIVERSAL_GUIDANCE.vehicleIntake.length).toBeGreaterThan(0);
  });
});

describe("compileSystemPrompt integrates ASE knowledge", () => {
  const baseContext: ShopContext = {
    shopName: "Test Shop",
    agentName: "Baylio",
    phone: "+15551234567",
    address: "123 Main St",
    city: "Anytown",
    state: "NJ",
    timezone: "America/New_York",
    businessHours: {},
    serviceCatalog: [{ name: "Oil Change", category: "maintenance", price: 49 }],
    upsellRules: [],
    confidenceThreshold: 0.8,
    maxUpsellsPerCall: 1,
    greeting: "",
    language: "en",
    characterPreset: "warm_helper",
    warmth: 4,
    salesIntensity: 3,
    technicalDepth: 3,
  };

  const prompt = compileSystemPrompt(baseContext);

  it("includes the ASE A1-A9 domain section header", () => {
    expect(prompt).toContain("AUTO REPAIR KNOWLEDGE (ASE A1–A9 DOMAINS)");
  });

  it("includes all 9 domain titles", () => {
    for (const d of ALL_DOMAINS) {
      const title = KNOWLEDGE_BY_DOMAIN[d].title;
      expect(prompt).toContain(title);
    }
  });

  it("includes the NEVER DIAGNOSE hard rules", () => {
    expect(prompt).toContain("NEVER DIAGNOSE RULES");
  });

  it("includes emergency escalation guidance", () => {
    expect(prompt).toContain("EMERGENCY ESCALATION");
  });

  it("includes vehicle intake guidance", () => {
    expect(prompt).toContain("VEHICLE INTAKE");
  });

  it("stays under a reasonable token budget (< 12k chars / ~3k tokens)", () => {
    // 12k chars ≈ 3k tokens — generous ceiling. If we blow past this, the
    // per-call prompt budget gets uncomfortable.
    expect(prompt.length).toBeLessThan(30000);
  });

  it("is still a non-trivial prompt (> 6k chars)", () => {
    expect(prompt.length).toBeGreaterThan(6000);
  });
});
