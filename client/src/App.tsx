import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ScrollRestoration } from "./components/ScrollRestoration";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

// ─── Lazy-loaded page components (code-split per route) ─────────────
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ShopDetail = lazy(() => import("./pages/ShopDetail"));
const AgentConfig = lazy(() => import("./pages/AgentConfig"));
const CallLogs = lazy(() => import("./pages/CallLogs"));
const Analytics = lazy(() => import("./pages/Analytics"));
const MissedCallAudit = lazy(() => import("./pages/MissedCallAudit"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ShopSettings = lazy(() => import("./pages/ShopSettings"));
const PartnersPortal = lazy(() => import("./pages/PartnersPortal"));
const PartnersLanding = lazy(() => import("./pages/PartnersLanding"));
const PartnersReferrals = lazy(() => import("./pages/PartnersReferrals"));
const PartnersEarnings = lazy(() => import("./pages/PartnersEarnings"));
const PartnersNetwork = lazy(() => import("./pages/PartnersNetwork"));
const PartnersResources = lazy(() => import("./pages/PartnersResources"));
const PartnersOnboardingGuide = lazy(() => import("./pages/PartnersOnboardingGuide"));
const PartnersSettings = lazy(() => import("./pages/PartnersSettings"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));
const CostAnalytics = lazy(() => import("./pages/CostAnalytics"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Contact = lazy(() => import("./pages/Contact"));
const Integrations = lazy(() => import("./pages/Integrations"));
const CallScorecard = lazy(() => import("./pages/CallScorecard"));
const Help = lazy(() => import("./pages/Help"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ─── Loading fallback ───────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Detect which portal to render based on hostname or ?portal= query param.
 * - admin.baylio.io    → "admin"
 * - partners.baylio.io → "partners"
 * - everything else    → "main"
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
 * - Unauthenticated visitors → public landing page
 * - Authenticated partners   → partner dashboard
 */
function PartnersLandingOrDashboard() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PartnersLanding />;
  if (isAuthenticated) return <PartnersPortal />;
  return <PartnersLanding />;
}

function PartnersRouter() {
  return (
    <Switch>
      <Route path="/" component={PartnersLandingOrDashboard} />
      <Route path="/partners" component={PartnersLandingOrDashboard} />
      <Route path="/partners/referrals" component={PartnersReferrals} />
      <Route path="/partners/earnings" component={PartnersEarnings} />
      <Route path="/partners/network" component={PartnersNetwork} />
      <Route path="/partners/resources" component={PartnersResources} />
      <Route path="/partners/onboarding-guide" component={PartnersOnboardingGuide} />
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
      <Route path="/login" component={Login} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/shops/:id" component={ShopDetail} />
      <Route path="/shops/:id/agent" component={AgentConfig} />
      <Route path="/shops/:id/calls" component={CallLogs} />
      <Route path="/shops/:id/analytics" component={Analytics} />
      <Route path="/shops/:id/settings" component={ShopSettings} />
      <Route path="/shops/:id/integrations" component={Integrations} />
      <Route path="/shops/:id/calls/:callId/scorecard" component={CallScorecard} />
      <Route path="/audits" component={MissedCallAudit} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/dashboard/costs" component={CostAnalytics} />
      <Route path="/faq" component={FAQ} />
      <Route path="/help" component={Help} />
      <Route path="/contact" component={Contact} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      {/* Partners routes accessible from main domain too */}
      <Route path="/partners" component={PartnersLandingOrDashboard} />
      <Route path="/partners/referrals" component={PartnersReferrals} />
      <Route path="/partners/earnings" component={PartnersEarnings} />
      <Route path="/partners/network" component={PartnersNetwork} />
      <Route path="/partners/resources" component={PartnersResources} />
      <Route path="/partners/onboarding-guide" component={PartnersOnboardingGuide} />
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
      <AuthProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <ScrollRestoration />
            <Suspense fallback={<PageLoader />}>
              <Router />
            </Suspense>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
