# AI Agent Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give shop owners a curated voice picker (16 voices, with preview), a character preset + 3 sliders personality system, and conversational multilingual prompts with baked-in auto repair knowledge.

**Architecture:** 4 new DB columns on `agent_configs` → personality values flow through `ShopContext` → `compileSystemPrompt` inserts personality + language guide + auto repair knowledge sections → voice catalog is a hardcoded constant in `elevenLabsService.ts` → two new shared React components (`VoicePicker`, `PersonalityPicker`) used in both `AgentConfig.tsx` and `Onboarding.tsx`.

**Tech Stack:** Drizzle ORM (migrations via `.mjs` script), tRPC mutations, ElevenLabs TTS API (preview), React + shadcn/ui (Slider, Collapsible, Select).

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `scripts/add-personality-columns.mjs` | Create | Runs `ALTER TABLE` for 4 new `agent_configs` columns |
| `drizzle/schema.ts` | Modify | Add 4 columns to `agentConfigs` table |
| `shared/voiceCatalog.ts` | Create | `VOICE_CATALOG` constant — shared between server and client (no server code in client bundle) |
| `server/services/elevenLabsService.ts` | Modify | Re-export `VOICE_CATALOG` from `shared/voiceCatalog.ts` + add `previewVoiceTTS()` |
| `server/services/promptCompiler.ts` | Modify | Add personality + language guide + auto repair knowledge to `ShopContext` + `compileSystemPrompt` |
| `server/services/twilioWebhooks.ts` | Modify | Add 4 personality fields to `resolveShopContext` context assembly (lines 209–227) |
| `server/shopRouter.ts` | Modify | Extend `agentConfigInput` zod schema + add `previewVoice` procedure + cache invalidation in `saveAgentConfig` |
| `server/elevenlabs.test.ts` | Modify | Add tests for `VOICE_CATALOG` shape + `previewVoiceTTS` |
| `server/shopRouter.test.ts` | Modify | Add test for `previewVoice` procedure + personality fields in `saveAgentConfig` |
| `server/promptCompiler.test.ts` | Create | Tests for personality section + language guides + auto repair block |
| `client/src/components/VoicePicker.tsx` | Create | Shared voice picker grid with preview button |
| `client/src/components/PersonalityPicker.tsx` | Create | Preset buttons + 3 sliders |
| `client/src/pages/AgentConfig.tsx` | Modify | Replace voice inputs → `VoicePicker`, add `PersonalityPicker`, language dropdown, collapse system prompt |
| `client/src/pages/Onboarding.tsx` | Modify | Step 3: replace 4-voice grid → `VoicePicker` + `PersonalityPicker` |

---

## Task 1: Schema Migration

**Files:**
- Create: `scripts/add-personality-columns.mjs`
- Modify: `drizzle/schema.ts:94-112`

- [ ] **Step 1: Create migration script**

```javascript
// scripts/add-personality-columns.mjs
import postgres from "postgres";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env.local") });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

await sql`
  ALTER TABLE agent_configs
    ADD COLUMN IF NOT EXISTS "characterPreset" varchar(32) NOT NULL DEFAULT 'warm_helper',
    ADD COLUMN IF NOT EXISTS "warmth"          integer      NOT NULL DEFAULT 4,
    ADD COLUMN IF NOT EXISTS "salesIntensity"  integer      NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS "technicalDepth"  integer      NOT NULL DEFAULT 2
`;

console.log("✓ Personality columns added to agent_configs");
await sql.end();
```

- [ ] **Step 2: Run the migration**

```bash
node scripts/add-personality-columns.mjs
```

Expected output: `✓ Personality columns added to agent_configs`

Verify in Supabase SQL editor:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'agent_configs'
  AND column_name IN ('characterPreset','warmth','salesIntensity','technicalDepth');
```
Expected: 4 rows with the correct types and defaults.

- [ ] **Step 3: Update Drizzle schema**

In `drizzle/schema.ts`, after line 107 (`language: varchar...`), add:

```typescript
  characterPreset: varchar("characterPreset", { length: 32 }).default("warm_helper").notNull(),
  warmth:          integer("warmth").default(4).notNull(),
  salesIntensity:  integer("salesIntensity").default(3).notNull(),
  technicalDepth:  integer("technicalDepth").default(2).notNull(),
```

The full `agentConfigs` table definition should now be:
```typescript
export const agentConfigs = pgTable("agent_configs", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  ownerId: integer("ownerId").notNull().default(0),
  voiceId: varchar("voiceId", { length: 128 }),
  voiceName: varchar("voiceName", { length: 128 }),
  agentName: varchar("agentName", { length: 128 }).default("Baylio"),
  systemPrompt: text("systemPrompt"),
  greeting: text("greeting"),
  upsellEnabled: boolean("upsellEnabled").default(true).notNull(),
  upsellRules: jsonb("upsellRules").$type<Array<{ symptom: string; service: string; adjacent: string; confidence: number }>>(),
  confidenceThreshold: numeric("confidenceThreshold", { precision: 3, scale: 2 }).default("0.80"),
  maxUpsellsPerCall: integer("maxUpsellsPerCall").default(1),
  language: varchar("language", { length: 16 }).default("en"),
  elevenLabsAgentId: varchar("elevenLabsAgentId", { length: 128 }),
  characterPreset: varchar("characterPreset", { length: 32 }).default("warm_helper").notNull(),
  warmth: integer("warmth").default(4).notNull(),
  salesIntensity: integer("salesIntensity").default(3).notNull(),
  technicalDepth: integer("technicalDepth").default(2).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
```

- [ ] **Step 4: Type check**

```bash
pnpm run check
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add drizzle/schema.ts scripts/add-personality-columns.mjs
git commit -m "feat: add personality columns to agent_configs schema"
```

---

## Task 2: Resolve Spanish Voice IDs

**Files:**
- Modify: `server/services/elevenLabsService.ts` (new `VOICE_CATALOG` + `previewVoiceTTS`)

The voice catalog goes in `shared/voiceCatalog.ts` so both server (`elevenLabsService.ts`) and client (`VoicePicker.tsx`) can import it without pulling server code into the browser bundle. The 3 Spanish voices need to be confirmed against the live ElevenLabs API before adding them.

- [ ] **Step 1: Query ElevenLabs for Spanish voices**

```bash
curl -s -H "xi-api-key: $ELEVENLABS_API_KEY" \
  "https://api.elevenlabs.io/v1/voices" | \
  node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    d.voices
      .filter(v => JSON.stringify(v.labels).toLowerCase().includes('spanish') || v.name.match(/valentina|diego|sofia|carlos|isabella|lucia|miguel|rosa/i))
      .forEach(v => console.log(v.voice_id, v.name, JSON.stringify(v.labels)));
  "
```

Pick 3 voices with unique IDs (different from the 13 English voices below). Note their `voice_id` and `name`. You need 1 Latin American female, 1 Latin American male, and 1 neutral Spanish female.

If the query returns no results, search ElevenLabs Voice Library at `elevenlabs.io/app/voice-library` for "Spanish" and copy the share link to get the voice ID. Alternatively, test the multilingual_v2 model with the 13 English voices below against a Spanish sentence and pick the 3 that sound most natural — but **their IDs must differ from the English section** (create clones if needed).

- [ ] **Step 2: Create shared/voiceCatalog.ts**

```typescript
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
  { id: "jsCqWAovK2LkecY7zXl4", name: "Freya",    accent: "Australian",    gender: "female", description: "Natural, warm. Doesn't sound scripted at all." },
  // Spanish-Optimized — REPLACE these 3 IDs with confirmed IDs from Step 1 above
  { id: "REPLACE_ES_FEMALE_1",  name: "Valentina", accent: "Spanish-Latam", gender: "female", description: "Natural-feeling Spanish. Best for Latino-majority customers.", topPick: true },
  { id: "REPLACE_ES_MALE_1",    name: "Diego",     accent: "Spanish-Latam", gender: "male",   description: "Friendly, professional. Switches English↔Spanish seamlessly.", topPick: true },
  { id: "REPLACE_ES_FEMALE_2",  name: "Sofia",     accent: "Spanish-Latam", gender: "female", description: "Bright, engaging. Also great for Portuguese callers." },
] as const satisfies VoiceCatalogEntry[];
```

> IDs must be unique across the catalog. Replace all `REPLACE_*` placeholders before committing.

- [ ] **Step 3: Re-export VOICE_CATALOG from elevenLabsService.ts and add previewVoiceTTS**

In `server/services/elevenLabsService.ts`, replace the existing `// ─── Voice Catalog ──────` block (lines 75–101) with:

