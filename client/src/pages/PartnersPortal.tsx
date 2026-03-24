import PartnersPortalLayout from "@/components/PartnersPortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
  ArrowUpRight,
  Clock,
  UserPlus,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const TIER_THRESHOLDS = {
  bronze: { min: 0, max: 5, next: "silver" as const },
  silver: { min: 5, max: 15, next: "gold" as const },
  gold: { min: 15, max: 30, next: "platinum" as const },
  platinum: { min: 30, max: Infinity, next: null },
};

const TIER_COLORS = {
  bronze: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  silver: "bg-zinc-400/20 text-zinc-300 border-zinc-400/30",
  gold: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  platinum: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function PartnersPortal() {
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const { data: dashboard, isLoading } = trpc.partner.dashboard.useQuery();
  const enrollMutation = trpc.partner.enroll.useMutation({
    onSuccess: () => {
      toast.success("Welcome to the Baylio Partner Program!");
      utils.partner.dashboard.invalidate();
      utils.partner.getProfile.invalidate();
    },
  });
  const utils = trpc.useUtils();

  if (isLoading) {
    return (
      <PartnersPortalLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-64 bg-zinc-800 rounded-lg" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-zinc-800 rounded-xl" />
            ))}
          </div>
        </div>
      </PartnersPortalLayout>
    );
  }

  // Not enrolled yet — show enrollment CTA
  if (!dashboard) {
    return (
      <PartnersPortalLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-lg w-full bg-zinc-900 border-zinc-800">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl text-white">
                Join the Baylio Partner Program
              </CardTitle>
              <p className="text-zinc-400 mt-2">
                Earn 20% recurring commission on every shop you refer.
                $199-$599/mo per shop means $40-$120/mo per referral, forever.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-zinc-800">
                  <p className="text-2xl font-mono font-bold text-emerald-400">20%</p>
                  <p className="text-xs text-zinc-500">Commission</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800">
                  <p className="text-2xl font-mono font-bold text-amber-400">$120</p>
                  <p className="text-xs text-zinc-500">Max/mo/referral</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800">
                  <p className="text-2xl font-bold text-white">Recurring</p>
                  <p className="text-xs text-zinc-500">Lifetime</p>
                </div>
              </div>
              <Button
                onClick={() => enrollMutation.mutate({})}
                disabled={enrollMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                size="lg"
              >
                {enrollMutation.isPending ? "Enrolling..." : "Become a Partner"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PartnersPortalLayout>
    );
  }

  const { partner, stats } = dashboard;
  const tier = (partner.tier || "bronze") as keyof typeof TIER_THRESHOLDS;
  const tierInfo = TIER_THRESHOLDS[tier];
  const tierProgress =
    tierInfo.max === Infinity
      ? 100
      : Math.min(
          100,
          ((stats.activeSubscriptions - tierInfo.min) /
            (tierInfo.max - tierInfo.min)) *
            100
        );

  const referralLink = `${window.location.origin}/?ref=${partner.referralCode}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PartnersPortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Partner Dashboard
            </h1>
            <p className="text-zinc-400 mt-1">
              Welcome back. Here's your performance overview.
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-sm px-3 py-1 capitalize ${TIER_COLORS[tier]}`}
          >
            {tier} Partner
          </Badge>
        </div>

        {/* Referral Link Card */}
        <Card className="bg-gradient-to-r from-emerald-950/50 to-zinc-900 border-emerald-800/30">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-400 mb-1">
                  Your Referral Link
                </p>
                <p className="text-sm text-zinc-300 font-mono truncate">
                  {referralLink}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyReferralLink}
                className="border-emerald-700 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? "Copied" : "Copy Link"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Total Referrals</p>
                <Users className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="text-2xl font-mono font-medium text-white mt-2">
                {stats.totalReferrals}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.activeSubscriptions} active
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Total Earnings</p>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-mono font-medium text-emerald-400 mt-2">
                ${stats.totalEarnings.toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                ${stats.pendingEarnings.toFixed(2)} pending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Monthly Recurring</p>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-mono font-medium text-amber-400 mt-2">
                ${stats.recurringMonthly.toFixed(0)}
                <span className="text-sm text-zinc-500">/mo</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                From {stats.activeSubscriptions} shops
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Conversion Rate</p>
                <ArrowUpRight className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-mono font-medium text-white mt-2">
                {stats.conversionRate}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.pending} pending signups
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Progress + Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                Tier Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400 capitalize">{tier}</span>
                {tierInfo.next && (
                  <span className="text-zinc-500 capitalize">
                    {tierInfo.next} ({tierInfo.max} referrals)
                  </span>
                )}
              </div>
              <Progress
                value={tierProgress}
                className="h-2 bg-zinc-800 [&>div]:bg-emerald-500"
              />
              <p className="text-xs text-zinc-500">
                {tierInfo.next
                  ? `${tierInfo.max - stats.activeSubscriptions} more active referrals to reach ${tierInfo.next}`
                  : "You've reached the highest tier!"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={() => setLocation("/partners/referrals")}
              >
                <Users className="h-4 w-4 mr-2 text-emerald-400" />
                View All Referrals
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={() => setLocation("/partners/earnings")}
              >
                <DollarSign className="h-4 w-4 mr-2 text-amber-400" />
                Request Payout
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                onClick={() => setLocation("/partners/resources")}
              >
                <BookOpen className="h-4 w-4 mr-2 text-blue-400" />
                Marketing Resources
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PartnersPortalLayout>
  );
}
