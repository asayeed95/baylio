import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import ShopDetail from "./pages/ShopDetail";
import AgentConfig from "./pages/AgentConfig";
import CallLogs from "./pages/CallLogs";
import Analytics from "./pages/Analytics";
import MissedCallAudit from "./pages/MissedCallAudit";
import Subscriptions from "./pages/Subscriptions";
import Notifications from "./pages/Notifications";
import ShopSettings from "./pages/ShopSettings";
import PartnersPortal from "./pages/PartnersPortal";
import PartnersLanding from "./pages/PartnersLanding";
import PartnersReferrals from "./pages/PartnersReferrals";
import PartnersEarnings from "./pages/PartnersEarnings";
import PartnersNetwork from "./pages/PartnersNetwork";
import PartnersResources from "./pages/PartnersResources";
import PartnersSettings from "./pages/PartnersSettings";
import AdminPortal from "./pages/AdminPortal";

/**
 * Detect which portal to render based on hostname or ?portal= query param.
 * - admin.baylio.io  → "admin"
 * - partners.baylio.io → "partners"
 * - everything else  → "main"
 * Dev shortcut: ?portal=admin or ?portal=partners
 */
function detectPortal(): "admin" | "partners" | "main" {
  const params = new URLSearchParams(window.location.search);
  const override = params.get("portal");
  if (override === "admin") return "admin";
  if (override === "partners") return "partners";

  const hostname = window.location.hostname;
  if (hostname.startsWith("admin.")) return "admin";
  if (hostname.startsWith("partners.")) return "partners";
  return "main";
}

/**
 * Root of the partners portal:
 * - Unauthenticated visitors → public landing page (commission tiers, calculator, CTA)
 * - Authenticated partners  → partner dashboard
 */
function PartnersLandingOrDashboard() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <PartnersPortal />;
  return <PartnersLanding />;
}

function PartnersRouter() {
  return (
    <Switch>
      <Route path="/" component={PartnersLandingOrDashboard} />
      <Route path="/referrals" component={PartnersReferrals} />
      <Route path="/earnings" component={PartnersEarnings} />
      <Route path="/network" component={PartnersNetwork} />
      <Route path="/resources" component={PartnersResources} />
      <Route path="/settings" component={PartnersSettings} />
      {/* Legacy /partners/* paths */}
      <Route path="/partners" component={PartnersPortal} />
      <Route path="/partners/referrals" component={PartnersReferrals} />
      <Route path="/partners/earnings" component={PartnersEarnings} />
      <Route path="/partners/network" component={PartnersNetwork} />
      <Route path="/partners/resources" component={PartnersResources} />
      <Route path="/partners/settings" component={PartnersSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminPortal} />
      <Route path="/admin" component={AdminPortal} />
      <Route path="/admin/:rest*" component={AdminPortal} />
      <Route component={AdminPortal} />
    </Switch>
  );
}

function MainRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/shops/:id" component={ShopDetail} />
      <Route path="/shops/:id/agent" component={AgentConfig} />
      <Route path="/shops/:id/calls" component={CallLogs} />
      <Route path="/shops/:id/analytics" component={Analytics} />
      <Route path="/shops/:id/settings" component={ShopSettings} />
      <Route path="/audits" component={MissedCallAudit} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/notifications" component={Notifications} />
      {/* Partners routes accessible from main domain too */}
      <Route path="/partners" component={PartnersPortal} />
      <Route path="/partners/referrals" component={PartnersReferrals} />
      <Route path="/partners/earnings" component={PartnersEarnings} />
      <Route path="/partners/network" component={PartnersNetwork} />
      <Route path="/partners/resources" component={PartnersResources} />
      <Route path="/partners/settings" component={PartnersSettings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const portal = detectPortal();
  if (portal === "partners") return <PartnersRouter />;
  if (portal === "admin") return <AdminRouter />;
  return <MainRouter />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
