import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import {
  DollarSign,
  Users,
  TrendingUp,
  Zap,
  Shield,
  Clock,
  ChevronRight,
  Star,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const TIERS = [
  {
    name: "Bronze",
    referrals: "1–4 shops",
    rate: "20%",
    monthly: "$40–$120",
    color: "border-orange-500/40 bg-orange-500/5",
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    accent: "text-orange-400",
  },
  {
    name: "Silver",
    referrals: "5–14 shops",
    rate: "22%",
    monthly: "$220–$660",
    color: "border-zinc-400/40 bg-zinc-400/5",
    badge: "bg-zinc-400/20 text-zinc-300 border-zinc-400/30",
    accent: "text-zinc-300",
  },
  {
    name: "Gold",
    referrals: "15–29 shops",
    rate: "25%",
    monthly: "$750–$1,500",
    color: "border-amber-500/40 bg-amber-500/5",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    accent: "text-amber-400",
    popular: true,
  },
  {
    name: "Platinum",
    referrals: "30+ shops",
    rate: "30%",
    monthly: "$1,800+",
    color: "border-emerald-500/40 bg-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    accent: "text-emerald-400",
  },
];

const FEATURES = [
  {
    icon: DollarSign,
    title: "Recurring Commissions",
    desc: "Earn 20–30% every single month a shop stays subscribed. Not a one-time payout — lifetime recurring.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Zap,
    title: "Instant Referral Links",
    desc: "Your unique link is ready the moment you join. Share it anywhere — email, social, in-person QR code.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Users,
    title: "Network Override",
    desc: "Recruit other partners and earn a 5% override on every commission they generate. Build a passive income layer.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: TrendingUp,
    title: "Tier Upgrades",
    desc: "The more shops you refer, the higher your commission rate. Bronze → Silver → Gold → Platinum automatically.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Shield,
    title: "Lifetime Attribution",
    desc: "Your referral code is permanently tied to every shop you bring in. No expiry windows, no clawbacks.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    icon: Clock,
    title: "Monthly Payouts",
    desc: "Request payouts via PayPal or bank transfer. Minimum $50. Processed within 5 business days.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
];

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    role: "Auto Repair Consultant",
    text: "I referred 8 shops in my first month. That's $640/month in recurring income on top of my consulting fees. Baylio basically sells itself.",
    stars: 5,
  },
  {
    name: "Priya S.",
    role: "Automotive Marketing Agency",
    text: "We added Baylio to our service stack and now earn commissions on every client we onboard. It's become a meaningful revenue line.",
    stars: 5,
  },
  {
    name: "Derek W.",
    role: "Parts Sales Rep",
    text: "I visit 20+ shops a week. Mentioning Baylio takes 2 minutes. I've got 12 active referrals and just hit Gold tier.",
    stars: 5,
  },
];

