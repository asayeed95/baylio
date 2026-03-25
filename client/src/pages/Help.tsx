import DashboardLayout from "@/components/DashboardLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Rocket,
  Phone,
  Bot,
  BarChart3,
  CreditCard,
  HelpCircle,
  Settings,
} from "lucide-react";

const HELP_SECTIONS = [
  {
    icon: Rocket,
    title: "Getting Started",
    items: [
      {
        q: "How do I set up my first shop?",
        a: "From your Dashboard, click 'Create a Shop' and enter your shop's name, address, phone number, and business hours. You can add your service catalog and pricing later from Shop Settings.",
      },
      {
        q: "How long does setup take?",
        a: "Most shops are fully set up in under 10 minutes. Create your shop, configure the AI agent, provision a phone number, and you're live.",
      },
      {
        q: "Do I need any special hardware?",
        a: "No. Baylio is entirely cloud-based. You just need to forward your existing phone number to your Baylio number, or use the new number we provision for you.",
      },
    ],
  },
  {
    icon: Phone,
    title: "Phone Setup",
    items: [
      {
        q: "Should I forward my existing number or get a new one?",
        a: "Both work. Forwarding your existing number means customers don't need a new number. Getting a new Baylio number lets you keep your original line as a backup. Most shops start with forwarding.",
      },
      {
        q: "How do I provision a Twilio phone number?",
        a: "Go to Shop Settings → Baylio AI Phone Number. Search by area code, pick a number, and click 'Purchase'. The number is assigned to your shop and Baylio starts answering immediately.",
      },
      {
        q: "How do I set up call forwarding?",
        a: "Contact your phone provider and ask them to forward unanswered calls to your Baylio number. Most carriers let you set this up with a code like *72 followed by the number. We provide setup guides for AT&T, Verizon, T-Mobile, and most VoIP providers.",
      },
      {
        q: "What happens if Baylio goes down?",
        a: "If the AI is temporarily unavailable, calls automatically go to a professional voicemail greeting with your shop's name. You'll be notified of the recording and can call back.",
      },
    ],
  },
  {
    icon: Bot,
    title: "AI Agent Configuration",
    items: [
      {
        q: "How do I customize my AI agent?",
        a: "Go to your shop → Agent Config. You can set the agent's name, voice, greeting message, system prompt, and upsell behavior. Changes take effect on the next call.",
      },
      {
        q: "What is the system prompt?",
        a: "The system prompt tells the AI how to behave. It includes your shop's services, personality guidelines, appointment booking rules, and what to do in edge cases. We provide a default template that works for most shops.",
      },
      {
        q: "Can the AI upsell services?",
        a: "Yes. Enable the Upsell Engine in Agent Config to let the AI suggest complementary services. For example, if a customer calls about brakes, the AI might suggest a fluid flush. You control the confidence threshold and maximum upsells per call.",
      },
      {
        q: "How do I make the AI go live?",
        a: "After saving your agent configuration, click the 'Go Live' button at the top of the Agent Config page. This creates your ElevenLabs voice agent. Once live, the status banner will show green.",
      },
    ],
  },
  {
    icon: BarChart3,
    title: "Understanding Your Dashboard",
    items: [
      {
        q: "What do the dashboard metrics mean?",
        a: "Total Calls: all inbound calls. Appointments Booked: calls that resulted in a booking. Revenue Recovered: estimated value of booked appointments. Missed Calls: calls that went to voicemail or were abandoned.",
      },
      {
        q: "How is revenue calculated?",
        a: "Revenue estimates are based on the services discussed during each call and your service catalog pricing. The AI analyzes each conversation to identify what was booked and the likely ticket value.",
      },
      {
        q: "What is the call quality score?",
        a: "Each call is scored on a 0-10 scale across six dimensions: greeting quality, problem identification, service recommendation, upsell execution, appointment handling, and closing. View detailed scorecards from the Call Logs page.",
      },
    ],
  },
  {
    icon: Settings,
    title: "Call Analytics & Integrations",
    items: [
      {
        q: "Can I connect Google Calendar?",
        a: "Yes. Go to Integrations and connect your Google account. When the AI books an appointment, it automatically creates a calendar event with the customer's details, service, and vehicle info.",
      },
      {
        q: "Can I sync calls to a Google Sheet?",
        a: "Yes. Connect Google Sheets from the Integrations page. Every completed call is automatically logged as a row with date, caller, duration, service, outcome, and revenue estimate.",
      },
      {
        q: "Does Baylio work with Shopmonkey?",
        a: "Yes. Connect your Shopmonkey API keys in Integrations. When the AI books an appointment, it creates a work order in Shopmonkey with the customer, vehicle, and service details.",
      },
    ],
  },
  {
    icon: CreditCard,
    title: "Billing & Plans",
    items: [
      {
        q: "What plans are available?",
        a: "Trial ($149/mo, 150 min), Starter ($199/mo, 300 min), Pro ($349/mo, 750 min), and Elite ($599/mo, 1500 min). All plans include a 14-day free trial. Annual billing saves 20%.",
      },
      {
        q: "What happens if I exceed my minutes?",
        a: "Overage minutes are billed at $0.15/minute. You'll see a warning in your dashboard when you're approaching your limit. You can upgrade your plan at any time to get more included minutes.",
      },
      {
        q: "How do I cancel?",
        a: "Go to Subscriptions → Manage Billing. You can cancel anytime with no penalty. Your service continues through the end of the billing period.",
      },
    ],
  },
  {
    icon: HelpCircle,
    title: "Troubleshooting",
    items: [
      {
        q: "My calls are going to voicemail instead of the AI.",
        a: "Check three things: (1) Is your ElevenLabs agent provisioned? Go to Agent Config — the status banner should show 'Agent is live'. (2) Is your Twilio phone number assigned? Check Shop Settings. (3) Is your phone forwarding set up correctly?",
      },
      {
        q: "The AI isn't booking appointments correctly.",
        a: "Review your system prompt in Agent Config. Make sure your business hours, service catalog, and appointment booking rules are clearly defined. The AI follows the system prompt exactly.",
      },
      {
        q: "I'm not receiving call notifications.",
        a: "Check Notifications in the sidebar. Make sure your notification preferences are enabled in Shop Settings. SMS notifications require the Pro plan or higher.",
      },
      {
        q: "I need help with something not listed here.",
        a: "Email us at hello@baylio.io or call (844) 875-2441. Our team typically responds within a few hours during business hours.",
      },
    ],
  },
];

export default function Help() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help Center</h1>
          <p className="text-muted-foreground mt-1">
            Everything you need to get the most out of Baylio.
          </p>
        </div>

        {HELP_SECTIONS.map((section) => (
          <Card key={section.title} className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <section.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {section.items.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`${section.title}-${i}`}
                    className="border-border"
                  >
                    <AccordionTrigger className="text-sm text-left font-medium">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
