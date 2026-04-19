import PartnersPortalLayout from "@/components/PartnersPortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Video,
  Image,
  MessageSquare,
  Download,
  ExternalLink,
  BookOpen,
  Presentation,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { Copy, Check, GraduationCap, ArrowRight } from "lucide-react";

const RESOURCES = [
  {
    category: "Sales Materials",
    items: [
      {
        title: "Baylio One-Pager",
        description:
          "Single-page overview of Baylio's value proposition for auto repair shops.",
        type: "PDF",
        icon: FileText,
      },
      {
        title: "ROI Calculator Spreadsheet",
        description:
          "Editable spreadsheet showing shops exactly how much revenue they're losing to missed calls.",
        type: "XLSX",
        icon: Presentation,
      },
      {
        title: "Partner Pitch Deck",
        description:
          "15-slide presentation covering Baylio's features, pricing, and case studies.",
        type: "PPTX",
        icon: Presentation,
      },
    ],
  },
  {
    category: "Email Templates",
    items: [
      {
        title: "Cold Outreach Template",
        description:
          "Proven email template for reaching out to auto repair shop owners.",
        type: "Email",
        icon: Mail,
      },
      {
        title: "Follow-Up Sequence (3-part)",
        description:
          "Three-email nurture sequence for shops that showed interest but haven't signed up.",
        type: "Email",
        icon: Mail,
      },
      {
        title: "Post-Audit Send",
        description:
          "Email template to send after running a missed call audit, with scorecard results.",
        type: "Email",
        icon: Mail,
      },
    ],
  },
  {
    category: "Social & Content",
    items: [
      {
        title: "Social Media Graphics Pack",
        description:
          "20 branded graphics for Instagram, Facebook, and LinkedIn posts.",
        type: "ZIP",
        icon: Image,
      },
      {
        title: "Demo Video: AI Receptionist",
        description:
          "2-minute walkthrough showing what a shop owner hears when Baylio answers a call.",
        type: "Video",
        icon: Video,
      },
      {
        title: "Testimonial Clips",
        description:
          "Short video clips from shop owners sharing their experience with Baylio.",
        type: "Video",
        icon: Video,
      },
    ],
  },
  {
    category: "Training",
    items: [
      {
        title: "Partner Playbook",
        description:
          "Step-by-step guide on how to identify, pitch, and close auto repair shops.",
        type: "PDF",
        icon: BookOpen,
      },
      {
        title: "Objection Handling Guide",
        description:
          "Responses to the 15 most common objections from shop owners.",
        type: "PDF",
        icon: MessageSquare,
      },
      {
        title: "Missed Call Audit Setup Guide",
        description:
          "How to run a 7-day missed call audit to prove value before the sale.",
        type: "PDF",
        icon: BookOpen,
      },
    ],
  },
];

const TYPE_COLORS: Record<string, string> = {
  PDF: "bg-red-500/20 text-red-400",
  XLSX: "bg-green-500/20 text-green-400",
  PPTX: "bg-orange-500/20 text-orange-400",
  Email: "bg-blue-500/20 text-blue-400",
  ZIP: "bg-purple-500/20 text-purple-400",
  Video: "bg-pink-500/20 text-pink-400",
};

export default function PartnersResources() {
  const { data: profile } = trpc.partner.getProfile.useQuery();
  const [, setLocation] = useLocation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const referralCode = profile?.referralCode || "YOUR_CODE";
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <PartnersPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Partner Resources
          </h1>
          <p className="text-zinc-400 mt-1">
            Everything you need to pitch, close, and onboard auto repair shops.
          </p>
        </div>

        {/* Featured — Onboarding Guide */}
        <Card
          className="bg-gradient-to-r from-primary/10 via-card to-card border-primary/30 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setLocation("/partners/onboarding-guide")}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">
                    How Baylio Works — 5-Step Onboarding Guide
                  </p>
                  <Badge
                    variant="outline"
                    className="text-xs border-primary/30 text-primary bg-primary/5"
                  >
                    New
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Illustrated pitch deck you can walk a shop owner through in 5
                  minutes. Visuals + scripts + objection handlers. Print it or
                  show it on your laptop.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Copy Section */}
        <Card className="bg-gradient-to-r from-emerald-950/50 to-zinc-900 border-emerald-800/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-emerald-400">
              Your Referral Assets
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500">Referral Link</p>
                  <p className="text-sm text-zinc-300 font-mono truncate">
                    {referralLink}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(referralLink, "link")}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 shrink-0"
                >
                  {copiedId === "link" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500">Referral Code</p>
                  <p className="text-sm text-zinc-300 font-mono">
                    {referralCode}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(referralCode, "code")}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 shrink-0"
                >
                  {copiedId === "code" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources by Category */}
        {RESOURCES.map(category => (
          <div key={category.category} className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-400">
              {category.category}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.items.map(item => (
                <Card
                  key={item.title}
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <item.icon className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {item.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs border-0 shrink-0 ${TYPE_COLORS[item.type] || "bg-zinc-700 text-zinc-400"}`}
                          >
                            {item.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      onClick={() =>
                        toast.info(
                          "Resources will be available once the partner program launches."
                        )
                      }
                    >
                      <Download className="h-3 w-3 mr-1.5" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* Help Section */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-300 font-medium">Need custom materials?</p>
            <p className="text-sm text-zinc-500 mt-1">
              Reach out to your partner manager for co-branded assets, custom
              pitch decks, or localized content.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              onClick={() => toast.info("Partner support coming soon.")}
            >
              Contact Partner Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </PartnersPortalLayout>
  );
}
