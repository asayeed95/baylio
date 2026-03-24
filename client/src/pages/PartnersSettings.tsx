import PartnersPortalLayout from "@/components/PartnersPortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Save, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PartnersSettings() {
  const { data: profile, isLoading } = trpc.partner.getProfile.useQuery();
  const utils = trpc.useUtils();

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [payoutEmail, setPayoutEmail] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("stripe");
  const [notifyReferrals, setNotifyReferrals] = useState(true);
  const [notifyPayouts, setNotifyPayouts] = useState(true);
  const [notifyNewsletter, setNotifyNewsletter] = useState(true);

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.companyName || "");
      setWebsite(profile.website || "");
      setPayoutEmail(profile.payoutEmail || "");
      setPayoutMethod(profile.payoutMethod || "stripe");
      setNotifyReferrals(profile.notifyReferrals ?? true);
      setNotifyPayouts(profile.notifyPayouts ?? true);
      setNotifyNewsletter(profile.notifyNewsletter ?? true);
    }
  }, [profile]);

  const updateSettings = trpc.partner.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved");
      utils.partner.getProfile.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSave = () => {
    updateSettings.mutate({
      companyName: companyName || undefined,
      website: website || undefined,
      payoutEmail: payoutEmail || undefined,
      payoutMethod: payoutMethod as "stripe" | "paypal" | "bank_transfer",
      notifyReferrals,
      notifyPayouts,
      notifyNewsletter,
    });
  };

  if (isLoading) {
    return (
      <PartnersPortalLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-zinc-800 rounded-lg" />
          <div className="h-64 bg-zinc-800 rounded-xl" />
          <div className="h-48 bg-zinc-800 rounded-xl" />
        </div>
      </PartnersPortalLayout>
    );
  }

  if (!profile) {
    return (
      <PartnersPortalLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-zinc-400">
            You need to enroll as a partner first.
          </p>
        </div>
      </PartnersPortalLayout>
    );
  }

  return (
    <PartnersPortalLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Settings
            </h1>
            <p className="text-zinc-400 mt-1">
              Manage your partner profile and preferences.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Profile Info */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Partner Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-zinc-300">Company Name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Website</Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Referral Code</p>
                  <p className="text-white font-mono font-medium">
                    {profile.referralCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Partner Tier</p>
                  <p className="text-white capitalize font-medium">
                    {profile.tier}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Commission Rate</p>
                  <p className="text-emerald-400 font-mono font-medium">
                    {(
                      parseFloat(profile.commissionRate?.toString() || "0.20") *
                      100
                    ).toFixed(0)}
                    %
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout Settings */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Payout Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Payout Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bank_transfer">
                    Bank Transfer (ACH)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Payout Email</Label>
              <Input
                type="email"
                value={payoutEmail}
                onChange={(e) => setPayoutEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
              />
              <p className="text-xs text-zinc-500">
                This email will receive payout notifications and payment
                processing details.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-200">Referral Updates</p>
                <p className="text-xs text-zinc-500">
                  Get notified when someone signs up through your link
                </p>
              </div>
              <Switch
                checked={notifyReferrals}
                onCheckedChange={setNotifyReferrals}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-200">Payout Notifications</p>
                <p className="text-xs text-zinc-500">
                  Get notified when payouts are processed
                </p>
              </div>
              <Switch
                checked={notifyPayouts}
                onCheckedChange={setNotifyPayouts}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-200">Partner Newsletter</p>
                <p className="text-xs text-zinc-500">
                  Monthly updates on new features, promotions, and tips
                </p>
              </div>
              <Switch
                checked={notifyNewsletter}
                onCheckedChange={setNotifyNewsletter}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button (mobile) */}
        <div className="sm:hidden">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </PartnersPortalLayout>
  );
}
