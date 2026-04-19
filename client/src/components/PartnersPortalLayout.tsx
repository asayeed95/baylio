import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  DollarSign,
  Network,
  BookOpen,
  GraduationCap,
  Settings,
  Handshake,
  ArrowLeft,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Skeleton } from "./ui/skeleton";

/**
 * Partners Portal Navigation
 *
 * Separate layout from the main Baylio dashboard — dark sidebar
 * with emerald + gold accent branding for the partner/affiliate experience.
 */
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/partners" },
  { icon: Users, label: "Referrals", path: "/partners/referrals" },
  { icon: DollarSign, label: "Earnings", path: "/partners/earnings" },
  { icon: Network, label: "Network", path: "/partners/network" },
  { icon: BookOpen, label: "Resources", path: "/partners/resources" },
  { icon: GraduationCap, label: "Onboarding Guide", path: "/partners/onboarding-guide" },
  { icon: Settings, label: "Settings", path: "/partners/settings" },
];

const SIDEBAR_WIDTH_KEY = "partners-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

function PartnersSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-[260px] border-r border-border bg-background p-4 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 rounded-md bg-secondary" />
          <Skeleton className="h-4 w-28 bg-secondary" />
        </div>
        <div className="space-y-2 px-2">
          <Skeleton className="h-10 w-full rounded-lg bg-secondary" />
          <Skeleton className="h-10 w-full rounded-lg bg-secondary" />
          <Skeleton className="h-10 w-full rounded-lg bg-secondary" />
        </div>
      </div>
      <div className="flex-1 p-6 space-y-4 bg-background">
        <Skeleton className="h-12 w-48 rounded-lg bg-secondary" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-xl bg-secondary" />
          <Skeleton className="h-32 rounded-xl bg-secondary" />
          <Skeleton className="h-32 rounded-xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}

export default function PartnersPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // NOTE: Auth is handled at the routing layer in App.tsx.
  // PartnersPortalLayout only renders when the user IS authenticated.
  // Do NOT add auth checks here — it causes the login wall to appear
  // instead of the public landing page for unauthenticated visitors.

  return (
    <div className="partners-portal bg-background text-foreground min-h-screen">
      <SidebarProvider
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <PartnersLayoutContent setSidebarWidth={setSidebarWidth}>
          {children}
        </PartnersLayoutContent>
      </SidebarProvider>
    </div>
  );
}

type PartnersLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function PartnersLayoutContent({
  children,
  setSidebarWidth,
}: PartnersLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item =>
    item.path === "/partners"
      ? location === "/partners"
      : location.startsWith(item.path)
  );
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-border bg-background [&_[data-sidebar=sidebar]]:bg-background"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-secondary rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Handshake className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span className="font-bold tracking-tight truncate text-foreground">
                    Partners
                  </span>
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">
                    PRO
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive =
                  item.path === "/partners"
                    ? location === "/partners"
                    : location.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal text-foreground/80 hover:text-foreground hover:bg-secondary ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-400"
                          : ""
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${
                          isActive ? "text-emerald-400" : "text-muted-foreground"
                        }`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            <div className="px-2 mt-4">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setLocation("/dashboard")}
                    tooltip="Back to Baylio"
                    className="h-10 font-normal text-muted-foreground hover:text-foreground/80 hover:bg-secondary"
                  >
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                    <span>Back to Baylio</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-secondary transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                  <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-secondary text-foreground/80">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-foreground">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      Partner
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-card border-border/50"
              >
                <DropdownMenuItem
                  onClick={() => setLocation("/dashboard")}
                  className="cursor-pointer text-foreground/80 focus:text-foreground focus:bg-secondary"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span>Back to Baylio</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-secondary"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-emerald-500/30 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-background">
        {isMobile && (
          <div className="flex border-b border-border h-14 items-center justify-between bg-background/95 px-2 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-card text-foreground/80" />
              <span className="tracking-tight text-foreground">
                {activeMenuItem?.label ?? "Partners"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
