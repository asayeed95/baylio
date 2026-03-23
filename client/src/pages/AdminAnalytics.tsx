/**
 * Admin Analytics Dashboard
 *
 * Six panels:
 * 1. Call Volume chart (daily/weekly/monthly)
 * 2. Revenue Recovered chart (from missed call audits)
 * 3. Active Subscriptions + MRR
 * 4. Top Performing Shops by call volume
 * 5. Conversion Funnel (prospects → trials → paid)
 * 6. Affiliate Referral Stats
 */
import { useState } from "react";
import AdminPortalLayout from "@/components/AdminPortalLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Store,
  Handshake,
  PhoneCall,
  ArrowDownRight,
  CreditCard,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="bg-[#0D0D14] border-white/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg bg-${color}-500/10`}>{icon}</div>
        </div>
        <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
        <p className="text-slate-500 text-xs mt-1">{label}</p>
        {sub && <p className="text-slate-600 text-[10px] mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function GranularityToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "daily" | "weekly" | "monthly") => void;
}) {
  return (
    <div className="flex gap-1 bg-white/5 rounded-md p-0.5">
      {(["daily", "weekly", "monthly"] as const).map((g) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            value === g
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {g.charAt(0).toUpperCase() + g.slice(1)}
        </button>
      ))}
    </div>
  );
}

const CHART_COLORS = {
  emerald: "#10b981",
  amber: "#f59e0b",
  blue: "#3b82f6",
  red: "#ef4444",
  purple: "#a855f7",
  slate: "#64748b",
};

const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "#0D0D14",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#e2e8f0",
  },
  labelStyle: { color: "#94a3b8" },
};

// ─── Section 1: Call Volume ──────────────────────────────────────────

function CallVolumeSection() {
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const { data, isLoading } = trpc.analytics.callVolume.useQuery({
    granularity,
    days: granularity === "monthly" ? 365 : granularity === "weekly" ? 90 : 30,
  });

  const chartData = data?.data ?? [];
  const totalCalls = chartData.reduce((s, d) => s + d.total, 0);
  const totalCompleted = chartData.reduce((s, d) => s + d.completed, 0);
  const totalMissed = chartData.reduce((s, d) => s + d.missed, 0);

  return (
    <Card className="bg-[#0D0D14] border-white/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            Call Volume
          </CardTitle>
          <GranularityToggle value={granularity} onChange={setGranularity} />
        </div>
        <div className="flex gap-6 mt-2">
          <div>
            <p className="text-2xl font-bold text-white">{totalCalls.toLocaleString()}</p>
            <p className="text-slate-500 text-xs">Total Calls</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-emerald-400">{totalCompleted.toLocaleString()}</p>
            <p className="text-slate-500 text-xs">Completed</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-400">{totalMissed.toLocaleString()}</p>
            <p className="text-slate-500 text-xs">Missed</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-600 text-sm">
            No call data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradMissed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.red} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="period"
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...chartTooltipStyle} />
              <Area
                type="monotone"
                dataKey="completed"
                stroke={CHART_COLORS.emerald}
                fill="url(#gradCompleted)"
                strokeWidth={2}
                name="Completed"
              />
              <Area
                type="monotone"
                dataKey="missed"
                stroke={CHART_COLORS.red}
                fill="url(#gradMissed)"
                strokeWidth={2}
                name="Missed"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 2: Revenue Recovered ────────────────────────────────────

