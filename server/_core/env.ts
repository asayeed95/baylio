export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Twilio
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioValidationEnabled: process.env.TWILIO_VALIDATION_ENABLED !== "false",
  // ElevenLabs
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  hubspotApiKey: process.env.HUBSPOT_API_KEY ?? "",
};
