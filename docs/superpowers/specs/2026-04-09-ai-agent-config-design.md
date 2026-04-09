# AI Agent Configuration — Design Spec

**Date:** 2026-04-09  
**Status:** Approved for implementation

---

## What We're Building

Three connected upgrades to the AI agent configuration system:

1. **Voice Picker** — Replace the raw ElevenLabs voice ID text field with a curated grid of 16 handpicked voices, each with a one-tap preview.
2. **Personality System** — Shop owners pick a character archetype (preset), then fine-tune 3 sliders. Values compile into the system prompt automatically.
3. **Language & Knowledge** — Expand language support to 8 languages with genuinely conversational tone guidance per language. Deep auto repair knowledge baked into every agent by default.

All three touch the same files: `agent_configs` schema, `promptCompiler.ts`, `elevenLabsService.ts`, `AgentConfig.tsx`, `Onboarding.tsx`.

---

## 1. Voice Picker

### Curated Voice Catalog

A hardcoded constant `VOICE_CATALOG` in `server/services/elevenLabsService.ts`. All voices use `eleven_multilingual_v2` — every voice speaks all 8 supported languages. The catalog is categorized by accent and gender.

```typescript
export const VOICE_CATALOG = [
  // ── American English — Female ──────────────────────────────
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",   accent: "American", gender: "female", description: "Warm, conversational, trustworthy. Best all-round choice.", topPick: true  },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah",    accent: "American", gender: "female", description: "Friendly, energetic, clear. Great for sales-forward shops."                },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda",  accent: "American", gender: "female", description: "Calm, patient, empathetic. Handles frustrated callers well."                },
  { id: "cgSgspJ2msm6clMkdo1a", name: "Jessica",  accent: "American", gender: "female", description: "Professional, bright, direct. Good for premium shops."                      },
  // ── American English — Male ────────────────────────────────
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",     accent: "American", gender: "male",   description: "Deep, authoritative, expert. Commands respect.",           topPick: true  },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",     accent: "American", gender: "male",   description: "Casual, friendly, relatable. Sounds like the guy at the shop."             },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam",      accent: "American", gender: "male",   description: "Confident, clear, efficient. Straight-shooter."                            },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam",     accent: "American", gender: "male",   description: "Reliable, neutral, natural. Works everywhere."                             },
  // ── British English ────────────────────────────────────────
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",   accent: "British",  gender: "male",   description: "Crisp, polished. Premium feel for high-end shops."                        },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", accent: "British", gender: "female", description: "Warm, professional. High approval ratings."                               },
  { id: "bVMeCyTHy58xNoL34h3p", name: "Jeremy",   accent: "British",  gender: "male",   description: "Calm, measured. Great for shops that get lots of upset callers."           },
  // ── Australian English ─────────────────────────────────────
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie",  accent: "Australian", gender: "male", description: "Easy-going, casual, disarming for hesitant callers."                      },
  { id: "jsCqWAovK2LkecY7zXl4", name: "Freya",   accent: "Australian", gender: "female", description: "Natural, warm. Doesn't sound scripted at all."                          },
  // ── Spanish-Optimized ─────────────────────────────────────────────────
  // IDs below are PLACEHOLDERS — confirm during implementation:
  //   GET /v1/voices → filter by labels.language = "es" or test multilingual_v2 with each voice
  //   ElevenLabs Voice Library has Spanish-native voices (search "spanish" in their UI)
  //   Must use DIFFERENT IDs from the English section above (same ID = broken UI selection)
  { id: "TO_CONFIRM_ES_F1", name: "Valentina", accent: "Spanish-Latam", gender: "female", description: "Natural-feeling Spanish. Best for Latino-majority customers.", topPick: true },
  { id: "TO_CONFIRM_ES_M1", name: "Diego",    accent: "Spanish-Latam", gender: "male",   description: "Friendly, professional. Switches English↔Spanish mid-call seamlessly.", topPick: true },
  { id: "TO_CONFIRM_ES_F2", name: "Sofia",    accent: "Spanish-ES",    gender: "female", description: "Bright, engaging. Also great for Portuguese callers."                  },
] as const;
```

> **Implementation note on Spanish voices:** During Task 1 of the implementation, run `GET /v1/voices` with the ElevenLabs API key and look for voices with `labels.language = "es"` or `labels.accent = "spanish"`. Alternatively, test `eleven_multilingual_v2` on voices already in the catalog by generating a sample Spanish phrase — pick the 3 that sound most natural. Replace the `TO_CONFIRM_*` placeholder IDs before shipping. IDs must be unique across the catalog.

