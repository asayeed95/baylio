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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Users, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useState } from "react";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: Clock,
  },
  signed_up: {
    label: "Signed Up",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Users,
  },
  subscribed: {
    label: "Subscribed",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle,
  },
  churned: {
    label: "Churned",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: XCircle,
  },
};

export default function PartnersReferrals() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.partner.listReferrals.useQuery({
    status: statusFilter as any,
    limit,
    offset: page * limit,
  });

  const referrals = data?.referrals || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <PartnersPortalLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Referrals
            </h1>
            <p className="text-zinc-400 mt-1">
              Track the status of every shop you've referred.
            </p>
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] bg-zinc-900 border-zinc-700 text-zinc-300">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="signed_up">Signed Up</SelectItem>
              <SelectItem value="subscribed">Subscribed</SelectItem>
              <SelectItem value="churned">Churned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const count = referrals.filter(
              (r) => statusFilter === "all" || r.status === statusFilter
            ).length;
            return (
              <Card key={key} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${config.color.split(" ")[0]}`}
                  >
                    <config.icon className={`h-5 w-5 ${config.color.split(" ")[1]}`} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">{config.label}</p>
                    <p className="text-lg font-bold text-white">
                      {statusFilter === key || statusFilter === "all"
                        ? referrals.filter((r) => r.status === key).length
                        : 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Referrals Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-zinc-500">Loading...</div>
            ) : referrals.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400">No referrals yet</p>
                <p className="text-sm text-zinc-600 mt-1">
                  Share your referral link to start earning commissions.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Name</TableHead>
                    <TableHead className="text-zinc-400">Email</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Plan</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Commission
                    </TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Date
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((ref) => {
                    const statusCfg =
                      STATUS_CONFIG[
                        ref.status as keyof typeof STATUS_CONFIG
                      ] || STATUS_CONFIG.pending;
                    return (
                      <TableRow
                        key={ref.id}
                        className="border-zinc-800 hover:bg-zinc-800/50"
                      >
                        <TableCell className="text-zinc-200 font-medium">
                          {ref.referredName || "Unknown"}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {ref.referredEmail || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusCfg.color}
                          >
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-300 capitalize">
                          {ref.subscriptionTier || "-"}
                        </TableCell>
                        <TableCell className="text-right text-emerald-400 font-mono font-medium">
                          {parseFloat(ref.commissionEarned?.toString() || "0") > 0
                            ? `$${parseFloat(ref.commissionEarned?.toString() || "0").toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-zinc-500 text-sm">
                          {ref.createdAt
                            ? new Date(ref.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">
                Showing {page * limit + 1}-
                {Math.min((page + 1) * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PartnersPortalLayout>
  );
}
