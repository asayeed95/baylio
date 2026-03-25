import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Store,
  Plus,
  Phone,
  BarChart3,
  Bot,
  Settings,
  ArrowRight,
  PhoneCall,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";
import OnboardingWizard from "@/components/OnboardingWizard";

/**
 * Dashboard Page
 *
 * The main hub after login. Shows:
 * - Quick stats across all shops
 * - List of shop cards with key metrics per shop
 * - Quick actions: add shop, view analytics, configure agent
 * - Organization grouping if multi-location
 */
export default function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}

function DashboardContent() {
  const [, setLocation] = useLocation();
  const posthog = usePostHog();
  const [createOpen, setCreateOpen] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [newShopPhone, setNewShopPhone] = useState("");

  const { data: shops, isLoading, refetch } = trpc.shop.list.useQuery();
  const createShop = trpc.shop.create.useMutation({
    onSuccess: data => {
      posthog?.capture("shop_created", { shop_name: newShopName.trim(), has_phone: Boolean(newShopPhone.trim()) });
      toast.success("Shop created successfully");
      setCreateOpen(false);
      setNewShopName("");
      setNewShopPhone("");
      refetch();
    },
    onError: err => {
      toast.error(err.message || "Failed to create shop");
    },
  });

  const handleCreateShop = () => {
    if (!newShopName.trim()) {
      toast.error("Shop name is required");
      return;
    }
    createShop.mutate({
      name: newShopName.trim(),
      phone: newShopPhone.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[180px] rounded-xl border-border/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your shops and monitor AI call performance.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Shop
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
            <OnboardingWizard onComplete={() => {
              setCreateOpen(false);
              refetch();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Shop Cards */}
      {!shops || shops.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon" className="mb-4 bg-primary/10 text-primary">
              <Store className="w-8 h-8" />
            </EmptyMedia>
            <EmptyTitle>Welcome to Baylio Dashboard</EmptyTitle>
            <EmptyDescription className="max-w-md mx-auto">
              Add your first auto repair shop to deploy your AI receptionist and start recovering missed revenue today.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)} size="lg" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Shop
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map(shop => (
            <Card
              key={shop.id}
              className="cursor-pointer hover:border-primary/30 transition-colors border border-border rounded-sm"
              onClick={() => setLocation(`/shops/${shop.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{shop.name}</CardTitle>
                      {shop.phone && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {shop.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={shop.twilioPhoneNumber ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {shop.twilioPhoneNumber ? "Active" : "Setup Needed"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {shop.city && shop.state && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {shop.city}, {shop.state}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Click to manage</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
