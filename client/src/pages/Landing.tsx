import { useState, useMemo } from "react";
import { usePostHog } from "@posthog/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "wouter";
import { HeroVisual } from "@/components/visuals/HeroVisual";
import { WrenchDivider, TreadDivider } from "@/components/visuals/TreadDivider";
import { CarLineDraw } from "@/components/visuals/CarLineDraw";
import { TIER_ICONS } from "@/components/visuals/TierIcons";
import {
  Phone,
  BarChart3,
  Bot,
  Calendar,
  TrendingUp,
  Shield,
  Clock,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Zap,
  Building2,
  Calculator,
  Handshake,
  Users,
  BadgeDollarSign,
  Gift,
  Menu,
  PhoneIncoming,
  MessageSquare,
  ClipboardList,
  BellRing,
  Headphones,
  Wrench,
  FileText,
  Target,
} from "lucide-react";

/**
 * Resolve the partners portal URL.
 * On production (baylio.io / www.baylio.io) → partners.baylio.io
 * On dev preview → same origin with ?portal=partners
 */
function getPartnersUrl(): string {
  const hostname = window.location.hostname;
  if (hostname === "baylio.io" || hostname === "www.baylio.io") {
    return "https://partners.baylio.io";
  }
  return `${window.location.origin}?portal=partners`;
}

/**
 * Landing Page — Public, conversion-focused
 *
 * Written for busy auto repair shop owners, service managers,
 * and multi-location operators. Every sentence answers:
 * "Why should a shop owner care?"
 *
 * Section order:
 *  1. Navbar
 *  2. Hero — Instant clarity
 *  3. What Happens When a Customer Calls — 4-step flow
 *  4. Outcomes / Business Results
 *  5. ROI Calculator
 *  6. Hear Baylio in Action — Sample calls
 *  7. Features
 *  8. Who Baylio Is For
 *  9. Trust / Credibility
 * 10. Pricing
 * 11. Blog / Resources Preview
 * 12. Partner Program CTA
 * 13. Final CTA
 * 14. Footer
 */

// ─── Data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Phone,
    title: "24/7 AI Receptionist",
    description:
      "Answers every call with a natural voice. After hours, weekends, holidays — covered.",
  },
  {
    icon: Calendar,
    title: "Automatic Appointment Booking",
    description:
      "Captures vehicle info, understands the problem, books the appointment. No human needed.",
  },
  {
    icon: TrendingUp,
    title: "Intelligent Upselling",
    description:
      "Brakes? Suggest a fluid flush. Oil change? Mention the tire rotation. Subtle and effective.",
  },
  {
    icon: BarChart3,
    title: "Call Analytics Dashboard",
    description:
      "Every call, every outcome, every dollar. Real-time visibility into phone performance.",
  },
  {
    icon: Bot,
    title: "Custom AI Persona",
    description:
      "Your AI sounds like your best employee. Configure voice, name, greeting, and personality.",
  },
  {
    icon: Building2,
    title: "Multi-Location Support",
    description:
      "One dashboard, multiple shops. Each location gets its own AI agent and analytics.",
  },
];

