import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Copy } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import PartnersPortalLayout from "@/components/PartnersPortalLayout";

export default function PartnersSettings() {
  const { data: affiliate, isLoading } = trpc.affiliate.me.useQuery();
  const utils = trpc.useUtils();

  const [paypalEmail, setPaypalEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (affiliate) {
      setPaypalEmail(affiliate.paypalEmail ?? "");
      setName(affiliate.name ?? "");
      setPhone(affiliate.phone ?? "");
    }
  }, [affiliate]);

  const updateSettings = trpc.affiliate.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated!");
      utils.affiliate.me.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update settings");
    },
  });

  const copyCode = () => {
    if (affiliate?.code) {
      navigator.clipboard.writeText(affiliate.code);
      toast.success("Referral code copied!");
    }
  };

  if (isLoading) {
    return (
      <PartnersPortalLayout title="Settings">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </PartnersPortalLayout>
    );
  }

  return (
    <PartnersPortalLayout title="Settings">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-6">Account Settings</h1>

        {/* Profile */}
        <Card className="bg-[#0D0D14] border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-white">Profile</CardTitle>
            <CardDescription className="text-slate-400">Update your partner profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payout Info */}
        <Card className="bg-[#0D0D14] border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-white">Payout Information</CardTitle>
            <CardDescription className="text-slate-400">Where commissions are sent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paypal" className="text-slate-300">PayPal Email</Label>
              <Input
                id="paypal"
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="paypal@example.com"
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-slate-500">Commissions are paid monthly via PayPal.</p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          className="w-full mb-6 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => updateSettings.mutate({
            paypalEmail: paypalEmail || undefined,
            name: name || undefined,
            phone: phone || undefined,
          })}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>

        {/* Referral Code */}
        <Card className="bg-[#0D0D14] border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-white">Referral Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-white/5 border border-white/10 rounded-md px-4 py-2 text-amber-400 font-mono">
                {affiliate?.code ?? "—"}
              </code>
              <Button size="sm" variant="outline" onClick={copyCode} className="border-white/10 text-slate-300 hover:text-white">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="bg-[#0D0D14] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white">Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Status</span>
              <Badge
                variant="outline"
                className={
                  affiliate?.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                  affiliate?.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                  "bg-red-500/10 text-red-400 border-red-500/30"
                }
              >
                {affiliate?.status ?? "unknown"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Tier</span>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 capitalize">
                {affiliate?.tier ?? "affiliate"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Commission Rate</span>
              <span className="text-sm text-white font-medium">
                {(Number(affiliate?.commissionRate ?? 0.2) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Member Since</span>
              <span className="text-sm text-slate-300">
                {affiliate?.createdAt ? new Date(affiliate.createdAt).toLocaleDateString() : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PartnersPortalLayout>
  );
}
