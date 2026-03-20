/**
 * Affiliate Admin Management
 * 
 * Admin-only page for managing the affiliate program.
 * Features:
 * - List all affiliates with status, earnings, referral count
 * - Approve/suspend affiliates
 * - View affiliate detail (referrals, commissions)
 * 
 * Accessed via /admin/affiliates (admin role required)
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  UserCheck,
  UserX,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useState } from "react";

export default function AffiliateAdmin() {
  const { user, loading } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: affiliates, isLoading } = trpc.affiliate.adminList.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const utils = trpc.useUtils();

  const updateStatus = trpc.affiliate.adminUpdateStatus.useMutation({
    onSuccess: () => {
      toast.success("Affiliate status updated");
      utils.affiliate.adminList.invalidate();
      if (selectedId) utils.affiliate.adminDetail.invalidate({ affiliateId: selectedId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const { data: detail, isLoading: detailLoading } = trpc.affiliate.adminDetail.useQuery(
    { affiliateId: selectedId! },
    { enabled: !!selectedId }
  );

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Loading affiliates...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </DashboardLayout>
    );
  }

  const pendingCount = affiliates?.filter((a: { status: string }) => a.status === "pending").length ?? 0;
  const activeCount = affiliates?.filter((a: { status: string }) => a.status === "active").length ?? 0;
  const totalEarnings = affiliates?.reduce((sum: number, a: { totalEarnings: string }) => sum + Number(a.totalEarnings || 0), 0) ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Affiliate Management</h1>
          <p className="text-muted-foreground">
            Review applications, manage affiliates, and track program performance.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Affiliates</span>
              </div>
              <div className="text-2xl font-bold">{affiliates?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Pending Review</span>
              </div>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
              <div className="text-2xl font-bold text-primary">{activeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Paid Out</span>
              </div>
              <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Affiliate List */}
        <Card>
          <CardHeader>
            <CardTitle>All Affiliates</CardTitle>
            <CardDescription>
              {pendingCount > 0 && (
                <span className="text-amber-600 font-medium">{pendingCount} pending approval</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!affiliates || affiliates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No affiliate applications yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Sort: pending first, then active, then others */}
                {[...affiliates]
                  .sort((a: { status: string }, b: { status: string }) => {
                    const order: Record<string, number> = { pending: 0, active: 1, suspended: 2, inactive: 3 };
                    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
                  })
                  .map((aff) => (
                    <div
                      key={aff.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{aff.name}</p>
                            <Badge
                              variant={
                                aff.status === "active" ? "default" :
                                aff.status === "pending" ? "secondary" :
                                aff.status === "suspended" ? "destructive" : "outline"
                              }
                              className="capitalize text-xs"
                            >
                              {aff.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{aff.email}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Code: <span className="font-mono">{aff.code}</span> · 
                            {aff.totalClicks} clicks · {aff.totalSignups} signups · 
                            ${Number(aff.totalEarnings || 0).toFixed(2)} earned
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {aff.status === "pending" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateStatus.mutate({ affiliateId: aff.id, status: "active" })}
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        )}
                        {aff.status === "active" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateStatus.mutate({ affiliateId: aff.id, status: "suspended" })}
                            disabled={updateStatus.isPending}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            Suspend
                          </Button>
                        )}
                        {aff.status === "suspended" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus.mutate({ affiliateId: aff.id, status: "active" })}
                            disabled={updateStatus.isPending}
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            Reactivate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedId(aff.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Affiliate Details</DialogTitle>
            <DialogDescription>
              {detail?.affiliate?.name} — {detail?.affiliate?.email}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">Loading...</div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Profile */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant={detail.affiliate.status === "active" ? "default" : "secondary"}
                    className="capitalize mt-1"
                  >
                    {detail.affiliate.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Referral Code</p>
                  <p className="font-mono font-medium mt-1">{detail.affiliate.code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Commission Rate</p>
                  <p className="font-medium mt-1">{(Number(detail.affiliate.commissionRate) * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">PayPal</p>
                  <p className="font-medium mt-1">{detail.affiliate.paypalEmail || "Not set"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Clicks</p>
                  <p className="font-medium mt-1">{detail.affiliate.totalClicks}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Earnings</p>
                  <p className="font-medium mt-1 text-primary">${Number(detail.affiliate.totalEarnings || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Referrals */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Referrals ({detail.referrals.length})
                </h3>
                {detail.referrals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No referrals yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.referrals.map((ref: any) => (
                      <div key={ref.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                        <div>
                          <p className="font-medium">{ref.referredName || ref.referredEmail || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ref.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">{ref.status.replace("_", " ")}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Commissions */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Commissions ({detail.commissions.length})
                </h3>
                {detail.commissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No commissions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.commissions.map((comm: any) => (
                      <div key={comm.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                        <div>
                          <p className="font-medium">${Number(comm.amount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comm.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={comm.status === "paid" ? "default" : "outline"}
                          className="capitalize text-xs"
                        >
                          {comm.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                {detail.affiliate.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      updateStatus.mutate({ affiliateId: detail.affiliate.id, status: "active" });
                      setSelectedId(null);
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                )}
                {detail.affiliate.status === "active" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      updateStatus.mutate({ affiliateId: detail.affiliate.id, status: "suspended" });
                      setSelectedId(null);
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Suspend
                  </Button>
                )}
                {detail.affiliate.status === "suspended" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateStatus.mutate({ affiliateId: detail.affiliate.id, status: "active" });
                      setSelectedId(null);
                    }}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