### Voice Preview

A new tRPC procedure `shop.previewVoice` generates a short TTS clip server-side and returns it as a base64 data URL. The frontend plays it via `new Audio(dataUrl).play()`.

```typescript
// server/shopRouter.ts — new procedure
previewVoice: protectedProcedure
  .input(z.object({ voiceId: z.string(), text: z.string().max(200).optional() }))
  .mutation(async ({ input }) => {
    const text = input.text ?? "Hi, thanks for calling! This is your AI assistant. How can I help you today?";
    const audio = await previewVoiceTTS(input.voiceId, text); // returns Buffer
    return { audio: `data:audio/mpeg;base64,${audio.toString("base64")}` };
  }),
```

`previewVoiceTTS` in `elevenLabsService.ts` calls `POST /v1/text-to-speech/{voice_id}` with `model_id: "eleven_multilingual_v2"`, `output_format: "mp3_44100_128"` (browser-compatible, not ulaw — preview only). Returns a `Buffer`.

### UI — Voice Picker Component

Replaces the raw text inputs in `AgentConfig.tsx` (the `<Input id="voice-id">` and `<Input id="voice-name">` fields).

- Grid of 16 voice cards (2 columns on mobile, 4 columns on desktop), grouped by accent label.
- Each card: avatar circle (color-coded by accent/gender), name, 1-line description, "Top Pick" badge if applicable, play button.
- Selected voice: teal ring + checkmark. Clicking another card deselects.
- Play button triggers `previewVoice` mutation. While loading: spinner. Plays via `new Audio(dataUrl).play()`. One preview at a time (cancel previous).
- The selected `voiceId` and `voiceName` are stored in component state exactly as before — no schema change needed here.

---

## 2. Personality System

### Schema Changes

Add 4 columns to `agent_configs` in `drizzle/schema.ts`:

```typescript
characterPreset: varchar("characterPreset", { length: 32 }).default("warm_helper").notNull(),
warmth:          integer("warmth").default(4).notNull(),          // 1–5
salesIntensity:  integer("salesIntensity").default(3).notNull(),  // 1–5
technicalDepth:  integer("technicalDepth").default(2).notNull(),  // 1–5
```

Migration: one-off `.mjs` script (drizzle-kit push is broken — see `feedback_drizzle_broken.md`):
```sql
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS "characterPreset" varchar(32) NOT NULL DEFAULT 'warm_helper';
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS "warmth" integer NOT NULL DEFAULT 4;
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS "salesIntensity" integer NOT NULL DEFAULT 3;
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS "technicalDepth" integer NOT NULL DEFAULT 2;
```

### Character Presets — Default Slider Values

| Preset | characterPreset value | Warmth | Sales | Technical |
|--------|----------------------|--------|-------|-----------|
| Warm Helper | `warm_helper` | 5 | 2 | 2 |
| Efficient Closer | `efficient_closer` | 3 | 4 | 2 |
| Tech Expert | `tech_expert` | 3 | 3 | 5 |
| Sales Pro | `sales_pro` | 4 | 5 | 3 |

When a shop owner clicks a preset button, the 3 sliders snap to those defaults. They can then adjust from there — sliders always win. The `characterPreset` field is stored as a label (for display), but the 3 integers are what `promptCompiler.ts` actually uses.

### Prompt Compiler Changes

Add 4 fields to the `ShopContext` interface in `promptCompiler.ts`:
```typescript
characterPreset: string;   // "warm_helper" | "efficient_closer" | "tech_expert" | "sales_pro"
warmth: number;            // 1–5
salesIntensity: number;    // 1–5
technicalDepth: number;    // 1–5
```
Also add them to `contextCache.ts`'s `ShopContext` assembly (lines ~80-120 where the context is built from DB rows). The context cache reads from `agent_configs` — it must include the new columns.

Add a `compilePersonalitySection(context)` helper that generates a personality block injected right after the HOW TO SOUND HUMAN section:

```typescript
function compilePersonalitySection(ctx: ShopContext): string {
  const warmthDesc = warmthDescriptions[Math.min(5, Math.max(1, ctx.warmth))];
  const salesDesc  = salesDescriptions[Math.min(5, Math.max(1, ctx.salesIntensity))];
  const techDesc   = techDescriptions[Math.min(5, Math.max(1, ctx.technicalDepth))];

  return `═══════════════════════════════════════════════════
PERSONALITY CALIBRATION
═══════════════════════════════════════════════════

