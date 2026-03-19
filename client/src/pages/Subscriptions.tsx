import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  CreditCard,
  Store,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * Subscriptions Page
 * 
 * Shows all shops with their subscription status:
 * - Current tier and usage
 * - Minutes used vs included
 * - Overage charges
 * - Upgrade/downgrade options
 * - Billing cycle info
 * 
 * Stripe integration will be added later for actual payment processing.
 */
export default function Subscriptions() {
  return (
    <DashboardLayout>
      <SubscriptionsContent />
    </DashboardLayout>
  );
}

function SubscriptionsContent() {
  const [, setLocation] = useLocation();
  const { data: allSubs, isLoading } = trpc.subscription.listAll.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    starter: "bg-blue-50 text-blue-700",
    pro: "bg-emerald-50 text-emerald-700",
    elite: "bg-purple-50 text-purple-700",
  };

  const tierPrices: Record<string, number> = {
    starter: 199,
    pro: 349,
    elite: 599,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions & Billing</h1>
        <p className="text-muted-foreground">
          Manage plans, track usage, and view billing for all your shops.
        </p>
      </div>

      {/* Subscription Cards */}
      {!allSubs || allSubs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CreditCard /></EmptyMedia>
            <EmptyTitle>No subscriptions</EmptyTitle>
            <EmptyDescription>
              Add a shop from the dashboard to set up a subscription plan.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {allSubs.map(({ shop, subscription }) => (
            <Card key={shop.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{shop.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{shop.phone || "No phone"}</p>
                    </div>
                  </div>
                  {subscription ? (
                    <Badge className={tierColors[subscription.tier] || ""}>
                      {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} — ${tierPrices[subscription.tier]}/mo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">No Plan</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="space-y-4">
                    {/* Usage bar */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{subscription.usedMinutes} min used</span>
                        <span>{subscription.includedMinutes} min included</span>
                      </div>
                      <Progress
                        value={subscription.includedMinutes > 0
                          ? Math.min(100, (subscription.usedMinutes / subscription.includedMinutes) * 100)
                          : 0}
                        className="h-2"
                      />
                    </div>

                    {/* Details row */}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{subscription.billingCycle}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{subscription.status}</span>
                      </div>
                      {subscription.usedMinutes > subscription.includedMinutes && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>
                            {subscription.usedMinutes - subscription.includedMinutes} min overage
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/shops/${shop.id}/analytics`)}
                      >
                        View Usage
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info("Stripe billing integration coming soon")}
                      >
                        Manage Billing
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      No subscription active. Choose a plan to start AI call handling.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => toast.info("Subscription creation coming soon")}
                    >
                      Choose Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pricing Reference */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Plan Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { tier: "Starter", price: 199, minutes: 300, features: ["AI receptionist", "Call logging", "Basic analytics"] },
              { tier: "Pro", price: 349, minutes: 750, features: ["Calendar integration", "Advanced analytics", "Custom AI voice"] },
              { tier: "Elite", price: 599, minutes: 1500, features: ["Upsell engine", "CRM integration", "Multi-location", "Priority support"] },
            ].map((plan) => (
              <div key={plan.tier} className="p-4 rounded-lg bg-background border">
                <h3 className="font-semibold">{plan.tier}</h3>
                <p className="text-2xl font-bold mt-1">${plan.price}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
                <p className="text-xs text-muted-foreground mt-1">{plan.minutes} min included</p>
                <ul className="mt-3 space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
