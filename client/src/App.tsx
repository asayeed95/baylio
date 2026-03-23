import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useSubdomain } from "./hooks/useSubdomain";

// Main site pages
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
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";

// Admin portal pages (admin.baylio.io)
import AdminOverview from "./pages/AdminOverview";
import AdminLeads from "./pages/AdminLeads";
import AdminTeam from "./pages/AdminTeam";
import AffiliateAdmin from "./pages/AffiliateAdmin";

// Partners portal pages (partners.baylio.io)
import AffiliatePortal from "./pages/AffiliatePortal";
import PartnersReferrals from "./pages/PartnersReferrals";
import PartnersEarnings from "./pages/PartnersEarnings";
import PartnersNetwork from "./pages/PartnersNetwork";
import PartnersResources from "./pages/PartnersResources";
import PartnersSettings from "./pages/PartnersSettings";

/**
 * Main site router — baylio.io
 */
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
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Admin portal router — admin.baylio.io
 */
function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminOverview} />
      <Route path="/admin" component={AdminOverview} />
      <Route path="/admin/leads" component={AdminLeads} />
      <Route path="/admin/affiliates" component={AffiliateAdmin} />
      <Route path="/admin/calls" component={AdminLeads} />
      <Route path="/admin/team" component={AdminTeam} />
      <Route path="/admin/analytics" component={AdminOverview} />
      <Route path="/admin/settings" component={AdminOverview} />
      <Route component={AdminOverview} />
    </Switch>
  );
}

/**
 * Partners portal router — partners.baylio.io
 */
function PartnersRouter() {
  return (
    <Switch>
      <Route path="/" component={AffiliatePortal} />
      <Route path="/dashboard" component={AffiliatePortal} />
      <Route path="/referrals" component={PartnersReferrals} />
      <Route path="/earnings" component={PartnersEarnings} />
      <Route path="/payouts" component={PartnersEarnings} />
      <Route path="/network" component={PartnersNetwork} />
      <Route path="/resources" component={PartnersResources} />
      <Route path="/settings" component={PartnersSettings} />
      <Route component={AffiliatePortal} />
    </Switch>
  );
}

function Router() {
  const subdomain = useSubdomain();

  if (subdomain === "admin") return <AdminRouter />;
  if (subdomain === "partners") return <PartnersRouter />;
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
