import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import {
  Plug,
  Calendar,
  FileSpreadsheet,
  Building2,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Wrench,
  ArrowLeft,
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function Integrations() {
  return (
    <DashboardLayout>
      <IntegrationsContent />
    </DashboardLayout>
  );
}

function IntegrationsContent() {
  const params = useParams<{ id: string }>();
  const shopId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();

  const { data: shop, isLoading: shopLoading } = trpc.shop.getById.useQuery(
    { id: shopId },
    { enabled: shopId > 0 }
  );

  const { data: integrations, isLoading: integrationsLoading, refetch } = trpc.integration.listConnected.useQuery(
    { shopId },
    { enabled: shopId > 0 }
  );

  const saveSettingsMut = trpc.integration.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Integration settings saved");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnectMut = trpc.integration.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Integration disconnected");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateShopMut = trpc.shop.update.useMutation({
    onSuccess: () => {
      toast.success("Setting updated");
    },
    onError: (err) => toast.error(err.message),
  });

  // HubSpot state
  const [hubspotKey, setHubspotKey] = useState("");

  // Shopmonkey state
  const [smPublicKey, setSmPublicKey] = useState("");
  const [smPrivateKey, setSmPrivateKey] = useState("");

  if (shopId === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Plug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select a Shop</h2>
          <p className="text-muted-foreground">
            Navigate to a shop first to manage its integrations.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (shopLoading || integrationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = (provider: string) =>
    integrations?.some((i) => i.provider === provider && i.isActive);

  const getIntegration = (provider: string) =>
    integrations?.find((i) => i.provider === provider && i.isActive);

  const handleGoogleConnect = () => {
    window.location.href = `/api/integrations/google/connect?shopId=${shopId}&origin=${window.location.origin}`;
  };

  const handleDisconnect = (provider: string) => {
    const integration = getIntegration(provider);
    if (integration) {
      disconnectMut.mutate({ integrationId: integration.id, shopId });
    }
  };

  const handleHubspotSave = () => {
    if (!hubspotKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    saveSettingsMut.mutate({
      shopId,
      provider: "hubspot",
      accessToken: hubspotKey.trim(),
    });
    setHubspotKey("");
  };

  const handleShopmonkeySave = () => {
    if (!smPublicKey.trim() || !smPrivateKey.trim()) {
      toast.error("Please enter both keys");
      return;
    }
    saveSettingsMut.mutate({
      shopId,
      provider: "shopmonkey",
      settings: {
        shopmonkeyPublicKey: smPublicKey.trim(),
        shopmonkeyPrivateKey: smPrivateKey.trim(),
      },
    });
    setSmPublicKey("");
    setSmPrivateKey("");
  };

  const handleSmsToggle = (enabled: boolean) => {
    updateShopMut.mutate({
      id: shopId,
      data: { smsFollowUpEnabled: enabled } as any,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/shops/${shopId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground text-sm">
            Connect third-party tools for {shop?.name || "your shop"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Google Calendar */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Google Calendar</CardTitle>
                  <CardDescription className="text-xs">Auto-book appointments</CardDescription>
                </div>
              </div>
              {isConnected("google_calendar") ? (
                <span className="badge-live">Connected</span>
              ) : (
                <Badge variant="secondary" className="text-xs">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Automatically create calendar events when the AI books an appointment.
            </p>
            {isConnected("google_calendar") ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">
                  {getIntegration("google_calendar")?.externalAccountId || "Connected"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={() => handleDisconnect("google_calendar")}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={handleGoogleConnect} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Google Account
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Google Sheets */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Google Sheets</CardTitle>
                  <CardDescription className="text-xs">Call log sync</CardDescription>
                </div>
              </div>
              {isConnected("google_sheets") ? (
                <span className="badge-live">Connected</span>
              ) : (
                <Badge variant="secondary" className="text-xs">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Sync every completed call to a Google Sheet for reporting.
            </p>
            {isConnected("google_sheets") ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">
                  {getIntegration("google_sheets")?.externalAccountId || "Connected"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={() => handleDisconnect("google_sheets")}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={handleGoogleConnect} className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Google Account
              </Button>
            )}
          </CardContent>
        </Card>

        {/* HubSpot */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">HubSpot</CardTitle>
                  <CardDescription className="text-xs">CRM sync</CardDescription>
                </div>
              </div>
              {isConnected("hubspot") ? (
                <span className="badge-live">Connected</span>
              ) : (
                <Badge variant="secondary" className="text-xs">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Auto-create contacts and log calls in HubSpot CRM.
            </p>
            {isConnected("hubspot") ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">Active</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={() => handleDisconnect("hubspot")}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="hubspot-key" className="text-xs">API Key</Label>
                  <Input
                    id="hubspot-key"
                    type="password"
                    placeholder="pat-na1-..."
                    value={hubspotKey}
                    onChange={(e) => setHubspotKey(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleHubspotSave}
                  className="w-full"
                  disabled={saveSettingsMut.isPending}
                >
                  {saveSettingsMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save & Connect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shopmonkey */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Shopmonkey</CardTitle>
                  <CardDescription className="text-xs">Work orders</CardDescription>
                </div>
              </div>
              {isConnected("shopmonkey") ? (
                <span className="badge-live">Connected</span>
              ) : (
                <Badge variant="secondary" className="text-xs">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Auto-create work orders when the AI books an appointment.
            </p>
            {isConnected("shopmonkey") ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">Active</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive"
                  onClick={() => handleDisconnect("shopmonkey")}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="sm-public" className="text-xs">Public Key</Label>
                  <Input
                    id="sm-public"
                    type="password"
                    placeholder="Public key..."
                    value={smPublicKey}
                    onChange={(e) => setSmPublicKey(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sm-private" className="text-xs">Private Key</Label>
                  <Input
                    id="sm-private"
                    type="password"
                    placeholder="Private key..."
                    value={smPrivateKey}
                    onChange={(e) => setSmPrivateKey(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleShopmonkeySave}
                  className="w-full"
                  disabled={saveSettingsMut.isPending}
                >
                  {saveSettingsMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save & Connect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMS Follow-ups */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">SMS Follow-ups</CardTitle>
                  <CardDescription className="text-xs">Automated texts</CardDescription>
                </div>
              </div>
              <span className="badge-live">Active</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Send automated follow-up texts after calls. Respects opt-outs.
            </p>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-toggle" className="text-sm">Enable SMS follow-ups</Label>
              <Switch
                id="sms-toggle"
                checked={(shop as any)?.smsFollowUpEnabled ?? true}
                onCheckedChange={handleSmsToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stripe */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Stripe</CardTitle>
                  <CardDescription className="text-xs">Billing & payments</CardDescription>
                </div>
              </div>
              <span className="badge-live">Connected via Platform</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Billing and subscription management powered by Stripe.
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Always connected through Baylio platform</span>
            </div>
          </CardContent>
        </Card>

        {/* Tekmetric - Coming Soon */}
        <Card className="border-border opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Tekmetric</CardTitle>
                  <CardDescription className="text-xs">Shop management</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Sync with Tekmetric for work orders and customer management.
            </p>
            <Button disabled className="w-full" variant="outline">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
