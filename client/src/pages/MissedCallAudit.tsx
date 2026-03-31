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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  ClipboardCheck,
  Plus,
  Phone,
  DollarSign,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Missed Call Audit Page
 *
 * This is the SALES TOOL — the "Missed Call Audit" lead magnet.
 *
 * Flow:
 * 1. Admin creates an audit for a prospect shop
 * 2. A forwarding number is set up for 7 days
 * 3. System tracks all missed calls during the audit period
 * 4. After 7 days, a scorecard is generated showing:
 *    - Total missed calls
 *    - Intent classification per call
 *    - Estimated revenue lost
 *    - PDF scorecard for the sales pitch
 *
 * This page manages the lifecycle of all audits.
 */
export default function MissedCallAudit() {
  return (
    <DashboardLayout>
      <MissedCallAuditContent />
    </DashboardLayout>
  );
}

function MissedCallAuditContent() {
  const [createOpen, setCreateOpen] = useState(false);
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [shopName, setShopName] = useState("");

  const { data: audits, isLoading, refetch } = trpc.calls.audits.useQuery({});

  const createAudit = trpc.calls.createAudit.useMutation({
    onSuccess: () => {
      toast.success("Audit created. Set up call forwarding to begin tracking.");
      setCreateOpen(false);
      setProspectName("");
      setProspectEmail("");
      setProspectPhone("");
      setShopName("");
      refetch();
    },
    onError: err => {
      toast.error(err.message || "Failed to create audit");
    },
  });

  const handleCreate = () => {
    if (!shopName.trim()) {
      toast.error("Shop name is required");
      return;
    }
    createAudit.mutate({
      prospectName: prospectName.trim() || undefined,
      prospectEmail: prospectEmail.trim() || undefined,
      prospectPhone: prospectPhone.trim() || undefined,
      shopName: shopName.trim() || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      pending: { variant: "secondary", label: "Pending Setup" },
      active: { variant: "default", label: "Active (Tracking)" },
      completed: { variant: "outline", label: "Completed" },
      expired: { variant: "destructive", label: "Expired" },
    };
    const config = map[status] || {
      variant: "secondary" as const,
      label: status,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Missed Call Audits
          </h1>
          <p className="text-muted-foreground">
            Your sales tool. Run 7-day audits to show prospects how much revenue
            they're losing.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Audit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Missed Call Audit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Shop Name (Prospect)</Label>
                <Input
                  placeholder="e.g., Joe's Auto Repair"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  placeholder="e.g., Joe Smith"
                  value={prospectName}
                  onChange={e => setProspectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  placeholder="joe@example.com"
                  value={prospectEmail}
                  onChange={e => setProspectEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  placeholder="(555) 123-4567"
                  value={prospectPhone}
                  onChange={e => setProspectPhone(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createAudit.isPending}
              >
                {createAudit.isPending ? "Creating..." : "Create Audit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* How It Works */}
      <Card className="bg-muted/30">
        <CardContent className="pt-5 pb-5">
          <div className="grid md:grid-cols-4 gap-4 text-center">
            {[
              {
                step: "1",
                title: "Create Audit",
                desc: "Enter prospect shop details",
              },
              {
                step: "2",
                title: "Forward Calls",
                desc: "Set up 7-day call forwarding",
              },
              {
                step: "3",
                title: "Track Misses",
                desc: "AI classifies every missed call",
              },
              {
                step: "4",
                title: "Deliver Scorecard",
                desc: "Show them the revenue they're losing",
              },
            ].map(item => (
              <div key={item.step} className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-2">
                  {item.step}
                </div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audits Table */}
      {!audits || audits.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheck />
            </EmptyMedia>
            <EmptyTitle>No audits yet</EmptyTitle>
            <EmptyDescription>
              Create your first missed call audit to start generating sales
              leads.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Audit
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Missed Calls</TableHead>
                <TableHead>Est. Lost Revenue</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map(audit => (
                <TableRow key={audit.id}>
                  <TableCell className="font-medium">
                    {audit.shopName || "-"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{audit.prospectName || "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {audit.prospectPhone || audit.prospectEmail || ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(audit.status)}</TableCell>
                  <TableCell className="font-mono">
                    {audit.totalMissedCalls ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center px-3 py-1 rounded-md bg-primary/10 text-primary font-mono text-lg font-bold">
                      {audit.estimatedLostRevenue
                        ? `$${parseFloat(audit.estimatedLostRevenue).toLocaleString()}`
                        : "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(audit.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
