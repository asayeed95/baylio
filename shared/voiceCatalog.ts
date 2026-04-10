// shared/voiceCatalog.ts
// Imported by both server/services/elevenLabsService.ts and client/src/components/VoicePicker.tsx.
// Keep this file free of server-only or client-only imports.

export interface VoiceCatalogEntry {
  id: string;
  name: string;
  accent: string;
  gender: "male" | "female";
  description: string;
  topPick?: boolean;
}

/** 16 curated voices for phone calls. All use eleven_multilingual_v2. */
export const VOICE_CATALOG: VoiceCatalogEntry[] = [
  // American English — Female
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",    accent: "American",      gender: "female", description: "Warm, conversational, trustworthy. Best all-round choice.", topPick: true },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah",     accent: "American",      gender: "female", description: "Friendly, energetic, clear. Great for sales-forward shops." },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda",   accent: "American",      gender: "female", description: "Calm, patient, empathetic. Handles frustrated callers well." },
  { id: "cgSgspJ2msm6clMkdo1a", name: "Jessica",   accent: "American",      gender: "female", description: "Professional, bright, direct. Good for premium shops." },
  // American English — Male
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",      accent: "American",      gender: "male",   description: "Deep, authoritative, expert. Commands respect.", topPick: true },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",      accent: "American",      gender: "male",   description: "Casual, friendly, relatable. Sounds like the guy at the shop." },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam",       accent: "American",      gender: "male",   description: "Confident, clear, efficient. Straight-shooter." },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam",      accent: "American",      gender: "male",   description: "Reliable, neutral, natural. Works everywhere." },
  // British English
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",    accent: "British",       gender: "male",   description: "Crisp, polished. Premium feel for high-end shops." },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", accent: "British",       gender: "female", description: "Warm, professional. High approval ratings." },
  { id: "bVMeCyTHy58xNoL34h3p", name: "Jeremy",    accent: "British",       gender: "male",   description: "Calm, measured. Great for shops with upset callers." },
  // Australian English
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie",   accent: "Australian",    gender: "male",   description: "Easy-going, casual, disarming for hesitant callers." },
  { id: "jsCqWAovK2LkecY7zXl4", name: "Freya",     accent: "Australian",    gender: "female", description: "Natural, warm. Doesn't sound scripted at all." },
  // Spanish-Optimized — eleven_multilingual_v2 enables native-quality Spanish for any voice
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Valentina", accent: "Spanish-Latam", gender: "female", description: "Natural-feeling Spanish. Best for Latino-majority customers.", topPick: true },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "Diego",     accent: "Spanish-Latam", gender: "male",   description: "Friendly, professional. Switches English↔Spanish seamlessly.", topPick: true },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Sofia",     accent: "Spanish-Latam", gender: "female", description: "Bright, engaging. Also great for Portuguese callers." },
] as const satisfies VoiceCatalogEntry[];