// ⚠️ DO NOT REMOVE THE $149 TRIAL TIER — it is a permanent pricing option
const PRICING_TIERS = [
  {
    name: "Trial",
    price: 149,
    description: "Try Baylio risk-free for your first month",
    minutes: 150,
    features: [
      "AI receptionist (150 min/mo)",
      "Call logging & transcription",
      "Basic analytics dashboard",
      "Email notifications",
      "Business hours configuration",
      "14-day money-back guarantee",
    ],
    cta: "Start for $149",
    popular: false,
    badge: "Best to Start",
  },
  {
    name: "Starter",
    price: 199,
    description: "For single-location shops getting started",
    minutes: 300,
    features: [
      "AI receptionist (300 min/mo)",
      "Call logging & transcription",
      "Basic analytics dashboard",
      "Email notifications",
      "Business hours configuration",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Pro",
    price: 349,
    description: "For busy shops that need more capacity",
    minutes: 750,
    features: [
      "Everything in Starter",
      "750 minutes per month",
      "Calendar integration",
      "Advanced analytics & trends",
      "SMS notifications to owner",
      "Custom AI voice & persona",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Elite",
    price: 599,
    description: "For multi-location operators and high-volume shops",
    minutes: 1500,
    features: [
      "Everything in Pro",
      "1,500 minutes per month",
      "Intelligent upsell engine",
      "CRM integration",
      "Multi-location management",
      "Priority support",
      "Weekly performance reports",
    ],
    cta: "Book a Demo",
    popular: false,
  },
];

const SAMPLE_CALLS = [
  {
    icon: Wrench,
    title: "Brake Service Inquiry",
    description:
      "Customer calls about squeaking brakes. Baylio identifies the issue, checks availability, and books a brake inspection.",
    transcript: [
      {
        role: "AI",
        text: "Thanks for calling Precision Auto! This is Alex, how can I help?",
      },
      {
        role: "Caller",
        text: "Yeah, my brakes have been squeaking pretty bad.",
      },
      {
        role: "AI",
        text: "I can get you in for a brake inspection. What kind of car are you driving?",
      },
      { role: "Caller", text: "2019 Honda Civic, about 65,000 miles." },
    ],
  },
  {
    icon: Clock,
    title: "After-Hours Call",
    description:
      "9:47 PM on a Tuesday. Instead of voicemail, Baylio answers, captures the problem, and schedules a morning callback.",
    transcript: [
      {
        role: "AI",
        text: "Thanks for calling! We're closed for the evening, but I can help.",
      },
      {
        role: "Caller",
        text: "My check engine light just came on. Should I be worried?",
      },
      {
        role: "AI",
        text: "I'll make a note and have our team call you first thing tomorrow morning. Can I get your name?",
      },
      {
        role: "Caller",
        text: "Sure, it's Maria. My number is the one I'm calling from.",
      },
    ],
  },
  {
    icon: Calendar,
    title: "Oil Change Booking",
    description:
      "Quick and efficient. Baylio confirms the vehicle, finds an open slot, and books the appointment in under 90 seconds.",
    transcript: [
      {
        role: "AI",
        text: "Hi, this is Alex at Downtown Auto. How can I help you today?",
      },
      {
        role: "Caller",
        text: "I need to schedule an oil change for my truck.",
      },
      { role: "AI", text: "Absolutely. What year and model is it?" },
      {
        role: "Caller",
        text: "2021 Ford F-150. Can you do Thursday afternoon?",
      },
    ],
  },
];

const BLOG_POSTS = [
  {
    slug: "missed-call-revenue-loss",
    title: "How Much Revenue Auto Repair Shops Lose From Missed Calls",
    category: "Revenue Recovery",
    excerpt:
      "The average shop misses 62% of incoming calls. Here's what that costs you annually and how to fix it.",
  },
  {
    slug: "after-hours-calls",
    title: "After-Hours Calls: What Shop Owners Are Missing",
    category: "Operations",
    excerpt:
      "35% of customer calls come outside business hours. Most go to voicemail. Most never call back.",
  },
  {
    slug: "ai-receptionist-for-shops",
    title: "How AI Receptionists Help Front Desks Book More Jobs",
    category: "Technology",
    excerpt:
      "AI phone answering isn't science fiction. Here's how modern shops are using it to grow revenue.",
  },
];

// ─── ROI Calculator ──────────────────────────────────────────────────

/**
 * Interactive calculator that shows shop owners how much revenue
 * they're losing to missed calls. Uses real industry data:
 * - Average repair order: $466 (AAA/IBISWorld)
 * - 62% of calls go unanswered (industry average)
 * - 85% of callers won't call back
 */
function ROICalculator() {
  const posthog = usePostHog();
  const [callsPerDay, setCallsPerDay] = useState([15]);
  const [missedPercent, setMissedPercent] = useState([40]);
  const [avgRepairOrder, setAvgRepairOrder] = useState([466]);

  const calculations = useMemo(() => {
    const dailyCalls = callsPerDay[0];
    const missedRate = missedPercent[0] / 100;
    const aro = avgRepairOrder[0];
    const conversionRate = 0.35;

    const dailyMissed = Math.round(dailyCalls * missedRate);
    const monthlyMissed = dailyMissed * 22;
    const potentialBookings = Math.round(monthlyMissed * conversionRate);
    const monthlyRevenueLost = potentialBookings * aro;
    const annualRevenueLost = monthlyRevenueLost * 12;

    const capturedCalls = Math.round(monthlyMissed * 0.9);
    const newBookings = Math.round(capturedCalls * conversionRate);
    const monthlyRecovered = newBookings * aro;
    const annualRecovered = monthlyRecovered * 12;

    const baylioCost = 349;
    const monthlyROI = monthlyRecovered - baylioCost;
    const roiMultiple =
      monthlyRecovered > 0 ? Math.round(monthlyRecovered / baylioCost) : 0;

    return {
      dailyMissed,
      monthlyMissed,
      monthlyRevenueLost,
      annualRevenueLost,
      capturedCalls,
      newBookings,
      monthlyRecovered,
      annualRecovered,
      monthlyROI,
      roiMultiple,
    };
  }, [callsPerDay, missedPercent, avgRepairOrder]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <section id="roi-calculator" className="container py-12 md:py-20">
      <h2 className="text-3xl font-bold text-center mb-4">
        <Calculator className="inline h-8 w-8 mr-2 text-primary" />
        See How Much You're Losing
      </h2>
      <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
        Adjust the sliders to match your shop. The numbers speak for themselves.
      </p>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-lg">Your Shop's Numbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <div className="flex justify-between mb-3">
                <label className="text-sm font-medium">Calls per day</label>
                <span className="text-sm font-bold text-primary">
                  {callsPerDay[0]}
                </span>
              </div>
              <Slider
                value={callsPerDay}
                onValueChange={v => {
                  setCallsPerDay(v);
                  posthog?.capture("roi_calculator_used", { field: "calls_per_day", value: v[0] });
                }}
                min={5}
                max={60}
                step={1}
              />
            </div>
            <div>
              <div className="flex justify-between mb-3">
                <label className="text-sm font-medium">Missed call rate</label>
                <span className="text-sm font-bold text-primary">
                  {missedPercent[0]}%
                </span>
              </div>
              <Slider
                value={missedPercent}
                onValueChange={v => {
                  setMissedPercent(v);
                  posthog?.capture("roi_calculator_used", { field: "missed_percent", value: v[0] });
                }}
                min={10}
                max={80}
                step={5}
              />
            </div>
            <div>
              <div className="flex justify-between mb-3">
                <label className="text-sm font-medium">
                  Average repair order
                </label>
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(avgRepairOrder[0])}
                </span>
              </div>
              <Slider
                value={avgRepairOrder}
                onValueChange={v => {
                  setAvgRepairOrder(v);
                  posthog?.capture("roi_calculator_used", { field: "avg_repair_order", value: v[0] });
                }}
                min={100}
                max={1200}
                step={25}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Industry average: $466 per repair order (AAA/IBISWorld). 35%
              call-to-appointment conversion rate.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">
                Revenue you're losing monthly
              </p>
              <p className="text-3xl font-mono font-bold text-destructive">
                {formatCurrency(calculations.monthlyRevenueLost)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {calculations.monthlyMissed} missed calls/mo &times; 35%
                conversion &times; {formatCurrency(avgRepairOrder[0])} avg order
              </p>
            </CardContent>
          </Card>

          <Card className="border border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">
                Revenue Baylio recovers monthly
              </p>
              <p className="text-3xl font-mono font-bold text-primary">
                {formatCurrency(calculations.monthlyRecovered)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {calculations.capturedCalls} calls captured &rarr;{" "}
                {calculations.newBookings} new bookings
              </p>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Annual recovery
                  </p>
                  <p className="text-xl font-mono font-bold">
                    {formatCurrency(calculations.annualRecovered)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ROI multiple</p>
                  <p className="text-xl font-mono font-bold text-primary">
                    {calculations.roiMultiple}x return
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              posthog?.capture("cta_clicked", { label: "Start Recovering Revenue", location: "roi_calculator" });
              window.location.href = "/login";
            }}
          >
            Start Recovering Revenue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function Landing() {
  const posthog = usePostHog();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── 1. Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-semibold tracking-wider uppercase text-sm">
              Baylio
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </a>
            <Link
              href="/faq"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
            <a
              href={getPartnersUrl()}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              <Handshake className="h-3.5 w-3.5" />
              Partners
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 pt-10">
                <nav className="flex flex-col gap-4">
                  <a
                    href="#features"
                    className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
                  >
                    Features
                  </a>
                  <a
                    href="#pricing"
                    className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
                  >
                    Pricing
                  </a>
                  <a
                    href="#how-it-works"
                    className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
                  >
                    How It Works
                  </a>
                  <Link
                    href="/faq"
                    className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
                  >
                    FAQ
                  </Link>
                  <Link
                    href="/blog"
                    className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
                  >
                    Blog
                  </Link>
                  <Link
                    href="/contact"
                    className="text-base font-medium text-foreground hover:text-primary transition-colors py-2"
                  >
                    Contact
                  </Link>
                  <a
                    href={getPartnersUrl()}
                    className="text-base font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-2 py-2"
                  >
                    <Handshake className="h-4 w-4" />
                    Become a Partner
                  </a>
                  <hr className="my-2" />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      window.location.href = "/login";
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      window.location.href = "/login";
                    }}
                  >
                    Book a Demo
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Sign In
            </Button>
            <Button
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── 2. Hero ─── */}
      <section className="container py-12 md:py-32">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center md:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <Badge variant="secondary" className="mb-6">
                <Phone className="h-3 w-3 mr-1" />
                AI Receptionist for Auto Repair Shops
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight"
            >
              Answer Every Call.
              <br />
              <span className="text-primary">
                Book More Jobs. Recover Lost Revenue.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl md:max-w-none mx-auto md:mx-0 leading-relaxed"
            >
              Baylio answers your shop's phone 24/7 with a human-sounding AI
              voice. It captures caller details, books appointments, and makes
              sure you never lose a customer to a missed call again.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
            >
              <Button
                size="lg"
                className="text-base px-8"
                onClick={() => {
                  posthog?.capture("cta_clicked", { label: "Book a Demo", location: "hero" });
                  window.location.href = "/login";
                }}
              >
                Book a Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8"
                asChild
              >
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-sm text-muted-foreground mt-4"
            >
              Setup in under 10 minutes · No hardware required · 14-day free trial
            </motion.p>
          </motion.div>

          {/* Right: schematic visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="hidden md:block text-foreground"
          >
            <HeroVisual />
          </motion.div>

          {/* Mobile: show a compact version below copy */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="md:hidden text-foreground -mt-4 max-w-sm mx-auto w-full"
          >
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      <WrenchDivider />

      {/* ─── 3. What Happens When a Customer Calls ─── */}
      <section id="how-it-works" className="border-y bg-muted/30">
        <div className="container py-12 md:py-20">
          <h2 className="text-3xl font-bold text-center mb-4">
            What Happens When a Customer Calls
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            From ring to resolution in seconds. No training. No staffing. No
            missed opportunities.
          </p>

          {/* Schematic car outline draws in as section enters viewport */}
          <div className="max-w-3xl mx-auto mb-10 text-foreground">
            <CarLineDraw />
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                icon: PhoneIncoming,
                title: "Customer calls your shop",
                desc: "Your existing number or a new local number. No changes to your current setup.",
              },
              {
                step: "2",
                icon: Headphones,
                title: "Baylio answers instantly",
                desc: "Under 2 seconds. Professional greeting with your shop's name. No hold music.",
              },
              {
                step: "3",
                icon: ClipboardList,
                title: "AI captures the details",
                desc: "Vehicle info, problem description, urgency level — all documented automatically.",
              },
              {
                step: "4",
                icon: BellRing,
                title: "You get the result",
                desc: "Appointment booked, lead logged, or owner notified. Nothing falls through the cracks.",
              },
            ].map(item => (
              <Card key={item.step} className="border bg-card text-center">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-3">
                    {item.step}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. Outcomes / Business Results ─── */}
      <section className="container py-12 md:py-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          What Baylio Does for Your Bottom Line
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          This isn't about software features. It's about the business results
          shop owners see.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: DollarSign,
              title: "Recover missed revenue",
              desc: "62% of shop calls go unanswered. Each one is $1,200+ walking out the door.",
            },
            {
              icon: Calendar,
              title: "Book more appointments",
              desc: "AI converts calls to bookings while your techs stay focused on the bay.",
            },
            {
              icon: Clock,
              title: "Respond after hours",
              desc: "Evenings, weekends, holidays. Your phone never goes to voicemail again.",
            },
            {
              icon: Users,
              title: "Reduce front desk chaos",
              desc: "Stop pulling your service writer off the counter to answer the phone.",
            },
            {
              icon: BarChart3,
              title: "See every call in one dashboard",
              desc: "Who called, what they needed, what happened. Complete visibility.",
            },
          ].map((item, i) => (
            <Card key={i} className="border bg-card">
              <CardContent className="pt-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <TreadDivider />

      {/* ─── 5. ROI Calculator ─── */}
      <ROICalculator />

      {/* ─── 6. Hear Baylio in Action ─── */}
      <section className="border-y bg-muted/30">
        <div className="container py-12 md:py-20">
          <h2 className="text-3xl font-bold text-center mb-4">
            Hear What Your Customers Will Experience
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Real scenarios. Real conversations. Real results.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {SAMPLE_CALLS.map((call, i) => (
              <Card key={i} className="border bg-card">
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <call.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{call.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {call.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                    {call.transcript.map((line, j) => (
                      <div key={j} className="text-xs">
                        <span
                          className={`font-semibold ${line.role === "AI" ? "text-primary" : "text-foreground"}`}
                        >
                          {line.role === "AI" ? "Baylio:" : "Caller:"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {line.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button
              size="lg"
              className="text-base px-8"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Book a Live Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── 7. Features ─── */}
      <section id="features" className="container py-12 md:py-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          Everything Your Shop Needs to Never Miss a Call
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Built specifically for auto repair shops. Every feature earns its
          place.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {FEATURES.map((feature, i) => (
            <Card key={i} className="border bg-card">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── 8. Who Baylio Is For ─── */}
      <section className="border-y bg-muted/30">
        <div className="container py-10 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Built for Shops That Can't Afford to Miss the Phone
          </h2>
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-4">
            {[
              { icon: Wrench, text: "Independent auto repair shops" },
              { icon: Phone, text: "Busy front desks drowning in phone calls" },
              {
                icon: Building2,
                text: "Multi-location operators who need consistency",
              },
              {
                icon: Clock,
                text: "Shops losing revenue to after-hours calls",
              },
              {
                icon: BarChart3,
                text: "Owners who want visibility into phone performance",
              },
              {
                icon: Target,
                text: "Shops ready to grow without adding headcount",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border"
              >
                <item.icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8 max-w-xl mx-auto">
            Not built for generic call centers or retail. Baylio is
            purpose-built for automotive service businesses.
          </p>
        </div>
      </section>

      {/* ─── 9. Trust / Credibility ─── */}
      <section className="container py-12 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          Why Shop Owners Trust Baylio
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: Zap,
              title: "Setup in under 10 minutes",
              desc: "Forward your number or get a new local line. No hardware, no IT team needed.",
            },
            {
              icon: Clock,
              title: "Answers in under 2 seconds",
              desc: "Faster than any human receptionist. Your customers never hear a busy signal.",
            },
            {
              icon: Shield,
              title: "14-day free trial",
              desc: "See the results before you pay. No credit card required to start.",
            },
            {
              icon: Users,
              title: "Hands-on onboarding",
              desc: "We configure your AI agent with you. Your service catalog, your hours, your voice.",
            },
            {
              icon: Wrench,
              title: "Built by operators, not just engineers",
              desc: "Founded by people who understand auto repair. Not a generic AI tool bolted onto your shop.",
            },
            {
              icon: Building2,
              title: "Enterprise-grade infrastructure",
              desc: "Same telephony platform used by major contact centers. 99.9% uptime SLA.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 rounded-lg bg-muted/30 border"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 10. Pricing ─── */}
      <section id="pricing" className="border-y bg-muted/30">
        <div className="container py-12 md:py-20">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Choose the plan that fits your shop. All plans include a 14-day free
            trial. No contracts.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {PRICING_TIERS.map((tier: any) => {
              const TierIcon = TIER_ICONS[tier.name];
              return (
                <Card
                  key={tier.name}
                  className={`relative border transition-all hover:border-primary/40 ${tier.popular ? "border-primary shadow-sm" : ""}`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground font-mono text-xs">
                        MOST POPULAR
                      </Badge>
                    </div>
                  )}
                  {tier.badge && !tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {tier.badge}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    {TierIcon && (
                      <div
                        className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-lg ${tier.popular ? "bg-primary/10 text-primary" : "bg-muted text-steel"}`}
                      >
                        <TierIcon size={40} />
                      </div>
                    )}
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {tier.description}
                    </p>
                    <div className="mt-4">
                      <span className="text-4xl font-mono font-bold">
                        ${tier.price}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tier.minutes} minutes included
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={tier.popular ? "default" : "outline"}
                      onClick={() => {
                        posthog?.capture("pricing_tier_selected", { tier: tier.name, price: tier.price, cta: tier.cta });
                        posthog?.capture("cta_clicked", { label: tier.cta, location: "pricing", tier: tier.name });
                        window.location.href = "/login";
                      }}
                    >
                      {tier.cta}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Overage: $0.15/minute beyond your plan. Annual billing saves 20%.
          </p>
        </div>
      </section>

      {/* ─── 11. Blog / Resources Preview ─── */}
      <section className="container py-12 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
          Resources for Shop Owners
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Phone strategy, missed-call recovery, front-desk efficiency, and AI
          for repair shops.
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {BLOG_POSTS.map(post => (
            <Card
              key={post.slug}
              className="border bg-card hover:border-primary/30 transition-colors"
            >
              <CardContent className="pt-6">
                <Badge variant="secondary" className="mb-3 text-xs">
                  {post.category}
                </Badge>
                <h3 className="text-base font-semibold mb-2 leading-snug">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {post.excerpt}
                </p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  Read More <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-8">
          <Button variant="outline" asChild>
            <Link href="/blog">
              Visit the Blog
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ─── 12. Partner Program CTA ─── */}
      <section
        id="partners"
        className="border-y bg-gradient-to-br from-primary/5 via-background to-primary/10"
      >
        <div className="container py-12 md:py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                <Handshake className="h-3 w-3 mr-1" />
                Partner Program
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Earn Up to 30% Commission.
                <br />
                <span className="text-primary">
                  Refer Shops. Get Paid Every Month.
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Know auto repair shop owners? Refer them to Baylio and earn
                recurring commissions every month they stay subscribed — for as
                long as they're a customer.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  icon: BadgeDollarSign,
                  title: "20-30% Recurring Commission",
                  desc: "Earn a percentage of every monthly subscription your referrals pay. Not a one-time bonus — every single month, on autopilot.",
                },
                {
                  icon: Users,
                  title: "Unlimited Referrals",
                  desc: "No cap on how many shops you can refer. Refer 10 shops on the Pro plan and earn $700+/month in passive income.",
                },
                {
                  icon: Gift,
                  title: "Free to Join. No Minimums.",
                  desc: "Sign up in 60 seconds. Get your unique referral link. Start sharing. No quotas, no fees, no fine print.",
                },
              ].map((item, i) => (
                <Card key={i} className="border bg-card text-center">
                  <CardHeader className="pb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-muted/50 border rounded-sm p-6 md:p-8 mb-10">
              <p className="text-center text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wide">
                Example monthly earnings
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                {[
                  {
                    referrals: "5 shops",
                    tier: "Starter ($199)",
                    monthly: "$199/mo",
                    rate: "20%",
                  },
                  {
                    referrals: "10 shops",
                    tier: "Pro ($349)",
                    monthly: "$698/mo",
                    rate: "20%",
                  },
                  {
                    referrals: "20 shops",
                    tier: "Pro ($349)",
                    monthly: "$1,745/mo",
                    rate: "25%",
                  },
                  {
                    referrals: "50 shops",
                    tier: "Mixed",
                    monthly: "$5,000+/mo",
                    rate: "30%",
                  },
                ].map((ex, i) => (
                  <div key={i}>
                    <p className="text-2xl font-mono font-bold text-primary">
                      {ex.monthly}
                    </p>
                    <p className="text-sm font-medium mt-1">{ex.referrals}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.tier} · {ex.rate}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <Button
                size="lg"
                className="text-base px-10"
                onClick={() => {
                  posthog?.capture("partner_signup_intent", { location: "partner_section" });
                  posthog?.capture("cta_clicked", { label: "Become a Partner", location: "partner_section" });
                  window.location.href = getPartnersUrl();
                }}
              >
                Become a Partner — It's Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Already a partner?{" "}
                <a
                  href={getPartnersUrl()}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in to your portal →
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 13. Final CTA ─── */}
      <section className="container py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Stop Losing Customers to Missed Calls
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join the shops that answer every call, book more jobs, and recover
            thousands in lost revenue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-base px-8"
              onClick={() => {
                posthog?.capture("cta_clicked", { label: "Start Your Free Trial", location: "final_cta" });
                window.location.href = "/login";
              }}
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8"
              onClick={() => {
                posthog?.capture("cta_clicked", { label: "Book a Demo", location: "final_cta" });
                window.location.href = "/login";
              }}
            >
              Book a Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            14-day free trial · No credit card required · Setup in 10 minutes
          </p>
        </div>
      </section>

      {/* ─── 14. Footer ─── */}
      <footer className="border-t">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-semibold tracking-wider uppercase text-sm">
                Baylio
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Baylio. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-6 justify-center">
              <Link
                href="/contact"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Contact
              </Link>
              <Link
                href="/faq"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                FAQ
              </Link>
              <Link
                href="/blog"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Blog
              </Link>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Terms
              </a>
              <a
                href={getPartnersUrl()}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Partners
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
