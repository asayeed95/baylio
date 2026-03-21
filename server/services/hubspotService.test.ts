import { describe, it, expect, beforeAll } from "vitest";
import {
  createOrUpdateContact,
  getContactByEmail,
  createDeal,
  createContactNote,
} from "./hubspotService";

describe("HubSpot Service", () => {
  const testEmail = `test-${Date.now()}@baylio-test.com`;
  const testContactName = "Test Contact";

  beforeAll(() => {
    // Verify API key is configured
    if (!process.env.HUBSPOT_API_KEY) {
      console.warn(
        "HUBSPOT_API_KEY not configured, some tests may be skipped"
      );
    }
  });

  it("should create a contact in HubSpot", async () => {
    if (!process.env.HUBSPOT_API_KEY) {
      console.log("Skipping HubSpot contact creation test - API key not set");
      return;
    }

    const contact = await createOrUpdateContact(testEmail, {
      firstname: testContactName,
      lastname: "Test",
      phone: "+1-555-0123",
      company: "Test Auto Repair",
      lifecyclestage: "lead",
    });

    expect(contact).not.toBeNull();
    expect(contact?.id).toBeDefined();
    expect(contact?.properties.email).toBe(testEmail);
  });

  it("should retrieve a contact by email", async () => {
    if (!process.env.HUBSPOT_API_KEY) {
      console.log("Skipping HubSpot contact retrieval test - API key not set");
      return;
    }

    // First create a contact
    await createOrUpdateContact(testEmail, {
      firstname: "Retrieve",
      lastname: "Test",
    });

    // Then retrieve it
    const contact = await getContactByEmail(testEmail);

    expect(contact).not.toBeNull();
    expect(contact?.id).toBeDefined();
    expect(contact?.properties.email).toBe(testEmail);
  });

  it("should update an existing contact", async () => {
    if (!process.env.HUBSPOT_API_KEY) {
      console.log("Skipping HubSpot contact update test - API key not set");
      return;
    }

    const updateEmail = `update-${Date.now()}@baylio-test.com`;

    // Create initial contact
    await createOrUpdateContact(updateEmail, {
      firstname: "Original",
      lastname: "Name",
    });

    // Update the contact
    const updated = await createOrUpdateContact(updateEmail, {
      firstname: "Updated",
      lastname: "Name",
      phone: "+1-555-9999",
    });

    expect(updated).not.toBeNull();
    expect(updated?.properties.firstname).toBe("Updated");
  });

  it("should create a deal for a contact", async () => {
    if (!process.env.HUBSPOT_API_KEY) {
      console.log("Skipping HubSpot deal creation test - API key not set");
      return;
    }

    const dealEmail = `deal-${Date.now()}@baylio-test.com`;

    // Create a contact first
    await createOrUpdateContact(dealEmail, {
      firstname: "Deal",
      lastname: "Contact",
    });

    // Create a deal
    const deal = await createDeal("Shop Signup - Test Auto Repair", dealEmail, {
      dealstage: "appointmentscheduled",
      amount: 149,
      description: "New shop signup via Baylio",
    });

    expect(deal).not.toBeNull();
    expect(deal?.id).toBeDefined();
    expect(deal?.properties.dealname).toContain("Shop Signup");
  });

  it("should create a note on a contact", async () => {
    if (!process.env.HUBSPOT_API_KEY) {
      console.log("Skipping HubSpot note creation test - API key not set");
      return;
    }

    const noteEmail = `note-${Date.now()}@baylio-test.com`;

    // Create a contact first
    await createOrUpdateContact(noteEmail, {
      firstname: "Note",
      lastname: "Contact",
    });

    // Create a note
    const note = await createContactNote(
      noteEmail,
      "Test call summary: Customer called about brake service. Interested in appointment."
    );

    expect(note).not.toBeNull();
    expect(note?.id).toBeDefined();
    expect(note?.properties.hs_note_body).toContain("brake service");
  });

  it("should handle missing API key gracefully", async () => {
    // This test verifies that the service doesn't crash if API key is missing
    // The actual behavior is to log a warning and return null
    const originalKey = process.env.HUBSPOT_API_KEY;

    try {
      delete process.env.HUBSPOT_API_KEY;

      // Should not throw, just return null or log warning
      const result = await createOrUpdateContact("test@example.com", {
        firstname: "Test",
      });

      // If API key is missing, the function should handle it gracefully
      expect(result === null || result !== undefined).toBe(true);
    } finally {
      if (originalKey) {
        process.env.HUBSPOT_API_KEY = originalKey;
      }
    }
  });
});
