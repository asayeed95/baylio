import AdminPortalLayout from "@/components/AdminPortalLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  PhoneCall,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";

export default function AdminOverview() {
  const { data: coldLeads } = trpc.leads.getColdLeads.useQuery({ page: 1, limit: 1 });
  const { data: warmLeads } = trpc.leads.getWarmLeads.useQuery({ page: 1, limit: 1 });
  const { data: scheduledCalls } = trpc.leads.getScheduledCalls.useQuery({ status: "pending" });

  const pendingCallbacks = scheduledCalls?.calls?.filter((c) => c.status === "pending").length ?? 0;

  const stats = [
    {
      label: "Cold Leads",
      value: coldLeads?.total ?? "—",
      icon: <Target className="w-5 h-5 text-blue-400" />,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Warm Leads",
      value: warmLeads?.total ?? "—",
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Pending Callbacks",
      value: pendingCallbacks,
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Active Shops",
      value: "—",
      icon: <Users className="w-5 h-5 text-purple-400" />,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <AdminPortalLayout title="Overview">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Operations Overview</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time view of Baylio's pipeline and AI activity.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="bg-[#0D0D14] border-white/5 hover:border-white/10 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>{stat.icon}</div>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Agents Status */}
        <Card className="bg-[#0D0D14] border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              AI Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                name: "Alex",
                role: "Sales AI",
                number: "(844) 875-2441",
                status: "active",
                description: "Handles inbound sales calls, qualifies leads, schedules follow-ups",
              },
              {
                name: "Sam",
                role: "Support AI",
                number: "Pending provisioning",
                status: "pending",
                description: "Technical support and onboarding for shop owners",
              },
            ].map((agent) => (
              <div
                key={agent.name}
                className="flex items-start gap-4 p-3 rounded-lg bg-white/3 border border-white/5"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white text-sm font-medium">{agent.name}</span>
                    <Badge
                      variant="outline"
                      className="text-xs h-4 px-1.5 border-slate-600 text-slate-400"
                    >
                      {agent.role}
                    </Badge>
                    <Badge
                      className={`text-xs h-4 px-1.5 border-0 ${
                        agent.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {agent.status === "active" ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Live
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-xs">{agent.number}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{agent.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Lead Intelligence",
              desc: "View cold leads from AgencyFlow and warm leads from signups",
              href: "/admin/leads",
              icon: <Target className="w-5 h-5 text-blue-400" />,
            },
            {
              title: "Alex's Callbacks",
              desc: "Manage scheduled follow-up calls and outbound queue",
              href: "/admin/leads",
              icon: <Clock className="w-5 h-5 text-amber-400" />,
            },
            {
              title: "Team Management",
              desc: "Invite partners and employees, manage access roles",
              href: "/admin/team",
              icon: <Users className="w-5 h-5 text-purple-400" />,
            },
          ].map((link) => (
            <a
              key={link.title}
              href={link.href}
              className="block p-4 rounded-lg bg-[#0D0D14] border border-white/5 hover:border-white/10 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-2">
                {link.icon}
                <span className="text-white text-sm font-medium group-hover:text-emerald-400 transition-colors">
                  {link.title}
                </span>
              </div>
              <p className="text-slate-500 text-xs">{link.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </AdminPortalLayout>
  );
}
