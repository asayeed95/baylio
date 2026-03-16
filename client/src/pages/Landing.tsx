import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
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
} from "lucide-react";

/**
 * Landing Page — Public, sales-focused
 * 
 * This is the first page prospects see when visiting baylio.io.
 * Designed for door-to-door sales: the sales rep can pull up
 * this page on a tablet to demo the product to shop owners.
 * 
 * Sections:
 * 1. Hero — Value proposition + CTA
 * 2. Problem — Pain points auto repair shops face
 * 3. Solution — How Baylio solves it
 * 4. Features — Key capabilities
 * 5. Pricing — Three tiers
 * 6. Social proof — Testimonials (placeholder)
 * 7. CTA — Final conversion
 */

const FEATURES = [
  {
    icon: Phone,
    title: "24/7 AI Receptionist",
    description: "Never miss a call again. Baylio answers every call with a natural-sounding AI voice, even after hours, weekends, and holidays.",
  },
  {
    icon: Calendar,
    title: "Automatic Appointment Booking",
    description: "The AI captures vehicle info, understands the customer's needs, and books appointments directly into your schedule.",
  },
  {
    icon: TrendingUp,
    title: "Intelligent Upselling",
    description: "When a customer calls about brakes, Baylio knows to suggest a fluid flush. Smart, subtle, and effective.",
  },
  {
    icon: BarChart3,
    title: "Call Analytics Dashboard",
    description: "See every call, every outcome, every dollar recovered. Real-time insights into your shop's phone performance.",
  },
  {
    icon: Bot,
    title: "Custom AI Persona",
    description: "Configure your AI's voice, name, greeting, and personality. It sounds like your best employee, not a robot.",
  },
  {
    icon: Building2,
    title: "Multi-Location Support",
    description: "Manage multiple shops from one dashboard. Each location gets its own AI agent, phone number, and analytics.",
  },
];

const PRICING_TIERS = [
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
    cta: "Contact Sales",
    popular: false,
  },
];

const PAIN_POINTS = [
  { stat: "62%", label: "of calls to auto shops go unanswered" },
  { stat: "$1,200", label: "average revenue lost per missed call" },
  { stat: "85%", label: "of callers won't call back after being ignored" },
  { stat: "$28K+", label: "annual revenue lost from missed calls alone" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">Baylio</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { window.location.href = getLoginUrl(); }}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => { window.location.href = getLoginUrl(); }}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="container py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered Call Handling for Auto Repair Shops
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Stop Losing Customers
            <br />
            <span className="text-primary">To Missed Calls</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Baylio is an AI receptionist that answers every call to your auto repair shop 24/7.
            It books appointments, captures vehicle details, and intelligently upsells services — 
            so you never lose another dollar to a ringing phone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base px-8" onClick={() => { window.location.href = getLoginUrl(); }}>
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8">
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required. 14-day free trial on all plans.
          </p>
        </div>
      </section>

      {/* ─── Pain Points ─── */}
      <section className="border-y bg-muted/30">
        <div className="container py-16">
          <h2 className="text-center text-2xl font-bold mb-12">
            The Missed Call Problem Is Costing You Thousands
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {PAIN_POINTS.map((point, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{point.stat}</div>
                <p className="text-sm text-muted-foreground">{point.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="container py-20">
        <h2 className="text-3xl font-bold text-center mb-4">How Baylio Works</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Three steps to never miss a call again. Setup takes less than 10 minutes.
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { step: "1", title: "Connect Your Phone", desc: "We provision a local phone number or forward your existing line to Baylio. No hardware needed." },
            { step: "2", title: "Configure Your AI", desc: "Tell Baylio about your shop — services, hours, pricing, and personality. It learns your business." },
            { step: "3", title: "Start Capturing Revenue", desc: "Every call is answered, every appointment is booked, every upsell opportunity is captured." },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="border-y bg-muted/30">
        <div className="container py-20">
          <h2 className="text-3xl font-bold text-center mb-4">Everything Your Shop Needs</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Built specifically for auto repair shops. Every feature is designed to capture more revenue and save you time.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <Card key={i} className="border bg-card">
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="container py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Choose the plan that fits your shop. All plans include a 14-day free trial. No contracts.
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <Card key={tier.name} className={`relative border ${tier.popular ? "border-primary shadow-lg" : ""}`}>
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${tier.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tier.minutes} minutes included</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  onClick={() => { window.location.href = getLoginUrl(); }}
                >
                  {tier.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          Overage: $0.15/minute beyond your plan. Annual billing saves 20%.
        </p>
      </section>

      {/* ─── Trust / Social Proof ─── */}
      <section className="border-y bg-muted/30">
        <div className="container py-16">
          <h2 className="text-2xl font-bold text-center mb-8">Trusted by Auto Repair Shops</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { quote: "We were missing 15+ calls a week. Baylio caught every single one. Our bookings went up 40% in the first month.", name: "Mike R.", shop: "Mike's Auto Care" },
              { quote: "The upsell feature alone pays for the subscription. Customers don't mind when it's done right.", name: "Sarah T.", shop: "Precision Auto Works" },
              { quote: "I manage 3 locations. Having one dashboard for all of them with individual AI agents is a game changer.", name: "James K.", shop: "Metro Auto Group" },
            ].map((testimonial, i) => (
              <Card key={i} className="border bg-card">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground italic mb-4">"{testimonial.quote}"</p>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.shop}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="container py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Stop Losing Money to Missed Calls?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start your 14-day free trial today. No credit card required. Setup takes 10 minutes.
          </p>
          <Button size="lg" className="text-base px-8" onClick={() => { window.location.href = getLoginUrl(); }}>
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <span className="font-semibold">Baylio</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Baylio. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
