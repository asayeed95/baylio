/**
 * Environment variable validation + typed access.
 * Fails fast at import time if required vars are missing in production.
 * In development/test, missing vars get empty-string defaults (tests mock them).
 */

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test" || !!process.env.VITEST;

/** Require a var in production, default to "" in dev/test */
function required(name: string): string {
  const val = process.env[name] ?? "";
  if (isProduction && !val) {
    throw new Error(`[ENV] Missing required environment variable: ${name}`);
  }
  return val;
}

export const ENV = {
  // Core
  cookieSecret: required("JWT_SECRET"),
  databaseUrl: required("DATABASE_URL"),
  isProduction,
  isTest,
  // Supabase
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  // Twilio
  twilioAccountSid: required("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: required("TWILIO_AUTH_TOKEN"),
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER ?? "",
  twilioValidationEnabled: process.env.TWILIO_VALIDATION_ENABLED !== "false",
  // ElevenLabs
  elevenLabsApiKey: required("ELEVENLABS_API_KEY"),
  // Stripe
  stripeSecretKey: required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: required("STRIPE_WEBHOOK_SECRET"),
  // Integrations (optional — not all shops use them)
  hubspotApiKey: process.env.HUBSPOT_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  // Anthropic
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  // Mem0
  mem0ApiKey: process.env.MEM0_API_KEY ?? "",
  // Mnemix
  mnemixApiKey: process.env.MNEMIX_API_KEY ?? "",
  mnemixApiUrl: process.env.MNEMIX_API_URL ?? "https://mnemix-api.sayeed965.workers.dev",
  // Sam tool auth (shared secret ElevenLabs sends as x-sam-tool-secret)
  samToolSecret: process.env.SAM_TOOL_SECRET ?? "",
  // Founder phone for transfer_to_human
  founderPhone: process.env.FOUNDER_PHONE ?? "+12013212235",
};
