import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getLoginUrl } from "@/const";
import { ArrowRight } from "lucide-react";
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
      "Baylio offers four plans to fit shops of any size:\n\n• Trial — $149/month: Try Baylio risk-free. Includes 150 minutes of AI call handling, call logging, basic analytics, and a 14-day money-back guarantee.\n\n• Starter — $199/month: Perfect for single-location shops. 300 minutes of AI call answering, appointment booking, and basic analytics.\n\n• Pro — $349/month: Our most popular plan. 750 minutes, calendar integration, advanced analytics, SMS notifications, and custom AI voice.\n\n• Elite — $599/month: For high-volume shops and multi-location businesses. 1,500 minutes, CRM integration, upsell engine, priority support, and weekly reports.\n\nAll plans come with a 14-day free trial — no credit card required.",
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
];

export default function FAQ() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-semibold tracking-wider uppercase text-sm">
              Baylio
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/faq" className="text-sm text-foreground font-medium">
              FAQ
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── FAQ Content ─── */}
      <section className="container py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
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
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border-border"
              >
                <AccordionTrigger className="text-base text-left text-foreground font-medium hover:no-underline hover:text-primary transition-colors py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* ─── CTA ─── */}
        <div className="max-w-2xl mx-auto text-center mt-16 p-8 bg-card border border-border rounded-sm">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Still have questions?
          </h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help. Reach out and we'll get back to you within
            24 hours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" className="rounded-sm">
                Contact Us
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="rounded-sm"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-semibold tracking-wider uppercase text-sm">
                Baylio
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Baylio. All rights reserved.
            </p>
            <div className="flex gap-6">
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