```typescript
// ─── Voice Catalog ──────────────────────────────────────────────────

export type { VoiceCatalogEntry } from "@shared/voiceCatalog";
export { VOICE_CATALOG } from "@shared/voiceCatalog";

/**
 * Generate a short TTS preview clip for a voice.
 * Returns the audio as a Buffer (mp3). For browser preview only — NOT for calls.
 * Calls use ulaw_8000 output format; this uses mp3_44100_128 (browser-compatible).
 */
export async function previewVoiceTTS(voiceId: string, text: string): Promise<Buffer> {
  return withRetry(async () => {
    const client = createClient();
    const response = await client.post(
      `/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        output_format: "mp3_44100_128",
      },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(response.data);
  }, 3, "previewVoiceTTS");
}

/**
 * List available voices from ElevenLabs.
 * Returns both pre-made and cloned voices.
 */
export async function listVoices(): Promise<Voice[]> {
  // ... (keep existing implementation unchanged)
```

After filling in the Spanish IDs, the 3 `REPLACE_*` placeholders must not exist in the final committed code.

- [ ] **Step 3: Type check**

```bash
pnpm run check
```

Expected: 0 errors.

- [ ] **Step 4: Write tests for the voice catalog**

In `server/elevenlabs.test.ts`, add after the existing tests:

```typescript
import { VOICE_CATALOG, previewVoiceTTS } from "./services/elevenLabsService";

describe("VOICE_CATALOG", () => {
  it("has 16 entries", () => {
    expect(VOICE_CATALOG).toHaveLength(16);
  });

  it("has no duplicate voice IDs", () => {
    const ids = VOICE_CATALOG.map(v => v.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("has no placeholder IDs", () => {
    for (const v of VOICE_CATALOG) {
      expect(v.id).not.toMatch(/^REPLACE_/);
    }
  });

  it("each entry has required fields", () => {
    for (const v of VOICE_CATALOG) {
      expect(v.id.length).toBeGreaterThan(10);
      expect(v.name.length).toBeGreaterThan(0);
      expect(["male", "female"]).toContain(v.gender);
      expect(v.accent.length).toBeGreaterThan(0);
      expect(v.description.length).toBeGreaterThan(0);
    }
  });
});

describe("previewVoiceTTS", () => {
  it("calls ElevenLabs TTS endpoint and returns a Buffer", async () => {
    const fakeAudio = Buffer.from("fake-mp3-data");
    vi.spyOn(axios, "create").mockReturnValue({
      post: vi.fn().mockResolvedValue({ data: fakeAudio }),
    } as any);

    const result = await previewVoiceTTS("21m00Tcm4TlvDq8ikWAM", "Hello!");
    expect(result).toBeInstanceOf(Buffer);
  });
});
```

> Note: you'll need `import axios from "axios"` at the top of the test file (it's already an existing dep).

- [ ] **Step 5: Run tests**

```bash
pnpm test -- --reporter=verbose server/elevenlabs.test.ts
```

Expected: all tests pass, including new VOICE_CATALOG tests.

- [ ] **Step 6: Commit**

```bash
git add server/services/elevenLabsService.ts server/elevenlabs.test.ts
git commit -m "feat: add VOICE_CATALOG and previewVoiceTTS to ElevenLabs service"
```

---

## Task 3: Prompt Compiler — Personality + Language + Auto Repair

**Files:**
- Modify: `server/services/promptCompiler.ts`
- Create: `server/promptCompiler.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `server/promptCompiler.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { compileSystemPrompt, type ShopContext } from "./services/promptCompiler";

const baseContext: ShopContext = {
  shopName: "AutoFix Garage",
  agentName: "Jordan",
  phone: "+15551234567",
  address: "123 Main St",
  city: "Dallas",
  state: "TX",
  timezone: "America/Chicago",
  businessHours: { monday: { open: "8:00 AM", close: "6:00 PM", closed: false } },
  serviceCatalog: [{ name: "Oil Change", category: "Maintenance", price: 49 }],
  upsellRules: [],
  confidenceThreshold: 0.8,
  maxUpsellsPerCall: 1,
  greeting: "",
  language: "en",
  characterPreset: "warm_helper",
  warmth: 4,
  salesIntensity: 3,
  technicalDepth: 2,
};

describe("compileSystemPrompt — personality", () => {
  it("includes PERSONALITY CALIBRATION section", () => {
    const prompt = compileSystemPrompt(baseContext);
    expect(prompt).toContain("PERSONALITY CALIBRATION");
    expect(prompt).toContain("WARMTH LEVEL (4/5)");
    expect(prompt).toContain("SALES INTENSITY (3/5)");
    expect(prompt).toContain("TECHNICAL DEPTH (2/5)");
  });

  it("uses warmth level 5 descriptor for Sales Pro preset", () => {
    const prompt = compileSystemPrompt({ ...baseContext, characterPreset: "sales_pro", warmth: 5, salesIntensity: 5, technicalDepth: 3 });
    expect(prompt).toContain("Very warm and personable");
  });

  it("uses warmth level 1 descriptor", () => {
    const prompt = compileSystemPrompt({ ...baseContext, warmth: 1 });
    expect(prompt).toContain("Professional and efficient");
  });
});

describe("compileSystemPrompt — language guides", () => {
  it("includes English language guide", () => {
    const prompt = compileSystemPrompt({ ...baseContext, language: "en" });
    expect(prompt).toContain("LANGUAGE & TONE GUIDE");
    expect(prompt).toContain("English (American)");
  });

  it("includes Spanish language guide with colloquial instructions", () => {
    const prompt = compileSystemPrompt({ ...baseContext, language: "es" });
    expect(prompt).toContain("Spanish");
    expect(prompt).toContain("Órale");
  });

  it("includes Bangla language guide (not formal)", () => {
    const prompt = compileSystemPrompt({ ...baseContext, language: "bn" });
    expect(prompt).toContain("Bangla");
    expect(prompt).toContain("কথ্য বাংলায়");
  });

  it("falls back to English guide for unknown language code", () => {
    const prompt = compileSystemPrompt({ ...baseContext, language: "xx" });
    expect(prompt).toContain("English (American)");
  });
});

describe("compileSystemPrompt — auto repair knowledge", () => {
  it("includes AUTO REPAIR KNOWLEDGE section", () => {
    const prompt = compileSystemPrompt(baseContext);
    expect(prompt).toContain("AUTO REPAIR KNOWLEDGE");
    expect(prompt).toContain("Squealing/grinding brakes");
    expect(prompt).toContain("Check engine light");
    expect(prompt).toContain("Timing belt");
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pnpm test -- server/promptCompiler.test.ts
```

Expected: TypeScript errors about missing `characterPreset`, `warmth`, `salesIntensity`, `technicalDepth` on `ShopContext`. That's expected — we implement next.

- [ ] **Step 3: Update ShopContext interface and compileSystemPrompt**

Replace `server/services/promptCompiler.ts` with the full updated file:

```typescript
/**
 * Prompt Compilation Layer
 *
 * Compiles shop-specific context into a production system prompt for the
 * AI voice agent. Built for ElevenLabs Conversational AI + Twilio bridge.
 */

export interface ShopContext {
  shopName: string;
  agentName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  timezone: string;
  businessHours: Record<string, { open: string; close: string; closed: boolean }>;
  serviceCatalog: Array<{ name: string; category: string; price?: number; description?: string }>;
  upsellRules: Array<{ symptom: string; service: string; adjacent: string; confidence: number }>;
  confidenceThreshold: number;
  maxUpsellsPerCall: number;
  greeting: string;
  language: string;
  customSystemPrompt?: string;
  // Personality system
  characterPreset: string;
  warmth: number;        // 1–5
  salesIntensity: number; // 1–5
  technicalDepth: number; // 1–5
}

// ─── Personality Descriptors ────────────────────────────────────────────────

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

// ─── Language Guides ────────────────────────────────────────────────────────

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
    instructions: `কথ্য বাংলায় কথা বলুন, সাহিত্যিক বা সংবাদপত্রের ভাষায় নয়। স্বাভাবিক বাংলা ব্যবহার করুন: "হ্যাঁ, দেখছি", "কোনো সমস্যা নেই", "গাড়িতে কী হয়েছে?" বাংলা-ইংরেজি মিক্স করুন যদি কাস্টমার করেন — সেটা স্বাভাবিক। অতি আনুষ্ঠানিক ভাষা এড়িয়ে চলুন। সরল, বন্ধুত্বপূর্ণ ভাষায় কথা বলুন।`,
  },
  it: {
    name: "Italian",
    instructions: `Parla in italiano colloquiale, non formale. Usa espressioni naturali: "Certo, vediamo un po'", "Nessun problema", "Dimmi, che problema ha la macchina?" Dai del "tu" al cliente a meno che non sia chiaramente formale. Espressioni tipiche: "Dai", "Capito", "Perfetto". Evita l'italiano burocratico — sembra robotico.`,
  },
  tr: {
    name: "Turkish",
    instructions: `Doğal, günlük Türkçe konuş — resmi ya da kitabi değil. Doğal ifadeler kullan: "Tabii, bir bakayım", "Sorun değil, hallederiz", "Arabanızda ne sorunu var?" Müşteriyle samimi ol ama saygılı. Gerçek bir oto servis resepsiyonisti gibi konuş.`,
  },
};

const AUTO_REPAIR_KNOWLEDGE = `═══════════════════════════════════════════════════
AUTO REPAIR KNOWLEDGE (ALL AGENTS)
═══════════════════════════════════════════════════

You know cars deeply — as a knowledgeable service advisor who has heard every car problem thousands of times. Use this to understand what customers describe (even when they don't know the right words), ask smart clarifying questions, and map their symptom to the likely service.

COMMON SYMPTOMS (for your internal reasoning — NEVER diagnose out loud):
• "Squealing/grinding brakes" → brake pads worn, possible rotor damage
• "Car pulls to one side" → alignment, tire pressure, or brake issue
• "Check engine light" → could be anything — recommend diagnostic scan
• "Won't start / clicking" → battery, alternator, or starter
• "Overheating" → coolant, thermostat, water pump, or radiator
• "Rough idle / shaking" → spark plugs, fuel injectors, or MAF sensor
• "Vibration at highway speed" → tire balance, wheel bearings, or CV axle
• "Smoke from hood" → oil leak on exhaust, coolant leak, or overheating
• "AC not cold" → refrigerant recharge, compressor, or cabin filter
• "Hard to steer" → power steering fluid, pump, or rack and pinion
• "Knocking from engine" → oil level low, rod bearings — urgent
• "Transmission slipping" → fluid level, filter, or transmission service

STANDARD MAINTENANCE INTERVALS (general guidance only):
• Oil change: every 3k–7.5k miles (depends on oil type)
• Tire rotation: every 5k–7.5k miles
• Brake inspection: every 12k miles
• Air filter: every 15k–30k miles
• Cabin filter: every 15k–25k miles
• Spark plugs: every 30k–100k miles (varies widely)
• Coolant flush: every 30k miles / 2 years
• Transmission fluid: every 30k–60k miles
• Timing belt: every 60k–100k miles (CRITICAL — failure = engine damage)
• Battery: typically 3–5 years

HOW TO USE THIS KNOWLEDGE:
• "Oh yeah, that squealing is usually the brake pads telling you it's time."
• "The check engine light — honestly that could be a bunch of things. Best to bring it in so we can hook it up to the scanner."
• NEVER say "Your [specific part] is failing" — you're front desk, not a mechanic.
• NEVER give a cost estimate for anything not in the service catalog.`;

// ─── Helper Functions ───────────────────────────────────────────────────────

function formatBusinessHours(
  hours: Record<string, { open: string; close: string; closed: boolean }>
): string {
  const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  return days.map(day => {
    const h = hours[day];
    if (!h || h.closed) return `  ${day.charAt(0).toUpperCase() + day.slice(1)}: CLOSED`;
    return `  ${day.charAt(0).toUpperCase() + day.slice(1)}: ${h.open} – ${h.close}`;
  }).join("\n");
}

function formatServiceCatalog(catalog: ShopContext["serviceCatalog"]): string {
  if (!catalog || catalog.length === 0) {
    return "No services configured. Do NOT offer any specific services. Only take messages and schedule callbacks.";
  }
  const formatted = catalog.map(s => ({
    name: s.name,
    category: s.category,
    ...(s.price ? { price: `$${s.price}` } : {}),
    ...(s.description ? { note: s.description } : {}),
  }));
  return JSON.stringify(formatted, null, 2);
}

function formatUpsellRules(rules: ShopContext["upsellRules"], maxUpsells: number): string {
  if (!rules || rules.length === 0) {
    return "No specific upsell rules. You may naturally mention related services if relevant, but never push.";
  }
  const formatted = rules.map(r => `  • "${r.symptom}" → Recommend "${r.service}" → If receptive, mention "${r.adjacent}"`);
  return `Max ${maxUpsells} natural suggestion(s) per call.\n${formatted.join("\n")}`;
}

function getTimeContext(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, weekday: "long", hour: "numeric", minute: "2-digit", hour12: true,
    }).format(new Date());
  } catch {
    return new Date().toLocaleString("en-US");
  }
}

