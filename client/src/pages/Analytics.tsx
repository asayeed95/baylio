import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  PhoneCall,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  PhoneMissed,
  ThumbsUp,
  Target,
} from "lucide-react";
import { useLocation, useParams } from "wouter";

/**
 * Analytics Page
 * 
 * Displays shop performance metrics:
 * - Total calls answered
 * - Appointments booked (conversion rate)
 * - Revenue recovered
 * - Missed call trends
 * - Average call duration
 * - Sentiment scores
 * - Upsell performance (attempts vs accepted)
 * 
 * Charts will be added in the UI/UX design pass.
 * For now, we display clean metric cards with computed values.
 */
export default function Analytics() {
  return (
    <DashboardLayout>
      <AnalyticsContent />
    </DashboardLayout>
  );
}

function AnalyticsContent() {
  const params = useParams<{ id: string }>();
  const shopId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();

  const { data: shop } = trpc.shop.getById.useQuery(
    { id: shopId },
    { enabled: shopId > 0 }
  );

  const { data: analytics, isLoading } = trpc.calls.analytics.useQuery(
    { shopId },
    { enabled: shopId > 0 }
  );

  const { data: subscription } = trpc.subscription.getByShop.useQuery(
    { shopId },
    { enabled: shopId > 0 }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const totalCalls = analytics?.totalCalls ?? 0;
  const appointmentsBooked = analytics?.appointmentsBooked ?? 0;
  const missedCalls = analytics?.missedCalls ?? 0;
  const totalRevenue = parseFloat(analytics?.totalRevenue ?? "0");
  const avgDuration = parseFloat(analytics?.avgDuration ?? "0");
  const avgSentiment = parseFloat(analytics?.avgSentiment ?? "0");
  const upsellAttempts = analytics?.upsellAttempts ?? 0;
  const upsellAccepted = analytics?.upsellAccepted ?? 0;

  const conversionRate = totalCalls > 0 ? ((appointmentsBooked / totalCalls) * 100).toFixed(1) : "0";
  const missedRate = totalCalls > 0 ? ((missedCalls / totalCalls) * 100).toFixed(1) : "0";
  const upsellRate = upsellAttempts > 0 ? ((upsellAccepted / upsellAttempts) * 100).toFixed(1) : "0";

  const metrics = [
    {
      title: "Total Calls",
      value: totalCalls.toLocaleString(),
      icon: PhoneCall,
      description: "All calls handled by AI",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Appointments Booked",
      value: appointmentsBooked.toLocaleString(),
      icon: Calendar,
      description: `${conversionRate}% conversion rate`,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Revenue Recovered",
      value: `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: "Estimated from booked appointments",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Missed Calls",
      value: missedCalls.toLocaleString(),
      icon: PhoneMissed,
      description: `${missedRate}% of total calls`,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  const secondaryMetrics = [
    {
      title: "Avg Call Duration",
      value: `${Math.round(avgDuration)}s`,
      icon: Clock,
    },
    {
      title: "Avg Sentiment",
      value: avgSentiment.toFixed(2),
      icon: ThumbsUp,
    },
    {
      title: "Upsell Attempts",
      value: upsellAttempts.toLocaleString(),
      icon: TrendingUp,
    },
    {
      title: "Upsell Accepted",
      value: `${upsellAccepted} (${upsellRate}%)`,
      icon: Target,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/shops/${shopId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">{shop?.name}</p>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${metric.bg} flex items-center justify-center shrink-0`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{metric.title}</p>
                  <p className="text-xl font-bold mt-0.5">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {secondaryMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{metric.title}</p>
              </div>
              <p className="text-lg font-semibold mt-1">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage / Subscription */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Usage</CardTitle>
            <CardDescription>
              {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan — {subscription.includedMinutes} minutes included
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>{subscription.usedMinutes} minutes used</span>
              <span>{subscription.includedMinutes} minutes total</span>
            </div>
            <Progress
              value={subscription.usagePercent}
              className="h-2"
            />
            {subscription.overageMinutes > 0 && (
              <p className="text-sm text-destructive">
                {subscription.overageMinutes} overage minutes — ${subscription.overageCharge} additional charge
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Placeholder for future charts */}
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Detailed charts and trend visualizations will be added in the design pass.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