function RevenueRecoveredSection() {
  const { data, isLoading } = trpc.analytics.revenueRecovered.useQuery({ days: 180 });

  const chartData = data?.data ?? [];
  const totals = data?.totals ?? { audits: 0, missedCalls: 0, estimatedLost: 0 };

  return (
    <Card className="bg-[#0D0D14] border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
          <ArrowDownRight className="w-4 h-4 text-amber-400" />
          Revenue at Risk (Missed Call Audits)
        </CardTitle>
        <div className="flex gap-6 mt-2">
          <div>
            <p className="text-2xl font-bold text-amber-400">
              ${totals.estimatedLost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-slate-500 text-xs">Estimated Lost Revenue</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{totals.audits}</p>
            <p className="text-slate-500 text-xs">Audits Run</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-400">{totals.missedCalls.toLocaleString()}</p>
            <p className="text-slate-500 text-xs">Missed Calls Detected</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-600 text-sm">
            No audit data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="period"
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                {...chartTooltipStyle}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Est. Lost Revenue"]}
              />
              <Bar dataKey="estimatedLost" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} name="Est. Lost Revenue" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 3: Subscription Metrics + MRR ───────────────────────────

function SubscriptionMetricsSection() {
  const { data, isLoading } = trpc.analytics.subscriptionMetrics.useQuery();

  const tiers = data?.tiers ?? [];
  const mrr = data?.mrr ?? 0;
  const totalActive = data?.totalActive ?? 0;
  const totalTrialing = data?.totalTrialing ?? 0;

  const TIER_COLORS: Record<string, string> = {
    pilot: CHART_COLORS.slate,
    starter: CHART_COLORS.blue,
    pro: CHART_COLORS.emerald,
    elite: CHART_COLORS.purple,
  };

  return (
    <Card className="bg-[#0D0D14] border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-purple-400" />
          Subscriptions & MRR
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Top-line numbers */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/3 rounded-lg p-3 border border-white/5">
                <p className="text-2xl font-bold text-emerald-400">
                  ${mrr.toLocaleString()}
                </p>
                <p className="text-slate-500 text-xs">Monthly Recurring Revenue</p>
              </div>
              <div className="bg-white/3 rounded-lg p-3 border border-white/5">
                <p className="text-2xl font-bold text-white">{totalActive}</p>
                <p className="text-slate-500 text-xs">Active Subscriptions</p>
              </div>
              <div className="bg-white/3 rounded-lg p-3 border border-white/5">
                <p className="text-2xl font-bold text-amber-400">{totalTrialing}</p>
                <p className="text-slate-500 text-xs">In Trial</p>
              </div>
            </div>

            {/* Tier breakdown bar chart */}
            {tiers.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={tiers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="tier"
                    type="category"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                    tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                  />
                  <Tooltip
                    {...chartTooltipStyle}
                    formatter={(value: number, name: string) => [value, name === "active" ? "Active" : name === "trialing" ? "Trialing" : name]}
                  />
                  <Bar dataKey="active" stackId="a" fill={CHART_COLORS.emerald} radius={[0, 0, 0, 0]} name="active" />
                  <Bar dataKey="trialing" stackId="a" fill={CHART_COLORS.amber} radius={[0, 4, 4, 0]} name="trialing" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-600 text-sm">
                No subscriptions yet
              </div>
            )}

            {/* Tier details */}
            <div className="mt-4 space-y-2">
              {tiers.map((t) => (
                <div key={t.tier} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: TIER_COLORS[t.tier] ?? CHART_COLORS.slate }}
                    />
                    <span className="text-slate-300 capitalize">{t.tier}</span>
                    <span className="text-slate-600">${t.price}/mo</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400">{t.active} active</span>
                    {t.trialing > 0 && <span className="text-amber-400">{t.trialing} trial</span>}
                    {t.pastDue > 0 && <span className="text-red-400">{t.pastDue} past due</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 4: Top Performing Shops ─────────────────────────────────

function TopShopsSection() {
  const { data, isLoading } = trpc.analytics.topShops.useQuery({ days: 30, limit: 10 });
  const shopList = data?.shops ?? [];

  return (
    <Card className="bg-[#0D0D14] border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
          <Store className="w-4 h-4 text-blue-400" />
          Top Shops by Call Volume (30d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shopList.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
            No call data yet
          </div>
        ) : (
          <div className="space-y-2">
            {shopList.map((shop, i) => {
              const maxCalls = shopList[0]?.totalCalls ?? 1;
              const pct = (shop.totalCalls / maxCalls) * 100;
              return (
                <div key={shop.shopId} className="group">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 w-5 text-right text-xs">{i + 1}.</span>
                      <span className="text-slate-200 truncate max-w-[200px]">{shop.shopName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-400">{shop.totalCalls} calls</span>
                      <span className="text-emerald-400">{shop.appointmentsBooked} booked</span>
                      {shop.revenueEstimate > 0 && (
                        <span className="text-amber-400">
                          ${shop.revenueEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 5: Conversion Funnel ────────────────────────────────────

function ConversionFunnelSection() {
  const { data, isLoading } = trpc.analytics.conversionFunnel.useQuery();

  const prospects = data?.prospects ?? { total: 0, contacted: 0, interested: 0, demoScheduled: 0, signedUp: 0 };
  const subs = data?.subscriptions ?? { totalUsers: 0, shopOwners: 0, trialing: 0, active: 0 };

  const prospectFunnel = [
    { stage: "Total Prospects", value: prospects.total, color: CHART_COLORS.slate },
    { stage: "Contacted", value: prospects.contacted, color: CHART_COLORS.blue },
    { stage: "Interested", value: prospects.interested, color: CHART_COLORS.amber },
    { stage: "Demo Scheduled", value: prospects.demoScheduled, color: CHART_COLORS.purple },
    { stage: "Signed Up", value: prospects.signedUp, color: CHART_COLORS.emerald },
  ];

  const subFunnel = [
    { stage: "Total Users", value: subs.totalUsers, color: CHART_COLORS.slate },
    { stage: "Shop Owners", value: subs.shopOwners, color: CHART_COLORS.blue },
    { stage: "Trialing", value: subs.trialing, color: CHART_COLORS.amber },
    { stage: "Paid Active", value: subs.active, color: CHART_COLORS.emerald },
  ];

  return (
    <Card className="bg-[#0D0D14] border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Outbound Prospect Funnel */}
            <div>
              <p className="text-slate-400 text-xs mb-3 font-medium uppercase tracking-wider">Outbound Prospects</p>
              <div className="space-y-2">
                {prospectFunnel.map((step, i) => {
                  const maxVal = prospectFunnel[0].value || 1;
                  const pct = (step.value / maxVal) * 100;
                  return (
                    <div key={step.stage}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-300">{step.stage}</span>
                        <span className="text-white font-medium">{step.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: step.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inbound Subscription Funnel */}
            <div>
              <p className="text-slate-400 text-xs mb-3 font-medium uppercase tracking-wider">Subscription Pipeline</p>
              <div className="space-y-2">
                {subFunnel.map((step) => {
                  const maxVal = subFunnel[0].value || 1;
                  const pct = (step.value / maxVal) * 100;
                  return (
                    <div key={step.stage}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-300">{step.stage}</span>
                        <span className="text-white font-medium">{step.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: step.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 6: Affiliate Stats ──────────────────────────────────────

function AffiliateStatsSection() {
  const { data, isLoading } = trpc.analytics.affiliateStats.useQuery();

  if (isLoading) {
    return (
      <Card className="bg-[#0D0D14] border-white/5">
        <CardContent className="p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const stats = data ?? {
    totalAffiliates: 0,
    activeAffiliates: 0,
    totalReferrals: 0,
    convertedReferrals: 0,
    conversionRate: "0.0",
    totalClicks: 0,
    totalEarningsPaid: 0,
  };

  return (
    <Card className="bg-[#0D0D14] border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
          <Handshake className="w-4 h-4 text-purple-400" />
          Affiliate Program
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/3 rounded-lg p-3 border border-white/5">
            <p className="text-xl font-bold text-white">{stats.totalAffiliates}</p>
            <p className="text-slate-500 text-xs">Total Affiliates</p>
            <p className="text-emerald-400 text-xs mt-0.5">{stats.activeAffiliates} active</p>
          </div>
          <div className="bg-white/3 rounded-lg p-3 border border-white/5">
            <p className="text-xl font-bold text-blue-400">{stats.totalReferrals}</p>
            <p className="text-slate-500 text-xs">Total Referrals</p>
            <p className="text-emerald-400 text-xs mt-0.5">{stats.convertedReferrals} converted</p>
          </div>
          <div className="bg-white/3 rounded-lg p-3 border border-white/5">
            <p className="text-xl font-bold text-amber-400">{stats.conversionRate}%</p>
            <p className="text-slate-500 text-xs">Conversion Rate</p>
            <p className="text-slate-600 text-xs mt-0.5">{stats.totalClicks.toLocaleString()} clicks</p>
          </div>
          <div className="bg-white/3 rounded-lg p-3 border border-white/5">
            <p className="text-xl font-bold text-emerald-400">
              ${stats.totalEarningsPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-slate-500 text-xs">Commissions Paid</p>
          </div>
        </div>

        {/* Referral conversion bar */}
        {stats.totalReferrals > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Referral Conversion</span>
              <span>
                {stats.convertedReferrals}/{stats.totalReferrals} ({stats.conversionRate}%)
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2.5">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all"
                style={{
                  width: `${Math.max(parseFloat(stats.conversionRate), 2)}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function AdminAnalytics() {
  return (
    <AdminPortalLayout title="Analytics">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">
            Platform-wide metrics, revenue intelligence, and growth tracking.
          </p>
        </div>

        {/* Row 1: Call Volume (full width) */}
        <CallVolumeSection />

        {/* Row 2: Revenue Recovered + Subscriptions */}
        <div className="grid lg:grid-cols-2 gap-6">
          <RevenueRecoveredSection />
          <SubscriptionMetricsSection />
        </div>

        {/* Row 3: Top Shops + Conversion Funnel */}
        <div className="grid lg:grid-cols-2 gap-6">
          <TopShopsSection />
          <ConversionFunnelSection />
        </div>

        {/* Row 4: Affiliate Stats (full width) */}
        <AffiliateStatsSection />
      </div>
    </AdminPortalLayout>
  );
}
