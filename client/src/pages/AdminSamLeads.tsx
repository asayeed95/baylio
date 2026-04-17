/**
 * /admin/sam-leads
 *
 * Lists prospects captured by Sam during sales calls to 844-875-2441.
 * Search by name/phone/email/shop. Filter by intent.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Phone,
  Mail,
  MessageSquare,
  PhoneForwarded,
  TrendingUp,
  Users,
  Inbox,
  Building2,
} from "lucide-react";

const INTENT_LABEL: Record<string, string> = {
  shop_owner_prospect: "Shop owner",
  curious_tester: "Tester",
  car_question: "Car question",
  existing_customer: "Customer",
  onboarding_help: "Onboarding",
  other: "Other",
};

const INTENT_COLOR: Record<string, string> = {
  shop_owner_prospect: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  curious_tester: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  car_question: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  existing_customer: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  onboarding_help: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  other: "bg-gray-500/15 text-gray-300 border-gray-500/30",
};

export default function AdminSamLeads() {
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState<string>("all");

  const stats = trpc.samLeads.stats.useQuery();
  const { data, isLoading } = trpc.samLeads.list.useQuery({
    search: search || undefined,
    intent: intent === "all" ? undefined : (intent as never),
    limit: 100,
    offset: 0,
  });

  const statCards = [
    {
      label: "Total Leads",
      value: stats.data?.total ?? "—",
      icon: Inbox,
      color: "text-emerald-400",
    },
    {
      label: "Shop Prospects",
      value: stats.data?.prospects ?? "—",
      icon: Building2,
      color: "text-blue-400",
    },
    {
      label: "SMS Sent",
      value: stats.data?.sms ?? "—",
      icon: MessageSquare,
      color: "text-purple-400",
    },
    {
      label: "Transferred",
      value: stats.data?.transferred ?? "—",
      icon: PhoneForwarded,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Sam Leads</h1>
        <p className="text-gray-400 text-sm mt-1">
          Prospects captured by Sam during sales calls to 844-875-2441
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((c) => (
          <Card key={c.label} className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-gray-400">
                  {c.label}
                </CardTitle>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-mono font-medium text-white">
                {c.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Search name, phone, email, or shop…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-950 border-gray-800 text-white placeholder:text-gray-500"
            />
            <Select value={intent} onValueChange={setIntent}>
              <SelectTrigger className="md:w-[200px] bg-gray-950 border-gray-800 text-white">
                <SelectValue placeholder="All intents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All intents</SelectItem>
                <SelectItem value="shop_owner_prospect">Shop owner prospect</SelectItem>
                <SelectItem value="curious_tester">Curious tester</SelectItem>
                <SelectItem value="car_question">Car question</SelectItem>
                <SelectItem value="existing_customer">Existing customer</SelectItem>
                <SelectItem value="onboarding_help">Onboarding help</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="text-gray-400">Caller</TableHead>
                <TableHead className="text-gray-400">Shop / City</TableHead>
                <TableHead className="text-gray-400">Intent</TableHead>
                <TableHead className="text-gray-400">Summary</TableHead>
                <TableHead className="text-gray-400">Touch</TableHead>
                <TableHead className="text-gray-400 text-right">Last call</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-gray-800">
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : !data?.leads.length ? (
                <TableRow className="border-gray-800">
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No leads yet. Sam will populate this as calls come in.
                  </TableCell>
                </TableRow>
              ) : (
                data.leads.map((lead) => (
                  <TableRow key={lead.id} className="border-gray-800 hover:bg-gray-800/30">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-white font-medium">
                          {lead.name || "Unknown"}
                        </span>
                        <span className="text-gray-500 text-xs font-mono">
                          {lead.callerPhone}
                        </span>
                        {lead.email && (
                          <span className="text-gray-500 text-xs">{lead.email}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-gray-300 text-sm">
                          {lead.shopName || "—"}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {lead.city || ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={INTENT_COLOR[lead.intent] || INTENT_COLOR.other}
                      >
                        {INTENT_LABEL[lead.intent] || lead.intent}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="text-gray-300 text-xs line-clamp-2">
                        {lead.intentSummary || "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {lead.smsSent && (
                          <MessageSquare
                            className="w-3 h-3 text-purple-400"
                            aria-label="SMS sent"
                          />
                        )}
                        {lead.emailSent && (
                          <Mail className="w-3 h-3 text-blue-400" aria-label="Email sent" />
                        )}
                        {lead.transferredToHuman && (
                          <PhoneForwarded
                            className="w-3 h-3 text-amber-400"
                            aria-label="Transferred"
                          />
                        )}
                        {lead.callCount > 1 && (
                          <Badge
                            variant="outline"
                            className="text-xs h-5 border-gray-700 text-gray-400"
                          >
                            {lead.callCount}×
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-gray-400 text-xs font-mono">
                      {new Date(lead.lastCalledAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
