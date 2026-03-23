import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Bot,
  Plus,
  Search,
  RefreshCw,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";

type OutreachStatus =
  | "not_contacted"
  | "called"
  | "voicemail"
  | "interested"
  | "demo_scheduled"
  | "signed_up"
  | "not_interested"
  | "do_not_call";

const STATUS_COLORS: Record<OutreachStatus, string> = {
  not_contacted: "bg-slate-100 text-slate-700",
  called: "bg-blue-100 text-blue-700",
  voicemail: "bg-yellow-100 text-yellow-700",
  interested: "bg-emerald-100 text-emerald-700",
  demo_scheduled: "bg-purple-100 text-purple-700",
  signed_up: "bg-green-100 text-green-700",
  not_interested: "bg-red-100 text-red-700",
  do_not_call: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<OutreachStatus, string> = {
  not_contacted: "Not Contacted",
  called: "Called",
  voicemail: "Voicemail",
  interested: "Interested",
  demo_scheduled: "Demo Scheduled",
  signed_up: "Signed Up ✓",
  not_interested: "Not Interested",
  do_not_call: "Do Not Call",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  csv_import: "CSV Import",
  google_maps: "Google Maps",
  yelp: "Yelp",
  referral: "Referral",
  cold_call: "Cold Call",
  agencyflow: "AgencyFlow 🤖",
};

export default function AdminLeads() {
  const { user } = useAuth();
  const [coldPage, setColdPage] = useState(1);
  const [warmPage, setWarmPage] = useState(1);
  const [coldSearch, setColdSearch] = useState("");
  const [warmSearch, setWarmSearch] = useState("");
  const [coldStatusFilter, setColdStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<OutreachStatus>("called");
  const [statusNote, setStatusNote] = useState("");
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledStatusFilter, setScheduledStatusFilter] = useState<string>("pending");
  const [newLead, setNewLead] = useState({
    ownerName: "", shopName: "", phone: "", email: "",
    address: "", city: "", state: "", notes: "",
  });

  const utils = trpc.useUtils();

  const { data: stats } = trpc.leads.getStats.useQuery();

  const { data: coldLeads, isLoading: coldLoading } = trpc.leads.getColdLeads.useQuery({
    page: coldPage,
    limit: 25,
    search: coldSearch || undefined,
    status: (coldStatusFilter !== "all" ? coldStatusFilter as OutreachStatus : undefined),
  });

  const { data: warmLeads, isLoading: warmLoading } = trpc.leads.getWarmLeads.useQuery({
    page: warmPage,
    limit: 25,
    search: warmSearch || undefined,
  });

  const updateStatus = trpc.leads.updateLeadStatus.useMutation({
    onSuccess: () => {
      utils.leads.getColdLeads.invalidate();
      utils.leads.getStats.invalidate();
      setSelectedLead(null);
      setStatusNote("");
      toast.success("Status updated");
    },
  });

  const { data: scheduledCallsData, isLoading: scheduledLoading } = trpc.leads.getScheduledCalls.useQuery({
    page: scheduledPage,
    limit: 20,
    status: scheduledStatusFilter !== "all" ? scheduledStatusFilter as "pending" | "calling" | "completed" | "failed" | "cancelled" : undefined,
  });

  const cancelCall = trpc.leads.cancelScheduledCall.useMutation({
    onSuccess: () => {
      utils.leads.getScheduledCalls.invalidate();
      toast.success("Callback cancelled");
    },
  });

  const addLead = trpc.leads.addColdLead.useMutation({
    onSuccess: () => {
      utils.leads.getColdLeads.invalidate();
      utils.leads.getStats.invalidate();
      setAddLeadOpen(false);
      setNewLead({ ownerName: "", shopName: "", phone: "", email: "", address: "", city: "", state: "", notes: "" });
      toast.success("Lead added successfully");
    },
  });

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </DashboardLayout>
    );
  }

  const coldTotal = coldLeads?.total ?? 0;
  const coldPages = Math.ceil(coldTotal / 25);
  const warmTotal = warmLeads?.total ?? 0;
  const warmPages = Math.ceil(warmTotal / 25);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lead Intelligence</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Cold leads from AgencyFlow · Warm leads from site signups
            </p>
          </div>
          <Button onClick={() => setAddLeadOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cold Leads</p>
                  <p className="text-xl font-bold">{stats?.coldLeads.total ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Warm Leads</p>
                  <p className="text-xl font-bold">{stats?.warmLeads.total ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                  <p className="text-xl font-bold">{stats?.coldLeads.conversionRate ?? "0.0%"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Interested</p>
                  <p className="text-xl font-bold">
                    {(stats?.coldLeads.byStatus?.["interested"] ?? 0) +
                      (stats?.coldLeads.byStatus?.["demo_scheduled"] ?? 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cold">
          <TabsList>
            <TabsTrigger value="cold">
              Cold Leads
              {coldTotal > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{coldTotal}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="warm">
              Warm Leads
              {warmTotal > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{warmTotal}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Alex's Callbacks
              {(scheduledCallsData?.calls.filter(c => c.status === "pending").length ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs bg-orange-100 text-orange-700">
                  {scheduledCallsData?.calls.filter(c => c.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Cold Leads Tab ── */}
          <TabsContent value="cold" className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shop, owner, city..."
                  className="pl-9"
                  value={coldSearch}
                  onChange={e => { setColdSearch(e.target.value); setColdPage(1); }}
                />
              </div>
              <Select value={coldStatusFilter} onValueChange={v => { setColdStatusFilter(v); setColdPage(1); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => utils.leads.getColdLeads.invalidate()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {coldLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
            ) : !coldLeads?.leads.length ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <Bot className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">No cold leads yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AgencyFlow will push leads here automatically, or add them manually.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {coldLeads.leads.map(lead => (
                  <Card key={lead.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{lead.shopName}</span>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-sm text-muted-foreground truncate">{lead.ownerName}</span>
                            {lead.source && (
                              <Badge variant="outline" className="text-xs py-0">
                                {SOURCE_LABELS[lead.source] ?? lead.source}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 flex-wrap">
                            {lead.phone && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />{lead.phone}
                              </span>
                            )}
                            {lead.city && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />{lead.city}{lead.state ? `, ${lead.state}` : ""}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />{lead.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.outreachStatus as OutreachStatus]}`}>
                            {STATUS_LABELS[lead.outreachStatus as OutreachStatus]}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              setSelectedLead(lead.id);
                              setNewStatus(lead.outreachStatus as OutreachStatus);
                            }}
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {coldPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Page {coldPage} of {coldPages} · {coldTotal} total
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={coldPage === 1} onClick={() => setColdPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={coldPage === coldPages} onClick={() => setColdPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Warm Leads Tab ── */}
          <TabsContent value="warm" className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-9"
                  value={warmSearch}
                  onChange={e => { setWarmSearch(e.target.value); setWarmPage(1); }}
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => utils.leads.getWarmLeads.invalidate()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {warmLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading warm leads...</div>
            ) : !warmLeads?.leads.length ? (
              <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">No warm leads yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Users who sign up on baylio.io will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {warmLeads.leads.map(lead => (
                  <Card key={lead.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{lead.name ?? "Unknown"}</span>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-sm text-muted-foreground">{lead.email}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Signed up {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                          </p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs shrink-0">
                          Warm Lead
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {warmPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Page {warmPage} of {warmPages} · {warmTotal} total
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={warmPage === 1} onClick={() => setWarmPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={warmPage === warmPages} onClick={() => setWarmPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Scheduled Callbacks Tab ── */}
          <TabsContent value="scheduled" className="space-y-4">
            <div className="flex gap-3 flex-wrap items-center justify-between">
              <p className="text-sm text-muted-foreground">
                When callers ask Alex to call them back, the scheduled callbacks appear here.
              </p>
              <Select value={scheduledStatusFilter} onValueChange={v => { setScheduledStatusFilter(v); setScheduledPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="calling">Calling</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scheduledLoading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !scheduledCallsData?.calls.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No scheduled callbacks yet</p>
                <p className="text-sm mt-1">When a caller tells Alex "call me back later", it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledCallsData.calls.map(call => {
                  const isPending = call.status === "pending";
                  const isFailed = call.status === "failed";
                  const statusColors: Record<string, string> = {
                    pending: "bg-orange-100 text-orange-700",
                    calling: "bg-blue-100 text-blue-700",
                    completed: "bg-green-100 text-green-700",
                    failed: "bg-red-100 text-red-700",
                    cancelled: "bg-gray-100 text-gray-500",
                  };
                  return (
                    <Card key={call.id} className={`hover:shadow-sm transition-shadow ${isFailed ? "border-red-200" : ""}`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {call.phone}
                              </span>
                              <Badge className={`text-xs ${statusColors[call.status] ?? ""}`}>
                                {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                              </Badge>
                              {call.attempts > 1 && (
                                <span className="text-xs text-muted-foreground">{call.attempts} attempts</span>
                              )}
                            </div>
                            {call.reason && (
                              <p className="text-xs text-muted-foreground mt-1 italic">"{call.reason}"</p>
                            )}
                            {call.context && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{call.context}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Scheduled for: <span className="font-medium text-foreground">{new Date(call.scheduledAt).toLocaleString()}</span>
                            </p>
                          </div>
                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                              onClick={() => cancelCall.mutate({ id: call.id })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={selectedLead !== null} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Outreach Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={newStatus} onValueChange={v => setNewStatus(v as OutreachStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Add a note (optional)..."
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedLead) {
                  updateStatus.mutate({ id: selectedLead, status: newStatus, note: statusNote || undefined });
                }
              }}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Cold Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Owner Name *" value={newLead.ownerName} onChange={e => setNewLead(p => ({ ...p, ownerName: e.target.value }))} />
              <Input placeholder="Shop Name *" value={newLead.shopName} onChange={e => setNewLead(p => ({ ...p, shopName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Phone" value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} />
              <Input placeholder="Email" value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} />
            </div>
            <Input placeholder="Address" value={newLead.address} onChange={e => setNewLead(p => ({ ...p, address: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" value={newLead.city} onChange={e => setNewLead(p => ({ ...p, city: e.target.value }))} />
              <Input placeholder="State" value={newLead.state} onChange={e => setNewLead(p => ({ ...p, state: e.target.value }))} />
            </div>
            <Input placeholder="Notes" value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLeadOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addLead.mutate({
                ownerName: newLead.ownerName,
                shopName: newLead.shopName,
                phone: newLead.phone || undefined,
                email: newLead.email || undefined,
                address: newLead.address || undefined,
                city: newLead.city || undefined,
                state: newLead.state || undefined,
                notes: newLead.notes || undefined,
              })}
              disabled={!newLead.ownerName || !newLead.shopName || addLead.isPending}
            >
              {addLead.isPending ? "Adding..." : "Add Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
