import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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

/**
 * Baylio App Router
 * 
 * Route structure:
 * /                    → Landing page (public) or Dashboard (authenticated)
 * /dashboard           → Main dashboard with shop overview
 * /shops/:id           → Shop detail page
 * /shops/:id/agent     → AI agent configuration
 * /shops/:id/calls     → Call logs for a shop
 * /shops/:id/analytics → Analytics dashboard
 * /shops/:id/settings  → Shop settings (hours, services, etc.)
 * /audits              → Missed call audit management
 * /subscriptions       → Subscription & billing management
 * /notifications       → Notification center
 */
function Router() {
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
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
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