export default function PartnersLanding() {
  const loginUrl = getLoginUrl();
  const [shops, setShops] = useState(10);
  const [tier, setTier] = useState<"bronze" | "silver" | "gold" | "platinum">("silver");

  const TIER_RATES: Record<string, number> = {
    bronze: 0.20,
    silver: 0.22,
    gold: 0.25,
    platinum: 0.30,
  };

  const AVG_PLAN = 299; // average Baylio subscription
  const monthlyEarnings = Math.round(shops * AVG_PLAN * TIER_RATES[tier]);
  const annualEarnings = monthlyEarnings * 12;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Baylio</span>
            <Badge variant="outline" className="ml-2 text-xs border-emerald-700 text-emerald-400 bg-emerald-500/10">
              Partner Program
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={loginUrl}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign In
            </a>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => window.location.href = loginUrl}
            >
              Join Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
          <Badge variant="outline" className="mb-6 border-emerald-700 text-emerald-400 bg-emerald-500/10 px-4 py-1.5 text-sm">
            🚀 Founding Partner spots open — first 25 get Gold tier instantly
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Earn{" "}
            <span className="text-emerald-400">20–30% recurring</span>
            <br />
            for every shop you refer
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Baylio is an AI receptionist that auto repair shops love. You refer them, they subscribe, you earn every month — forever. No selling required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-base px-8 h-12"
              onClick={() => window.location.href = loginUrl}
            >
              Become a Partner — It's Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-base px-8 h-12"
              onClick={() => document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" })}
            >
              Calculate Your Earnings
            </Button>
          </div>

          {/* Social proof numbers */}
          <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            <div>
              <p className="text-3xl font-mono font-bold text-white">$299</p>
              <p className="text-sm text-zinc-500 mt-1">Avg shop plan/mo</p>
            </div>
            <div>
              <p className="text-3xl font-mono font-bold text-emerald-400">30%</p>
              <p className="text-sm text-zinc-500 mt-1">Max commission rate</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-400">∞</p>
              <p className="text-sm text-zinc-500 mt-1">Lifetime attribution</p>
            </div>
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section id="calculator" className="py-16 bg-zinc-900/50 border-y border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Earnings Calculator</h2>
            <p className="text-zinc-400">See exactly what you'd earn based on your referrals</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Number of shops referred: <span className="text-emerald-400 font-bold">{shops}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={shops}
                  onChange={(e) => {
                    const n = parseInt(e.target.value);
                    setShops(n);
                    if (n >= 30) setTier("platinum");
                    else if (n >= 15) setTier("gold");
                    else if (n >= 5) setTier("silver");
                    else setTier("bronze");
                  }}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-zinc-600 mt-1">
                  <span>1</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">Your tier</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["bronze", "silver", "gold", "platinum"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTier(t)}
                      className={`py-2 rounded-lg text-xs font-medium capitalize border transition-all ${
                        tier === t
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-700">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Commission rate</span>
                  <span className="text-white font-mono font-bold">{(TIER_RATES[tier] * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Avg plan value</span>
                  <span className="text-white font-mono font-bold">$299/mo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Active referrals</span>
                  <span className="text-white font-mono font-bold">{shops} shops</span>
                </div>
                <div className="border-t border-zinc-800 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-300 font-medium">Monthly earnings</span>
                    <span className="text-2xl font-mono font-extrabold text-emerald-400">
                      ${monthlyEarnings.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-sm">Annual earnings</span>
                    <span className="text-lg font-mono font-bold text-amber-400">
                      ${annualEarnings.toLocaleString()}
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => window.location.href = loginUrl}
                >
                  Start Earning This
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Commission Tiers */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Commission Tiers</h2>
            <p className="text-zinc-400">Your rate increases automatically as you refer more shops</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`relative rounded-xl border p-5 ${t.color} ${t.popular ? "ring-1 ring-amber-500/50" : ""}`}
              >
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-black text-xs font-bold px-3">Most Popular</Badge>
                  </div>
                )}
                <Badge variant="outline" className={`text-xs mb-4 ${t.badge}`}>
                  {t.name}
                </Badge>
                <p className={`text-4xl font-mono font-extrabold mb-1 ${t.accent}`}>{t.rate}</p>
                <p className="text-xs text-zinc-500 mb-3">recurring commission</p>
                <div className="border-t border-zinc-800/60 pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="text-xs text-zinc-400">{t.referrals}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="text-xs text-zinc-400">{t.monthly}/mo potential</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span className="text-xs text-zinc-400">Lifetime attribution</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-zinc-600 mt-4">
            + 5% network override when you recruit other partners. Tiers upgrade automatically.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-zinc-900/30 border-y border-zinc-800/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Everything you need to earn</h2>
            <p className="text-zinc-400">No minimums, no contracts, no complicated rules</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
                <div className={`h-10 w-10 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Partners are already earning</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-4">"{t.text}"</p>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-b from-zinc-900/50 to-emerald-950/20 border-t border-zinc-800/40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to start earning?
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            Join free in under 60 seconds. Your referral link is ready instantly. First 25 partners get Gold tier status automatically.
          </p>
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-base px-10 h-12"
            onClick={() => window.location.href = loginUrl}
          >
            Join the Partner Program — Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-zinc-600 mt-4">No credit card. No minimum referrals. Cancel anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">© 2025 Baylio. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-zinc-600">
            <a href="https://baylio.io" className="hover:text-zinc-400 transition-colors">Main Site</a>
            <a href="mailto:hello@baylio.io" className="hover:text-zinc-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