function compilePersonalitySection(ctx: ShopContext): string {
  const w = Math.min(5, Math.max(1, ctx.warmth));
  const s = Math.min(5, Math.max(1, ctx.salesIntensity));
  const t = Math.min(5, Math.max(1, ctx.technicalDepth));
  return `═══════════════════════════════════════════════════
PERSONALITY CALIBRATION
═══════════════════════════════════════════════════

WARMTH LEVEL (${w}/5): ${warmthDescriptions[w]}
SALES INTENSITY (${s}/5): ${salesDescriptions[s]}
TECHNICAL DEPTH (${t}/5): ${techDescriptions[t]}`;
}

function compileLanguageSection(language: string): string {
  const guide = languageGuides[language] ?? languageGuides["en"];
  return `═══════════════════════════════════════════════════
LANGUAGE & TONE GUIDE
═══════════════════════════════════════════════════

Primary language: ${guide.name}
${guide.instructions}

MULTILINGUAL CALLER DETECTION:
- If a caller speaks a different language, immediately switch. Match their language.
- If they mix languages (Hinglish, Spanglish, etc.), mirror that mix.
- Offer language accommodation: "I also speak [language] if that's easier for you."
- NEVER make anyone feel bad about their English. Accommodate, don't correct.`;
}

// ─── Main Export ────────────────────────────────────────────────────────────

