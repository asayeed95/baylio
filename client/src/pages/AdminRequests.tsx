/**
 * /admin/requests
 *
 * Support inbox. Lists tickets that arrived via support@baylio.io.
 * Each is auto-triaged by Claude into {category, priority, summary}.
 * Admin can update status, jot notes, and reply — reply goes back to
 * the original sender via Resend (support@baylio.io).
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Inbox,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Flag,
  Tag as TagIcon,
} from "lucide-react";

type Status = "new" | "triaged" | "in_progress" | "shipped" | "declined" | "spam";
type Category =
  | "feature_request"
  | "bug_report"
  | "question"
  | "billing"
  | "language_request"
  | "integration_request"
  | "other";
type Priority = "low" | "medium" | "high" | "urgent";

const STATUS_STYLE: Record<Status, string> = {
  new: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  triaged: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  shipped: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  declined: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  spam: "bg-red-500/15 text-red-300 border-red-500/30",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  urgent: "bg-red-500/15 text-red-300 border-red-500/30",
  high: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  medium: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  low: "bg-gray-500/15 text-gray-300 border-gray-500/30",
};

const CATEGORY_LABEL: Record<Category, string> = {
  feature_request: "Feature",
  bug_report: "Bug",
  question: "Question",
  billing: "Billing",
  language_request: "Language",
  integration_request: "Integration",
  other: "Other",
};

export default function AdminRequests() {
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [openTicketId, setOpenTicketId] = useState<number | null>(null);

  const listQuery = trpc.support.list.useQuery(
    statusFilter === "all" ? undefined : { status: statusFilter }
  );
  const tickets = listQuery.data ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { new: 0, triaged: 0, in_progress: 0, shipped: 0 };
    for (const t of tickets) {
      c[t.status] = (c[t.status] ?? 0) + 1;
    }
    return c;
  }, [tickets]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Inbox className="h-6 w-6 text-emerald-400" />
            Support Requests
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Every email to support@baylio.io lands here, auto-triaged. Reply ships back via Resend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "new", "triaged", "in_progress", "shipped"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className={
                statusFilter === s
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
              }
            >
              {s === "all" ? "All" : s.replace("_", " ")}
              {s !== "all" && counts[s] ? (
                <span className="ml-1.5 text-[10px] opacity-70">{counts[s]}</span>
              ) : null}
            </Button>
          ))}
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-medium">
            {listQuery.isLoading
              ? "Loading…"
              : `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 && !listQuery.isLoading ? (
            <div className="p-12 text-center">
              <Mail className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                No tickets. Email support@baylio.io to test the pipeline.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOpenTicketId(t.id)}
                  className="w-full text-left p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-white text-sm font-medium">
                          {t.fromName || t.fromEmail}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {t.fromEmail}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${STATUS_STYLE[t.status as Status]}`}
                        >
                          {t.status.replace("_", " ")}
                        </Badge>
                        {t.priority && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${PRIORITY_STYLE[t.priority as Priority]}`}
                          >
                            <Flag className="h-2.5 w-2.5 mr-1" />
                            {t.priority}
                          </Badge>
                        )}
                        {t.category && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-gray-700 text-gray-300"
                          >
                            <TagIcon className="h-2.5 w-2.5 mr-1" />
                            {CATEGORY_LABEL[t.category as Category]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-200 text-sm font-medium mb-1 truncate">
                        {t.subject || "(no subject)"}
                      </p>
                      {t.summary ? (
                        <p className="text-emerald-300/80 text-xs mb-1 italic">
                          {t.summary}
                        </p>
                      ) : null}
                      <p className="text-gray-400 text-xs line-clamp-2">
                        {t.body}
                      </p>
                    </div>
                    <div className="text-right text-gray-500 text-xs shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelative(new Date(t.createdAt))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TicketDialog
        ticketId={openTicketId}
        onClose={() => setOpenTicketId(null)}
      />
    </div>
  );
}

function TicketDialog({
  ticketId,
  onClose,
}: {
  ticketId: number | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const ticketQuery = trpc.support.get.useQuery(
    { id: ticketId ?? 0 },
    { enabled: ticketId !== null }
  );
  const updateMutation = trpc.support.update.useMutation({
    onSuccess: () => {
      utils.support.list.invalidate();
      utils.support.get.invalidate();
      toast.success("Updated");
    },
    onError: (err) => toast.error(err.message),
  });
  const replyMutation = trpc.support.reply.useMutation({
    onSuccess: () => {
      utils.support.list.invalidate();
      utils.support.get.invalidate();
      toast.success("Reply sent");
      setReplyBody("");
    },
    onError: (err) => toast.error(err.message),
  });

  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [markStatus, setMarkStatus] = useState<Status>("in_progress");

  const t = ticketQuery.data;

  const defaultSubject = t?.subject
    ? t.subject.toLowerCase().startsWith("re:")
      ? t.subject
      : `Re: ${t.subject}`
    : "Re: your Baylio request";

  const subjectValue = replySubject || defaultSubject;

  return (
    <Dialog open={ticketId !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            {t?.subject || "(no subject)"}
          </DialogTitle>
          <p className="text-gray-400 text-xs mt-1">
            From {t?.fromName ? `${t.fromName} <${t.fromEmail}>` : t?.fromEmail}
          </p>
        </DialogHeader>

        {t && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={`text-xs ${STATUS_STYLE[t.status as Status]}`}
              >
                {t.status.replace("_", " ")}
              </Badge>
              {t.priority && (
                <Badge
                  variant="outline"
                  className={`text-xs ${PRIORITY_STYLE[t.priority as Priority]}`}
                >
                  {t.priority}
                </Badge>
              )}
              {t.category && (
                <Badge variant="outline" className="text-xs border-gray-700 text-gray-300">
                  {CATEGORY_LABEL[t.category as Category]}
                </Badge>
              )}
              {t.summary && (
                <p className="w-full text-emerald-300/90 text-sm italic mt-1">
                  <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                  {t.summary}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <p className="text-gray-200 text-sm whitespace-pre-wrap">{t.body}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-1">
                  Status
                </label>
                <Select
                  value={t.status}
                  onValueChange={(v) =>
                    updateMutation.mutate({ id: t.id, status: v as Status })
                  }
                >
                  <SelectTrigger className="bg-gray-950 border-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["new", "triaged", "in_progress", "shipped", "declined", "spam"] as const).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-1">
                  Priority
                </label>
                <Select
                  value={t.priority ?? ""}
                  onValueChange={(v) =>
                    updateMutation.mutate({ id: t.id, priority: v as Priority })
                  }
                >
                  <SelectTrigger className="bg-gray-950 border-gray-800 text-white">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["urgent", "high", "medium", "low"] as const).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-1">
                Admin notes (internal)
              </label>
              <Textarea
                defaultValue={t.adminNotes ?? ""}
                onBlur={(e) =>
                  updateMutation.mutate({
                    id: t.id,
                    adminNotes: e.currentTarget.value,
                  })
                }
                className="bg-gray-950 border-gray-800 text-white text-sm"
                rows={2}
              />
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Reply to {t.fromEmail}
              </p>
              <Input
                placeholder="Subject"
                value={replySubject || defaultSubject}
                onChange={(e) => setReplySubject(e.target.value)}
                className="bg-gray-950 border-gray-800 text-white"
              />
              <Textarea
                placeholder="Write your reply…"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={6}
                className="bg-gray-950 border-gray-800 text-white text-sm"
              />
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Mark as:</span>
                <Select
                  value={markStatus}
                  onValueChange={(v) => setMarkStatus(v as Status)}
                >
                  <SelectTrigger className="w-40 bg-gray-950 border-gray-800 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Close
          </Button>
          <Button
            disabled={!t || replyBody.trim().length === 0 || replyMutation.isPending}
            onClick={() =>
              t &&
              replyMutation.mutate({
                id: t.id,
                subject: subjectValue,
                body: replyBody,
                markStatus,
              })
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {replyMutation.isPending ? "Sending…" : "Send reply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
