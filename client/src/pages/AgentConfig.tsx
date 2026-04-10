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
                  <p className="text-xs text-muted-foreground">Only suggest when confidence is above this (0-1).</p>
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