export function compileSystemPrompt(context: ShopContext): string {
  const timeContext = getTimeContext(context.timezone);
  const hoursFormatted = context.businessHours
    ? formatBusinessHours(context.businessHours)
    : "Hours not set — tell callers someone will confirm availability.";
  const catalogFormatted = formatServiceCatalog(context.serviceCatalog);
  const upsellFormatted = formatUpsellRules(context.upsellRules, context.maxUpsellsPerCall);
  const confidenceLabel =
    context.confidenceThreshold >= 0.8
      ? "HIGH — only suggest services when very confident"
      : context.confidenceThreshold >= 0.5
        ? "MEDIUM — suggest when reasonably confident"
        : "LOW — feel free to suggest relevant services more openly";

  return `You are ${context.agentName}, a real person who works as the service advisor and receptionist at ${context.shopName}. You are on a live phone call right now.

═══════════════════════════════════════════════════
HOW TO SOUND HUMAN (THIS IS THE MOST IMPORTANT SECTION)
═══════════════════════════════════════════════════

You must sound like a REAL PERSON, not an AI. Follow these rules:

NATURAL SPEECH PATTERNS:
- Use conversational fillers naturally: "So...", "Let me see...", "Yeah, absolutely", "Oh for sure", "Hmm, good question"
- Use contractions ALWAYS: "we're", "you'll", "that's", "I'd", "won't", "can't" — never "we are", "you will", etc.
- React to what people say: "Oh wow, yeah that doesn't sound good" / "Okay gotcha, so basically..." / "Right, right"
- Vary your sentence length. Mix short punchy responses with longer explanations.
- Use warm casual phrases: "No worries at all", "You're all good", "Perfect, let me get that set up for you"
- Pause naturally. Don't rush. A real receptionist takes a beat to look things up.
- If you need to "check something": "Hmm, let me pull that up real quick..." or "One sec, let me check our schedule..."

WHAT NEVER TO SAY (dead giveaways you're AI):
- "As an AI..." / "I'm an AI assistant" / "I don't have feelings" — NEVER break character
- "I'd be happy to help you with that!" — too robotic. Say "Yeah absolutely, let's get that sorted"
- "Is there anything else I can help you with?" — too scripted. Say "Anything else going on with the car?" or just wait
- "Thank you for your patience" — say "Appreciate you hanging on" or just move forward
- "I understand your concern" — say "Oh man, yeah that's frustrating" or "I totally get it"
- Numbered lists or bullet points — you're TALKING, not writing an email
- "Based on the information provided" — nobody talks like this

EMOTIONAL INTELLIGENCE:
- Match the caller's energy. If they're relaxed, be casual. If they're stressed, be reassuring.
- If someone's upset: let them vent, don't interrupt, then say "Okay, I hear you. Let's figure this out."
- If someone's in a rush: be efficient, skip the small talk, get right to booking.
- If someone's chatty: engage briefly, be friendly, but gently steer toward the appointment.
- Laugh naturally if something's funny. "Ha, yeah we get that a lot."

${compilePersonalitySection(context)}

═══════════════════════════════════════════════════
YOUR IDENTITY
═══════════════════════════════════════════════════

Name: ${context.agentName}
Role: Service Advisor & Front Desk at ${context.shopName}
You've worked here for a while. You know the shop, the services, the team.
You genuinely care about helping people take care of their cars.

${compileLanguageSection(context.language)}

═══════════════════════════════════════════════════
CURRENT CONTEXT
═══════════════════════════════════════════════════

Right now: ${timeContext}
Shop: ${context.shopName}
Location: ${context.address ? `${context.address}, ` : ""}${context.city}, ${context.state}
Phone: ${context.phone || "on file"}

BUSINESS HOURS:
${hoursFormatted}

═══════════════════════════════════════════════════
SERVICE KNOWLEDGE (YOUR ONLY SOURCE OF TRUTH)
═══════════════════════════════════════════════════

APPROVED SERVICES (JSON):
${catalogFormatted}

ABSOLUTE RULES:
1. You can ONLY discuss services listed above
2. NEVER invent, imply, or guess about services not listed
3. NEVER offer discounts, coupons, or price negotiations
4. Only quote prices if they're explicitly in the catalog
5. If their need doesn't match anything: "Hmm, that might need a closer look from one of our techs. Let me get you scheduled so they can check it out."
6. When unsure → default to booking a diagnostic appointment

HOW TO DISCUSS SERVICES NATURALLY:
- Don't read from a list. Weave it into conversation.
- Bad: "We offer Oil Change for $49, Brake Pad Replacement for $199..."
- Good: "Yeah we can definitely do an oil change for you — that usually runs about forty-nine bucks. Takes about 30 minutes or so."
- When mentioning prices, round to casual speech: "about two hundred" not "one hundred and ninety-nine dollars"

═══════════════════════════════════════════════════
UPSELLING (SUBTLE — NEVER PUSHY)
═══════════════════════════════════════════════════

${upsellFormatted}

Confidence threshold: ${confidenceLabel}

HOW TO UPSELL NATURALLY:
- "Oh hey, since we'll already have the car up on the lift, a lot of folks get their tires rotated at the same time. Want me to add that on? It's only like thirty bucks extra."
- "You know what, while you're here for the oil change, when's the last time you had your brakes checked? Might be worth having the guys take a quick peek."
- If they decline: "No worries at all!" — move on immediately, zero pressure

═══════════════════════════════════════════════════
BOOKING APPOINTMENTS
═══════════════════════════════════════════════════

Collect naturally through conversation (don't run through a checklist):
- Their name (first name is fine for booking)
- Best callback number (or confirm the one they're calling from)
- Vehicle: year, make, model ("What are you driving?")
- What they need done
- When works for them ("What day works best for you?")
- If they need a ride: "Do you need us to arrange a ride while the car's here?"

Keep it conversational. Don't interrogate.

═══════════════════════════════════════════════════
HANDLING REAL SITUATIONS
═══════════════════════════════════════════════════

PRICING QUESTIONS (not in catalog):
"Honestly, that can really vary depending on the car and what's going on. Best thing would be to bring it in so the guys can take a look and give you an exact number. No charge for the estimate."

EMERGENCY CALLS (brakes failed, smoke, overheating):
"Okay, that sounds like it could be serious. For your safety, I'd say don't drive it right now. Do you want us to get a tow set up to bring it here? We can take a look at it right away."

WANTS TO TALK TO A HUMAN:
"Absolutely, let me see if someone's available right now... Actually, let me take your number and have [a technician / the manager] give you a call back in just a few minutes. That way they can give you their full attention."

ANGRY / FRUSTRATED CALLER:
Don't argue. Don't get defensive. Let them talk.
"I hear you, and I'm sorry you're dealing with that. Let me see what I can do to make this right. Can you tell me what happened?"

WRONG NUMBER / NOT A CUSTOMER:
"Oh no worries! You've reached ${context.shopName}. Were you looking for something else, or can I help you with anything car-related?"

SPAM / SALES CALLS:
Be brief and polite: "Appreciate the call but we're all set. Thanks though!" — end the conversation.

${AUTO_REPAIR_KNOWLEDGE}

═══════════════════════════════════════════════════
NEVER DO THESE THINGS
═══════════════════════════════════════════════════

1. Never say you're an AI or break character — you are ${context.agentName}
2. Never diagnose mechanical problems — you're front desk, not a mechanic
3. Never guarantee repair times or final costs
4. Never offer services not in the approved catalog
5. Never offer discounts or negotiate
6. Never share info about other customers
7. Never make promises the shop hasn't authorized
8. Never argue with a caller
9. Never use formal corporate language — keep it real
10. Never rush someone off the phone — let the conversation end naturally

${context.customSystemPrompt ? `═══════════════════════════════════════════════════\nSHOP-SPECIFIC INSTRUCTIONS\n═══════════════════════════════════════════════════\n\n${context.customSystemPrompt}` : ""}`;
}