WARMTH LEVEL (${ctx.warmth}/5): ${warmthDesc}
SALES INTENSITY (${ctx.salesIntensity}/5): ${salesDesc}
TECHNICAL DEPTH (${ctx.technicalDepth}/5): ${techDesc}`;
}
```

Descriptor maps:

```typescript
const warmthDescriptions: Record<number, string> = {
  1: "Professional and efficient. Friendly but minimal small talk. Get to the point fast.",
  2: "Polite and pleasant. A bit warmer than purely transactional, but mostly business.",
  3: "Balanced. Warm when appropriate, efficient when the caller is in a rush.",
  4: "Warm and conversational. Make callers feel welcomed and at ease. A bit of light small talk is fine.",
  5: "Very warm and personable. This shop feels like family. Callers should feel like they're talking to a friend who happens to know cars.",
};

const salesDescriptions: Record<number, string> = {
  1: "Never suggest additional services unless the caller specifically asks. Pure service mode.",
  2: "Only mention additional services if there's an obvious direct connection (e.g., oil change → tire rotation).",
  3: "Balanced upseller. One natural suggestion per call if the moment is right. Never push.",
  4: "Proactive but tasteful. Look for upsell opportunities, make them feel helpful not salesy.",
  5: "Revenue-focused. Actively look for every appropriate upsell opportunity. Still smooth — never aggressive.",
};

const techDescriptions: Record<number, string> = {
  1: "Keep it simple. No jargon. Explain things like the caller knows nothing about cars.",
  2: "Mostly simple. Use a technical term only if it helps clarity, then briefly explain it.",
  3: "Moderate. Use standard automotive terms (brake pads, rotors, serpentine belt) without over-explaining.",
  4: "Technical and knowledgeable. Comfortable discussing diagnostic codes, part specs, fluid types.",
  5: "Deep technical mode. Speak with a mechanic's vocabulary. Callers who want detail get full detail.",
};
```

### tRPC / Router Changes

In `server/shopRouter.ts`, extend `saveAgentConfig` input schema:
```typescript
characterPreset: z.enum(["warm_helper", "efficient_closer", "tech_expert", "sales_pro"]).optional(),
warmth:         z.number().int().min(1).max(5).optional(),
salesIntensity: z.number().int().min(1).max(5).optional(),
technicalDepth: z.number().int().min(1).max(5).optional(),
```

Pass them through to the DB upsert. Add the same fields to `getAgentConfig` return.

### UI — Personality Card (AgentConfig.tsx)

