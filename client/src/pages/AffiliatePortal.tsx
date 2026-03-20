/**
 * Affiliate Portal
 * 
 * Two states:
 * 1. Public view: Explains the affiliate program + signup CTA
 * 2. Authenticated affiliate: Dashboard with stats, referral link, earnings
 * 
 * Affiliates earn 20% recurring monthly commission on every shop they refer.
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
  Percent,
  Wallet,
  Phone,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";

// ─── Public Landing Section ──────────────────────────────────────────

const AFFILIATE_BENEFITS = [
  {
    icon: DollarSign,
    title: "20% Recurring Commission",
    description: "Earn 20% of every monthly subscription payment from shops you refer. For as long as they stay subscribed.",
  },
  {
    icon: TrendingUp,
    title: "Passive Income That Grows",
    description: "Refer 10 shops on the Starter plan ($249/mo) and earn $498/mo passively. Scale to 50 shops for $2,490/mo.",
  },
  {
    icon: Users,
    title: "Perfect for Industry Insiders",
    description: "Parts suppliers, tool reps, shop consultants — if you already talk to shop owners, this is free money.",
  },
  {
    icon: Clock,
    title: "30-Day Cookie Window",
    description: "Your referral link stays active for 30 days. Even if they don't sign up immediately, you still get credit.",
  },
];

const COMMISSION_EXAMPLES = [
  { tier: "Starter", price: 249, shops: 5, monthly: 249 },
  { tier: "Growth", price: 449, shops: 10, monthly: 898 },
  { tier: "Pro", price: 749, shops: 20, monthly: 2996 },
];

function AffiliatePublicView() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">Baylio</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">Home</Button>
            </Link>
            <Button
              size="sm"
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
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
            Affiliate Program
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Earn <span className="text-primary">20% Recurring</span> by Referring Auto Repair Shops
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Know shop owners? Baylio's AI call assistant is the easiest product to recommend — 
            it pays for itself in the first week. You earn commission every month they stay subscribed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-base px-8"
              onClick={() => { window.location.href = getLoginUrl(); }}
            >
              Apply Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Link href="/#pricing">
              <Button size="lg" variant="outline" className="text-base px-8">
                See Baylio Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Why Become a Baylio Affiliate?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {AFFILIATE_BENEFITS.map((benefit) => (
              <Card key={benefit.title} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Calculator */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-4">Your Earning Potential</h2>
          <p className="text-center text-muted-foreground mb-10">
            Here's what your monthly passive income looks like at 20% commission:
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {COMMISSION_EXAMPLES.map((ex) => (
              <Card key={ex.tier} className="text-center">
                <CardHeader className="pb-2">
                  <CardDescription>Refer {ex.shops} shops on</CardDescription>
                  <CardTitle className="text-lg">{ex.tier} (${ex.price}/mo)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary mb-1">
                    ${ex.monthly.toLocaleString()}/mo
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ${(ex.monthly * 12).toLocaleString()}/year passive income
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            {[
              { step: "1", title: "Apply & Get Approved", desc: "Sign up, tell us about your network, and get your unique referral link within 24 hours." },
              { step: "2", title: "Share Your Link", desc: "Send your referral link to shop owners you know. We provide marketing materials and talking points." },
              { step: "3", title: "Shops Sign Up & Subscribe", desc: "When a shop signs up through your link and subscribes, you're credited automatically." },
              { step: "4", title: "Get Paid Monthly", desc: "Earn 20% of every payment, every month, for as long as the shop stays subscribed. Payouts via PayPal." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Earning?</h2>
          <p className="text-muted-foreground mb-8">
            Join the Baylio affiliate program and turn your auto repair industry connections into recurring revenue.
          </p>
          <Button
            size="lg"
            className="text-base px-10"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            Apply Now — It's Free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Baylio</span>
            <span>Affiliate Program</span>
          </div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Authenticated Affiliate Dashboard ───────────────────────────────

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
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">Baylio</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Dashboard</Button>
          </Link>
        </div>
      </nav>

      <div className="container max-w-lg py-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Apply to Become an Affiliate</h1>
          <p className="text-muted-foreground">
            Fill out the form below and we'll review your application within 24 hours.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paypal">PayPal Email (for payouts)</Label>
              <Input
                id="paypal"
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="paypal@example.com"
              />
              <p className="text-xs text-muted-foreground">
                You can update this later. Commissions are paid monthly via PayPal.
              </p>
            </div>
            <Button
              className="w-full mt-2"
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
    </div>
  );
}

function AffiliateDashboard() {
  const { data: statsData, isLoading } = trpc.affiliate.stats.useQuery();
  const [origin] = useState(() => window.location.origin);

  const referralLink = useMemo(() => {
    if (!statsData?.affiliate?.code) return "";
    return `${origin}/?ref=${statsData.affiliate.code}`;
  }, [origin, statsData?.affiliate?.code]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const stats = statsData?.summary;
  const affiliate = statsData?.affiliate;
  const referrals = statsData?.referrals || [];
  const commissions = statsData?.commissions || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">Baylio</span>
            <Badge variant="secondary" className="ml-2">Affiliate</Badge>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Shop Dashboard</Button>
          </Link>
        </div>
      </nav>

      <div className="container max-w-6xl py-8">
        {/* Status Banner */}
        {affiliate?.status === "pending" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Application Under Review</p>
              <p className="text-sm text-amber-700">
                Your affiliate application is being reviewed. You'll be notified once approved.
                Your referral link will become active after approval.
              </p>
            </div>
          </div>
        )}

        {affiliate?.status === "suspended" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Clock className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-medium text-red-800">Account Suspended</p>
              <p className="text-sm text-red-700">
                Your affiliate account has been suspended. Please contact support for more information.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {affiliate?.name}. Here's your performance overview.
            </p>
          </div>
          <Badge
            variant={affiliate?.status === "active" ? "default" : "secondary"}
            className="w-fit capitalize"
          >
            {affiliate?.status}
          </Badge>
        </div>

        {/* Referral Link */}
        {affiliate?.status === "active" && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Your Referral Link:</span>
                </div>
                <div className="flex-1 flex items-center gap-2 w-full">
                  <Input
                    value={referralLink}
                    readOnly
                    className="font-mono text-sm bg-muted"
                  />
                  <Button size="sm" variant="outline" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Clicks</span>
              </div>
              <div className="text-2xl font-bold">{stats?.totalClicks ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Signups</span>
              </div>
              <div className="text-2xl font-bold">{stats?.totalSignups ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.conversionRate}% conversion
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active Shops</span>
              </div>
              <div className="text-2xl font-bold">{stats?.activeShops ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Earned</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                ${Number(stats?.totalEarnings ?? 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ${Number(stats?.pendingPayout ?? 0).toFixed(2)} pending
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout: Referrals + Commissions */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Referrals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Referrals
              </CardTitle>
              <CardDescription>Shops referred through your link</CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No referrals yet. Share your link to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{ref.referredName || ref.referredEmail || "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ref.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          ref.status === "subscribed" ? "default" :
                          ref.status === "signed_up" ? "secondary" :
                          ref.status === "churned" ? "destructive" : "outline"
                        }
                        className="capitalize"
                      >
                        {ref.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Commission History
              </CardTitle>
              <CardDescription>Your earnings from referred shops</CardDescription>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No commissions yet. They'll appear here once referrals subscribe.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commissions.map((comm) => (
                    <div key={comm.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">${Number(comm.amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comm.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          comm.status === "paid" ? "default" :
                          comm.status === "approved" ? "secondary" :
                          comm.status === "rejected" ? "destructive" : "outline"
                        }
                        className="capitalize"
                      >
                        {comm.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payout Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Commission Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Commission Rate</p>
                <p className="font-semibold">{(Number(affiliate?.commissionRate ?? 0.2) * 100).toFixed(0)}% Recurring</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Payout Method</p>
                <p className="font-semibold">{affiliate?.paypalEmail ? `PayPal (${affiliate.paypalEmail})` : "Not configured"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Payout Schedule</p>
                <p className="font-semibold">Monthly (1st of each month)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function AffiliatePortal() {
  const { user, loading } = useAuth();
  const { data: affiliateProfile, isLoading: profileLoading } = trpc.affiliate.me.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Not logged in → show public landing
  if (!loading && !user) {
    return <AffiliatePublicView />;
  }

  // Loading states
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Logged in but not an affiliate → show signup form
  if (!affiliateProfile) {
    return <AffiliateSignupForm />;
  }

  // Logged in affiliate → show dashboard
  return <AffiliateDashboard />;
}
