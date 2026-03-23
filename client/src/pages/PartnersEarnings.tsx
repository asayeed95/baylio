import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import PartnersPortalLayout from "@/components/PartnersPortalLayout";

export default function PartnersEarnings() {
  const { data: statsData, isLoading } = trpc.affiliate.stats.useQuery();
  const { data: payouts } = trpc.affiliate.getMyPayouts.useQuery();
  const utils = trpc.useUtils();

  const requestPayout = trpc.affiliate.requestPayout.useMutation({
    onSuccess: () => {
      toast.success("Payout requested! We'll process it within 3-5 business days.");
      utils.affiliate.getMyPayouts.invalidate();
      utils.affiliate.stats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to request payout");
    },
  });

  const stats = statsData?.summary;
  const affiliate = statsData?.affiliate;
  const commissions = statsData?.commissions || [];
  const pendingBalance = parseFloat(affiliate?.pendingPayout ?? "0");

  return (
    <PartnersPortalLayout title="Earnings">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-6">Earnings & Commissions</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-[#0D0D14] border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-400">Total Earned</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${Number(stats?.totalEarnings ?? 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0D0D14] border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-400">Pending Balance</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">
                ${pendingBalance.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0D0D14] border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-400">Request Payout</span>
              </div>
              <Button
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={pendingBalance < 50 || requestPayout.isPending}
                onClick={() => requestPayout.mutate({ method: "paypal" })}
              >
                {requestPayout.isPending ? "Requesting..." : pendingBalance < 50 ? "Min $50 required" : "Request Payout"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Commission History */}
        <Card className="bg-[#0D0D14] border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-white">Commission History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : commissions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No commissions yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Period</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((comm) => (
                    <tr key={comm.id} className="border-b border-white/5 last:border-0">
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(comm.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-amber-400 font-medium">
                        ${Number(comm.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            comm.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                            comm.status === "approved" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                            comm.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                            "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }
                        >
                          {comm.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {comm.periodStart ? new Date(comm.periodStart).toLocaleDateString() : "—"}
                        {comm.periodEnd ? ` - ${new Date(comm.periodEnd).toLocaleDateString()}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        {payouts && payouts.length > 0 && (
          <Card className="bg-[#0D0D14] border-white/10">
            <CardHeader>
              <CardTitle className="text-lg text-white">Payout History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Method</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 last:border-0">
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-white font-medium">${Number(p.amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-slate-300 capitalize">{p.method}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            p.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                            p.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                            "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </PartnersPortalLayout>
  );
}
