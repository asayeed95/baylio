import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getLoginUrl } from "@/const";
import { Phone, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const FAQ_ITEMS = [
  {
    question: "What is Baylio?",
    answer:
      "Baylio is an AI-powered phone receptionist built specifically for auto repair shops. It answers every incoming call 24/7 with a natural-sounding voice, books appointments, captures customer information, and even handles intelligent upselling — so you never lose revenue to a missed call again.",
  },
  {
    question: "How does the AI answer calls?",
    answer:
      "When a customer calls your shop, Baylio's AI picks up instantly with a friendly, natural greeting customized to your business. It understands what the caller needs through advanced speech recognition, asks the right follow-up questions (vehicle year/make/model, symptoms, preferred appointment time), and handles the conversation just like a trained receptionist would — including after hours, weekends, and holidays.",
  },
  {
    question: "What happens if the AI can't handle a call?",
    answer:
      "Baylio is designed to gracefully handle edge cases. If the AI encounters a situation it can't resolve — like a complex technical question or an upset customer — it will offer to take a detailed message and immediately notify you or your team via text/email so you can follow up personally. You'll never lose a lead; the AI ensures every caller is taken care of.",
  },
  {
    question: "How much does Baylio cost?",
    answer:
      "Baylio offers four plans to fit shops of any size:\n\n• Pilot — $149/month: Perfect for trying Baylio risk-free. Includes 150 minutes, 1 location, after-hours coverage, and a 30-day no-commitment trial.\n\n• Starter — $199/month: For single-location shops. Includes 300 minutes, AI call answering, appointment booking, and basic analytics.\n\n• Pro — $349/month: Our most popular plan. 750 minutes, intelligent upselling, advanced analytics, custom AI voice, and SMS notifications.\n\n• Elite — $599/month: For high-volume and multi-location shops. 1,500 minutes, CRM integration, multi-location management, and priority support.\n\nAll plans come with a free trial — no credit card required.",
  },
  {
    question: "Can I customize what the AI says?",
    answer:
      "Absolutely. You have full control over your AI agent's behavior through the Agent Configuration dashboard. You can customize the greeting, set your shop's services and pricing, define business hours, configure appointment rules, and add custom responses for common questions specific to your shop. The AI adapts to your brand voice and your way of doing business.",
  },
  {
    question: "How do I get started?",
    answer:
      "Getting started takes less than 10 minutes:\n\n1. Sign up for a free trial at baylio.io\n2. Add your shop's information (name, address, services, hours)\n3. Configure your AI agent's greeting and behavior\n4. Forward your shop's phone line to your Baylio number\n\nThat's it — Baylio starts answering calls immediately. Our team is also available to help you set up if you prefer a hands-on walkthrough.",
  },
  {
    question: "How fast does Baylio answer calls?",
    answer:
      "Under 2 seconds. Every time. There's no ringing, no hold music, and no voicemail. Your customers hear a live, professional AI voice before the second ring completes. Compare that to the industry average of 4-6 rings (or no answer at all) — Baylio makes your shop feel like a premium operation from the very first interaction.",
  },
  {
    question: "Does it sound like a robot?",
    answer:
      "Not at all. Baylio uses the latest conversational AI voice technology to sound natural, warm, and professional — like your best front-desk employee. Callers regularly don't realize they're speaking with an AI. You can also choose from multiple voice options and customize the tone, speed, and personality to match your shop's brand.",
  },
  {
    question: "Can Baylio speak Spanish?",
    answer:
      "We are actively building multilingual support, with Spanish as the top priority. Currently, Baylio handles calls in English. Spanish language support is on our near-term roadmap, and early adopters will be the first to get access when it launches. If bilingual support is critical for your shop, let us know — it helps us prioritize.",
  },
  {
    question: "Does it actually book appointments?",
    answer:
      "Yes — but with an important distinction. Baylio submits appointment requests, not confirmations. When a customer asks to book, the AI captures all the details (date, time, service needed, vehicle info) and says: 'I've submitted your appointment request for Tuesday at 10 AM. You'll receive a confirmation text shortly.' Your shop then gets an SMS with the details and confirms or adjusts. This protects you from double-bookings and scheduling conflicts.",
  },
  {
    question: "What if I already have a receptionist?",
    answer:
      "Baylio isn't here to replace your staff — it's here to back them up. Most shops use Baylio for after-hours calls, overflow during busy periods, lunch breaks, and weekends. Your receptionist handles the in-person customers and complex calls; Baylio catches everything else. Our Pilot plan ($149/mo) is specifically designed for after-hours-only coverage, so you can start there and expand as needed.",
  },
  {
    question: "Does Baylio work after hours and weekends?",
    answer:
      "That's where Baylio shines brightest. Industry data shows that 35-40% of calls to auto repair shops come outside business hours — evenings, weekends, and holidays. Without Baylio, those calls go to voicemail (and 85% of callers won't leave one). With Baylio, every after-hours call gets a live, professional response, and your next morning starts with a list of booked appointments instead of missed opportunities.",
  },
  {
    question: "What if Baylio goes down?",
    answer:
      "Baylio is built on enterprise-grade telephony infrastructure with a 99.9% uptime SLA. But we plan for the worst: if Baylio ever experiences an outage, calls automatically route to your backup number (your shop's main line or your cell phone) within seconds. You also get a voicemail fallback as a last resort. Your customers will never hear dead air.",
  },
  {
    question: "Is my customer data secure?",
    answer:
      "Absolutely. All call data is encrypted in transit and at rest. We never sell or share your customer information with third parties. Call recordings and transcripts are stored securely and only accessible to you through your dashboard. We follow industry-standard security practices including SOC 2-aligned controls, and you can delete any call data at any time from your account.",
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">Baylio</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium text-foreground">FAQ</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
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

      {/* ─── FAQ Content ─── */}
      <section className="container py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Baylio and how it works for your
            auto repair shop.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-base text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground whitespace-pre-line">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* ─── CTA ─── */}
        <div className="max-w-2xl mx-auto text-center mt-16">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help. Reach out and we'll get back to you within
            24 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button size="lg">
                Contact Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() => { window.location.href = getLoginUrl(); }}
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <span className="font-semibold">Baylio</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Baylio. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
              <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</Link>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
