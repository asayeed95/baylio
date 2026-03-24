import PartnersPortalLayout from "@/components/PartnersPortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Network,
  Store,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

const STATUS_ICONS = {
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  signed_up: { icon: Store, color: "text-blue-400", bg: "bg-blue-500/10" },
  subscribed: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  churned: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

export default function PartnersNetwork() {
  const { data, isLoading } = trpc.partner.getMyNetwork.useQuery();

  const network = data?.network || [];
  const totalMRR = data?.totalMRR || 0;

  const activeShops = network.filter(n => n.status === "subscribed");
  const pendingShops = network.filter(
    n => n.status === "pending" || n.status === "signed_up"
  );

  return (
    <PartnersPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Your Network
          </h1>
          <p className="text-zinc-400 mt-1">
            Shops in your referral network and their subscription status.
          </p>
        </div>

        {/* Network Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                  Network Size
                </p>
                <Network className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="text-2xl font-mono font-medium text-white mt-2">
                {network.length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {activeShops.length} active, {pendingShops.length} pending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                  Network MRR
                </p>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-mono font-medium text-emerald-400 mt-2">
                ${totalMRR.toFixed(0)}
                <span className="text-sm text-zinc-500">/mo</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Total subscriptions value
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                  Your Monthly Cut
                </p>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-mono font-medium text-amber-400 mt-2">
                ${(totalMRR * 0.2).toFixed(0)}
                <span className="text-sm text-zinc-500">/mo</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">20% commission</p>
            </CardContent>
          </Card>
        </div>

        {/* Network Members */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-zinc-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : network.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center">
              <Network className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-lg">Your network is empty</p>
              <p className="text-sm text-zinc-600 mt-1">
                Share your referral link to start building your partner network
                and earning commissions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {network.map(member => {
              const statusInfo =
                STATUS_ICONS[member.status as keyof typeof STATUS_ICONS] ||
                STATUS_ICONS.pending;
              const StatusIcon = statusInfo.icon;
              const monthlyValue = parseFloat(
                member.monthlyValue?.toString() || "0"
              );
              const commission = parseFloat(
                member.commissionEarned?.toString() || "0"
              );

              return (
                <Card
                  key={member.referralId}
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${statusInfo.bg}`}
                      >
                        <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">
                            {member.referredName || "Unknown Shop"}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${
                              member.status === "subscribed"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : member.status === "churned"
                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                  : "bg-zinc-700/50 text-zinc-400 border-zinc-600"
                            }`}
                          >
                            {member.status?.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-500 mt-0.5">
                          {member.referredEmail || "No email"}
                          {member.subscriptionTier && (
                            <span className="ml-2 capitalize">
                              | {member.subscriptionTier} plan
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {member.status === "subscribed" && monthlyValue > 0 ? (
                          <>
                            <p className="text-emerald-400 font-mono font-medium">
                              ${(monthlyValue * 0.2).toFixed(0)}/mo
                            </p>
                            <p className="text-xs text-zinc-500 font-mono">
                              ${monthlyValue.toFixed(0)}/mo plan
                            </p>
                          </>
                        ) : commission > 0 ? (
                          <p className="text-zinc-400 font-mono font-medium">
                            ${commission.toFixed(2)} earned
                          </p>
                        ) : (
                          <p className="text-zinc-600 text-sm">-</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PartnersPortalLayout>
  );
}