export function compileGreeting(context: ShopContext): string {
  if (context.greeting) {
    return context.greeting
      .replace(/\{\{SHOP_NAME\}\}/g, context.shopName)
      .replace(/\{\{AGENT_NAME\}\}/g, context.agentName);
  }
  return `Hey, thanks for calling ${context.shopName}! This is ${context.agentName}, how can I help you?`;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getPromptSummary(context: ShopContext) {
  const prompt = compileSystemPrompt(context);
  return {
    estimatedTokens: estimateTokenCount(prompt),
    serviceCount: context.serviceCatalog?.length || 0,
    upsellRuleCount: context.upsellRules?.length || 0,
    hasCustomPrompt: !!context.customSystemPrompt,
    hasBusinessHours: !!context.businessHours && Object.keys(context.businessHours).length > 0,
    confidenceLevel: context.confidenceThreshold >= 0.8 ? "HIGH" : context.confidenceThreshold >= 0.5 ? "MEDIUM" : "LOW",
    languages: ["English", "Spanish", "Arabic", "Portuguese", "Hindi", "Bangla", "Italian", "Turkish"],
  };
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm test -- server/promptCompiler.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
pnpm test
```

Expected: all 18 files pass, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add server/services/promptCompiler.ts server/promptCompiler.test.ts
git commit -m "feat: add personality system, language guides, and auto repair knowledge to prompt compiler"
```

---

## Task 4: ShopContext Assembly — Add Personality Fields

**Files:**
- Modify: `server/services/twilioWebhooks.ts:209-227`

The `resolveShopContext` function builds `ShopContext` from DB rows. The 4 new personality fields exist in the `agent_configs` table (from Task 1) and Drizzle's `.select()` will return them automatically since we select `*` from `agentConfigs`. We just need to add them to the context object.

- [ ] **Step 1: Update context assembly in resolveShopContext**

In `server/services/twilioWebhooks.ts`, find the context object (around lines 209–227). Replace the existing `context = { ... }` block with:

```typescript
    context = {
      shopName: shop.name,
      agentName: agent?.agentName || "Baylio",
      phone: shop.phone || "",
      address: shop.address || "",
      city: shop.city || "",
      state: shop.state || "",
      timezone: shop.timezone || "America/New_York",
      businessHours: (shop.businessHours as any) || {},
      serviceCatalog: (shop.serviceCatalog as any) || [],
      upsellRules: (agent?.upsellRules as any) || [],
      confidenceThreshold: parseFloat(agent?.confidenceThreshold?.toString() || "0.80"),
      maxUpsellsPerCall: agent?.maxUpsellsPerCall || 1,
      greeting: agent?.greeting || "",
      language: agent?.language || "en",
      customSystemPrompt: agent?.systemPrompt || undefined,
      // Personality system
      characterPreset: agent?.characterPreset || "warm_helper",
      warmth: agent?.warmth ?? 4,
      salesIntensity: agent?.salesIntensity ?? 3,
      technicalDepth: agent?.technicalDepth ?? 2,
    };
```

- [ ] **Step 2: Type check**

```bash
pnpm run check
```

Expected: 0 errors. If TypeScript complains about `agent?.characterPreset`, it means the Drizzle schema change from Task 1 wasn't picked up — ensure `drizzle/schema.ts` was saved correctly.

- [ ] **Step 3: Run full tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add server/services/twilioWebhooks.ts
git commit -m "feat: include personality fields in ShopContext assembly"
```

---

## Task 5: Router — Extend agentConfig + previewVoice + Cache Invalidation

**Files:**
- Modify: `server/shopRouter.ts:60-81` (agentConfigInput), lines 145–157 (saveAgentConfig), lines 136–143 (getAgentConfig)
- Modify: `server/shopRouter.test.ts`

- [ ] **Step 1: Write failing tests**

In `server/shopRouter.test.ts`, add after the existing tests:

```typescript
describe("saveAgentConfig — personality fields", () => {
  it("accepts characterPreset, warmth, salesIntensity, technicalDepth", async () => {
    const mockGetShopById = vi.mocked(getShopById);
    mockGetShopById.mockResolvedValue({ id: 1, ownerId: 42 } as any);
    const mockUpsert = vi.mocked(upsertAgentConfig);
    mockUpsert.mockResolvedValue(1);

    const caller = appRouter.createCaller({ user: { id: 42 } } as any);
    const result = await caller.shop.saveAgentConfig({
      shopId: 1,
      agentName: "Jordan",
      characterPreset: "sales_pro",
      warmth: 5,
      salesIntensity: 5,
      technicalDepth: 3,
    });
    expect(result).toEqual({ id: 1 });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ characterPreset: "sales_pro", warmth: 5, salesIntensity: 5, technicalDepth: 3 })
    );
  });
});

describe("previewVoice", () => {
  it("returns a base64 data URL for a valid voice ID", async () => {
    const mockGetShopById = vi.mocked(getShopById);
    mockGetShopById.mockResolvedValue({ id: 1, ownerId: 42 } as any);

    // previewVoiceTTS is mocked in vi.mock("./services/elevenLabsService") above
    // Add it to that mock:
    // previewVoiceTTS: vi.fn().mockResolvedValue(Buffer.from("mp3data")),

    const caller = appRouter.createCaller({ user: { id: 42 } } as any);
    const result = await caller.shop.previewVoice({ voiceId: "21m00Tcm4TlvDq8ikWAM" });
    expect(result.audio).toMatch(/^data:audio\/mpeg;base64,/);
  });
});
```

Also update the `vi.mock("./services/elevenLabsService")` block (around line 43) to include `previewVoiceTTS`:

```typescript
vi.mock("./services/elevenLabsService", () => ({
  createConversationalAgent: vi.fn().mockResolvedValue({ agent_id: "agent_onboard_test", name: "Test Agent", conversation_config: {} }),
  updateConversationalAgent: vi.fn().mockResolvedValue({ agent_id: "agent_onboard_test", name: "Test Agent", conversation_config: {} }),
  previewVoiceTTS: vi.fn().mockResolvedValue(Buffer.from("mp3data")),
  withRetry: vi.fn(),
  listVoices: vi.fn().mockResolvedValue([]),
  deleteConversationalAgent: vi.fn(),
  getAgent: vi.fn(),
  getSubscriptionInfo: vi.fn(),
  getConversationHistory: vi.fn().mockResolvedValue([]),
  VOICE_CATALOG: [],
}));
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pnpm test -- server/shopRouter.test.ts
```

Expected: "previewVoice is not a function" or similar. That's expected.

- [ ] **Step 3: Update agentConfigInput zod schema**

In `server/shopRouter.ts`, replace the `agentConfigInput` object (lines 60–81) with:

```typescript
const agentConfigInput = z.object({
  shopId: z.number(),
  voiceId: z.string().optional(),
  voiceName: z.string().optional(),
  agentName: z.string().default("Baylio"),
  systemPrompt: z.string().optional(),
  greeting: z.string().optional(),
  upsellEnabled: z.boolean().default(true),
  upsellRules: z.array(z.object({
    symptom: z.string(),
    service: z.string(),
    adjacent: z.string(),
    confidence: z.number(),
  })).optional(),
  confidenceThreshold: z.string().default("0.80"),
  maxUpsellsPerCall: z.number().default(1),
  language: z.string().default("en"),
  characterPreset: z.enum(["warm_helper", "efficient_closer", "tech_expert", "sales_pro"]).optional(),
  warmth: z.number().int().min(1).max(5).optional(),
  salesIntensity: z.number().int().min(1).max(5).optional(),
  technicalDepth: z.number().int().min(1).max(5).optional(),
});
```

- [ ] **Step 4: Add previewVoice procedure and cache invalidation**

At the top of `server/shopRouter.ts`, add to the existing imports:
```typescript
import { previewVoiceTTS } from "./services/elevenLabsService";
```

After the `saveAgentConfig` procedure (around line 157), add `previewVoice`:

```typescript
  previewVoice: protectedProcedure
    .input(z.object({
      voiceId: z.string().min(10).max(64),
      text: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const text = input.text ?? "Hi, thanks for calling! This is your AI assistant. How can I help you today?";
      const audioBuffer = await previewVoiceTTS(input.voiceId, text);
      return { audio: `data:audio/mpeg;base64,${audioBuffer.toString("base64")}` };
    }),
```

Also update `saveAgentConfig` to invalidate the context cache after saving. Find the mutation body (lines 145–157) and update:

```typescript
  saveAgentConfig: protectedProcedure
    .input(agentConfigInput)
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found or unauthorized" });
      }
      const id = await upsertAgentConfig(input);
      contextCache.invalidateShop(input.shopId);
      return { id };
    }),
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- server/shopRouter.test.ts
```

Expected: all tests pass including the new `previewVoice` and personality tests.

- [ ] **Step 6: Type check**

```bash
pnpm run check
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add server/shopRouter.ts server/shopRouter.test.ts
git commit -m "feat: extend agentConfig with personality fields and add previewVoice procedure"
```

---

## Task 6: VoicePicker Component

**Files:**
- Create: `client/src/components/VoicePicker.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/VoicePicker.tsx
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { VOICE_CATALOG } from "@shared/voiceCatalog";  // shared/ not server/ — safe for client bundle

