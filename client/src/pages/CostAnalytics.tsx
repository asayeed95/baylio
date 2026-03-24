import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  Phone,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * Mask a phone number for display: +1 201 ***-2235
 */
function maskPhone(phone: string | null): string {
  if (!phone) return "Unknown";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  const last4 = digits.slice(-4);
  const areaCode = digits.length >= 10 ? digits.slice(-10, -7) : "***";
  return `+1 ${areaCode} ***-${last4}`;
}

/**
 * Format seconds as Xm Ys
 */
function formatDuration(seconds: number | null): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function CostAnalytics() {
  const { data, isLoading } = trpc.analytics.getCostSummary.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  const summary = data || {
    callCount: 0,
    totalMinutes: 0,
    twilioCost: 0,
    elevenLabsCost: 0,
    totalCost: 0,
    costPerCall: 0,
    revenue: 0,
    grossMargin: 0,
    dailyCalls: [],
    recentCalls: [],
  };

  const dailyData = (summary.dailyCalls || []).map((d: any) => ({
    date: d.date,
    calls: d.count,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cost Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Platform costs, revenue, and margin for the current month.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Calls This Month</p>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-mono font-medium mt-2">{summary.callCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-mono">{summary.totalMinutes}</span> total minutes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Total Cost</p>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-mono font-medium mt-2">
                ${summary.totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Twilio: <span className="font-mono">${summary.twilioCost.toFixed(2)}</span> | ElevenLabs: <span className="font-mono">${summary.elevenLabsCost.toFixed(2)}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Cost Per Call</p>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-mono font-medium mt-2">
                ${summary.costPerCall.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Average across all calls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Gross Margin</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className={`text-2xl font-mono font-medium mt-2 ${summary.grossMargin >= 50 ? "text-primary" : summary.grossMargin >= 20 ? "text-foreground" : "text-destructive"}`}>
                {summary.grossMargin.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Revenue: <span className="font-mono">${summary.revenue.toLocaleString()}</span>/mo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Call Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Call Volume (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No call data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(d) => {
                      const date = new Date(d + "T00:00:00");
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(d) => {
                      const date = new Date(d + "T00:00:00");
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Calls Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Calls</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(summary.recentCalls || []).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No calls recorded yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(summary.recentCalls as any[]).map((call: any) => {
                    const mins = Math.ceil((call.duration || 0) / 60);
                    const cost = mins * 0.014 + mins * 600 * 0.00011;
                    return (
                      <TableRow key={call.id}>
                        <TableCell className="text-sm">
                          {call.createdAt
                            ? new Date(call.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                }
                              )
                            : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {maskPhone(call.callerPhone)}
                        </TableCell>
                        <TableCell className="font-mono">{formatDuration(call.duration)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              call.status === "completed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : call.status === "missed"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {call.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ${cost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
