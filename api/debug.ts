import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({
    status: "ok",
    node: process.version,
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseAnon: !!process.env.SUPABASE_ANON_KEY,
      hasSupabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasElevenLabs: !!process.env.ELEVENLABS_API_KEY,
    },
  });
}