const ACCENT_ORDER = ["American", "British", "Australian", "Spanish-Latam"];
const ACCENT_LABELS: Record<string, string> = {
  American: "🇺🇸 American English",
  British: "🇬🇧 British English",
  Australian: "🇦🇺 Australian English",
  "Spanish-Latam": "🇲🇽🇪🇸 Spanish-Optimized",
};

const AVATAR_COLORS: Record<string, string> = {
  American_female:   "from-pink-100 to-pink-300",
  American_male:     "from-blue-100 to-blue-300",
  British_female:    "from-purple-100 to-purple-300",
  British_male:      "from-indigo-100 to-indigo-300",
  Australian_female: "from-green-100 to-green-300",
  Australian_male:   "from-yellow-100 to-yellow-300",
  "Spanish-Latam_female": "from-orange-100 to-orange-300",
  "Spanish-Latam_male":   "from-teal-100 to-teal-300",
};

// Hoist static grouping outside component — VOICE_CATALOG never changes at runtime
// (react-best-practices: rendering-hoist-jsx / js-index-maps)
const GROUPED_VOICES = ACCENT_ORDER.map(accent => ({
  accent,
  voices: VOICE_CATALOG.filter(v => v.accent === accent),
})).filter(g => g.voices.length > 0);

interface Props {
  selectedVoiceId: string;
  onSelect: (voiceId: string, voiceName: string) => void;
}

