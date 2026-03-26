// Check Twilio phone number webhook configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set");
  process.exit(1);
}

const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

console.log("=== Twilio Phone Number Configuration ===");
console.log(`Account SID: ${accountSid}`);

// List all incoming phone numbers
try {
  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    {
      headers: { Authorization: `Basic ${auth}` },
    }
  );

  if (!resp.ok) {
    console.error(`Failed: ${resp.status} ${await resp.text()}`);
    process.exit(1);
  }

  const data = await resp.json();
  console.log(`\nTotal phone numbers: ${data.incoming_phone_numbers.length}\n`);

  for (const num of data.incoming_phone_numbers) {
    console.log(`--- ${num.friendly_name} (${num.phone_number}) ---`);
    console.log(`  Voice URL: ${num.voice_url || "NOT SET"}`);
    console.log(`  Voice Method: ${num.voice_method || "NOT SET"}`);
    console.log(`  Voice Fallback URL: ${num.voice_fallback_url || "NOT SET"}`);
    console.log(`  Status Callback: ${num.status_callback || "NOT SET"}`);
    console.log(`  SID: ${num.sid}`);
    console.log("");
  }
} catch (err) {
  console.error("Error:", err.message);
}
