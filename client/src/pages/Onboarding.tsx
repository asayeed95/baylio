import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Store,
  Phone,
  Bot,
  Rocket,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  PhoneForwarded,
  PhoneCall,
  MapPin,
  Clock,
  Wrench,
  Sparkles,
  Search,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import VoicePicker from "@/components/VoicePicker";
import PersonalityPicker, { type CharacterPreset, type PersonalityValues } from "@/components/PersonalityPicker";

/**
 * Onboarding Wizard
 *
 * A guided multi-step flow for new shop owners:
 * Step 1: Shop Details (name, address, phone, hours, services)
 * Step 2: Phone Setup (forward existing number OR get new Baylio number)
 * Step 3: AI Agent Config (name, voice, greeting, personality)
 * Step 4: Go Live (review, provision, confirmation)
 */

const STEPS = [
  { id: 1, title: "Shop Details", icon: Store, description: "Tell us about your shop" },
  { id: 2, title: "Phone Setup", icon: Phone, description: "Connect your phone" },
  { id: 3, title: "AI Agent", icon: Bot, description: "Configure your assistant" },
  { id: 4, title: "Go Live", icon: Rocket, description: "Launch your AI receptionist" },
];

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
];

const DEFAULT_HOURS: Record<string, { open: string; close: string; closed: boolean }> = {
  monday: { open: "08:00", close: "18:00", closed: false },
  tuesday: { open: "08:00", close: "18:00", closed: false },
  wednesday: { open: "08:00", close: "18:00", closed: false },
  thursday: { open: "08:00", close: "18:00", closed: false },
  friday: { open: "08:00", close: "18:00", closed: false },
  saturday: { open: "09:00", close: "14:00", closed: false },
  sunday: { open: "00:00", close: "00:00", closed: true },
};

const COMMON_SERVICES = [
  // Popular (shown first)
  { name: "Oil Change", category: "Popular", price: 49 },
  { name: "Brake Pad Replacement", category: "Popular", price: 199 },
  { name: "Tire Rotation", category: "Popular", price: 29 },
  { name: "Engine Diagnostic", category: "Popular", price: 99 },
  { name: "State Inspection", category: "Popular", price: 25 },
  // Maintenance
  { name: "Transmission Flush", category: "Maintenance", price: 179 },
  { name: "Coolant Flush", category: "Maintenance", price: 99 },
  { name: "Spark Plug Replacement", category: "Maintenance", price: 149 },
  { name: "Timing Belt Replacement", category: "Maintenance", price: 450 },
  { name: "Fuel System Cleaning", category: "Maintenance", price: 129 },
  // Brakes & Tires
  { name: "Brake Rotor Replacement", category: "Brakes & Tires", price: 349 },
  { name: "Wheel Alignment", category: "Brakes & Tires", price: 89 },
  { name: "Tire Balance", category: "Brakes & Tires", price: 49 },
  { name: "New Tires (set of 4)", category: "Brakes & Tires", price: 599 },
  // Electrical & Climate
  { name: "Battery Replacement", category: "Electrical & Climate", price: 129 },
  { name: "AC Repair", category: "Electrical & Climate", price: 149 },
  { name: "AC Recharge", category: "Electrical & Climate", price: 89 },
  { name: "Alternator Replacement", category: "Electrical & Climate", price: 399 },
  // Engine & Drivetrain
  { name: "Head Gasket Repair", category: "Engine & Drivetrain", price: 1200 },
  { name: "Clutch Replacement", category: "Engine & Drivetrain", price: 899 },
  { name: "Exhaust Repair", category: "Engine & Drivetrain", price: 249 },
  { name: "Catalytic Converter", category: "Engine & Drivetrain", price: 999 },
];

const SERVICE_CATEGORIES = Array.from(new Set(COMMON_SERVICES.map(s => s.category)));


