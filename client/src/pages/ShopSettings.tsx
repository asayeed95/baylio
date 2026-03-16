import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Save,
  Store,
  MapPin,
  Clock,
  Phone,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

/**
 * Shop Settings Page
 * 
 * Manage shop profile details:
 * - Business name, phone, email
 * - Address (street, city, state, zip)
 * - Business hours (JSON object per day)
 * - Service catalog (text list)
 * - Twilio phone number (read-only, provisioned via admin)
 * - ElevenLabs agent ID (read-only, provisioned via admin)
 */
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

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [services, setServices] = useState("");

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
    // Parse services text back into structured array
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
          <h1 className="text-2xl font-bold tracking-tight">Shop Settings</h1>
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
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shop-name">Shop Name</Label>
              <Input
                id="shop-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

          </div>
          <div className="space-y-2">
            <Label htmlFor="shop-phone">Business Phone</Label>
            <Input
              id="shop-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
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
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
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

      {/* Integration Status (Read-only) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle>Integration Status</CardTitle>
          </div>
          <CardDescription>
            These fields are managed by the system. Contact support to change them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Twilio Phone Number</Label>
              <Input
                value={shop?.twilioPhoneNumber || "Not provisioned"}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">ElevenLabs Agent ID</Label>
              <Input
                value="Not configured"
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
