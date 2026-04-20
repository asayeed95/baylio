import { useMemo } from "react";
import { Link } from "wouter";
import { AlertCircle, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";

/**
 * Dashboard trial banner.
 *
 * Shown at the top of authed pages when the user is on a trial or has no
 * active subscription. Hidden for paying customers. Quietly absent while
 * the access status is loading so it doesn't flash in on every navigation.
 */
export function TrialBanner() {
  const { data } = trpc.subscription.getAccessStatus.useQuery(undefined, {
    staleTime: 60 * 1000,
  });

  const banner = useMemo(() => {
    if (!data) return null;
    if (data.reason === "subscription") return null;
    if (data.reason === "shop_not_found") return null;

    if (data.reason === "trial") {
      const days = data.trialDaysRemaining ?? 0;
      if (days > 7) return null;
      const urgent = days <= 2;
      return {
        urgent,
        title: urgent
          ? `${days} day${days === 1 ? "" : "s"} left in your trial`
          : `${days} days left in your trial`,
        message: urgent
          ? "Pick a plan before your trial ends so callers keep reaching Baylio instead of voicemail."
          : "Enjoying Baylio? Lock in a plan before your trial ends.",
        cta: "Choose your plan",
      };
    }

    if (data.reason === "trial_expired" || data.reason === "no_trial") {
      return {
        urgent: true,
        title: "Your trial has ended",
        message:
          "Incoming callers are hitting voicemail. Pick a plan to turn Baylio back on.",
        cta: "Reactivate Baylio",
      };
    }

    return null;
  }, [data]);

  if (!banner) return null;

  const Icon = banner.urgent ? AlertCircle : Clock;
  const toneClass = banner.urgent
    ? "border-red-200 bg-red-50 text-red-900"
    : "border-amber-200 bg-amber-50 text-amber-900";
  const buttonVariant = banner.urgent ? "default" : "outline";

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border ${toneClass} px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium">{banner.title}</span>
          <span className="text-xs opacity-90">{banner.message}</span>
        </div>
      </div>
      <Link href="/subscriptions">
        <Button size="sm" variant={buttonVariant as "default" | "outline"}>
          {banner.cta}
        </Button>
      </Link>
    </div>
  );
}
