# ElevenLabs Register Call API — Key Findings

## The Problem
We were generating TwiML with a direct WebSocket URL to ElevenLabs:
`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=XXX`

This doesn't work because ElevenLabs needs authentication and the call must be registered first.

## The Correct Flow
1. Server receives inbound call from Twilio
2. Server calls ElevenLabs Register Call API with agent_id, from_number, to_number
3. ElevenLabs returns TwiML (with authenticated WebSocket URL)
4. Server returns that TwiML to Twilio

## Prerequisites
- Agent must be configured with μ-law 8000 Hz audio format (TTS output AND input format)

## TypeScript Implementation
```ts
import ElevenLabs from "elevenlabs";

const elevenlabs = new ElevenLabs();

// In the webhook handler:
const twiml = await elevenlabs.conversationalAi.twilio.registerCall({
  agentId: AGENT_ID,
  fromNumber: From,
  toNumber: To,
  direction: "inbound",
  conversationInitiationClientData: {
    dynamicVariables: {
      caller_number: From,
    }
  }
});

// Return twiml directly to Twilio as application/xml
```

## Key Notes
- No call transfers supported with register call approach
- Phone numbers don't appear in ElevenLabs dashboard
- Must configure audio formats manually
