import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Volume2, MessageSquare, TrendingUp, Play, Pause, Check, Mic } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

/**
 * AI Agent Configuration Page
 * 
 * Allows shop owners to customize their AI call agent:
 * - Voice selection with audio preview (ElevenLabs voices)
 * - Agent name and greeting message
 * - System prompt (personality, behavior rules)
 * - Upsell settings (enable/disable, rules, confidence threshold)
 * - Language preference
 */
export default function AgentConfig() {
  return (
    <DashboardLayout>
      <AgentConfigContent />
    </DashboardLayout>
  );
}

// ─── Voice Picker Component ────────────────────────────────────────

interface VoiceOption {
  voiceId: string;
  name: string;
  accent: string;
  gender: string;
  useCase: string;
  description: string;
  previewUrl: string;
}

function VoicePicker({
  selectedVoiceId,
  onSelect,
}: {
  selectedVoiceId: string;
  onSelect: (voiceId: string, voiceName: string) => void;
}) {
  const { data: voices, isLoading } = trpc.voice.list.useQuery();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "male" | "female" | "neutral">("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback((voice: VoiceOption) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === voice.voiceId) {
      setPlayingId(null);
      return;
    }

    if (!voice.previewUrl) {
      toast.error("No preview available for this voice");
      return;
    }

    const audio = new Audio(voice.previewUrl);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      toast.error("Failed to play voice preview");
    };
    audio.play();
    audioRef.current = audio;
    setPlayingId(voice.voiceId);
  }, [playingId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const filteredVoices = (voices || []).filter((v) => {
    if (filter === "all") return true;
    return v.gender === filter;
  });

  const genderCounts = {
    all: voices?.length || 0,
    male: voices?.filter((v) => v.gender === "male").length || 0,
    female: voices?.filter((v) => v.gender === "female").length || 0,
    neutral: voices?.filter((v) => v.gender === "neutral").length || 0,
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "male", "female", "neutral"] as const).map((g) => (
          <Button
            key={g}
            variant={filter === g ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(g)}
            className="capitalize"
          >
            {g} ({genderCounts[g]})
          </Button>
        ))}
      </div>

      {/* Voice list */}
      <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
        {filteredVoices.map((voice) => {
          const isSelected = voice.voiceId === selectedVoiceId;
          const isPlaying = playingId === voice.voiceId;

          return (
            <div
              key={voice.voiceId}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
              onClick={() => onSelect(voice.voiceId, voice.name)}
            >
              {/* Play button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay(voice);
                }}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {/* Voice info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{voice.name}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                    {voice.gender}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                    {voice.accent}
                  </Badge>
                  {voice.useCase && (
                    <span className="text-[10px] text-muted-foreground capitalize truncate">
                      {voice.useCase.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVoices.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No voices found for this filter.
        </p>
      )}
    </div>
  );
}

// ─── Main Content ──────────────────────────────────────────────────

function AgentConfigContent() {
  const params = useParams<{ id: string }>();
  const shopId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();

  const { data: config, isLoading } = trpc.shop.getAgentConfig.useQuery(
    { shopId },
    { enabled: shopId > 0 }
  );

  const { data: shop } = trpc.shop.getById.useQuery(
    { id: shopId },
    { enabled: shopId > 0 }
  );

  // Form state
  const [agentName, setAgentName] = useState("Baylio");
  const [voiceId, setVoiceId] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [upsellEnabled, setUpsellEnabled] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState("0.80");
  const [maxUpsellsPerCall, setMaxUpsellsPerCall] = useState(1);
  const [language, setLanguage] = useState("en");

  // Load existing config
  useEffect(() => {
    if (config) {
      setAgentName(config.agentName || "Baylio");
      setVoiceId(config.voiceId || "");
      setVoiceName(config.voiceName || "");
      setGreeting(config.greeting || "");
      setSystemPrompt(config.systemPrompt || "");
      setUpsellEnabled(config.upsellEnabled ?? true);
      setConfidenceThreshold(config.confidenceThreshold || "0.80");
      setMaxUpsellsPerCall(config.maxUpsellsPerCall ?? 1);
      setLanguage(config.language || "en");
    }
  }, [config]);

  const saveConfig = trpc.shop.saveAgentConfig.useMutation({
    onSuccess: () => {
      toast.success("Agent configuration saved");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save configuration");
    },
  });

  const handleSave = () => {
    saveConfig.mutate({
      shopId,
      agentName,
      voiceId: voiceId || undefined,
      voiceName: voiceName || undefined,
      greeting: greeting || undefined,
      systemPrompt: systemPrompt || undefined,
      upsellEnabled,
      confidenceThreshold,
      maxUpsellsPerCall,
      language,
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

  const defaultSystemPrompt = `You are ${agentName}, the AI receptionist for ${shop?.name || "this auto repair shop"}. You are friendly, professional, and knowledgeable about auto repair services.

Your goals:
1. Answer customer questions about services, pricing, and availability
2. Book appointments when customers are ready
3. Capture vehicle information (year, make, model, mileage)
4. Identify the customer's primary concern and any related service needs
5. If appropriate, suggest complementary services that would benefit the customer

Always be helpful and never pushy. If you don't know something, offer to have the shop manager call them back.`;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/shops/${shopId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">AI Agent Configuration</h1>
          <p className="text-sm text-muted-foreground">{shop?.name}</p>
        </div>
        <Button onClick={handleSave} disabled={saveConfig.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveConfig.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Voice Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <CardTitle>Voice Selection</CardTitle>
          </div>
          <CardDescription>
            Choose the voice your AI agent uses on calls. Click play to preview, then click to select.
            {voiceName && (
              <span className="block mt-1 text-primary font-medium">
                Currently selected: {voiceName}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoicePicker
            selectedVoiceId={voiceId}
            onSelect={(id, name) => {
              setVoiceId(id);
              setVoiceName(name);
              toast.info(`Voice set to "${name}" — save to apply`);
            }}
          />
        </CardContent>
      </Card>

      {/* Agent Identity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <CardTitle>Agent Identity</CardTitle>
          </div>
          <CardDescription>
            Configure how your AI agent introduces itself and what language it speaks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g., Baylio, Sarah, Mike"
              />
              <p className="text-xs text-muted-foreground">The name your AI uses to introduce itself.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="en"
              />
              <p className="text-xs text-muted-foreground">ISO language code (e.g., en, es, fr).</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="greeting">Greeting Message</Label>
            <Textarea
              id="greeting"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder={`e.g., "Hi, thanks for calling ${shop?.name || "our shop"}! This is ${agentName}, how can I help you today?"`}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              The first thing the AI says when answering a call.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>System Prompt</CardTitle>
          </div>
          <CardDescription>
            Define your AI agent's personality, knowledge, and behavior rules.
            This is the core instruction set that controls how the agent handles calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={defaultSystemPrompt}
              rows={12}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {systemPrompt.length} characters
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSystemPrompt(defaultSystemPrompt)}
              >
                Load Default Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upsell Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Upsell Engine</CardTitle>
          </div>
          <CardDescription>
            Configure intelligent service recommendations. The AI suggests complementary
            services based on customer symptoms and vehicle needs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Upselling</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow the AI to suggest additional services during calls.
              </p>
            </div>
            <Switch
              checked={upsellEnabled}
              onCheckedChange={setUpsellEnabled}
            />
          </div>
          {upsellEnabled && (
            <>
              <Separator />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="confidence">Confidence Threshold</Label>
                  <Input
                    id="confidence"
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only suggest services when confidence is above this level (0-1).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-upsells">Max Upsells Per Call</Label>
                  <Input
                    id="max-upsells"
                    type="number"
                    min={0}
                    max={5}
                    value={maxUpsellsPerCall}
                    onChange={(e) => setMaxUpsellsPerCall(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limit suggestions to avoid sounding pushy.
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
