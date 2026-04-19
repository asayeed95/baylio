import PartnersPortalLayout from "@/components/PartnersPortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Copy,
  Check,
  ArrowRight,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import type { ReactElement } from "react";
import { useState } from "react";
import {
  Step1MissedCall,
  Step2BaylioAnswers,
  Step3SmartConvo,
  Step4OwnerNotified,
  Step5RevenueUp,
} from "@/components/visuals/PartnerIllustrations";

/**
 * Partners Onboarding Guide
 *
 * Visual 5-step explainer partners use to walk local auto repair shops
 * through how Baylio works. Designed to be shown on a laptop during a
 * pitch, printed as a handout, or shared as a link.
 *
 * Each step = one illustration + a talking-points block + a "what to say"
 * script. Partners can copy any script to clipboard or export the whole
 * guide as a print-friendly page.
 */
export default function PartnersOnboardingGuide() {
  return (
    <PartnersPortalLayout>
      <OnboardingGuideContent />
    </PartnersPortalLayout>
  );
}

type Objection = { q: string; a: string };
type Step = {
  n: string;
  title: string;
  Visual: () => ReactElement;
  pitch: string;
  talkingPoints: string[];
  objections?: Objection[];
};

const STEPS: Step[] = [
  {
    n: "01",
    title: "The problem every shop knows",
    Visual: Step1MissedCall,
    pitch:
      "You're under a car, the phone rings, you can't get to it. That caller goes to the next shop down the road. How many times a week does that happen?",
    talkingPoints: [
      "62% of calls to auto repair shops go unanswered during business hours.",
      "Each missed call is roughly $280 in lost revenue (avg ticket).",
      "Shops without a receptionist lose 8–20 hours of phone time per week.",
    ],
    objections: [
      {
        q: "\"I already have voicemail\"",
        a: "Only 1 in 4 callers leave a voicemail. The other 3 call a competitor. Voicemail doesn't book appointments — Baylio does.",
      },
    ],
  },
  {
    n: "02",
    title: "Baylio answers every call, instantly",
    Visual: Step2BaylioAnswers,
    pitch:
      "Baylio picks up in one ring. It sounds like a real receptionist — because customers can't tell the difference. 24/7, 5 languages, no sick days.",
    talkingPoints: [
      "AI voice trained specifically on auto repair terminology.",
      "Speaks English, Spanish, Arabic, Portuguese, Hindi, Bangla, Italian, Turkish — auto-detects the caller's language.",
      "Rings your cell first — only answers if you don't pick up in 12 seconds.",
      "You keep your existing number. We forward it.",
    ],
    objections: [
      {
        q: "\"Will customers know it's a robot?\"",
        a: "ElevenLabs voices sound indistinguishable from human. Most shops report callers don't realize until they're told.",
      },
      {
        q: "\"My customers speak Spanish and I don't.\"",
        a: "Baylio does — fluently. If a caller starts in Spanish, Baylio answers in Spanish, books the appointment, and sends you the transcript translated to English. You never lose a Spanish-speaking customer again because of language.",
      },
    ],
  },
  {
    n: "03",
    title: "It books. It quotes. It never diagnoses.",
    Visual: Step3SmartConvo,
    pitch:
      "Baylio books appointments, quotes your services from your own price list, and captures leads. But it never diagnoses a car — it always defers to you. That protects your reputation.",
    talkingPoints: [
      "Uses YOUR service catalog and YOUR prices — no guessing.",
      "Handles 'how much for brakes?' — gives range, books appointment.",
      "Detects high-value leads (transmissions, diagnostics) and flags them.",
      "Subtle upsells (cabin filter with oil change) — three confidence levels.",
      "Never says 'your car has X problem' — that's the mechanic's job.",
    ],
    objections: [
      {
        q: "\"What if it says the wrong price?\"",
        a: "It only quotes from services YOU configure. No hallucination. If a caller asks for something not in your catalog, it collects the info and tells you.",
      },
    ],
  },
  {
    n: "04",
    title: "You see everything — text, email, dashboard",
    Visual: Step4OwnerNotified,
    pitch:
      "After every call: full transcript, intent, customer info, estimated revenue, appointment details — sent to your phone and logged in your dashboard. You never walk out of a bay wondering what you missed.",
    talkingPoints: [
      "SMS notification for high-value leads ($200+ tickets).",
      "Daily digest email at end of day: 'You got 8 calls, 5 booked, 3 callbacks.'",
      "Full dashboard with call history, sentiment, recordings, transcripts.",
      "Integrates with Google Calendar, Sheets, HubSpot, Shopmonkey.",
    ],
  },
  {
    n: "05",
    title: "Shops see +27% bookings in 90 days",
    Visual: Step5RevenueUp,
    pitch:
      "Average shop on Baylio sees a 27% lift in booked appointments within the first 90 days — just from capturing calls they were already missing. Start at $149/month — one saved appointment pays for it.",
    talkingPoints: [
      "Trial: $149/mo · 150 minutes · try it risk-free for 30 days.",
      "Starter: $199/mo · 300 minutes · solo shops.",
      "Pro: $349/mo · 750 minutes · busy shops (most popular).",
      "Elite: $599/mo · 1,500 minutes · multi-bay & multi-location.",
      "No contract. Cancel anytime. 14-day setup, we handle everything.",
    ],
    objections: [
      {
        q: "\"$149 sounds like a lot.\"",
        a: "One booked oil change per month covers it. One brake job pays for 2 months. If it doesn't pay for itself in 30 days, cancel — we'll refund you.",
      },
      {
        q: "\"My customers speak Spanish / Portuguese / Arabic and I don't.\"",
        a: "Baylio speaks 8 languages fluently and auto-detects the caller's. Every transcript comes to you translated to English with the customer's details and the appointment booked. You capture revenue from callers you'd otherwise hang up on.",
      },
    ],
  },
];

