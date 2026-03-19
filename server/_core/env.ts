export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Twilio
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioValidationEnabled: process.env.TWILIO_VALIDATION_ENABLED !== "false",
  // ElevenLabs
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  elevenLabsAgentId: process.env.ELEVENLABS_AGENT_ID ?? "",
  // Baylio Sales Line
  baylioSalesPhone: process.env.BAYLIO_SALES_PHONE ?? "+18448752441",
};
