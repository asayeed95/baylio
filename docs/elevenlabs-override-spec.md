# ElevenLabs Register Call API — conversation_config_override Spec

## Endpoint
POST https://api.elevenlabs.io/v1/convai/twilio/register-call

## Request Body
```json
{
  "agent_id": "string (required)",
  "from_number": "string (required)",
  "to_number": "string (required)",
  "direction": "inbound | outbound (optional)",
  "conversation_initiation_client_data": {
    "conversation_config_override": {
      "agent": {
        "prompt": {
          "prompt": "Your custom system prompt here"
        },
        "first_message": "Hi, how can I help?",
        "language": "en"
      },
      "tts": {
        "voice_id": "custom_voice_id",
        "stability": 0.7,
        "speed": 1.1,
        "similarity_boost": 0.9
      }
    },
    "dynamic_variables": {
      "key": "value"
    },
    "user_id": "string (optional)",
    "custom_llm_extra_body": {},
    "source_info": {}
  }
}
```

## CRITICAL: Must enable overrides in ElevenLabs dashboard first
- Navigate to agent settings → Security tab
- Enable "System prompt" override
- Enable "First message" override
- Enable any other overrides needed (Language, Voice ID, etc.)
- Without enabling these, the API will throw a 422 error

## Override Structure (from Overrides docs)
The `conversation_config_override` object mirrors the Python SDK pattern:
```python
conversation_override = {
    "agent": {
        "prompt": {
            "prompt": "system prompt text",
            "llm": "gpt-4o"  # optional LLM override
        },
        "first_message": "greeting text",
        "language": "en"
    },
    "tts": {
        "voice_id": "voice_id",
        "stability": 0.7,
        "speed": 1.1,
        "similarity_boost": 0.9
    },
    "conversation": {
        "text_only": True  # optional
    }
}
```

## Key Rules
- Omit fields you don't want to override (don't set to null/empty)
- Only include fields you specifically want to customize
- Overrides completely replace the agent's default values
