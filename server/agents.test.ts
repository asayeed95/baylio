import { describe, expect, it } from "vitest";

/**
 * Agent Configuration Tests
 *
 * Verifies the ElevenLabs agent IDs and transfer configuration are correct.
 * These are static config tests — they don't call the ElevenLabs API.
 */

const ALEX_AGENT_ID = "agent_8401kkzx0edafhbb0c56a04d1kmb";
const RANVIR_AGENT_ID = "agent_7401kmdv1dbff0fr6cv04c256tbf";

describe("Agent Configuration", () => {
  it("Alex and Ranvir have distinct agent IDs", () => {
    expect(ALEX_AGENT_ID).not.toBe(RANVIR_AGENT_ID);
    expect(ALEX_AGENT_ID).toMatch(/^agent_/);
    expect(RANVIR_AGENT_ID).toMatch(/^agent_/);
  });

  it("configure-agent-transfer script references correct agent IDs", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const scriptPath = path.resolve(
      import.meta.dirname,
      "../scripts/configure-agent-transfer.mjs"
    );
    const script = fs.readFileSync(scriptPath, "utf-8");

    // Alex is the source agent being patched
    expect(script).toContain(ALEX_AGENT_ID);
    // Ranvir is the transfer target
    expect(script).toContain(RANVIR_AGENT_ID);
    // Script enables the transfer_to_agent tool
    expect(script).toContain("transfer_to_agent");
    // Script has transfer triggers
    expect(script).toContain("tech support");
    expect(script).toContain("billing issue");
  });

  it("transfer script is idempotent (checks for existing instructions)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const scriptPath = path.resolve(
      import.meta.dirname,
      "../scripts/configure-agent-transfer.mjs"
    );
    const script = fs.readFileSync(scriptPath, "utf-8");

    // The script should check if transfer instructions already exist
    expect(script).toContain("TRANSFER TO RANVIR");
    expect(script).toContain("needsUpdate");
  });
});
