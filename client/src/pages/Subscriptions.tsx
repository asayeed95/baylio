import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  CreditCard,
  Store,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";

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
  const posthog = usePostHog();
  const { data: allSubs, isLoading } = trpc.subscription.listAll.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Subscriptions & Billing
        </h1>
        <p className="text-muted-foreground">
          Manage plans, track usage, and view billing for all your shops.
        </p>
      </div>

      {/* Subscription Cards */}
      {!allSubs || allSubs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCard />
            </EmptyMedia>
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
                      <p className="text-xs text-muted-foreground">
                        {shop.phone || "No phone"}
                      </p>
                    </div>
                  </div>
                  {subscription ? (
                    <Badge className={tierColors[subscription.tier] || ""}>
                      {subscription.tier.charAt(0).toUpperCase() +
                        subscription.tier.slice(1)}{" "}
                      — ${tierPrices[subscription.tier]}/mo
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
                        <span className="font-mono">
                          {subscription.usedMinutes} min used
                        </span>
                        <span className="font-mono">
                          {subscription.includedMinutes} min included
                        </span>
                      </div>
                      <Progress
                        value={
                          subscription.includedMinutes > 0
                            ? Math.min(
                                100,
                                (subscription.usedMinutes /
                                  subscription.includedMinutes) *
                                  100
                              )
                            : 0
                        }
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
                      {subscription.usedMinutes >
                        subscription.includedMinutes && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>
                            {subscription.usedMinutes -
                              subscription.includedMinutes}{" "}
                            min overage
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setLocation(`/shops/${shop.id}/analytics`)
                        }
                      >
                        View Usage
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toast.info("Stripe billing integration coming soon")
                        }
                      >
                        Manage Billing
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      No subscription active. Choose a plan to start AI call
                      handling.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        posthog?.capture("subscription_checkout_started", { shop_id: shop.id, shop_name: shop.name });
                        toast.info("Subscription creation coming soon");
                      }}
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

      {/* Pricing Plans (Stripe Style) */}
      <div className="mt-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Upgrade your plan</h2>
          <p className="text-muted-foreground mt-1">
            Choose the right capacity for your shop's call volume.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {[
            {
              tier: "Starter",
              desc: "For single-location shops getting started",
              price: 199,
              minutes: 300,
              popular: false,
              features: [
                "AI receptionist",
                "Call logging & transcription",
                "Basic analytics dashboard",
                "Email notifications",
              ],
            },
            {
              tier: "Pro",
              desc: "For busy shops that need more capacity",
              price: 349,
              minutes: 750,
              popular: true,
              features: [
                "Everything in Starter",
                "Calendar integration",
                "Advanced analytics & trends",
                "Custom AI voice & persona",
                "SMS notifications to owner",
              ],
            },
            {
              tier: "Elite",
              desc: "For high-volume & multi-location owners",
              price: 599,
              minutes: 1500,
              popular: false,
              features: [
                "Everything in Pro",
                "Intelligent upsell engine",
                "CRM integration",
                "Multi-location management",
                "Priority support",
              ],
            },
          ].map(plan => (
            <Card
              key={plan.tier}
              className={`relative flex flex-col h-full bg-card ${
                plan.popular
                  ? "border-primary shadow-sm scale-100 md:scale-105 z-10"
                  : "border-border/50 scale-100"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-0 right-0 max-w-fit mx-auto">
                  <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-0.5">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-bold">{plan.tier}</CardTitle>
                <CardDescription className="text-sm mt-2 h-10">
                  {plan.desc}
                </CardDescription>
                <div className="mt-4 flex items-baseline text-4xl font-bold font-mono tracking-tighter">
                  ${plan.price}
                  <span className="text-sm font-sans font-medium text-muted-foreground ml-1 tracking-normal">
                    /month
                  </span>
                </div>
                <p className="text-sm font-medium text-primary mt-3">
                  {plan.minutes.toLocaleString()} min included
                </p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 p-8 pt-4">
                <ul className="space-y-3 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex gap-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-muted-foreground leading-tight">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full mt-8 ${
                    plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => {
                    posthog?.capture("cta_clicked", { label: `Upgrade to ${plan.tier}`, location: "subscriptions" });
                    toast.info(`Stripe checkout for ${plan.tier} coming soon.`);
                  }}
                >
                  Upgrade to {plan.tier}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
