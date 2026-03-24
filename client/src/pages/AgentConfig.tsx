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
import { ArrowLeft, Bot, Save, Volume2, MessageSquare, TrendingUp, Zap, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

/**
 * AI Agent Configuration Page
 * 
 * Allows shop owners to customize their AI call agent:
 * - Voice selection (ElevenLabs voice ID)
 * - Agent name and greeting message
 * - System prompt (personality, behavior rules)
 * - Upsell settings (enable/disable, rules, confidence threshold)
 * - Language preference
 * 
 * Changes are saved via the shop.saveAgentConfig tRPC mutation.
 */
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

  const { data: agentStatus, refetch: refetchStatus } = trpc.shop.getAgentStatus.useQuery(
    { shopId },
    { enabled: shopId > 0 }
  );

  const utils = trpc.useUtils();

  const saveConfig = trpc.shop.saveAgentConfig.useMutation({
    onSuccess: () => {
      toast.success("Agent configuration saved");
      refetchStatus();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save configuration");
    },
  });

  const provisionAgent = trpc.shop.provisionAgent.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.action === "created"
          ? "AI agent created and ready to take calls!"
          : "AI agent updated with latest config."
      );
      refetchStatus();
      utils.shop.getAgentConfig.invalidate({ shopId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to provision AI agent");
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
        <Card className={agentStatus.isLive
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
          : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
        }>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {agentStatus.isLive ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {agentStatus.isLive
                      ? "Agent is live and answering calls"
                      : !agentStatus.hasAgent
                        ? "AI agent not provisioned yet — calls will go to voicemail"
                        : !agentStatus.hasPhone
                          ? "No phone number assigned — provision one in Shop Settings"
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
                {provisionAgent.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {provisionAgent.isPending
                  ? "Provisioning..."
                  : agentStatus.hasAgent
                    ? "Update Agent"
                    : "Go Live"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice & Identity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Voice & Identity</CardTitle>
          </div>
          <CardDescription>
            Configure how your AI agent sounds and introduces itself.
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
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voice-id">ElevenLabs Voice ID</Label>
              <Input
                id="voice-id"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder="e.g., 21m00Tcm4TlvDq8ikWAM"
              />
              <p className="text-xs text-muted-foreground">
                Get this from your ElevenLabs dashboard.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-name">Voice Name (for reference)</Label>
              <Input
                id="voice-name"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., Rachel, Josh"
              />
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
            <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">System Prompt</CardTitle>
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
            <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Upsell Engine</CardTitle>
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
