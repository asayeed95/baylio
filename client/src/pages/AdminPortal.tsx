import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  Users,
  Phone,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
  BarChart3,
  Building2,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import AdminSamLeads from "./AdminSamLeads";
import AdminRequests from "./AdminRequests";
import { Inbox } from "lucide-react";

function AdminSidebar() {
  const { user, logout } = useAuth();

  const [location] = useLocation();
  const navItems = [
    { icon: BarChart3, label: "Overview", href: "/admin" },
    { icon: Inbox, label: "Requests", href: "/admin/requests" },
    { icon: Sparkles, label: "Sam Leads", href: "/admin/sam-leads" },
    { icon: Building2, label: "Shops", href: "/admin/shops" },
    { icon: Users, label: "Partners", href: "/admin/partners-admin" },
    { icon: Phone, label: "Call Logs", href: "/admin/calls" },
    { icon: DollarSign, label: "Subscriptions", href: "/admin/subscriptions" },
    { icon: TrendingUp, label: "Analytics", href: "/admin/analytics" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-gray-950 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Baylio</p>
            <p className="text-gray-400 text-xs">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const isActive =
            location === item.href ||
            (item.href !== "/admin" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
              {user.name?.charAt(0).toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">
                {user.name}
              </p>
              <Badge
                variant="outline"
                className="text-xs border-emerald-500 text-emerald-400 mt-0.5"
              >
                Admin
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      )}
    </aside>
  );
}

function AdminOverview() {
  const { data: shopStats } = trpc.shop.list.useQuery(undefined, {
    retry: false,
  });
  const { data: partnerStats } = trpc.partner.getProfile.useQuery(undefined, {
    retry: false,
    enabled: false,
  });

  const cards = [
    {
      label: "Total Shops",
      value: shopStats?.length ?? "—",
      icon: Building2,
      color: "text-emerald-400",
    },
    {
      label: "Active Subscriptions",
      value: "—",
      icon: DollarSign,
      color: "text-blue-400",
    },
    {
      label: "Calls This Month",
      value: "—",
      icon: Phone,
      color: "text-purple-400",
    },
    {
      label: "Active Partners",
      value: "—",
      icon: Users,
      color: "text-amber-400",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Overview</h1>
        <p className="text-gray-400 text-sm mt-1">
          Baylio platform metrics and management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <Card key={card.label} className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium uppercase tracking-widest text-gray-400">
                  {card.label}
                </CardTitle>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-mono font-medium text-white">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Manage Shops
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <Users className="w-4 h-4 mr-2" />
            Review Partners
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Payout Requests
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPortal() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Baylio Admin</h1>
          <p className="text-gray-400 text-sm mb-6">
            Sign in to access the admin portal
          </p>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm mb-6">
            You don't have admin access to Baylio.
          </p>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Go to Main Site
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <AdminContent />
      </main>
    </div>
  );
}

function AdminContent() {
  const [location] = useLocation();

  if (location.startsWith("/admin/sam-leads") || location === "/sam-leads") {
    return <AdminSamLeads />;
  }

  if (location.startsWith("/admin/requests")) {
    return <AdminRequests />;
  }

  return <AdminOverview />;
}
