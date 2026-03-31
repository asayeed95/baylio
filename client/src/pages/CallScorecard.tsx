import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Award,
  Lightbulb,
  Loader2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { usePostHog } from "@posthog/react";
import { useEffect } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

export default function CallScorecard() {
  return (
    <DashboardLayout>
      <CallScorecardContent />
    </DashboardLayout>
  );
}

function getScoreColor(score: number): string {
  if (score >= 7) return "text-green-600";
  if (score >= 5) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBadgeVariant(
  score: number
): "default" | "secondary" | "destructive" {
  if (score >= 7) return "default";
  if (score >= 5) return "secondary";
  return "destructive";
}

function CallScorecardContent() {
  const params = useParams<{ id: string; callId: string }>();
  const shopId = parseInt(params.id || "0", 10);
  const callId = parseInt(params.callId || "0", 10);
  const [, setLocation] = useLocation();
  const posthog = usePostHog();

  const { data: callData, isLoading } = trpc.calls.list.useQuery(
    { shopId, limit: 1, offset: 0 },
    { enabled: shopId > 0 && callId > 0 }
  );

  // Find the specific call
  const call = callData?.calls?.find((c: any) => c.id === callId);
  const scorecard = (call as any)?.scorecardData as
    | {
        greeting: number;
        problemId: number;
        serviceRec: number;
        upsell: number;
        appointment: number;
        closing: number;
        overall: number;
        suggestions: string[];
      }
    | null
    | undefined;

  useEffect(() => {
    if (!call || !scorecard) return;
    posthog?.capture("call_scorecard_viewed", {
      shop_id: shopId,
      call_id: callId,
      overall_score: scorecard.overall,
    });
  }, [call?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/shops/${shopId}/calls`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Call Scorecard</h1>
        </div>
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Call not found</p>
            <p className="text-sm text-muted-foreground">
              This call may have been removed or you lack access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scorecard) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/shops/${shopId}/calls`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Call Scorecard</h1>
        </div>
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No scorecard available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Scorecards are generated automatically for analyzed calls.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const radarData = [
    { dimension: "Greeting", score: scorecard.greeting, fullMark: 10 },
    { dimension: "Problem ID", score: scorecard.problemId, fullMark: 10 },
    { dimension: "Service Rec", score: scorecard.serviceRec, fullMark: 10 },
    { dimension: "Upsell", score: scorecard.upsell, fullMark: 10 },
    { dimension: "Appointment", score: scorecard.appointment, fullMark: 10 },
    { dimension: "Closing", score: scorecard.closing, fullMark: 10 },
  ];

  const dimensions = [
    {
      label: "Greeting",
      score: scorecard.greeting,
      desc: "Opening warmth and professionalism",
    },
    {
      label: "Problem Identification",
      score: scorecard.problemId,
      desc: "Understanding the customer need",
    },
    {
      label: "Service Recommendation",
      score: scorecard.serviceRec,
      desc: "Matching service to need",
    },
    {
      label: "Upsell",
      score: scorecard.upsell,
      desc: "Relevant additional service offer",
    },
    {
      label: "Appointment",
      score: scorecard.appointment,
      desc: "Booking attempt and success",
    },
    {
      label: "Closing",
      score: scorecard.closing,
      desc: "Professional call wrap-up",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(`/shops/${shopId}/calls`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Call Scorecard</h1>
          <p className="text-muted-foreground text-sm">
            {call.callerName || call.callerPhone || "Unknown caller"} &middot;{" "}
            {call.createdAt
              ? new Date(call.createdAt).toLocaleDateString()
              : ""}
          </p>
        </div>
      </div>

      {/* Overall Score */}
      <Card className="border-border">
        <CardContent className="flex items-center gap-6 py-6">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <span
              className={`text-3xl font-mono font-bold ${getScoreColor(scorecard.overall)}`}
            >
              {scorecard.overall}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Overall Score
            </p>
            <p className="text-xl font-semibold">
              {scorecard.overall >= 8
                ? "Excellent"
                : scorecard.overall >= 6
                  ? "Good"
                  : scorecard.overall >= 4
                    ? "Needs Improvement"
                    : "Poor"}{" "}
              Performance
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Based on 6 dimensions of call quality
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left Column: Metrics & Insights */}
        <div className="space-y-6 lg:col-span-1">
          {/* Radar Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance Radar</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" className="text-[10px]" />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dimension Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dimensions.map(dim => (
                  <div key={dim.label} className="flex items-center justify-between">
                    <p className="text-sm font-medium">{dim.label}</p>
                    <Badge variant={getScoreBadgeVariant(dim.score)} className="font-mono">
                      {dim.score}/10
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Suggestions */}
          {scorecard.suggestions && scorecard.suggestions.length > 0 && (
            <Card className="border-border bg-yellow-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  <CardTitle className="text-base text-yellow-900">
                    AI Suggestions
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {scorecard.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-200 flex items-center justify-center text-[10px] font-bold text-yellow-800 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-yellow-900 leading-snug">{suggestion}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Call Transcript */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-full border-border flex flex-col">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <CardTitle className="text-base">Call Transcript</CardTitle>
              <CardDescription>
                Full transcription of the AI interaction
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {call.transcription ? (
                <div className="p-6 text-sm leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground bg-slate-50 min-h-[500px]">
                  {call.transcription}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                  <p>No transcript available for this call.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
