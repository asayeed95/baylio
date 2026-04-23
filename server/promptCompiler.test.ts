import { describe, it, expect } from "vitest";
import { compileSystemPrompt, type ShopContext } from "./services/promptCompiler";

const baseContext: ShopContext = {
  shopName: "AutoFix Garage",
  agentName: "Jordan",
  phone: "+15551234567",
  address: "123 Main St",
  city: "Dallas",
  state: "TX",
  timezone: "America/Chicago",
  businessHours: { monday: { open: "8:00 AM", close: "6:00 PM", closed: false } },
  serviceCatalog: [{ name: "Oil Change", category: "Maintenance", price: 49 }],
  upsellRules: [],
  confidenceThreshold: 0.8,
  maxUpsellsPerCall: 1,
  greeting: "",
  language: "en",
  characterPreset: "warm_helper",
  warmth: 4,
  salesIntensity: 3,
  technicalDepth: 2,
};

describe("compileSystemPrompt — personality", () => {
  it("includes PERSONALITY CALIBRATION section", () => {
    const prompt = compileSystemPrompt(baseContext);
    expect(prompt).toContain("PERSONALITY CALIBRATION");
    expect(prompt).toContain("WARMTH LEVEL (4/5)");
    expect(prompt).toContain("SALES INTENSITY (3/5)");
    expect(prompt).toContain("TECHNICAL DEPTH (2/5)");
  });

  it("uses warmth level 5 descriptor for Sales Pro preset", () => {
    const prompt = compileSystemPrompt({ ...baseContext, characterPreset: "sales_pro", warmth: 5, salesIntensity: 5, technicalDepth: 3 });
    expect(prompt).toContain("Very warm and personable");
  });

  it("uses warmth level 1 descriptor", () => {
    const prompt = compileSystemPrompt({ ...baseContext, warmth: 1 });
    expect(prompt).toContain("Professional and efficient");
  });
});

describe("compileSystemPrompt — language guides", () => {
  it("includes English language guide", () => {
    const prompt = compileSystemPrompt({ ...baseContext, language: "en" });
    expect(prompt).toContain("LANGUAGE & TONE GUIDE");
    expect(prompt).toContain("English (American)");
  });

  it("includes Spanish language guide with colloquial instructions", () => {
    const prompt = compileSystemPrompt({ ...baseContext, language: "es" });
    expect(prompt).toContain("Spanish");
    expect(prompt).toContain("Órale");
  });

  it("includes Bangla language guide (not formal)", () => {
    const prompt = compileSystemPrompt({ ...baseContext, language: "bn" });
    expect(prompt).toContain("Bangla");
    expect(prompt).toContain("কথ্য বাংলায়");
  });

  it("falls back to English guide for unknown language code", () => {
    const prompt = compileSystemPrompt({ ...baseContext, language: "xx" });
    expect(prompt).toContain("English (American)");
  });
});

describe("compileSystemPrompt — auto repair knowledge", () => {
  it("includes AUTO REPAIR KNOWLEDGE section", () => {
    const prompt = compileSystemPrompt(baseContext);
    expect(prompt).toContain("AUTO REPAIR KNOWLEDGE");
    // ASE domain titles present
    expect(prompt).toContain("Brakes (A5)");
    expect(prompt).toContain("Engine Performance");
    expect(prompt).toContain("Transmission");
    // Structural rules present
    expect(prompt).toContain("NEVER DIAGNOSE RULES");
    expect(prompt).toContain("EMERGENCY ESCALATION");
    expect(prompt).toContain("VEHICLE INTAKE");
  });
});
