import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Network,
  CreditCard,
  BookOpen,
  Settings,
  LogOut,
  Handshake,
  ChevronRight,
  Bell,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    label: "My Referrals",
    path: "/referrals",
    icon: <Users className="w-4 h-4" />,
  },
  {
    label: "Earnings",
    path: "/earnings",
    icon: <DollarSign className="w-4 h-4" />,
  },
  {
    label: "My Network",
    path: "/network",
    icon: <Network className="w-4 h-4" />,
  },
  {
    label: "Payouts",
    path: "/payouts",
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    label: "Resources",
    path: "/resources",
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: <Settings className="w-4 h-4" />,
  },
];

const TIER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  bronze: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  silver: { text: "text-slate-300", bg: "bg-slate-400/10", border: "border-slate-400/30" },
  gold: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  platinum: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  affiliate: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  pro: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  agency: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
};

interface PartnersPortalLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function PartnersPortalLayout({
  children,
  title,
}: PartnersPortalLayoutProps) {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const affiliateQuery = trpc.affiliate.me.useQuery(undefined, { enabled: !!user });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading partners portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  const affiliate = affiliateQuery.data;
  const tier = affiliate?.tier ?? "affiliate";
  const tierStyle = TIER_COLORS[tier] ?? TIER_COLORS.affiliate;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "PA";

  const pendingBalance = affiliate?.pendingPayout ?? "0.00";

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0D0D14] border-r border-white/5 flex flex-col fixed h-full z-10">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center">
              <Handshake className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">
                Baylio Partners
              </p>
              <p className="text-slate-500 text-xs mt-0.5">Affiliate Portal</p>
            </div>
          </div>
        </div>

        {/* Tier badge + pending balance */}
        <div className="px-5 py-3 border-b border-white/5 space-y-2">
          <Badge
            variant="outline"
            className={`text-xs ${tierStyle.border} ${tierStyle.text} ${tierStyle.bg} capitalize`}
          >
            {tier} Partner
          </Badge>
          {affiliate && (
            <div>
              <p className="text-slate-500 text-xs">Pending Balance</p>
              <p className="text-amber-400 text-sm font-semibold">${pendingBalance}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location === "/" || location === "/dashboard"
                : location.startsWith(item.path);

            return (
              <Link key={item.path} href={item.path}>
                <a
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 font-medium"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span
                    className={
                      isActive
                        ? "text-emerald-400"
                        : "text-slate-500 group-hover:text-slate-300"
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge className="bg-amber-500/20 text-amber-400 text-xs border-0 h-5 px-1.5">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && (
                    <ChevronRight className="w-3 h-3 text-emerald-400/50" />
                  )}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">
                {affiliate?.name || user.name || "Partner"}
              </p>
              <p className="text-slate-500 text-xs truncate">{user.email}</p>
            </div>
            <button
              onClick={() => logoutMutation.mutate()}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 border-b border-white/5 bg-[#0D0D14]/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">partners.baylio.io</span>
            {title && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-white text-sm font-medium">{title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="text-slate-400 hover:text-white transition-colors relative">
              <Bell className="w-4 h-4" />
            </button>
            <a
              href="https://baylio.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              ← Back to baylio.io
            </a>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
