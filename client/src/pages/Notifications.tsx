import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  Bell,
  Check,
  Phone,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Notifications Page
 * 
 * Displays all notifications for the logged-in user:
 * - New customer calls
 * - High-value leads
 * - System issues
 * - Weekly performance summaries
 * - Overage warnings
 * 
 * Supports mark-as-read and mark-all-as-read actions.
 */
export default function Notifications() {
  return (
    <DashboardLayout>
      <NotificationsContent />
    </DashboardLayout>
  );
}

function NotificationsContent() {
  const { data: notifications, isLoading, refetch } = trpc.notification.list.useQuery({});

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      refetch();
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "new_call": return <Phone className="h-4 w-4 text-blue-500" />;
      case "high_value_lead": return <DollarSign className="h-4 w-4 text-green-500" />;
      case "system_issue": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "weekly_summary": return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case "overage_warning": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notification List */}
      {!notifications || notifications.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Bell /></EmptyMedia>
            <EmptyTitle>No notifications</EmptyTitle>
            <EmptyDescription>
              You'll receive alerts here for new calls, high-value leads, and system updates.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${!notification.isRead ? "bg-primary/5 border-primary/20" : ""}`}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{notification.title}</p>
                      {!notification.isRead && (
                        <Badge variant="default" className="text-xs px-1.5 py-0">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => markRead.mutate({ id: notification.id })}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
