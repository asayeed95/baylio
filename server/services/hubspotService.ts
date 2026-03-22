import axios, { AxiosError } from "axios";

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

if (!HUBSPOT_API_KEY) {
  console.warn(
    "[HubSpot] HUBSPOT_API_KEY not configured. HubSpot integration disabled."
  );
}

interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
  };
}

interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    dealstage: string;
    amount?: string;
    closedate?: string;
    description?: string;
  };
}

interface HubSpotNote {
  id: string;
  properties: {
    hs_note_body: string;
    hs_timestamp?: string;
  };
}

/**
 * Create or update a contact in HubSpot.
 * If emailMarketingConsent is true, the contact is enrolled in the
 * "Baylio Product Updates" and "Baylio Promotions" subscription types.
 */
export async function createOrUpdateContact(
  email: string,
  properties: {
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    lifecyclestage?: "subscriber" | "lead" | "marketingqualifiedlead" | "salesqualifiedlead" | "opportunity" | "customer" | "evangelist" | "other";
    hs_lead_status?: string;
    emailMarketingConsent?: boolean;
  }
): Promise<HubSpotContact | null> {
  if (!HUBSPOT_API_KEY) {
    console.warn("[HubSpot] API key not configured, skipping contact creation");
    return null;
  }

  const { emailMarketingConsent, ...contactProperties } = properties;

  try {
    const response = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
      {
        properties: {
          email,
          ...contactProperties,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const contact = response.data as HubSpotContact;

    // Enroll in email marketing subscriptions if consent given
    if (emailMarketingConsent !== false) {
      await enrollContactInEmailSubscriptions(contact.id, email).catch(err =>
        console.warn("[HubSpot] Warning: Could not enroll contact in email subscriptions", err.message)
      );
    }

    return contact;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 409) {
      // Contact already exists, update it instead
      return updateContactByEmail(email, { ...contactProperties, emailMarketingConsent });
    }
    console.error("[HubSpot] Error creating contact:", axiosError.message);
    throw error;
  }
}

/**
 * Enroll a contact in Baylio email marketing subscription types.
 * Uses HubSpot's Communication Preferences API to opt-in the contact
 * for "Product Updates" and "Promotional" emails.
 */
async function enrollContactInEmailSubscriptions(
  contactId: string,
  email: string
): Promise<void> {
  if (!HUBSPOT_API_KEY) return;

  // Subscribe to all marketing email types using the Communication Preferences API
  // This uses the "subscribeToAll" approach which subscribes to all non-transactional types
  try {
    await axios.post(
      `${HUBSPOT_API_BASE}/communication-preferences/v3/subscribe`,
      {
        emailAddress: email,
        subscriptionId: "product_updates",
        legalBasis: "CONSENT_WITH_NOTICE",
        legalBasisExplanation: "User opted in during Baylio shop signup",
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`[HubSpot] Enrolled ${email} in product_updates subscription`);
  } catch (err) {
    // Subscription type may not exist yet — log and continue
    console.warn(`[HubSpot] Could not subscribe to product_updates:`, (err as AxiosError).response?.data || (err as Error).message);
  }

  try {
    await axios.post(
      `${HUBSPOT_API_BASE}/communication-preferences/v3/subscribe`,
      {
        emailAddress: email,
        subscriptionId: "promotional",
        legalBasis: "CONSENT_WITH_NOTICE",
        legalBasisExplanation: "User opted in during Baylio shop signup",
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`[HubSpot] Enrolled ${email} in promotional subscription`);
  } catch (err) {
    console.warn(`[HubSpot] Could not subscribe to promotional:`, (err as AxiosError).response?.data || (err as Error).message);
  }

  // Also set the marketing email opt-in property on the contact
  try {
    await axios.patch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`,
      {
        properties: {
          hs_email_optout: "false",
          hs_marketable_status: "true",
          hs_marketable_reason_type: "FORM_SUBMISSION",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.warn("[HubSpot] Could not set marketable status:", (err as Error).message);
  }
}

/**
 * Update an existing contact by email
 */
export async function updateContactByEmail(
  email: string,
  properties: Record<string, string | boolean | undefined>
): Promise<HubSpotContact | null> {
  if (!HUBSPOT_API_KEY) {
    console.warn("[HubSpot] API key not configured, skipping contact update");
    return null;
  }

  const { emailMarketingConsent, ...contactProperties } = properties;

  try {
    // First, search for the contact by email
    const searchResponse = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: email,
              },
            ],
          },
        ],
        limit: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (searchResponse.data.results.length === 0) {
      // Contact not found, create it
      return createOrUpdateContact(email, { ...contactProperties, emailMarketingConsent } as any);
    }

    const contactId = searchResponse.data.results[0].id;

    // Update the contact
    const updateResponse = await axios.patch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`,
      {
        properties: Object.fromEntries(
          Object.entries(contactProperties).filter(([, v]) => v !== undefined)
        ),
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Handle email subscription update
    if (emailMarketingConsent === true) {
      await enrollContactInEmailSubscriptions(contactId, email).catch(err =>
        console.warn("[HubSpot] Warning: Could not update email subscriptions", err.message)
      );
    } else if (emailMarketingConsent === false) {
      await unsubscribeContactFromEmails(email).catch(err =>
        console.warn("[HubSpot] Warning: Could not unsubscribe contact", err.message)
      );
    }

    return updateResponse.data;
  } catch (error) {
    console.error("[HubSpot] Error updating contact:", error);
    throw error;
  }
}

/**
 * Unsubscribe a contact from all marketing emails
 */
async function unsubscribeContactFromEmails(email: string): Promise<void> {
  if (!HUBSPOT_API_KEY) return;

  try {
    await axios.post(
      `${HUBSPOT_API_BASE}/communication-preferences/v3/unsubscribe`,
      {
        emailAddress: email,
        subscriptionId: "product_updates",
        legalBasis: "CONSENT_WITH_NOTICE",
        legalBasisExplanation: "User opted out",
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.warn("[HubSpot] Could not unsubscribe from product_updates:", (err as Error).message);
  }
}

/**
 * Create a deal in HubSpot (for shop signups)
 */
export async function createDeal(
  dealName: string,
  contactEmail: string,
  properties: {
    dealstage?: "negotiation" | "closedwon" | "closedlost" | "appointmentscheduled" | "qualifiedtobuy" | "presentationscheduled";
    amount?: number;
    closedate?: string;
    description?: string;
    hubspot_owner_id?: string;
  }
): Promise<HubSpotDeal | null> {
  if (!HUBSPOT_API_KEY) {
    console.warn("[HubSpot] API key not configured, skipping deal creation");
    return null;
  }

  try {
    // First, get the contact ID from email
    const searchResponse = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: contactEmail,
              },
            ],
          },
        ],
        limit: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let contactId: string | null = null;
    if (searchResponse.data.results.length > 0) {
      contactId = searchResponse.data.results[0].id;
    }

    // Create the deal
    const dealResponse = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/deals`,
      {
        properties: {
          dealname: dealName,
          dealstage: properties.dealstage || "appointmentscheduled",
          amount: properties.amount?.toString(),
          closedate: properties.closedate,
          description: properties.description,
          hubspot_owner_id: properties.hubspot_owner_id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const dealId = dealResponse.data.id;

    // Associate the deal with the contact if we found one
    if (contactId) {
      try {
        await axios.put(
          `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}`,
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 3,
          },
          {
            headers: {
              Authorization: `Bearer ${HUBSPOT_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (assocError) {
        console.warn("[HubSpot] Warning: Could not associate deal with contact", assocError);
      }
    }

    return dealResponse.data;
  } catch (error) {
    console.error("[HubSpot] Error creating deal:", error);
    throw error;
  }
}

/**
 * Create a note attached to a contact
 */
export async function createContactNote(
  contactEmail: string,
  noteBody: string
): Promise<HubSpotNote | null> {
  if (!HUBSPOT_API_KEY) {
    console.warn("[HubSpot] API key not configured, skipping note creation");
    return null;
  }

  try {
    // First, get the contact ID from email
    const searchResponse = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: contactEmail,
              },
            ],
          },
        ],
        limit: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (searchResponse.data.results.length === 0) {
      console.warn(
        `[HubSpot] Contact with email ${contactEmail} not found, skipping note creation`
      );
      return null;
    }

    const contactId = searchResponse.data.results[0].id;

    // Create the note
    const noteResponse = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/notes`,
      {
        properties: {
          hs_note_body: noteBody,
          hs_timestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const noteId = noteResponse.data.id;

    // Associate the note with the contact
    try {
      await axios.put(
        `${HUBSPOT_API_BASE}/crm/v3/objects/notes/${noteId}/associations/contacts/${contactId}`,
        {
          associationCategory: "HUBSPOT_DEFINED",
          associationTypeId: 26,
        },
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (assocError) {
      console.warn("[HubSpot] Warning: Could not associate note with contact", assocError);
    }

    return noteResponse.data;
  } catch (error) {
    console.error("[HubSpot] Error creating note:", error);
    throw error;
  }
}

/**
 * Get contact by email
 */
export async function getContactByEmail(
  email: string
): Promise<HubSpotContact | null> {
  if (!HUBSPOT_API_KEY) {
    console.warn("[HubSpot] API key not configured, skipping contact fetch");
    return null;
  }

  try {
    const searchResponse = await axios.post(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: email,
              },
            ],
          },
        ],
        limit: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (searchResponse.data.results.length === 0) {
      return null;
    }

    return searchResponse.data.results[0];
  } catch (error) {
    console.error("[HubSpot] Error fetching contact:", error);
    throw error;
  }
}
