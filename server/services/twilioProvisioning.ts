/**
 * Twilio Phone Number Provisioning Service
 *
 * Handles all Twilio REST API operations:
 * - Search available local phone numbers by area code / city
 * - Purchase a phone number and assign it to a shop
 * - Configure the number's webhook URL to point at Baylio
 * - Release a number when a shop is offboarded
 * - Validate credentials on startup
 *
 * Requires env vars:
 *   TWILIO_ACCOUNT_SID  — Account SID (ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
 *   TWILIO_AUTH_TOKEN   — Auth Token (32-char hex string)
 */
import twilio from "twilio";

// ─── Client Factory ──────────────────────────────────────────────────────────

let _client: ReturnType<typeof twilio> | null = null;

function getTwilioClient(): ReturnType<typeof twilio> {
  if (_client) return _client;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
    );
  }

  _client = twilio(accountSid, authToken);
  return _client;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  postalCode: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

export interface ProvisionedNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  voiceUrl: string;
  statusCallbackUrl: string;
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Validate Twilio credentials by fetching the account info.
 * Returns account details on success, throws on failure.
 */
export async function validateTwilioCredentials(): Promise<{
  accountSid: string;
  friendlyName: string;
  status: string;
}> {
  const client = getTwilioClient();
  const account = await client.api.v2010
    .accounts(process.env.TWILIO_ACCOUNT_SID!)
    .fetch();
  return {
    accountSid: account.sid,
    friendlyName: account.friendlyName,
    status: account.status,
  };
}

/**
 * Search for available local phone numbers in a given area code.
 * Returns up to 10 numbers sorted by locality.
 *
 * @param areaCode  3-digit US area code (e.g. "415")
 * @param country   ISO country code, defaults to "US"
 */
export async function searchAvailableNumbers(
  areaCode: string,
  country: string = "US"
): Promise<AvailableNumber[]> {
  const client = getTwilioClient();

  const numbers = await client.availablePhoneNumbers(country).local.list({
    areaCode: parseInt(areaCode, 10),
    voiceEnabled: true,
    smsEnabled: true,
    limit: 10,
  });

  return numbers.map(n => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality ?? "",
    region: n.region ?? "",
    postalCode: n.postalCode ?? "",
    isoCountry: n.isoCountry,
    capabilities: {
      voice: n.capabilities?.voice ?? false,
      sms: n.capabilities?.sms ?? false,
      mms: n.capabilities?.mms ?? false,
    },
  }));
}

/**
 * Purchase a phone number and configure it to route calls to Baylio.
 *
 * @param phoneNumber   E.164 formatted number (e.g. "+14155551234")
 * @param shopId        Database shop ID (used in webhook URL params)
 * @param webhookBaseUrl  The public base URL of the Baylio server
 *                        (e.g. "https://baylio.io" or the Manus preview URL)
 * @param friendlyName  Human-readable label for the number in Twilio console
 */
export async function purchasePhoneNumber(
  phoneNumber: string,
  shopId: number,
  webhookBaseUrl: string,
  friendlyName?: string
): Promise<ProvisionedNumber> {
  const client = getTwilioClient();

  const voiceUrl = `${webhookBaseUrl}/api/twilio/voice`;
  const statusCallbackUrl = `${webhookBaseUrl}/api/twilio/status`;

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber,
    friendlyName: friendlyName ?? `Baylio — Shop #${shopId}`,
    voiceUrl,
    voiceMethod: "POST",
    statusCallback: statusCallbackUrl,
    statusCallbackMethod: "POST",
    // SMS recap endpoint
    smsUrl: `${webhookBaseUrl}/api/twilio/sms`,
    smsMethod: "POST",
  });

  return {
    sid: purchased.sid,
    phoneNumber: purchased.phoneNumber,
    friendlyName: purchased.friendlyName,
    voiceUrl: purchased.voiceUrl ?? voiceUrl,
    statusCallbackUrl: purchased.statusCallback ?? statusCallbackUrl,
  };
}

/**
 * Update the webhook URLs on an existing Twilio number.
 * Use this when the server URL changes (e.g. domain binding).
 *
 * @param phoneSid       The Twilio SID of the purchased number (PNxxxxxxxx)
 * @param webhookBaseUrl New public base URL
 */
export async function updatePhoneWebhooks(
  phoneSid: string,
  webhookBaseUrl: string
): Promise<void> {
  const client = getTwilioClient();

  await client.incomingPhoneNumbers(phoneSid).update({
    voiceUrl: `${webhookBaseUrl}/api/twilio/voice`,
    voiceMethod: "POST",
    statusCallback: `${webhookBaseUrl}/api/twilio/status`,
    statusCallbackMethod: "POST",
    smsUrl: `${webhookBaseUrl}/api/twilio/sms`,
    smsMethod: "POST",
  });
}

/**
 * Release (delete) a phone number from the account.
 * Called when a shop is offboarded or changes their number.
 *
 * @param phoneSid  The Twilio SID of the number to release
 */
export async function releasePhoneNumber(phoneSid: string): Promise<void> {
  const client = getTwilioClient();
  await client.incomingPhoneNumbers(phoneSid).remove();
}

/**
 * List all phone numbers currently owned by the account.
 * Useful for reconciliation and admin views.
 */
export async function listOwnedNumbers(): Promise<ProvisionedNumber[]> {
  const client = getTwilioClient();
  const numbers = await client.incomingPhoneNumbers.list({ limit: 100 });

  return numbers.map(n => ({
    sid: n.sid,
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    voiceUrl: n.voiceUrl ?? "",
    statusCallbackUrl: n.statusCallback ?? "",
  }));
}

/**
 * Get account balance and usage summary.
 * Used for the cost optimization dashboard.
 */
export async function getAccountBalance(): Promise<{
  balance: string;
  currency: string;
}> {
  const client = getTwilioClient();
  const balance = await client.api.v2010
    .accounts(process.env.TWILIO_ACCOUNT_SID!)
    .balance.fetch();

  return {
    balance: balance.balance,
    currency: balance.currency,
  };
}