function OnboardingGuideContent() {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const copyPitch = (step: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    toast.success("Pitch copied to clipboard");
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-5xl print:max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 print:block">
        <div>
          <Badge
            variant="outline"
            className="mb-3 border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
          >
            Partner Pitch Toolkit
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            How Baylio Works — Onboarding Guide
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Walk shop owners through Baylio in 5 minutes. Each step has a visual,
            a pitch you can read verbatim, talking points, and objection handlers.
            Print it, bookmark it, or share the link.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="border-zinc-700"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.info("Downloadable PDF will be available after launch.")
            }
            className="border-zinc-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Save PDF
          </Button>
        </div>
      </div>

      {/* Intro callout */}
      <Card className="bg-primary/5 border-primary/20 print:break-inside-avoid">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-foreground mb-1">
            How to use this guide in a pitch
          </p>
          <p className="text-sm text-muted-foreground">
            Open this page on your laptop or tablet. Walk the shop owner through
            each illustration top to bottom — it takes about 5 minutes. Read the{" "}
            <span className="text-foreground font-medium">Pitch</span> line as a
            starting point, then use the{" "}
            <span className="text-foreground font-medium">Talking Points</span>{" "}
            to go deeper. When they push back, you've got{" "}
            <span className="text-foreground font-medium">
              Objection Handlers
            </span>{" "}
            ready.
          </p>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-12 print:space-y-6">
        {STEPS.map((step, idx) => (
          <div
            key={step.n}
            className="grid md:grid-cols-2 gap-6 md:gap-8 items-start print:break-inside-avoid print:grid-cols-2"
          >
            {/* Left: illustration */}
            <div className={`${idx % 2 === 1 ? "md:order-2" : ""}`}>
              <div className="text-foreground">
                <step.Visual />
              </div>
            </div>

            {/* Right: copy */}
            <div
              className={`space-y-4 ${idx % 2 === 1 ? "md:order-1" : ""}`}
            >
              <div>
                <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
                  Step {step.n}
                </span>
                <h2 className="text-xl font-bold tracking-tight text-foreground mt-1">
                  {step.title}
                </h2>
              </div>

              {/* Pitch */}
              <Card className="border-primary/20 bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-mono uppercase tracking-widest text-primary">
                      Pitch
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyPitch(step.n, step.pitch)}
                      className="h-6 px-2 text-xs print:hidden"
                    >
                      {copiedStep === step.n ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed italic">
                    "{step.pitch}"
                  </p>
                </CardContent>
              </Card>

              {/* Talking points */}
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  Talking Points
                </p>
                <ul className="space-y-1.5">
                  {step.talkingPoints.map((pt) => (
                    <li key={pt} className="flex gap-2 text-sm text-foreground/85">
                      <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-1" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Objection handlers */}
              {step.objections?.map((obj, i) => (
                <Card key={i} className="border-copper/30 bg-copper/5">
                  <CardContent className="p-4">
                    <p className="text-xs font-mono uppercase tracking-widest text-copper mb-2">
                      If they say…
                    </p>
                    <p className="text-sm font-medium text-foreground/90 mb-2">
                      {obj.q}
                    </p>
                    <p className="text-sm text-foreground/75">
                      →&nbsp;{obj.a}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Close */}
      <Card className="bg-gradient-to-r from-emerald-950/40 to-zinc-900 border-emerald-800/30 print:break-before-page">
        <CardContent className="p-6 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-3">
            Your turn
          </p>
          <p className="text-lg font-semibold text-foreground mb-2">
            "Want me to set up a free 7-day audit to show you exactly how many
            calls you're missing?"
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            The Missed Call Audit is the easiest close. You set up forwarding for
            7 days, Baylio tracks every missed call + estimated revenue lost, and
            you deliver the scorecard. Then the price sells itself.
          </p>
          <Button
            className="mt-4 print:hidden"
            onClick={() => (window.location.href = "/audits")}
          >
            Start a Missed Call Audit
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
