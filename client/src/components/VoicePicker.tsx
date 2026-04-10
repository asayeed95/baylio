// client/src/components/VoicePicker.tsx
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { VOICE_CATALOG } from "@shared/voiceCatalog";

const ACCENT_ORDER = ["American", "British", "Australian", "Spanish-Latam"];
const ACCENT_LABELS: Record<string, string> = {
  American: "🇺🇸 American English",
  British: "🇬🇧 British English",
  Australian: "🇦🇺 Australian English",
  "Spanish-Latam": "🇲🇽🇪🇸 Spanish-Optimized",
};

const AVATAR_COLORS: Record<string, string> = {
  American_female:        "from-pink-100 to-pink-300",
  American_male:          "from-blue-100 to-blue-300",
  British_female:         "from-purple-100 to-purple-300",
  British_male:           "from-indigo-100 to-indigo-300",
  Australian_female:      "from-green-100 to-green-300",
  Australian_male:        "from-yellow-100 to-yellow-300",
  "Spanish-Latam_female": "from-orange-100 to-orange-300",
  "Spanish-Latam_male":   "from-teal-100 to-teal-300",
};

// Hoisted outside component — VOICE_CATALOG never changes at runtime
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
    onSuccess: (data) => {
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
