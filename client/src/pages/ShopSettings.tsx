import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Store,
  MapPin,
  Phone,
  Wrench,
  Search,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Loader2,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function ShopSettings() {
  return (
    <DashboardLayout>
      <ShopSettingsContent />
    </DashboardLayout>
  );
}

function ShopSettingsContent() {
  const params = useParams<{ id: string }>();
  const shopId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();

  const { data: shop, isLoading, refetch } = trpc.shop.getById.useQuery(
    { id: shopId },
    { enabled: shopId > 0 }
  );

  // Twilio status
  const { data: twilioStatus } = trpc.shop.twilioStatus.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [services, setServices] = useState("");

  // Phone provisioning state
  const [areaCode, setAreaCode] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [showNumberSearch, setShowNumberSearch] = useState(false);

  useEffect(() => {
    if (shop) {
      setName(shop.name || "");
      setPhone(shop.phone || "");
      setAddress(shop.address || "");
      setCity(shop.city || "");
      setState(shop.state || "");
      setZip(shop.zip || "");
      setServices(
        Array.isArray(shop.serviceCatalog)
          ? shop.serviceCatalog.map(s => `${s.name}${s.price ? ` - $${s.price}` : ""}`).join("\n")
          : ""
      );
    }
  }, [shop]);

  const updateShop = trpc.shop.update.useMutation({
    onSuccess: () => {
      toast.success("Shop settings saved");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save settings");
    },
  });

  const handleSave = () => {
    const parsedServices = services.trim()
      ? services.trim().split("\n").filter(Boolean).map(line => {
          const parts = line.split(" - $");
          return {
            name: parts[0]?.trim() || line.trim(),
            category: "general",
            price: parts[1] ? parseFloat(parts[1]) : undefined,
          };
        })
      : undefined;

    updateShop.mutate({
      id: shopId,
      data: {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip: zip.trim() || undefined,
        serviceCatalog: parsedServices,
      },
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
          <h1 className="text-2xl font-semibold tracking-tight">Shop Settings</h1>
          <p className="text-sm text-muted-foreground">{shop?.name}</p>
        </div>
        <Button onClick={handleSave} disabled={updateShop.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateShop.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle>Business Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop-name">Shop Name</Label>
            <Input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop-phone">Business Phone (existing landline)</Label>
            <Input
              id="shop-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
            <p className="text-xs text-muted-foreground">
              The shop's existing phone number. Baylio's AI number is provisioned separately below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Location</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Catalog */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <CardTitle>Service Catalog</CardTitle>
          </div>
          <CardDescription>
            List the services your shop offers. The AI agent uses this to answer customer questions accurately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={services}
            onChange={(e) => setServices(e.target.value)}
            placeholder={`Oil Change - $39.99\nBrake Pad Replacement - $149.99\nTire Rotation - $29.99\nFull Inspection - $89.99\nTransmission Flush - $179.99`}
            rows={8}
          />
          <p className="text-xs text-muted-foreground mt-2">
            One service per line. Include pricing if available.
          </p>
        </CardContent>
      </Card>

      {/* Twilio Phone Provisioning */}
      <TwilioPhoneCard
        shopId={shopId}
        twilioPhoneNumber={(shop as any)?.twilioPhoneNumber}
        twilioStatus={twilioStatus}
        onProvisioned={refetch}
        areaCode={areaCode}
        setAreaCode={setAreaCode}
        selectedNumber={selectedNumber}
        setSelectedNumber={setSelectedNumber}
        showNumberSearch={showNumberSearch}
        setShowNumberSearch={setShowNumberSearch}
        shopCity={city}
      />
    </div>
  );
}

// ─── Twilio Phone Provisioning Card ──────────────────────────────────────────

interface TwilioPhoneCardProps {
  shopId: number;
  twilioPhoneNumber?: string | null;
  twilioStatus?: { connected: boolean; friendlyName?: string; accountSid?: string; status?: string; error?: string };
  onProvisioned: () => void;
  areaCode: string;
  setAreaCode: (v: string) => void;
  selectedNumber: string | null;
  setSelectedNumber: (v: string | null) => void;
  showNumberSearch: boolean;
  setShowNumberSearch: (v: boolean) => void;
  shopCity: string;
}

function TwilioPhoneCard({
  shopId,
  twilioPhoneNumber,
  twilioStatus,
  onProvisioned,
  areaCode,
  setAreaCode,
  selectedNumber,
  setSelectedNumber,
  showNumberSearch,
  setShowNumberSearch,
  shopCity,
}: TwilioPhoneCardProps) {
  const utils = trpc.useUtils();

  // Search available numbers
  const {
    data: availableNumbers,
    isFetching: isSearching,
    refetch: doSearch,
  } = trpc.shop.searchPhoneNumbers.useQuery(
    { areaCode: areaCode.trim() },
    { enabled: false, retry: false }
  );

  const purchaseMutation = trpc.shop.purchasePhoneNumber.useMutation({
    onSuccess: (data) => {
      toast.success(`Phone number ${data.phoneNumber} provisioned and live!`);
      setShowNumberSearch(false);
      setSelectedNumber(null);
      setAreaCode("");
      utils.shop.getById.invalidate({ id: shopId });
      onProvisioned();
    },
    onError: (err) => {
      toast.error(`Failed to provision number: ${err.message}`);
    },
  });

  const releaseMutation = trpc.shop.releasePhoneNumber.useMutation({
    onSuccess: () => {
      toast.success("Phone number released");
      utils.shop.getById.invalidate({ id: shopId });
      onProvisioned();
    },
    onError: (err) => {
      toast.error(`Failed to release number: ${err.message}`);
    },
  });

  const handleSearch = () => {
    if (areaCode.trim().length !== 3) {
      toast.error("Enter a valid 3-digit area code");
      return;
    }
    doSearch();
  };

  const handlePurchase = () => {
    if (!selectedNumber) return;
    purchaseMutation.mutate({
      shopId,
      phoneNumber: selectedNumber,
      webhookBaseUrl: window.location.origin,
    });
  };

  const hasNumber = !!twilioPhoneNumber;

  return (
    <Card className={hasNumber ? "border-emerald-500/40" : "border-amber-500/40"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            <CardTitle>Baylio AI Phone Number</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {twilioStatus?.connected ? (
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 gap-1">
                <Wifi className="h-3 w-3" />
                Twilio Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-400 border-amber-500/40 gap-1">
                <WifiOff className="h-3 w-3" />
                Twilio Disconnected
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          This is the dedicated phone number customers call to reach the AI agent.
          It routes all inbound calls through ElevenLabs voice AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current number status */}
        {hasNumber ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-mono text-lg font-semibold text-emerald-300">{twilioPhoneNumber}</p>
                <p className="text-xs text-muted-foreground">Active — routing calls to AI agent</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => {
                if (confirm(`Release ${twilioPhoneNumber}? This will disconnect the AI agent immediately.`)) {
                  releaseMutation.mutate({ shopId });
                }
              }}
              disabled={releaseMutation.isPending}
            >
              {releaseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <XCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-medium text-amber-300">No phone number provisioned</p>
              <p className="text-xs text-muted-foreground">
                Search for a local number below to activate the AI agent for this shop.
              </p>
            </div>
          </div>
        )}

        {/* Number search */}
        {!hasNumber && (
          <>
            {!showNumberSearch ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNumberSearch(true)}
                disabled={!twilioStatus?.connected}
              >
                <Search className="h-4 w-4 mr-2" />
                Find a Local Phone Number
              </Button>
            ) : (
              <div className="space-y-4 border border-border rounded-lg p-4">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="area-code">Area Code</Label>
                    <Input
                      id="area-code"
                      value={areaCode}
                      onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder={shopCity ? `e.g. 248` : "e.g. 415"}
                      maxLength={3}
                      className="font-mono"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleSearch} disabled={isSearching || areaCode.length !== 3}>
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {availableNumbers && availableNumbers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No numbers found for area code {areaCode}. Try a different area code.
                  </p>
                )}

                {availableNumbers && availableNumbers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      Available Numbers
                    </Label>
                    {availableNumbers.map((num) => (
                      <div
                        key={num.phoneNumber}
                        onClick={() => setSelectedNumber(
                          selectedNumber === num.phoneNumber ? null : num.phoneNumber
                        )}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedNumber === num.phoneNumber
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div>
                          <p className="font-mono font-medium">{num.friendlyName}</p>
                          {num.locality && (
                            <p className="text-xs text-muted-foreground">
                              {num.locality}, {num.region}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {num.capabilities.voice && (
                            <Badge variant="secondary" className="text-xs">Voice</Badge>
                          )}
                          {num.capabilities.sms && (
                            <Badge variant="secondary" className="text-xs">SMS</Badge>
                          )}
                        </div>
                      </div>
                    ))}

                    {selectedNumber && (
                      <div className="pt-2 space-y-2">
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
                          <p className="font-medium">Ready to provision: <span className="font-mono">{selectedNumber}</span></p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This number will be purchased (~$1.15/month) and configured to route all calls to your AI agent.
                            Webhook URL: <span className="font-mono">{window.location.origin}/api/twilio/voice</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            onClick={handlePurchase}
                            disabled={purchaseMutation.isPending}
                          >
                            {purchaseMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Provisioning...
                              </>
                            ) : (
                              <>
                                <Phone className="h-4 w-4 mr-2" />
                                Provision This Number
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowNumberSearch(false);
                              setSelectedNumber(null);
                              setAreaCode("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Twilio account info */}
        {twilioStatus?.connected && (
          <div className="text-xs text-muted-foreground border-t border-border pt-3 mt-2">
            Connected as: <span className="font-mono">{twilioStatus.accountSid}</span>
            {" · "}
            {twilioStatus.friendlyName}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
