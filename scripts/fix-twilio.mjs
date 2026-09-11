// Fix Twilio phone number configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set");
  process.exit(1);
}

const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
const phoneSid = "PN06b668f2ec372e6bb897271d30903b5b";

console.log("=== Fixing Twilio Phone Number Config ===");

// Update the phone number configuration
try {
  const params = new URLSearchParams();
  params.set("VoiceUrl", "https://baylio.io/api/twilio/voice");
  params.set("VoiceMethod", "POST");
  params.set("VoiceFallbackUrl", "https://baylio.io/api/twilio/voice");
  params.set("VoiceFallbackMethod", "POST");
  params.set("StatusCallback", "https://baylio.io/api/twilio/status");
  params.set("StatusCallbackMethod", "POST");

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneSid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!resp.ok) {
    console.error(`Failed: ${resp.status} ${await resp.text()}`);
    process.exit(1);
  }

  const data = await resp.json();
  console.log("✅ Phone number updated successfully!");
  console.log(`  Voice URL: ${data.voice_url}`);
  console.log(`  Voice Fallback URL: ${data.voice_fallback_url}`);
  console.log(`  Status Callback: ${data.status_callback}`);
} catch (err) {
  console.error("Error:", err.message);
}
