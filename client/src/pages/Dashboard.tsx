import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
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




  ArrowRight,



} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

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
  const [createOpen, setCreateOpen] = useState(false);
  const [newShopName, setNewShopName] = useState("");
  const [newShopPhone, setNewShopPhone] = useState("");

  const { data: shops, isLoading, refetch } = trpc.shop.list.useQuery();
  const createShop = trpc.shop.create.useMutation({
    onSuccess: () => {
      toast.success("Shop created successfully");
      setCreateOpen(false);
      setNewShopName("");
      setNewShopPhone("");
      refetch();
    },
    onError: (err) => {
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
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
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Shop</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="shop-name">Shop Name</Label>
                <Input
                  id="shop-name"
                  placeholder="e.g., Mike's Auto Care"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-phone">Phone Number (optional)</Label>
                <Input
                  id="shop-phone"
                  placeholder="e.g., (555) 123-4567"
                  value={newShopPhone}
                  onChange={(e) => setNewShopPhone(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateShop}
                disabled={createShop.isPending}
              >
                {createShop.isPending ? "Creating..." : "Create Shop"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Shop Cards */}
      {!shops || shops.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Store />
            </EmptyMedia>
            <EmptyTitle>No shops yet</EmptyTitle>
            <EmptyDescription>
              Add your first auto repair shop to get started with Baylio AI call handling.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Shop
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <Card
              key={shop.id}
              role="link"
              tabIndex={0}
              className="cursor-pointer hover:shadow-md transition-shadow border focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setLocation(`/shops/${shop.id}`)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLocation(`/shops/${shop.id}`); } }}
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
                        <p className="text-xs text-muted-foreground mt-0.5">{shop.phone}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={shop.twilioPhoneNumber ? "default" : "secondary"} className="text-xs">
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
