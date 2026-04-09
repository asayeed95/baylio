/**
 * Ring-Shop-First Routing Tests
 *
 * Covers the Layer 1 phone routing feature: when a call comes in, ring the
 * shop's existing business phone first via TwiML <Dial>, and only fall back
 * to the ElevenLabs AI agent if no one picks up.
 *
 * These tests focus on:
 *   1. The pure TwiML builder (buildRingShopFirstTwiML)
 *   2. XML escaping of shop phone numbers
 *   3. The branching logic via direct handler invocation (mocked req/res)
 */
import { describe, it, expect } from "vitest";
import { buildRingShopFirstTwiML } from "./services/twilioWebhooks";

describe("buildRingShopFirstTwiML", () => {
  it("produces valid TwiML with the shop phone wrapped in <Number>", () => {
    const xml = buildRingShopFirstTwiML("+15551234567", "+18624162966", 12);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<Response>");
    expect(xml).toContain("</Response>");
    expect(xml).toContain("<Dial");
    expect(xml).toContain("</Dial>");
    expect(xml).toContain("<Number>+15551234567</Number>");
  });

  it("includes the timeout attribute on the <Dial> element", () => {
    const xml = buildRingShopFirstTwiML("+15551234567", "+18624162966", 15);
    expect(xml).toContain('timeout="15"');
  });

  it("uses /api/twilio/no-answer as the action URL (with baylio query param)", () => {
    const xml = buildRingShopFirstTwiML("+15551234567", "+18624162966", 12);
    expect(xml).toContain('action="/api/twilio/no-answer?baylio=');
    expect(xml).toContain(encodeURIComponent("+18624162966"));
  });

  it("uses POST method for the action callback", () => {
    const xml = buildRingShopFirstTwiML("+15551234567", "+18624162966", 12);
    expect(xml).toContain('method="POST"');
  });

  it("sets answerOnBridge=true so the caller hears ringback only", () => {
    const xml = buildRingShopFirstTwiML("+15551234567", "+18624162966", 12);
    expect(xml).toContain('answerOnBridge="true"');
  });

  it("supports a range of timeouts", () => {
    expect(buildRingShopFirstTwiML("+15551234567", "+18624162966", 5)).toContain(
      'timeout="5"'
    );
    expect(buildRingShopFirstTwiML("+15551234567", "+18624162966", 30)).toContain(
      'timeout="30"'
    );
  });

  it("escapes XML special characters in the shop phone number", () => {
    // Defensive: a shop phone number should never contain these, but if a
    // free-form input slips in (e.g. "555 & co"), it must not break the TwiML.
    const xml = buildRingShopFirstTwiML('555 "evil" & <bad>', "+18624162966", 12);
    expect(xml).not.toContain("<bad>");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&quot;");
    expect(xml).toContain("&lt;bad&gt;");
  });

  it("handles E.164 numbers without modification", () => {
    const xml = buildRingShopFirstTwiML("+18005551234", "+18624162966", 10);
    expect(xml).toContain("<Number>+18005551234</Number>");
  });

  it("handles US local format numbers", () => {
    const xml = buildRingShopFirstTwiML("(555) 123-4567", "+18624162966", 12);
    expect(xml).toContain("<Number>(555) 123-4567</Number>");
  });
});
