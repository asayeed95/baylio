import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Bot,
  Settings,
  ArrowLeft,
  PhoneCall,
  Calendar,
  DollarSign,
  Clock,
  ArrowRight,
  CirclePlay,
  AlertCircle
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";

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

  const { data: shop, isLoading: isShopLoading } = trpc.shop.getById.useQuery(
    { id: shopId },
    { enabled: shopId > 0 }
  );

  const { data: analytics, isLoading: isAnalyticsLoading } = trpc.calls.analytics.useQuery(
    { shopId },
    { enabled: shopId > 0 }
  );

  const { data: agentStatus, isLoading: isStatusLoading } = trpc.shop.getAgentStatus.useQuery(
    { shopId },
    { enabled: shopId > 0 }
  );

  const { data: recentCallsData, isLoading: isCallsLoading } = trpc.calls.list.useQuery(
    { shopId, limit: 5 },
    { enabled: shopId > 0 }
  );

  const isLoading = isShopLoading || isAnalyticsLoading || isStatusLoading || isCallsLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Shop not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => setLocation("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isLive = agentStatus?.isLive;

  const quickStats = [
    {
      label: "Revenue Recovered",
      value: `$${parseFloat(analytics?.totalRevenue ?? "0").toLocaleString()}`,
      icon: DollarSign,
      trend: "+12%",
      color: "text-emerald-600"
    },
    {
      label: "Appointments Booked",
      value: analytics?.appointmentsBooked ?? 0,
      icon: Calendar,
      trend: "+4%",
      color: "text-blue-600"
    },
    {
      label: "Total Calls Handled",
      value: analytics?.totalCalls ?? 0,
      icon: PhoneCall,
      trend: "0%",
      color: "text-indigo-600"
    },
    {
      label: "Avg Call Duration",
      value: `${Math.round(parseFloat(analytics?.avgDuration ?? "0"))}s`,
      icon: Clock,
      trend: "-2s",
      color: "text-orange-600"
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* SaaS Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/dashboard")} className="mt-1 shrink-0 bg-background">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{shop.name}</h1>
              {isLive ? (
                <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Agent Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 border-amber-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Needs Setup
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {[shop.address, shop.city, shop.state].filter(Boolean).join(", ") || "No address configured"}
              {shop.phone && (
                <>
                  <span>•</span>
                  <span className="font-mono">{shop.phone}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setLocation(`/shops/${shopId}/settings`)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setLocation(`/shops/${shopId}/agent`)}>
            <Bot className="w-4 h-4 mr-2" />
            Configure AI
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, idx) => (
          <Card key={idx} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className={`p-2 rounded-md bg-muted/50 ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: Recent Calls Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent Calls</h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setLocation(`/shops/${shopId}/calls`)}>
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          
          <Card className="shadow-sm overflow-hidden">
            {recentCallsData?.calls && recentCallsData.calls.length > 0 ? (
              <div className="divide-y">
                {recentCallsData.calls.map((call: any) => (
                  <div key={call.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between cursor-pointer" onClick={() => setLocation(`/shops/${shopId}/calls`)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${call.status === "completed" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{call.callerNumber || "Unknown Number"}</p>
                          {call.status === "completed" ? (
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-600 border-none">Completed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-none">Missed</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(call.startTime), "MMM d, h:mm a")} • {Math.round(call.durationSeconds || 0)}s
                        </p>
                      </div>
                    </div>
                    {call.recordingUrl && (
                      <Button variant="ghost" size="icon" className="shrink-0 text-primary">
                        <CirclePlay className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground font-medium">No calls recorded yet.</p>
                <p className="text-sm text-muted-foreground mt-1">When customers call your Twilio number, they'll appear here.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Agent Status & Actions */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${agentStatus?.hasPhone ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-sm font-medium">Phone Number</span>
                </div>
                <span className="text-sm text-muted-foreground font-mono">{agentStatus?.phoneNumber || "Unassigned"}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${agentStatus?.hasAgent ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-sm font-medium">AI Persona</span>
                </div>
                <span className="text-sm text-muted-foreground">{agentStatus?.hasAgent ? "Configured" : "Pending"}</span>
              </div>

              {!isLive && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mt-4">
                  <p className="text-sm text-amber-800 font-medium mb-2">Setup Incomplete</p>
                  <p className="text-xs text-amber-700 mb-3">Your AI Agent cannot answer calls until both a phone number and persona are configured.</p>
                  <Button size="sm" variant="outline" className="w-full bg-white border-amber-200 hover:bg-amber-50" onClick={() => setLocation(`/shops/${shopId}/agent`)}>
                    Complete Setup
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
}