New Card between "Voice & Identity" and "System Prompt" (or replace the system prompt card's position):

- **Step 1 — Character**: 4 pill/card buttons (Warm Helper, Efficient Closer, Tech Expert, Sales Pro). Clicking one snaps sliders to preset defaults.
- **Step 2 — Fine-tune**: 3 labeled sliders using shadcn `<Slider>`. Warmth (1-5), Sales Intensity (1-5), Technical Depth (1-5). Each slider has left/right label descriptions.
- The "System Prompt" raw textarea is moved into a shadcn `<Collapsible>` (closed by default) labeled "Custom Instructions (Advanced)". The trigger is a small "Advanced settings" link. Inside: existing `<Textarea>`, the character count, and a note: "The personality settings above automatically build your agent's instructions. Only add custom rules here for things unique to your shop (e.g., 'Always mention we offer fleet discounts')."

---

## 3. Language & Knowledge

### Supported Languages

8 languages, added to `ShopContext.language` as a language code. The existing `varchar(16)` column is sufficient.

| Code | Language | Notes |
|------|----------|-------|
| `en` | English (American) | Default |
| `es` | Spanish | Latin American primary |
| `ar` | Arabic | MSA + colloquial mix |
| `pt` | Portuguese | Brazilian |
| `hi` | Hindi | Hinglish-friendly |
| `bn` | Bangla | Conversational, not formal |
| `it` | Italian | New |
| `tr` | Turkish | New |

The UI language selector changes from a raw text input to a dropdown with these 8 options.

### Conversational Language Guide in System Prompt

The current MULTILINGUAL SUPPORT section is too generic — it says "use natural phrasing" but gives no actual guidance per language. Replace it with a compiled per-language section:

```typescript
function compileLanguageSection(language: string): string {
  const guide = languageGuides[language] ?? languageGuides["en"];
  return `═══════════════════════════════════════════════════
LANGUAGE & TONE GUIDE
═══════════════════════════════════════════════════

Primary language: ${guide.name}
${guide.instructions}

MULTILINGUAL CALLER DETECTION:
- If a caller speaks a different language, immediately switch. Match their language.
- If they mix languages (Hinglish, Spanglish, etc.), mirror that mix — don't force one language.
- Offer language accommodation: "I also speak [language] if that's easier for you."
- NEVER make anyone feel bad about their English. Accommodate, don't correct.`;
}
```

Language guide map (each entry has natural speech examples specific to that language's register):

```typescript
const languageGuides: Record<string, { name: string; instructions: string }> = {
  en: {
    name: "English (American)",
    instructions: `Speak in natural American English. Contractions always ("you'll", "we're", "that's"). Casual fillers: "So...", "Yeah, absolutely", "Oh for sure", "Hmm, good question". React naturally: "Oh wow, yeah that doesn't sound good."`,
  },
  es: {
    name: "Spanish (Latin American)",
    instructions: `Habla en español latinoamericano coloquial. NO uses español de libro de texto. Usa contracciones y expresiones naturales: "¿Y qué onda con el carro?", "Órale, déjame checar", "No te preocupes, lo arreglamos". Tutea al cliente a menos que sean muy formales. Expresiones de confianza: "Sale", "Ándale", "Simón", "Claro que sí". Evita: "Por favor, proceda a indicarme" — eso suena robótico. Sé como el recepcionista amigable de un taller real.`,
  },
  ar: {
    name: "Arabic",
    instructions: `تكلم بالعربية العامية المحكية، ليس الفصحى الرسمية. استخدم تعبيرات طبيعية: "إيه، تمام"، "خلني أشوف"، "لا تقلق، إحنا نتكفل". ابدأ بـ"السلام عليكم" إذا ناسب. كن ودوداً وغير رسمي. تجنب اللغة الفصحى الرسمية جداً — يجب أن تبدو كشخص حقيقي يعمل في الورشة.`,
  },
  pt: {
    name: "Portuguese (Brazilian)",
    instructions: `Fala português brasileiro informal. Usa expressões naturais: "Oi, tudo bem?", "É, deixa eu ver aqui", "Sem problema, a gente resolve". Tuteia o cliente. Usa contrações brasileiras: "tá", "né", "pra". Evita português europeu formal. Soa como recepcionista real de oficina.`,
  },
  hi: {
    name: "Hindi (Hinglish-friendly)",
    instructions: `बोलचाल की हिंदी इस्तेमाल करें, किताबी हिंदी नहीं। अगर ग्राहक Hinglish बोले (Hindi + English mix) तो आप भी mix करें — यह बिल्कुल natural है। उदाहरण: "हाँ बिल्कुल, let me check", "कोई बात नहीं, हम कर देंगे", "आपकी car का क्या issue है?" बहुत formal मत बोलो जैसे "कृपया अपनी समस्या बताइए" — यह robotic लगता है। Real receptionist की तरह बात करो।`,
  },
  bn: {
    name: "Bangla (Conversational)",
    instructions: `কথ্য বাংলায় কথা বলুন, সাহিত্যিক বা সংবাদপত্রের ভাষায় নয়। স্বাভাবিক বাংলা ব্যবহার করুন: "হ্যাঁ, দেখছি", "কোনো সমস্যা নেই", "গাড়িতে কী হয়েছে?" বাংলা-ইংরেজি মিক্স করুন যদি কাস্টমার করেন — সেটা স্বাভাবিক। অতি আনুষ্ঠানিক ভাষা এড়িয়ে চলুন। সরল, বন্ধুত্বপূর্ণ ভাষায় কথা বলুন — যেন একজন পরিচিত লোক কথা বলছে।`,
  },
  it: {
    name: "Italian",
    instructions: `Parla in italiano colloquiale, non formale. Usa espressioni naturali: "Certo, vediamo un po'", "Nessun problema", "Dimmi, che problema ha la macchina?" Dai del "tu" al cliente a meno che non sia chiaramente formale. Espressioni tipiche: "Dai", "Capito", "Perfetto". Evita l'italiano burocratico — sembra robotico. Sii come il receptionist simpatico di un'officina vera.`,
  },
  tr: {
    name: "Turkish",
    instructions: `Doğal, günlük Türkçe konuş — resmi ya da kitabi değil. Doğal ifadeler kullan: "Tabii, bir bakayım", "Sorun değil, hallederiz", "Arabanızda ne sorunu var?" Müşteriyle samimi ol ama saygılı. "Rica ederim" yerine "hay hay" gibi daha samimi ifadeler kullan. Gerçek bir oto servis resepsiyonisti gibi konuş.`,
  },
};
```

### Auto Repair Knowledge Block

Every agent already gets the service catalog, but there's no foundational auto repair knowledge. Add a new section to `compileSystemPrompt` — placed after the service catalog section:

```typescript
const AUTO_REPAIR_KNOWLEDGE = `═══════════════════════════════════════════════════
AUTO REPAIR KNOWLEDGE (ALL AGENTS)
═══════════════════════════════════════════════════

You know cars deeply. Not as a mechanic diagnosing — as a knowledgeable service advisor who has heard every car problem thousands of times. This helps you:
1. Understand what the customer is describing even if they don't know the right words
2. Ask the right clarifying questions
3. Map their symptom to a likely service (then book the diagnostic)

COMMON SYMPTOM → LIKELY CAUSE MAP (for YOUR internal reasoning only — never diagnose out loud):
- "Squealing/grinding brakes" → brake pads worn, possible rotor damage
- "Car pulls to one side" → alignment, tire pressure, or brake issue
- "Check engine light" → can be anything — always recommend diagnostic scan
- "Car won't start / clicks" → battery, alternator, or starter
- "Overheating" → coolant, thermostat, water pump, or radiator
- "Rough idle / shaking" → spark plugs, fuel injectors, or MAF sensor
- "Vibration at highway speed" → tire balance, wheel bearings, or CV axle
- "Smoke from hood" → oil leak onto exhaust, coolant leak, overheating
- "AC not cold" → refrigerant recharge, compressor, or cabin filter
- "Hard to steer" → power steering fluid, pump, or rack and pinion
- "Knocking sound from engine" → oil level low, rod bearings — urgent
- "Transmission slipping / jerking" → fluid level, filter, or transmission service

MAINTENANCE KNOWLEDGE (standard intervals — use only as general guidance):
- Oil change: every 3k–7.5k miles (depends on oil type and vehicle)
- Tire rotation: every 5k–7.5k miles
- Brake inspection: every 12k miles or once a year
- Air filter: every 15k–30k miles
- Cabin filter: every 15k–25k miles
- Spark plugs: every 30k–100k miles (varies widely)
- Coolant flush: every 30k miles or every 2 years
- Transmission fluid: every 30k–60k miles
- Timing belt: every 60k–100k miles (critical — failure = engine damage)
- Battery: typically 3–5 years

HOW TO USE THIS KNOWLEDGE:
- "Oh yeah, that squealing sound is usually the brake pads telling you it's time. We should get those looked at."
- "So the check engine light — honestly that could be a bunch of different things. The best thing is to bring it in and we'll hook it up to the scanner, usually takes about 20 minutes."
- NEVER say "It sounds like your [specific part] is failing" — you're not diagnosing, you're guiding.
- NEVER give a cost estimate for repairs not in the service catalog.`;
```

---

## What Does NOT Change

- The existing raw "Custom Instructions" textarea stays, now collapsed/secondary.
- `upsellRules`, `confidenceThreshold`, `maxUpsellsPerCall` — all stay as-is.
- `greeting` field — stays.
- `elevenLabsAgentId`, agent provisioning flow — no change.
- The "Go Live" / "Update Agent" button flow — no change.
- Ring-shop-first, post-call pipeline, Stripe — untouched.

---

## Files Changed

| File | Change |
|------|--------|
| `drizzle/schema.ts` | +4 columns to `agent_configs` |
| `scripts/add-personality-columns.mjs` | Migration script |
| `server/services/promptCompiler.ts` | +personality section, +language guide, +auto repair knowledge, ShopContext gets 4 new fields |
| `server/services/elevenLabsService.ts` | +`VOICE_CATALOG` constant, +`previewVoiceTTS()` function |
| `server/shopRouter.ts` | +`previewVoice` procedure, extend `saveAgentConfig` + `getAgentConfig` with new fields |
| `client/src/pages/AgentConfig.tsx` | Replace voice text inputs → VoicePickerCard, add PersonalityCard, language dropdown, collapse system prompt textarea |
| `client/src/pages/Onboarding.tsx` | Step 3 "AI Agent" uses same VoicePickerCard + PersonalityCard components |

---

## Verification

```bash
pnpm run check        # must pass clean
pnpm test             # 18/18 files, 0 failing
pnpm run build:vercel # must produce api/index.js cleanly
```

Smoke test:
1. Go to AgentConfig for a test shop
2. Voice picker: click Rachel → preview plays → saved voice ID is correct
3. Personality: click "Sales Pro" → sliders snap to (4, 5, 3) → drag Warmth to 2 → save → reload → sliders still at (2, 5, 3)
4. Language: switch to Spanish → save → call the shop → agent speaks Spanish in conversational tone
5. Call with no language switch (English) → verify auto repair knowledge is evident in agent responses
