/**
 * Affiliate Portal — Partners Dashboard
 *
 * Two states:
 * A. Not yet an affiliate → signup flow with hero + commission structure + form
 * B. Active affiliate → dashboard with stats, referral link, recent activity, tier progress
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  DollarSign,
  Users,
  MousePointerClick,
  Store,
  Copy,
  ArrowRight,
  TrendingUp,
  Clock,
  Link as LinkIcon,
  Phone,
  Handshake,
  CheckCircle2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import PartnersPortalLayout from "@/components/PartnersPortalLayout";

// ─── Commission Structure ────────────────────────────────────────────

const COMMISSION_TIERS = [
  { tier: "Bronze", requirement: "0-4 referrals", direct: "20%", override: "5%" },
  { tier: "Silver", requirement: "5-14 referrals", direct: "22%", override: "5%" },
  { tier: "Gold", requirement: "15-29 referrals", direct: "25%", override: "7%" },
  { tier: "Platinum", requirement: "30+ referrals", direct: "30%", override: "10%" },
];

// ─── State A: Not yet an affiliate (public signup) ───────────────────

function AffiliatePublicView() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#0D0D14]/80 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-white tracking-tight">Baylio Partners</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://baylio.io" className="text-slate-400 hover:text-white text-sm transition-colors">
              Home
            </a>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { window.location.href = getLoginUrl(); }}
            >
              Sign in to Apply
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="container max-w-4xl text-center">
          <Badge className="mb-6 text-sm px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            Affiliate Program
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white">
            Earn <span className="text-amber-400">20% Recurring</span> Commissions Referring Auto Repair Shops
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Know shop owners? Baylio's AI call assistant is the easiest product to recommend —
            it pays for itself in the first week. You earn commission every month they stay subscribed.
          </p>
          <Button
            size="lg"
            className="text-base px-8 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            Apply Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Commission Structure */}
      <section className="py-16 border-y border-white/5 bg-[#0D0D14]/50">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-8 text-white">Commission Structure</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Tier</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Requirement</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Direct Commission</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Override (L2)</th>
                </tr>
              </thead>
              <tbody>
                {COMMISSION_TIERS.map((t) => (
                  <tr key={t.tier} className="border-b border-white/5">
                    <td className="py-3 px-4 text-amber-400 font-semibold">{t.tier}</td>
                    <td className="py-3 px-4 text-slate-300">{t.requirement}</td>
                    <td className="py-3 px-4 text-emerald-400 font-medium">{t.direct} recurring</td>
                    <td className="py-3 px-4 text-slate-300">{t.override}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 text-xs mt-4 text-center">
            "Recurring" means you earn every month the referred shop stays subscribed.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-10 text-white">How It Works</h2>
          <div className="space-y-6">
            {[
              { step: "1", title: "Apply & Get Approved", desc: "Sign up, tell us about your network, and get approved within 24 hours." },
              { step: "2", title: "Share Your Link", desc: "Send your unique referral link to shop owners. We provide scripts and materials." },
              { step: "3", title: "Shops Sign Up", desc: "When a shop subscribes through your link, you're credited automatically." },
              { step: "4", title: "Get Paid Monthly", desc: "Earn recurring commission every month, for as long as the shop stays subscribed." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 border-t border-white/5">
        <div className="container max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Start Earning?</h2>
          <p className="text-slate-400 mb-8">
            Join the Baylio affiliate program and turn your auto repair industry connections into recurring revenue.
          </p>
          <Button
            size="lg"
            className="text-base px-10 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            Apply Now — It's Free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}

// ─── Signup Form (authenticated, no affiliate account) ───────────────

function AffiliateSignupForm() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  const utils = trpc.useUtils();
  const signup = trpc.affiliate.signup.useMutation({
    onSuccess: () => {
      toast.success("Application submitted! We'll review it within 24 hours.");
      utils.affiliate.me.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit application");
    },
  });

  return (
    <PartnersPortalLayout title="Apply">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Become a Baylio Partner</h1>
          <p className="text-slate-400">
            Fill out the form below. We'll review your application within 24 hours.
          </p>
        </div>

        <Card className="bg-[#0D0D14] border-white/10">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paypal" className="text-slate-300">PayPal Email (for payouts)</Label>
              <Input
                id="paypal"
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="paypal@example.com"
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-slate-500">
                You can update this later in Settings.
              </p>
            </div>
            <Button
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => signup.mutate({
                name,
                email,
                phone: phone || undefined,
                paypalEmail: paypalEmail || undefined,
              })}
              disabled={signup.isPending || !name || !email}
            >
              {signup.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PartnersPortalLayout>
  );
}

// ─── State B: Active affiliate dashboard ─────────────────────────────

function AffiliateDashboard() {
  const { data: statsData, isLoading } = trpc.affiliate.stats.useQuery();

  const referralLink = useMemo(() => {
    if (!statsData?.affiliate?.code) return "";
    return `https://baylio.io/?ref=${statsData.affiliate.code}`;
  }, [statsData?.affiliate?.code]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  if (isLoading) {
    return (
      <PartnersPortalLayout title="Dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </PartnersPortalLayout>
    );
  }

  const stats = statsData?.summary;
  const affiliate = statsData?.affiliate;
  const referrals = statsData?.referrals || [];
  const commissions = statsData?.commissions || [];

  // Tier progress
  const referralCount = stats?.totalReferred ?? 0;
  const tierThresholds = [
    { name: "Bronze", min: 0, max: 4 },
    { name: "Silver", min: 5, max: 14 },
    { name: "Gold", min: 15, max: 29 },
    { name: "Platinum", min: 30, max: Infinity },
  ];
  const currentTierIdx = tierThresholds.findIndex(t => referralCount >= t.min && referralCount <= t.max);
  const nextTier = tierThresholds[currentTierIdx + 1];
  const toNextTier = nextTier ? nextTier.min - referralCount : 0;

  return (
    <PartnersPortalLayout title="Dashboard">
      {/* Status banners */}
      {affiliate?.status === "pending" && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="font-medium text-amber-400">Application Under Review</p>
            <p className="text-sm text-slate-400">We'll notify you once approved. Your referral link activates after approval.</p>
          </div>
        </div>
      )}
      {affiliate?.status === "suspended" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-center gap-3">
          <Clock className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="font-medium text-red-400">Account Suspended</p>
            <p className="text-sm text-slate-400">Contact support for more information.</p>
          </div>
        </div>
      )}

      {/* Referral Link */}
      {affiliate?.status === "active" && (
        <Card className="mb-6 bg-[#0D0D14] border-white/10">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <LinkIcon className="h-4 w-4 text-emerald-400" />
                <span className="font-medium text-sm text-white">Your Referral Link:</span>
              </div>
              <div className="flex-1 flex items-center gap-2 w-full">
                <Input
                  value={referralLink}
                  readOnly
                  className="font-mono text-sm bg-white/5 border-white/10 text-slate-300"
                />
                <Button size="sm" variant="outline" onClick={copyLink} className="border-white/10 text-slate-300 hover:text-white">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#0D0D14] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-400">Clicks</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats?.totalClicks ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#0D0D14] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-400">Signups</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats?.totalSignups ?? 0}</div>
            <p className="text-xs text-slate-500 mt-1">{stats?.conversionRate}% conversion</p>
          </CardContent>
        </Card>
        <Card className="bg-[#0D0D14] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-400">Active Shops</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats?.activeShops ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#0D0D14] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-400">Total Earned</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              ${Number(stats?.totalEarnings ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ${Number(stats?.pendingPayout ?? 0).toFixed(2)} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      {nextTier && (
        <Card className="mb-6 bg-[#0D0D14] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Tier Progress</span>
              <span className="text-xs text-amber-400 font-medium">
                {toNextTier} more referral{toNextTier !== 1 ? "s" : ""} to {nextTier.name}
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((referralCount - tierThresholds[currentTierIdx].min) / (nextTier.min - tierThresholds[currentTierIdx].min)) * 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-[#0D0D14] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Recent Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Share your referral link to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.slice(0, 5).map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-medium text-sm text-white">{ref.referredName || ref.referredEmail || "Anonymous"}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(ref.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={
                        ref.status === "subscribed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                        ref.status === "signed_up" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                        ref.status === "churned" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                        "bg-slate-500/10 text-slate-400 border-slate-500/30"
                      }
                      variant="outline"
                    >
                      {ref.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
                {referrals.length > 5 && (
                  <Link href="/referrals">
                    <Button variant="ghost" size="sm" className="w-full text-emerald-400 hover:text-emerald-300">
                      View all referrals <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0D0D14] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-400" />
              Recent Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Commissions appear once referrals subscribe.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {commissions.slice(0, 5).map((comm) => (
                  <div key={comm.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-medium text-sm text-white">${Number(comm.amount).toFixed(2)}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(comm.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={
                        comm.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                        comm.status === "approved" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                        comm.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                        "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }
                      variant="outline"
                    >
                      {comm.status}
                    </Badge>
                  </div>
                ))}
                {commissions.length > 5 && (
                  <Link href="/earnings">
                    <Button variant="ghost" size="sm" className="w-full text-amber-400 hover:text-amber-300">
                      View all earnings <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnersPortalLayout>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function AffiliatePortal() {
  const { user, loading } = useAuth();
  const { data: affiliateProfile, isLoading: profileLoading } = trpc.affiliate.me.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (!loading && !user) return <AffiliatePublicView />;

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!affiliateProfile) return <AffiliateSignupForm />;

  return <AffiliateDashboard />;
}
