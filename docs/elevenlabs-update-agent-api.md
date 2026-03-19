# ElevenLabs Update Agent API - Key Structure

## PATCH /v1/convai/agents/:agent_id

conversation_config has 7 sub-objects:
1. asr - speech recognition config
2. turn - turn detection (turn_timeout, turn_eagerness, speculative_turn, etc.)
3. tts - text to speech (model_id, stability, speed, similarity_boost, optimize_streaming_latency, expressive_mode)
4. conversation - conversation settings
5. language_presets - language-specific overrides
6. agent - agent config (first_message, language, prompt: {prompt, llm, temperature, max_tokens, built_in_tools, tool_ids})
7. safety_evaluation - safety config

## Key: built_in_tools lives INSIDE agent.prompt, not at conversation_config level

The correct path is:
```json
{
  "conversation_config": {
    "tts": {
      "stability": 0.45,
      "speed": 1.05,
      "optimize_streaming_latency": 4
    },
    "turn": {
      "speculative_turn": true,
      "turn_eagerness": "balanced"
    },
    "agent": {
      "prompt": {
        "temperature": 0.7,
        "built_in_tools": {
          "end_call": {
            "name": "end_call",
            "description": "End the call",
            "wait_for_text": true
          }
        }
      }
    }
  }
}
```
