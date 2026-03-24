import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Bot,
  BarChart3,
  Settings,
  ArrowLeft,
  PhoneCall,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useLocation, useParams } from "wouter";

/**
 * Shop Detail Page
 *
 * Shows a single shop's overview with navigation cards to:
 * - AI Agent Config
 * - Call Logs
 * - Analytics
 * - Shop Settings
 *
 * Also displays quick stats: total calls, appointments, revenue recovered.
 */
export default function ShopDetail() {
  return (
    <DashboardLayout>
      <ShopDetailContent />
    </DashboardLayout>
  );
}

function ShopDetailContent() {
  const params = useParams<{ id: string }>();
  const shopId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();

  const { data: shop, isLoading } = trpc.shop.getById.useQuery(
    { id: shopId },
    { enabled: shopId > 0 }
  );

  const { data: analytics } = trpc.calls.analytics.useQuery(
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
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Shop not found.</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const quickStats = [
    {
      label: "Total Calls",
      value: analytics?.totalCalls ?? 0,
      icon: PhoneCall,
    },
    {
      label: "Appointments Booked",
      value: analytics?.appointmentsBooked ?? 0,
      icon: Calendar,
    },
    {
      label: "Revenue Recovered",
      value: `$${parseFloat(analytics?.totalRevenue ?? "0").toLocaleString()}`,
      icon: DollarSign,
    },
    {
      label: "Avg Call Duration",
      value: `${Math.round(parseFloat(analytics?.avgDuration ?? "0"))}s`,
      icon: Clock,
    },
  ];

  const navCards = [
    {
      title: "AI Agent",
      description: "Configure voice, persona, greeting, and upsell rules",
      icon: Bot,
      path: `/shops/${shopId}/agent`,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Call Logs",
      description: "View all calls, transcriptions, and outcomes",
      icon: Phone,
      path: `/shops/${shopId}/calls`,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Analytics",
      description: "Performance metrics, trends, and revenue insights",
      icon: BarChart3,
      path: `/shops/${shopId}/analytics`,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Shop Settings",
      description: "Business hours, services, phone number, and location",
      icon: Settings,
      path: `/shops/${shopId}/settings`,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {shop.name}
            </h1>
            <Badge variant={shop.twilioPhoneNumber ? "default" : "secondary"}>
              {shop.twilioPhoneNumber ? "Active" : "Setup Needed"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {[shop.address, shop.city, shop.state, shop.zip]
              .filter(Boolean)
              .join(", ") || "No address configured"}
            {shop.phone && ` | ${shop.phone}`}
          </p>
        </div>
        {subscription && (
          <Badge variant="outline" className="text-sm">
            {subscription.tier.charAt(0).toUpperCase() +
              subscription.tier.slice(1)}{" "}
            Plan
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-lg font-mono font-medium">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {navCards.map(card => (
          <Card
            key={card.title}
            className="cursor-pointer hover:border-primary/30 transition-colors rounded-sm"
            onClick={() => setLocation(card.path)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}
                >
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {card.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