export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  // Step 1: Shop Details
  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [businessHours, setBusinessHours] = useState(DEFAULT_HOURS);
  const [selectedServices, setSelectedServices] = useState<{ name: string; category: string; price: number | undefined }[]>([]);
  const [customServiceText, setCustomServiceText] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Popular");
  const [serviceSearch, setServiceSearch] = useState("");

  // Step 2: Phone Setup
  const [phoneOption, setPhoneOption] = useState<"forward" | "new" | null>(null);
  const [areaCode, setAreaCode] = useState("");
  const [selectedNewNumber, setSelectedNewNumber] = useState<string | null>(null);

  // Step 3: Agent Config
  const [agentName, setAgentName] = useState("");
  const [voiceId, setVoiceId] = useState("21m00Tcm4TlvDq8ikWAM"); // Rachel — default
  const [voiceName, setVoiceName] = useState("Rachel");
  const [greeting, setGreeting] = useState("");
  const [personality, setPersonality] = useState<PersonalityValues>({
    characterPreset: "warm_helper",
    warmth: 4,
    salesIntensity: 3,
    technicalDepth: 2,
  });

  // Step 4: Go Live
  const [provisioningStatus, setProvisioningStatus] = useState<"idle" | "provisioning" | "done" | "error">("idle");
  const [provisionError, setProvisionError] = useState("");
  const [result, setResult] = useState<{
    shopId: number;
    agentId: string;
    twilioNumber: string | null;
    phoneOption: string;
    steps: string[];
    isLive: boolean;
    requiresAddon: boolean;
  } | null>(null);

  // tRPC
  const completeOnboarding = trpc.shop.completeOnboarding.useMutation();
  const addonCheckout = trpc.stripe.createAdditionalShopCheckout.useMutation({
    onSuccess: ({ checkoutUrl }) => { if (checkoutUrl) window.location.href = checkoutUrl; },
    onError: (err) => toast.error(err.message || "Failed to start checkout"),
  });
  const searchNumbers = trpc.shop.searchPhoneNumbers.useQuery(
    { areaCode },
    { enabled: areaCode.length === 3 && phoneOption === "new" }
  );

  // Computed
  const progressPercent = (step / STEPS.length) * 100;

  const allServices = useMemo(() => {
    const custom = customServiceText
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(" - $");
        return {
          name: parts[0]?.trim() || line.trim(),
          category: "Custom",
          price: parts[1] ? parseFloat(parts[1]) : undefined,
        };
      });
    return [...selectedServices, ...custom];
  }, [selectedServices, customServiceText]);

  const defaultGreeting = useMemo(() => {
    const name = agentName || "your assistant";
    const shop = shopName || "our shop";
    return `Thanks for calling ${shop}! This is ${name}, how can I help you today?`;
  }, [agentName, shopName]);

  // Step validation
  const canProceedStep1 = shopName.trim().length > 0;
  const canProceedStep2 = phoneOption !== null;
  const canProceedStep3 = agentName.trim().length > 0;

  // Handlers
  const toggleService = (service: (typeof COMMON_SERVICES)[0]) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.name === service.name);
      if (exists) return prev.filter((s) => s.name !== service.name);
      return [...prev, { ...service }];
    });
  };

  const updateServicePrice = (name: string, price: number | undefined) => {
    setSelectedServices((prev) =>
      prev.map((s) => (s.name === name ? { ...s, price } : s))
    );
  };

  const filteredServices = serviceSearch.trim()
    ? COMMON_SERVICES.filter((s) =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase())
      )
    : COMMON_SERVICES;

  const updateHours = (day: string, field: "open" | "close" | "closed", value: string | boolean) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleGoLive = async () => {
    setProvisioningStatus("provisioning");
    setProvisionError("");

    try {
      const res = await completeOnboarding.mutateAsync({
        shopName: shopName.trim(),
        shopPhone: shopPhone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip: zip.trim() || undefined,
        timezone,
        businessHours,
        serviceCatalog: allServices.map((s) => ({
          name: s.name,
          category: s.category || "General",
          price: s.price,
        })),
        phoneOption: phoneOption!,
        selectedNewNumber: selectedNewNumber || undefined,
        agentName: agentName.trim(),
        voiceId,
        voiceName,
        greeting: greeting.trim() || undefined,
        characterPreset: personality.characterPreset,
        warmth: personality.warmth,
        salesIntensity: personality.salesIntensity,
        technicalDepth: personality.technicalDepth,
      });

      setResult(res);
      setProvisioningStatus("done");
      toast.success("Your AI receptionist is live!");
    } catch (err: any) {
      console.error("[Onboarding] Error:", err);
      setProvisionError(err.message || "Something went wrong. Please try again.");
      setProvisioningStatus("error");
    }
  };

  // Format phone for display
  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Baylio Setup</span>
          </div>
          <Badge variant="outline" className="text-xs">
            Step {step} of {STEPS.length}
          </Badge>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <Progress value={progressPercent} className="h-1.5" />
        <div className="flex justify-between mt-3">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                s.id <= step ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {s.id < step ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <s.icon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ─── STEP 1: Shop Details ─── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Tell us about your shop</h2>
              <p className="text-muted-foreground mt-1">
                This information helps your AI receptionist answer calls accurately.
              </p>
            </div>

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-4 w-4" /> Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shop-name">
                      Shop Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="shop-name"
                      placeholder="e.g., Mike's Auto Care"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop-phone">Current Phone Number</Label>
                    <Input
                      id="shop-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(555) 123-4567"
                      value={shopPhone}
                      onChange={(e) => setShopPhone(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your shop's existing phone number. We'll use this to set up call forwarding.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    autoComplete="street-address"
                    placeholder="123 Main Street"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Austin" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" placeholder="TX" autoComplete="address-level1" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP</Label>
                    <Input id="zip" type="text" inputMode="numeric" placeholder="78701" autoComplete="postal-code" value={zip} onChange={(e) => setZip(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {US_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Business Hours
                </CardTitle>
                <CardDescription>Your AI will know when you're open and handle after-hours calls differently.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(businessHours).map(([day, hours]) => (
                    <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-3 sm:flex-1">
                        <span className="w-24 text-sm font-medium capitalize">{day}</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!hours.closed}
                            onChange={(e) => updateHours(day, "closed", !e.target.checked)}
                            className="rounded border-border h-4 w-4"
                          />
                          <span className="text-xs text-muted-foreground">Open</span>
                        </label>
                        {hours.closed && (
                          <span className="text-sm text-muted-foreground sm:hidden">Closed</span>
                        )}
                      </div>
                      {!hours.closed && (
                        <div className="flex items-center gap-2 pl-[108px] sm:pl-0">
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => updateHours(day, "open", e.target.value)}
                            className="w-28 text-sm"
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => updateHours(day, "close", e.target.value)}
                            className="w-28 text-sm"
                          />
                        </div>
                      )}
                      {hours.closed && (
                        <span className="hidden sm:inline text-sm text-muted-foreground">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Services You Offer
                </CardTitle>
                <CardDescription>
                  Pick from common auto repair services below, or add your own. You can adjust prices after selecting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Category sections */}
                <div className="space-y-2">
                  {(serviceSearch.trim()
                    ? [{ cat: "Results", services: filteredServices }]
                    : SERVICE_CATEGORIES.map((cat) => ({
                        cat,
                        services: COMMON_SERVICES.filter((s) => s.category === cat),
                      }))
                  ).map(({ cat, services }) => (
                    <div key={cat} className="border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium bg-secondary/50 hover:bg-secondary/80 transition-colors text-left"
                        onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
                      >
                        <span className="flex items-center gap-2">
                          {cat}
                          <span className="text-xs text-muted-foreground font-normal">
                            ({services.filter((s) => selectedServices.some((sel) => sel.name === s.name)).length}/{services.length})
                          </span>
                        </span>
                        <svg
                          className={`h-4 w-4 text-muted-foreground transition-transform ${expandedCategory === cat ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedCategory === cat && (
                        <div className="p-2 space-y-1">
                          {services.map((service) => {
                            const isSelected = selectedServices.some((s) => s.name === service.name);
                            return (
                              <div
                                key={service.name}
                                className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors ${
                                  isSelected ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                                }`}
                                onClick={() => toggleService(service)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    isSelected ? "bg-primary border-primary" : "border-border"
                                  }`}>
                                    {isSelected && (
                                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium">{service.name}</span>
                                </div>
                                <span className="text-sm text-muted-foreground font-mono">
                                  ${service.price}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Selected services with editable prices */}
                {selectedServices.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Your Services — adjust prices to match your shop</Label>
                    <div className="space-y-2">
                      {selectedServices.map((service) => (
                        <div
                          key={service.name}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">{service.name}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{service.category}</Badge>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm text-muted-foreground">$</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              className="w-20 h-8 text-sm text-right font-mono"
                              value={service.price ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                updateServicePrice(service.name, val);
                              }}
                            />
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                              onClick={() => toggleService(service as (typeof COMMON_SERVICES)[0])}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom services */}
                <div className="space-y-2">
                  <Label className="text-sm">Add custom services (one per line, optional: "Service - $99")</Label>
                  <Textarea
                    placeholder={"Custom Exhaust Work - $350\nPaint Protection Film\nWindow Tinting - $199"}
                    value={customServiceText}
                    onChange={(e) => setCustomServiceText(e.target.value)}
                    rows={3}
                  />
                </div>

                {allServices.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {allServices.length} service{allServices.length !== 1 ? "s" : ""} configured
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── STEP 2: Phone Setup ─── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Connect your phone</h2>
              <p className="text-muted-foreground mt-1">
                Choose how customers will reach your AI receptionist.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Option A: Forward existing number */}
              <Card
                className={`cursor-pointer transition-all ${
                  phoneOption === "forward"
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-primary/30"
                }`}
                onClick={() => setPhoneOption("forward")}
              >
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                      <PhoneForwarded className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Forward Your Existing Number</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Keep your current phone number. Forward unanswered calls to Baylio.
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    <p className="text-xs text-muted-foreground">Included in your plan</p>
                  </div>
                </CardContent>
              </Card>

              {/* Option B: Get new number */}
              <Card
                className={`cursor-pointer transition-all ${
                  phoneOption === "new"
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-primary/30"
                }`}
                onClick={() => setPhoneOption("new")}
              >
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                      <PhoneCall className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Get a New Baylio Number</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        We'll provision a dedicated local number for your shop.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">+$1.15/mo</Badge>
                    <p className="text-xs text-muted-foreground">New local number in your area code</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Forward instructions */}
            {phoneOption === "forward" && (
              <Card className="bg-blue-50/50 border-blue-200">
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <PhoneForwarded className="h-4 w-4 text-blue-600" />
                    How Call Forwarding Works
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    After setup, we'll give you a Baylio number. Set up call forwarding on your phone so unanswered calls go to your AI receptionist.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">1</span>
                      <p className="text-sm">We provision a hidden Baylio number for your shop (done automatically)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">2</span>
                      <p className="text-sm">On your phone, dial <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">*71</code> followed by the Baylio number</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">3</span>
                      <p className="text-sm">Calls you don't answer will automatically go to your AI receptionist</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">4</span>
                      <p className="text-sm">To disable, dial <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">*73</code> from your phone</p>
                    </div>
                  </div>
                  {!shopPhone && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800">
                        Go back to Step 1 and enter your current phone number so we can provision a number in your area code.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* New number search */}
            {phoneOption === "new" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Search for a Local Number</CardTitle>
                  <CardDescription>Enter your area code to find available numbers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="space-y-2 flex-1">
                      <Label>Area Code</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g., 512"
                          value={areaCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 3);
                            setAreaCode(val);
                            setSelectedNewNumber(null);
                          }}
                          className="pl-9"
                          maxLength={3}
                        />
                      </div>
                    </div>
                  </div>

                  {searchNumbers.isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching available numbers...
                    </div>
                  )}

                  {searchNumbers.data && searchNumbers.data.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Select a number:</Label>
                      <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {searchNumbers.data.map((num: any) => (
                          <div
                            key={num.phoneNumber}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedNewNumber === num.phoneNumber
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : "hover:border-primary/30"
                            }`}
                            onClick={() => setSelectedNewNumber(num.phoneNumber)}
                          >
                            <div>
                              <p className="font-mono font-medium text-sm">{num.friendlyName}</p>
                              <p className="text-xs text-muted-foreground">
                                {num.locality}{num.region ? `, ${num.region}` : ""}
                              </p>
                            </div>
                            {selectedNewNumber === num.phoneNumber && (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchNumbers.data && searchNumbers.data.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4">
                      No numbers available in area code {areaCode}. Try a different area code.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ─── STEP 3: AI Agent Config ─── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Configure your AI receptionist</h2>
              <p className="text-muted-foreground mt-1">
                Give your AI assistant a name and personality. Customers will think they're talking to a real person.
              </p>
            </div>

            {/* Agent Name */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" /> Agent Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">
                    Agent Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="agent-name"
                    placeholder="e.g., Sam, Jordan, Lisa"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the name your AI will use when answering calls. Pick something friendly and professional.
                  </p>
                </div>
              </CardContent>
            </Card>

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

            {/* Greeting */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Greeting</CardTitle>
                <CardDescription>
                  The first thing your AI says when answering a call. Leave blank for the default.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder={defaultGreeting}
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Default: "{defaultGreeting}"
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── STEP 4: Go Live ─── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Launch your AI receptionist</h2>
              <p className="text-muted-foreground mt-1">
                Review your setup and go live.
              </p>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Setup Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Shop</p>
                    <p className="text-sm font-medium mt-1">{shopName}</p>
                    {city && state && <p className="text-xs text-muted-foreground">{city}, {state}</p>}
                    {shopPhone && <p className="text-xs text-muted-foreground font-mono">{shopPhone}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Phone Setup</p>
                    <p className="text-sm font-medium mt-1">
                      {phoneOption === "forward" ? "Call Forwarding" : "New Number"}
                    </p>
                    {phoneOption === "new" && selectedNewNumber && (
                      <p className="text-xs text-muted-foreground font-mono">{formatPhone(selectedNewNumber)}</p>
                    )}
                    {phoneOption === "forward" && (
                      <p className="text-xs text-muted-foreground">Auto-provisioned in your area code</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">AI Agent</p>
                    <p className="text-sm font-medium mt-1">{agentName}</p>
                    <p className="text-xs text-muted-foreground">Voice: {voiceName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Services</p>
                    <p className="text-sm font-medium mt-1">{allServices.length} services configured</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Go Live Button */}
            {provisioningStatus === "idle" && (
              <Button
                size="lg"
                className="w-full text-base py-6"
                onClick={handleGoLive}
              >
                <Rocket className="h-5 w-5 mr-2" />
                Go Live — Activate Your AI Receptionist
              </Button>
            )}

            {/* Provisioning Progress */}
            {provisioningStatus === "provisioning" && (
              <Card className="border-primary/30">
                <CardContent className="py-8 flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-semibold">Setting up your AI receptionist...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Creating shop, provisioning AI agent, and configuring phone. This takes 15-30 seconds.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error */}
            {provisioningStatus === "error" && (
              <Card className="border-destructive/30">
                <CardContent className="py-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Setup Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">{provisionError}</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleGoLive}>
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Success */}
            {provisioningStatus === "done" && result && (
              <Card className={result.requiresAddon ? "border-amber-300 bg-amber-50" : "border-primary/30 bg-primary/5"}>
                <CardContent className="py-8 space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${result.requiresAddon ? "bg-amber-100" : "bg-primary/10"}`}>
                      <CheckCircle2 className={`h-8 w-8 ${result.requiresAddon ? "text-amber-600" : "text-primary"}`} />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-semibold">{result.requiresAddon ? "Shop Ready — Activate AI" : "You're Live!"}</h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-md">
                        {result.requiresAddon
                          ? <>Your shop <strong>{shopName}</strong> is set up. Activate your AI receptionist for an additional <strong>$99/mo</strong> — includes 300 min/mo, same AI quality.</>
                          : <>Your AI receptionist <strong>{agentName}</strong> is now ready to handle calls for <strong>{shopName}</strong>.</>
                        }
                      </p>
                    </div>
                  </div>

                  {/* Additional shop payment prompt */}
                  {result.requiresAddon && (
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg border border-amber-200 p-4 space-y-2">
                        <p className="text-sm font-medium">Additional Location Add-on</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold font-mono">$99</span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• 300 min/mo included</li>
                          <li>• Full AI receptionist — same as your primary shop</li>
                          <li>• Cancel anytime</li>
                        </ul>
                      </div>
                      <Button
                        size="lg"
                        className="w-full"
                        disabled={addonCheckout.isPending}
                        onClick={() => addonCheckout.mutate({ shopId: result.shopId })}
                      >
                        {addonCheckout.isPending ? "Loading..." : "Activate for $99/mo"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        onClick={() => setLocation(`/shops/${result.shopId}`)}
                      >
                        Set up later
                      </Button>
                    </div>
                  )}

                  {/* Call Forwarding Instructions — only shown when live (no addon required) */}
                  {!result.requiresAddon && result.phoneOption === "forward" && result.twilioNumber && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-5 pb-5 space-y-3">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <PhoneForwarded className="h-4 w-4 text-blue-600" />
                          Set Up Call Forwarding Now
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Your Baylio number is:
                        </p>
                        <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
                          <p className="text-lg font-mono font-bold text-primary">
                            {formatPhone(result.twilioNumber)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From your shop's phone, dial:
                        </p>
                        <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
                          <p className="text-lg font-mono font-bold">
                            *71{result.twilioNumber.replace("+1", "")}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This activates "no-answer" forwarding. Calls you don't pick up go to your AI. To disable later: dial <code className="bg-blue-100 px-1 rounded">*73</code>.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* New Number Info — only shown when live */}
                  {!result.requiresAddon && result.phoneOption === "new" && result.twilioNumber && (
                    <Card className="bg-emerald-50 border-emerald-200">
                      <CardContent className="pt-5 pb-5 space-y-3">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <PhoneCall className="h-4 w-4 text-emerald-600" />
                          Your New Shop Number
                        </h4>
                        <div className="bg-white rounded-lg p-3 border border-emerald-200 text-center">
                          <p className="text-lg font-mono font-bold text-primary">
                            {formatPhone(result.twilioNumber)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Update your Google Business Profile, website, and business cards with this number. All calls to this number go directly to your AI receptionist.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {!result.requiresAddon && (
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => setLocation(result.shopId ? `/shops/${result.shopId}` : "/dashboard")}
                    >
                      Go to Dashboard
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Navigation Buttons — sticky on mobile so CTA is always reachable */}
        {provisioningStatus !== "done" && (
          <div className="flex items-center justify-between mt-8 pt-4 sm:pt-6 border-t sticky bottom-0 bg-background sm:static pb-4 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            <Button
              variant="ghost"
              onClick={() => {
                if (step === 1) {
                  sessionStorage.setItem("baylio_onboarding_dismissed", "true");
                  setLocation("/dashboard");
                } else {
                  setStep((s) => s - 1);
                }
              }}
              disabled={provisioningStatus === "provisioning"}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {step === 1 ? "Skip for Now" : "Back"}
            </Button>

            {step < 4 && (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
