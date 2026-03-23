import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";

/**
 * Call Logs Page
 * 
 * Displays all calls for a shop with:
 * - Filterable table (date range, status, search)
 * - Call detail dialog with transcription
 * - Status badges (completed, missed, voicemail)
 * - Pagination
 */
export default function CallLogs() {
  return (
    <DashboardLayout>
      <CallLogsContent />
    </DashboardLayout>
  );
}

function CallLogsContent() {
  const params = useParams<{ id: string }>();
  const shopId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const limit = 25;

  const { data: shop } = trpc.shop.getById.useQuery(
    { id: shopId },
    { enabled: shopId > 0 }
  );

  const { data, isLoading } = trpc.calls.list.useQuery(
    {
      shopId,
      limit,
      offset: page * limit,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    { enabled: shopId > 0 }
  );

  const calls = data?.calls ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const filteredCalls = useMemo(() => {
    if (!searchTerm) return calls;
    const term = searchTerm.toLowerCase();
    return calls.filter(c =>
      c.callerPhone?.toLowerCase().includes(term) ||
      c.callerName?.toLowerCase().includes(term) ||
      c.customerIntent?.toLowerCase().includes(term)
    );
  }, [calls, searchTerm]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      completed: { variant: "default", label: "Completed" },
      missed: { variant: "destructive", label: "Missed" },
      voicemail: { variant: "secondary", label: "Voicemail" },
      transferred: { variant: "outline", label: "Transferred" },
    };
    const config = map[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/shops/${shopId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Call Logs</h1>
          <p className="text-sm text-muted-foreground">{shop?.name} — {total} total calls</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by caller name, phone, or intent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="voicemail">Voicemail</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : filteredCalls.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Phone /></EmptyMedia>
            <EmptyTitle>No calls yet</EmptyTitle>
            <EmptyDescription>
              Calls will appear here once your AI agent starts handling phone calls.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCall(call)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{call.callerName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{call.callerPhone || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(call.status)}</TableCell>
                    <TableCell className="text-sm">{formatDuration(call.duration)}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {call.customerIntent || "-"}
                    </TableCell>
                    <TableCell>
                      {call.appointmentBooked ? (
                        <Badge variant="default" className="text-xs">Booked</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {call.estimatedRevenue ? `$${parseFloat(call.estimatedRevenue).toFixed(0)}` : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(call.callStartedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Call Detail Dialog */}
      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Caller</Label>
                  <p className="text-sm font-medium">{selectedCall.callerName || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{selectedCall.callerPhone}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedCall.status)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <p className="text-sm">{formatDuration(selectedCall.duration)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm">{formatDate(selectedCall.callStartedAt)}</p>
                </div>
              </div>
              {selectedCall.customerIntent && (
                <div>
                  <Label className="text-xs text-muted-foreground">Customer Intent</Label>
                  <p className="text-sm mt-1">{selectedCall.customerIntent}</p>
                </div>
              )}
              {selectedCall.serviceRecommendations && (
                <div>
                  <Label className="text-xs text-muted-foreground">Service Recommendations</Label>
                  <p className="text-sm mt-1">{selectedCall.serviceRecommendations}</p>
                </div>
              )}
              {selectedCall.transcription && (
                <div>
                  <Label className="text-xs text-muted-foreground">Transcription</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg text-sm max-h-64 overflow-y-auto whitespace-pre-wrap">
                    {selectedCall.transcription}
                  </div>
                </div>
              )}
              {selectedCall.sentimentScore != null && (
                <div>
                  <Label className="text-xs text-muted-foreground">Sentiment Score</Label>
                  <p className="text-sm">{parseFloat(selectedCall.sentimentScore).toFixed(2)} / 1.00</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
