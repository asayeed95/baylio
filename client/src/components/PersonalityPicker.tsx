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
