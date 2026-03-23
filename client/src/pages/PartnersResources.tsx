import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Mail, MessageSquare, Phone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import PartnersPortalLayout from "@/components/PartnersPortalLayout";

function CopyBlock({ title, content }: { title: string; content: string }) {
  const copy = () => {
    navigator.clipboard.writeText(content);
    toast.success(`${title} copied!`);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <Button size="sm" variant="ghost" onClick={copy} className="text-slate-400 hover:text-white h-7 px-2">
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-sm text-slate-400 whitespace-pre-line">{content}</p>
    </div>
  );
}

export default function PartnersResources() {
  return (
    <PartnersPortalLayout title="Resources">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-2">Marketing Resources</h1>
        <p className="text-sm text-slate-400 mb-8">
          Copy-paste templates and materials to help you promote Baylio to shop owners.
        </p>

        {/* Email Templates */}
        <Card className="bg-[#0D0D14] border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-emerald-400" />
              Email Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CopyBlock
              title="Cold Outreach Email"
              content={`Hey [Name],

I noticed your shop, [Shop Name], is doing great work. Quick question — how many calls do you think you're missing during busy hours or after closing?

I've been working with a company called Baylio that built an AI receptionist specifically for auto repair shops. It answers every call 24/7, books appointments, and even upsells services. Shop owners I've talked to are recovering $5K-$15K/month in previously lost revenue.

Would you be open to a quick demo? They offer a free 7-day missed call audit — no commitment, they just show you how many calls you're actually missing and what it's costing you.

Let me know if you'd like me to set it up.

Best,
[Your Name]`}
            />
            <CopyBlock
              title="Follow-Up Email"
              content={`Hey [Name],

Just following up on the Baylio AI receptionist I mentioned. A few quick stats that might interest you:

- 62% of calls to auto shops go unanswered
- Average missed call = $1,200 in lost revenue
- Baylio typically recovers $5K-$15K/month per shop

Their free missed call audit takes 5 minutes to set up and runs for 7 days. You'll see exactly how many calls you're missing and what it's costing you — zero risk.

Here's the link if you want to check it out: [YOUR REFERRAL LINK]

Happy to answer any questions.

[Your Name]`}
            />
          </CardContent>
        </Card>

        {/* SMS Scripts */}
        <Card className="bg-[#0D0D14] border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              SMS Scripts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CopyBlock
              title="Initial Text"
              content={`Hey [Name], it's [Your Name]. Quick question — have you ever thought about how many calls your shop might be missing during peak hours? I found something that auto repair shop owners are loving. 90-second demo if you're curious: [YOUR REFERRAL LINK]`}
            />
            <CopyBlock
              title="After Meeting / Visit"
              content={`Hey [Name], great chatting today! Here's the link for that AI receptionist I mentioned — Baylio. It answers every call to your shop 24/7, books appointments, and captures what you'd normally miss. Free to try: [YOUR REFERRAL LINK]`}
            />
          </CardContent>
        </Card>

        {/* Key Selling Points */}
        <Card className="bg-[#0D0D14] border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Key Selling Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                "62% of calls to auto repair shops go unanswered — that's real money walking away",
                "Average missed call costs $1,200 in lost revenue (repair order + future visits)",
                "Baylio answers every call 24/7 — nights, weekends, holidays, during lunch rush",
                "Natural-sounding AI voice — customers think they're talking to a real person",
                "Automatic appointment booking — captures vehicle info and schedules services",
                "Intelligent upselling — suggests fluid flush when they call about brakes, etc.",
                "Real-time analytics dashboard — see every call, every outcome, every dollar recovered",
                "Pays for itself in the first week — most shops recover 10-30x the subscription cost",
                "No contracts, 14-day free trial, setup takes 10 minutes",
                "Starting at $149/month — cheaper than a part-time receptionist",
              ].map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-slate-300">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Demo Call */}
        <Card className="bg-[#0D0D14] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-400" />
              Live Demo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-4">
              Let shop owners hear Baylio in action. Call the demo line and experience the AI receptionist firsthand:
            </p>
            <a href="tel:+18448752441" className="inline-block">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Phone className="h-4 w-4 mr-2" />
                Call Demo: (844) 875-2441
              </Button>
            </a>
            <p className="text-xs text-slate-500 mt-3">
              This is a live demo line — it connects to a real Baylio AI agent so prospects can experience it firsthand.
            </p>
          </CardContent>
        </Card>
      </div>
    </PartnersPortalLayout>
  );
}
