import PartnersPortalLayout from "@/components/PartnersPortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  TrendingUp,
  Clock,
  ArrowDownToLine,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PAYOUT_STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function PartnersEarnings() {
  const [payoutAmount, setPayoutAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: earnings, isLoading: earningsLoading } =
    trpc.partner.getEarnings.useQuery();
  const { data: payouts, isLoading: payoutsLoading } =
    trpc.partner.getMyPayouts.useQuery();

  const utils = trpc.useUtils();
  const requestPayout = trpc.partner.requestPayout.useMutation({
    onSuccess: (data) => {
      toast.success(`Payout of $${data.amount} requested successfully`);
      setDialogOpen(false);
      setPayoutAmount("");
      utils.partner.getMyPayouts.invalidate();
      utils.partner.getEarnings.invalidate();
      utils.partner.dashboard.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const isLoading = earningsLoading || payoutsLoading;

  if (isLoading) {
    return (
      <PartnersPortalLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-zinc-800 rounded-lg" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-zinc-800 rounded-xl" />
            ))}
          </div>
        </div>
      </PartnersPortalLayout>
    );
  }

  const totalEarnings = earnings?.totalEarnings || 0;
  const pendingEarnings = earnings?.pendingEarnings || 0;
  const commissionRate = earnings?.commissionRate || 0.2;
  const monthlyData = earnings?.monthlyEarnings || [];
  const tierData = earnings?.byTier || [];

  return (
    <PartnersPortalLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Earnings
            </h1>
            <p className="text-zinc-400 mt-1">
              Track your commissions and request payouts.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={pendingEarnings < 50}
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Request Payout
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  Request Payout
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">
                    Available balance
                  </p>
                  <p className="text-2xl font-mono font-bold text-emerald-400">
                    ${pendingEarnings.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Payout Amount ($)</Label>
                  <Input
                    type="number"
                    min={50}
                    max={pendingEarnings}
                    step="0.01"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Minimum $50"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-zinc-500">
                    Minimum payout: $50. Processing takes 3-5 business days.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    requestPayout.mutate({
                      amount: parseFloat(payoutAmount),
                    })
                  }
                  disabled={
                    requestPayout.isPending ||
                    !payoutAmount ||
                    parseFloat(payoutAmount) < 50 ||
                    parseFloat(payoutAmount) > pendingEarnings
                  }
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {requestPayout.isPending
                    ? "Processing..."
                    : "Submit Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Earnings Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Total Earned</p>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-mono font-medium text-emerald-400 mt-2">
                ${totalEarnings.toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Available to Withdraw</p>
                <Wallet className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-mono font-medium text-amber-400 mt-2">
                ${pendingEarnings.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {pendingEarnings >= 50
                  ? "Ready for payout"
                  : `$${(50 - pendingEarnings).toFixed(2)} until minimum`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Commission Rate</p>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-mono font-medium text-white mt-2">
                {(commissionRate * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Recurring on all referrals
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Earnings by Tier */}
        {tierData.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                Earnings by Plan Tier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {tierData.map((t) => (
                  <div
                    key={t.tier || "unknown"}
                    className="p-4 rounded-lg bg-zinc-800 border border-zinc-700"
                  >
                    <p className="text-sm text-zinc-400 capitalize">
                      {t.tier || "Unknown"} Tier
                    </p>
                    <p className="text-xl font-mono font-bold text-white mt-1">
                      ${parseFloat(t.earned || "0").toFixed(2)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {t.count} shops
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Earnings */}
        {monthlyData.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                Monthly Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monthlyData.slice(-6).map((m) => {
                  const earned = parseFloat(m.earned || "0");
                  const maxEarned = Math.max(
                    ...monthlyData.map((d) => parseFloat(d.earned || "0")),
                    1
                  );
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400 w-20 shrink-0">
                        {m.month}
                      </span>
                      <div className="flex-1 h-6 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500/60 rounded-full"
                          style={{
                            width: `${(earned / maxEarned) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-mono text-emerald-400 font-medium w-20 text-right">
                        ${earned.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payout History */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Payout History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!payouts || payouts.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400">No payouts yet</p>
                <p className="text-sm text-zinc-600 mt-1">
                  Request your first payout when you have $50+ in earnings.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Date</TableHead>
                    <TableHead className="text-zinc-400">Amount</TableHead>
                    <TableHead className="text-zinc-400">Method</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow
                      key={payout.id}
                      className="border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <TableCell className="text-zinc-300">
                        {new Date(payout.requestedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-emerald-400 font-mono font-medium">
                        ${parseFloat(payout.amount?.toString() || "0").toFixed(2)}
                      </TableCell>
                      <TableCell className="text-zinc-400 capitalize">
                        {payout.payoutMethod || "stripe"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            PAYOUT_STATUS_COLORS[
                              payout.status as keyof typeof PAYOUT_STATUS_COLORS
                            ] || PAYOUT_STATUS_COLORS.pending
                          }
                        >
                          {payout.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnersPortalLayout>
  );
}