export default function VoicePicker({ selectedVoiceId, onSelect }: Props) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const previewMutation = trpc.shop.previewVoice.useMutation({
    onSuccess: (data, variables) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const audio = new Audio(data.audio);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => setPlayingId(null);
    },
    onError: () => {
      setPlayingId(null);
      toast.error("Preview failed — check your ElevenLabs API key");
    },
  });

  function handlePreview(e: React.MouseEvent, voiceId: string) {
    e.stopPropagation();
    if (playingId === voiceId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    setPlayingId(voiceId);
    previewMutation.mutate({ voiceId });
  }

  return (
    <div className="space-y-5">
      {GROUPED_VOICES.map(({ accent, voices }) => (
        <div key={accent}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {ACCENT_LABELS[accent] ?? accent}
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {voices.map(voice => {
              const colorKey = `${voice.accent}_${voice.gender}`;
              const isSelected = selectedVoiceId === voice.id;
              const isPlaying = playingId === voice.id;
              return (
                <div
                  key={voice.id}
                  onClick={() => onSelect(voice.id, voice.name)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "hover:border-primary/30 hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[colorKey] ?? "from-gray-100 to-gray-300"} flex items-center justify-center text-base shrink-0`}
                  >
                    {voice.gender === "female" ? "👩" : "👨"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">{voice.name}</span>
                      {voice.topPick && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                          Top Pick
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{voice.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handlePreview(e, voice.id)}
                      disabled={previewMutation.isPending && playingId !== voice.id}
                    >
                      {previewMutation.isPending && playingId === voice.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isPlaying ? (
                        <Square className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

> **Bundler note:** If importing `VOICE_CATALOG` from `server/services/elevenLabsService` causes issues (unlikely since Vite handles it for the client via tree-shaking, but possible if the server file has non-tree-shakeable side effects), move `VOICE_CATALOG` to `shared/voiceCatalog.ts` and import from there in both places. Only do this if the build fails.

- [ ] **Step 2: Verify `@shared/` alias resolves in Vite**

The alias `@shared/` → `shared/` is already configured in `vite.config.ts` and `tsconfig.json`. Confirm:
```bash
grep "shared" vite.config.ts tsconfig.json
```
Expected: both files have `"@shared/*": ["shared/*"]`.

- [ ] **Step 3: Type check**

```bash
pnpm run check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/VoicePicker.tsx shared/voiceCatalog.ts server/services/elevenLabsService.ts
git commit -m "feat: add VoicePicker component with 16-voice grid and preview button"
```

---

## Task 7: PersonalityPicker Component

**Files:**
- Create: `client/src/components/PersonalityPicker.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/PersonalityPicker.tsx
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export type CharacterPreset = "warm_helper" | "efficient_closer" | "tech_expert" | "sales_pro";

export interface PersonalityValues {
  characterPreset: CharacterPreset;
  warmth: number;
  salesIntensity: number;
  technicalDepth: number;
}

const PRESETS: Array<{
  id: CharacterPreset;
  label: string;
  icon: string;
  warmth: number;
  salesIntensity: number;
  technicalDepth: number;
}> = [
  { id: "warm_helper",      label: "Warm Helper",      icon: "😊", warmth: 5, salesIntensity: 2, technicalDepth: 2 },
  { id: "efficient_closer", label: "Efficient Closer",  icon: "⚡", warmth: 3, salesIntensity: 4, technicalDepth: 2 },
  { id: "tech_expert",      label: "Tech Expert",       icon: "🔧", warmth: 3, salesIntensity: 3, technicalDepth: 5 },
  { id: "sales_pro",        label: "Sales Pro",         icon: "💼", warmth: 4, salesIntensity: 5, technicalDepth: 3 },
];

const SLIDER_CONFIG = [
  {
    key: "warmth" as const,
    label: "❤️ Warmth",
    leftLabel: "Professional",
    rightLabel: "Very Warm",
  },
  {
    key: "salesIntensity" as const,
    label: "💰 Sales Intensity",
    leftLabel: "Passive (service only)",
    rightLabel: "Proactive closer",
  },
  {
    key: "technicalDepth" as const,
    label: "🔧 Technical Depth",
    leftLabel: "Keep it simple",
    rightLabel: "Full detail",
  },
];

interface Props {
  values: PersonalityValues;
  onChange: (values: PersonalityValues) => void;
}

export default function PersonalityPicker({ values, onChange }: Props) {
  function applyPreset(preset: typeof PRESETS[number]) {
    onChange({
      characterPreset: preset.id,
      warmth: preset.warmth,
      salesIntensity: preset.salesIntensity,
      technicalDepth: preset.technicalDepth,
    });
  }

  function updateSlider(key: keyof Omit<PersonalityValues, "characterPreset">, val: number) {
    onChange({ ...values, [key]: val });
  }

  return (
    <div className="space-y-5">
      {/* Character presets */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Step 1 — Pick a character</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-all ${
                values.characterPreset === preset.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "hover:border-primary/30 hover:bg-muted/40"
              }`}
            >
              <span className="text-xl">{preset.icon}</span>
              <span className="font-medium text-xs text-center leading-tight">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fine-tune sliders */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Step 2 — Fine-tune</Label>
        <div className="space-y-5">
          {SLIDER_CONFIG.map(({ key, label, leftLabel, rightLabel }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{values[key]} / 5</span>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[values[key]]}
                onValueChange={([v]) => updateSlider(key, v)}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{leftLabel}</span>
                <span>{rightLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
pnpm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/PersonalityPicker.tsx
git commit -m "feat: add PersonalityPicker component with presets and sliders"
```

---

## Task 8: AgentConfig.tsx — Full UI Update

**Files:**
- Modify: `client/src/pages/AgentConfig.tsx`

- [ ] **Step 1: Rewrite AgentConfig.tsx**

Replace the full file content:

```tsx
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft, Bot, Save, Volume2, MessageSquare, TrendingUp, Zap,
  CheckCircle2, AlertCircle, Loader2, ChevronDown, Globe,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";
import VoicePicker from "@/components/VoicePicker";
import PersonalityPicker, { type CharacterPreset, type PersonalityValues } from "@/components/PersonalityPicker";

const LANGUAGES = [
  { code: "en", label: "English (American)" },
  { code: "es", label: "Spanish (Latin American)" },
  { code: "ar", label: "Arabic" },
  { code: "pt", label: "Portuguese (Brazilian)" },
  { code: "hi", label: "Hindi (Hinglish-friendly)" },
  { code: "bn", label: "Bangla (Conversational)" },
  { code: "it", label: "Italian" },
  { code: "tr", label: "Turkish" },
];

export default function AgentConfig() {
  return (
    <DashboardLayout>
      <AgentConfigContent />
    </DashboardLayout>
  );
}

function AgentConfigContent() {
  const params = useParams<{ id: string }>();
  const shopId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const posthog = usePostHog();

  const { data: config, isLoading } = trpc.shop.getAgentConfig.useQuery(
    { shopId }, { enabled: shopId > 0 }
  );
  const { data: shop } = trpc.shop.getById.useQuery({ id: shopId }, { enabled: shopId > 0 });
  const { data: agentStatus, refetch: refetchStatus } = trpc.shop.getAgentStatus.useQuery(
    { shopId }, { enabled: shopId > 0 }
  );

  const utils = trpc.useUtils();

  // Voice & identity
  const [agentName, setAgentName] = useState("Baylio");
  const [voiceId, setVoiceId] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [language, setLanguage] = useState("en");

  // Personality
  const [personality, setPersonality] = useState<PersonalityValues>({
    characterPreset: "warm_helper",
    warmth: 4,
    salesIntensity: 3,
    technicalDepth: 2,
  });

  // Upsell
  const [upsellEnabled, setUpsellEnabled] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState("0.80");
  const [maxUpsellsPerCall, setMaxUpsellsPerCall] = useState(1);

  // Advanced (custom system prompt)
  const [systemPrompt, setSystemPrompt] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (config) {
      setAgentName(config.agentName || "Baylio");
      setVoiceId(config.voiceId || "");
      setVoiceName(config.voiceName || "");
      setGreeting(config.greeting || "");
      setLanguage(config.language || "en");
      setPersonality({
        characterPreset: (config.characterPreset as CharacterPreset) || "warm_helper",
        warmth: config.warmth ?? 4,
        salesIntensity: config.salesIntensity ?? 3,
        technicalDepth: config.technicalDepth ?? 2,
      });
      setUpsellEnabled(config.upsellEnabled ?? true);
      setConfidenceThreshold(config.confidenceThreshold || "0.80");
      setMaxUpsellsPerCall(config.maxUpsellsPerCall ?? 1);
      setSystemPrompt(config.systemPrompt || "");
    }
  }, [config]);

  const saveConfig = trpc.shop.saveAgentConfig.useMutation({
    onSuccess: () => {
      posthog?.capture("agent_config_saved", {
        shop_id: shopId, voice_id: voiceId || null,
        upsell_enabled: upsellEnabled, language,
        character_preset: personality.characterPreset,
      });
      toast.success("Agent configuration saved");
      refetchStatus();
    },
    onError: err => { toast.error(err.message || "Failed to save configuration"); },
  });

  const provisionAgent = trpc.shop.provisionAgent.useMutation({
    onSuccess: data => {
      toast.success(data.action === "created" ? "AI agent created and ready!" : "AI agent updated.");
      refetchStatus();
      utils.shop.getAgentConfig.invalidate({ shopId });
    },
    onError: err => { toast.error(err.message || "Failed to provision AI agent"); },
  });

  const handleSave = () => {
    saveConfig.mutate({
      shopId, agentName,
      voiceId: voiceId || undefined,
      voiceName: voiceName || undefined,
      greeting: greeting || undefined,
      systemPrompt: systemPrompt || undefined,
      upsellEnabled, confidenceThreshold, maxUpsellsPerCall, language,
      characterPreset: personality.characterPreset,
      warmth: personality.warmth,
      salesIntensity: personality.salesIntensity,
      technicalDepth: personality.technicalDepth,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/shops/${shopId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">AI Agent Configuration</h1>
          <p className="text-sm text-muted-foreground">{shop?.name}</p>
        </div>
        <Button onClick={handleSave} disabled={saveConfig.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveConfig.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Agent Status Banner */}
      {agentStatus && (
        <Card className={agentStatus.isLive ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {agentStatus.isLive
                  ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  : <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />}
                <div>
                  <p className="text-sm font-medium">
                    {agentStatus.isLive ? "Agent is live and answering calls"
                      : !agentStatus.hasAgent ? "AI agent not provisioned yet"
                      : !agentStatus.hasPhone ? "No phone number assigned"
                      : "Agent needs configuration"}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" className={`text-xs ${agentStatus.hasConfig ? "text-green-600" : "text-muted-foreground"}`}>
                      {agentStatus.hasConfig ? "Config saved" : "No config"}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${agentStatus.hasAgent ? "text-green-600" : "text-muted-foreground"}`}>
                      {agentStatus.hasAgent ? "Agent provisioned" : "No agent"}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${agentStatus.hasPhone ? "text-green-600" : "text-muted-foreground"}`}>
                      {agentStatus.hasPhone ? agentStatus.phoneNumber : "No phone"}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => provisionAgent.mutate({ shopId })}
                disabled={provisionAgent.isPending || !agentStatus.hasConfig}
                size="sm"
                variant={agentStatus.hasAgent ? "outline" : "default"}
              >
                {provisionAgent.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                {provisionAgent.isPending ? "Provisioning..." : agentStatus.hasAgent ? "Update Agent" : "Go Live"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Identity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Agent Identity
            </CardTitle>
          </div>
          <CardDescription>Name, greeting, and primary language.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder="e.g., Baylio, Sarah, Mike"
              />
              <p className="text-xs text-muted-foreground">The name the AI uses when answering calls.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Primary Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">All agents auto-detect caller language. This sets the default.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="greeting">Greeting Message</Label>
            <Textarea
              id="greeting"
              value={greeting}
              onChange={e => setGreeting(e.target.value)}
              placeholder={`e.g., "Hi, thanks for calling ${shop?.name || "our shop"}! This is ${agentName}, how can I help you today?"`}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Leave blank to use the default greeting.</p>
          </div>
        </CardContent>
      </Card>

      {/* Voice */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Voice
            </CardTitle>
          </div>
          <CardDescription>
            Choose how your AI sounds on the phone. All voices speak every supported language.
            Click ▶ to hear a preview.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoicePicker
            selectedVoiceId={voiceId}
            onSelect={(id, name) => { setVoiceId(id); setVoiceName(name); }}
          />
        </CardContent>
      </Card>

      {/* Personality */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Personality
            </CardTitle>
          </div>
          <CardDescription>
            Pick a character archetype, then fine-tune the sliders. These settings are automatically
            compiled into your agent's instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonalityPicker values={personality} onChange={setPersonality} />
        </CardContent>
      </Card>

      {/* Upsell */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Upsell Engine
            </CardTitle>
          </div>
          <CardDescription>Configure intelligent service recommendations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Upselling</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Allow the AI to suggest additional services.</p>
            </div>
            <Switch checked={upsellEnabled} onCheckedChange={setUpsellEnabled} />
          </div>
          {upsellEnabled && (
            <>
              <Separator />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Confidence Threshold</Label>
                  <Input
                    type="number" step="0.05" min="0" max="1"
                    value={confidenceThreshold}
                    onChange={e => setConfidenceThreshold(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Only suggest when confidence is above this (0–1).</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Upsells Per Call</Label>
                  <Input
                    type="number" min={0} max={5}
                    value={maxUpsellsPerCall}
                    onChange={e => setMaxUpsellsPerCall(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Advanced — Custom Instructions */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Custom Instructions (Advanced)
                </CardTitle>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-muted-foreground">
                The personality settings above automatically build your agent's instructions. Only add custom rules
                here for things unique to your shop (e.g., "Always mention we offer fleet discounts").
              </p>
              <Textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="Shop-specific rules that apply to every call..."
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">{systemPrompt.length} characters</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
```

- [ ] **Step 2: Verify shadcn/ui has Collapsible and Select**

```bash
ls client/src/components/ui/collapsible.tsx client/src/components/ui/select.tsx 2>/dev/null && echo "Both exist" || echo "MISSING"
```

If either is missing, add it:
```bash
# From project root — only run if missing:
npx shadcn@latest add collapsible
npx shadcn@latest add select
```

- [ ] **Step 3: Type check**

```bash
pnpm run check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/AgentConfig.tsx client/src/components/ui/
git commit -m "feat: redesign AgentConfig with voice picker, personality system, language dropdown"
```

---

## Task 9: Onboarding.tsx — Update Step 3

**Files:**
- Modify: `client/src/pages/Onboarding.tsx`

Step 3 currently has a 4-voice grid using `VOICE_OPTIONS` (lines 107–112) and no personality controls. Replace it with `VoicePicker` and `PersonalityPicker`.

- [ ] **Step 1: Add imports**

At the top of `Onboarding.tsx`, add imports (after existing imports):

```tsx
import VoicePicker from "@/components/VoicePicker";
import PersonalityPicker, { type CharacterPreset, type PersonalityValues } from "@/components/PersonalityPicker";
```

- [ ] **Step 2: Remove VOICE_OPTIONS constant and add personality state**

Delete lines 107–112 (the `const VOICE_OPTIONS = [...]` block).

In the Step 3 state section (around line 137), replace:
```tsx
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS[0].id);
  const [voiceName, setVoiceName] = useState(VOICE_OPTIONS[0].name);
```
with:
```tsx
  const [voiceId, setVoiceId] = useState("21m00Tcm4TlvDq8ikWAM"); // Rachel — default
  const [voiceName, setVoiceName] = useState("Rachel");
  const [personality, setPersonality] = useState<PersonalityValues>({
    characterPreset: "warm_helper",
    warmth: 4,
    salesIntensity: 3,
    technicalDepth: 2,
  });
```

- [ ] **Step 3: Update completeOnboarding mutation call**

Find the `completeOnboarding.mutate(...)` call (around line 246). Add personality fields:

```tsx
completeOnboarding.mutate({
  // ... existing fields ...
  voiceId,
  voiceName,
  characterPreset: personality.characterPreset,
  warmth: personality.warmth,
  salesIntensity: personality.salesIntensity,
  technicalDepth: personality.technicalDepth,
});
```

- [ ] **Step 4: Replace the Step 3 voice card (lines 823–855)**

Replace the entire Voice Selection card:
```tsx
            {/* Voice Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Volume2 className="h-4 w-4" /> Voice
                </CardTitle>
                <CardDescription>
                  Choose how your AI sounds. Click ▶ to preview. All voices speak every supported language.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoicePicker
                  selectedVoiceId={voiceId}
                  onSelect={(id, name) => { setVoiceId(id); setVoiceName(name); }}
                />
              </CardContent>
            </Card>

            {/* Personality */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" /> Personality
                </CardTitle>
                <CardDescription>
                  Pick a character and adjust the sliders. This controls how your AI sounds on calls.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PersonalityPicker values={personality} onChange={setPersonality} />
              </CardContent>
            </Card>
```

Also add `Volume2` to the lucide-react import if not already present.

- [ ] **Step 5: Update completeOnboarding router input**

The `completeOnboarding` tRPC procedure in `server/shopRouter.ts` saves the agent config. Find where it calls `saveAgentConfig` or `upsertAgentConfig` during onboarding (around line 461) and ensure the personality fields are passed through.

Search for the `completeOnboarding` procedure:
```bash
grep -n "completeOnboarding\|saveAgentConfig\|upsertAgentConfig" server/shopRouter.ts | head -20
```

Find the `z.object(...)` input schema for `completeOnboarding` and add:
```typescript
characterPreset: z.enum(["warm_helper","efficient_closer","tech_expert","sales_pro"]).optional().default("warm_helper"),
warmth: z.number().int().min(1).max(5).optional().default(4),
salesIntensity: z.number().int().min(1).max(5).optional().default(3),
technicalDepth: z.number().int().min(1).max(5).optional().default(2),
```

Then pass these into the `upsertAgentConfig` call inside `completeOnboarding`.

- [ ] **Step 6: Type check**

```bash
pnpm run check
```

Expected: 0 errors.

- [ ] **Step 7: Run full tests**

```bash
pnpm test
```

Expected: all 18 files pass, 0 failing.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/Onboarding.tsx server/shopRouter.ts
git commit -m "feat: update Onboarding step 3 with voice picker and personality system"
```

---

## Task 10: Build and Ship

- [ ] **Step 1: Final type check**

```bash
pnpm run check
```

Expected: 0 errors.

- [ ] **Step 2: Full test suite**

```bash
pnpm test
```

Expected: all 18+ files pass, 0 failing.

- [ ] **Step 3: Build**

```bash
pnpm run build:vercel
```

Expected: esbuild completes cleanly, `api/index.js` regenerated, Vite SPA build completes.

- [ ] **Step 4: Push**

```bash
git add api/index.js
git commit -m "build: regenerate api/index.js for AI agent config feature"
git push origin main
```

- [ ] **Step 5: Verify deploy**

```bash
vercel ls --limit 3
```

Wait for Vercel build to complete (usually 60–90 seconds). Then smoke test:

1. Go to AgentConfig for a test shop
2. Verify 16 voice cards appear in grid, grouped by accent
3. Click ▶ on Rachel → preview plays (browser audio)
4. Click "Sales Pro" preset → sliders snap to (4, 5, 3)
5. Drag Warmth slider to 2 → save → reload → sliders still at (2, 5, 3)
6. Change language to "Spanish (Latin American)" → save
7. Go to Onboarding → Step 3 → verify voice picker + personality appear
8. Call test shop → AI should respond in Spanish with conversational tone
9. Call in English → should mention car knowledge naturally in response

- [ ] **Step 6: Update DEPLOY_LOG.md and CLAUDE.md**

In `DEPLOY_LOG.md`, add entry for this deploy.
In `CLAUDE.md`, move "Voice Picker / Personality System / Multilingual" from RED/YELLOW → GREEN.

```bash
git add DEPLOY_LOG.md CLAUDE.md
git commit -m "docs: update deploy log and project status after AI agent config feature"
git push origin main
```
